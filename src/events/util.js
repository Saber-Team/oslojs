/**
 * @fileoverview 一个总览原生浏览器事件和自定义js事件的事件管理器,提供了经过抽象的事件体系.
 * @author Leo.Zhang
 * @email zmike86@gmail.com
 *
 * 这个文件还提供了模拟IE9以下浏览器在W3C标准事件模型中缺失的事件捕获阶段.
 * 警告: 这种模拟的效果对于绕过events系统而直接绑定在dom上的句柄不生效.
 *       所有句柄函数都会接收形参的事件对象,是个跨浏览器的封装对象.
 *
 * 示例:
 * <pre>
 * events.listen(myNode, 'click', function(e) { alert('woo') });
 * events.listen(myNode, 'mouseover', mouseHandler, true);
 * events.unlisten(myNode, 'mouseover', mouseHandler, true);
 * events.removeAll(myNode);
 * </pre>
 *
 * @supported IE6+, FF1.5+, WebKit, Opera.
 * @see ../demos/events.html
 * @see ../demos/event-propagation.html
 * @see ../demos/stopevent.html
 */

// IMPLEMENTATION NOTES:
// This uses an indirect lookup of listener functions to avoid
// circular references between DOM (in IE) or XPCOM (in Mozilla)
// objects which leak memory. Unfortunately, this design is now
// problematic in modern browsers as it requires a global lookup table
// in JavaScript. This lookup table needs to be cleaned up manually
// (by calling #unlisten/#unlistenByKey), otherwise it will cause
// memory leaks. (This does not apply to events.EventTarget, which
// no longer uses the global lookup table.)
//
// This uses 3 lookup tables/trees for native event targets.
//   listenerTree_ is a tree of type -> capture -> src uid -> [Listener]
//   listeners_ is a map of key -> [Listener]
//       The key is a field of the Listener. The Listener class also
//       has the type, capture and the src so one can always trace
//       back in the tree
//   sources_: src uid -> [Listener]

define('@events.util',
    [
        '@util',
        '@events.browserEvent',
        '@events.browserFeature',
        '@events.eventTarget',
        '@events.listener',
        '@array',
        '@object'
    ],
    function(util, BrowserEvent, BrowserFeature, EvtTarget, Listener, array, object) {

        'use strict';

        /**
         * 如果一个对象包含handleEvent方法，则也可以被传递作为handler存在。
         * 这个属性就是表示该对象含有handleEvent。
         * @type {string}
         * @private
         */
        var LISTENER_WRAPPER_PROP_ = '__sogou_events_fn_' + ((Math.random() * 1e9) >>> 0);

        /**
         * 句柄树
         * 依照下面的代码, 其结构应该是
         * {
         *     click: {
         *         count_: 12,
         *         true: {
         *             count_: 4,
         *             sogou_uid_123456: [ listenerObj1,listenerObj2,listenerObj3 ]
         *         },
         *         false: {
         *             count_: 8,
         *             sogou_uid_654321: [ listenerObj1,listenerObj2,listenerObj3 ]
         *         }
         *     }
         * }
         * @private
         * @type {Object}
         */
        var listenerTree_ = {};

        /**
         * 为了快速查找某个对象的绑定句柄. key是对象的全局uid,value是句柄对象的数组.
         * @private
         * @type {Object}
         */
        var sources_ = {};

        /**
         * Container for storing event listeners and their proxies
         * key是句柄的key属性, 值是句柄的代理
         * @private {!Object.<Listener.Key>}
         */
        var listeners_ = {};

        /**
         * IE事件名称的前缀。
         * @type {string}
         * @private
         */
        var onString_ = 'on';

        /**
         * 专门为IE6做的缓存对象, 不必每次events.listen的时候都重新分配内存空间.
         * IE6下性能会有一些提升.
         * @type {Object}
         * @private
         */
        var onStringMap_ = {};

        /**
         * 标记IE event我们就可以不传递两次冒泡事件.
         * @param {Event} e IE浏览器事件。
         * @private
         */
        function markIeEvent_(e) {
            // 只有keyCode和returnValue属性可以被改变. 不是键盘事件我们就用keyCode标记.
            // e.returnValue有一定的欺骗性, 默认是undefined, false会阻止默认行为.
            // 在window.onbeforeunload中returnValue不是undefined会被警告.
            // 然而我们只对键盘事件修改returnValue.
            // 这样做也有致命缺陷：若其他框架改变了event对象的keyCode或者returnValue就败了
            var useReturnValue = false;
            // 不是键盘事件
            if (+e.keyCode === 0) {
                // We cannot change the keyCode in case that srcElement is input[type=file].
                // We could test that that is the case but that would allocate 3 objects.
                // If we use try/catch we will only allocate extra objects in the case of a
                // failure.
                /** @preserveTry */
                try {
                    e.keyCode = -1;
                    return;
                } catch (ex) {
                    useReturnValue = true;
                }
            }

            if (useReturnValue || /** @type {boolean|undefined} */ util.isNull(e.returnValue)) {
                e.returnValue = true;
            }
        }

        /**
         * 这个方法用于检查IE事件对象是否已经经过系统的处理. 用于防止系统对这个事件做两次冒泡处理.
         * @param {Event} e  IE浏览器事件
         * @return {boolean} 事件被处理过了就返回true
         * @private
         */
        function isMarkedIeEvent_(e) {
            return e.keyCode < 0 || !util.isNull(e.returnValue);
        }

        /**
         * 这个方法用于句柄的代理, getProxy中调用.
         * @param {EventTarget} src 触发事件的对象.
         * @param {Listener} listener 一个Listener的实例.
         * @param {Event=} opt_evt 在原始的处理器中传递的事件对象.
         * @return {boolean} Result of the event handler.
         * @private
         */
        function handleBrowserEvent_(src, listener, opt_evt) {
            if (listener.removed) 
                return true;

            var type = listener.type;
            var map = listenerTree_;
            var ancestors;

            if (!(type in map)) 
                return true;

            map = map[type];
            var retval, targetsMap;
            // 如果浏览器不支持W3C标准事件模型就需要通过合成事件(Synthesize event)模拟捕获.
            // IE9以下需执行这块代码.
            if (!BrowserFeature.HAS_W3C_EVENT_SUPPORT) {
                var ieEvent = opt_evt ||/** @type {Event} */ window.event;
                var i;

                // 确定该类型的事件是否有capture阶段需要执行的句柄.
                var hasCapture = true in map;
                var hasBubble = false in map;
                // todo
                if (hasCapture) {
                    if (isMarkedIeEvent_(ieEvent))
                        return true;
                    markIeEvent_(ieEvent);
                }

                // 用原生事件初始化系统的标准事件
                var evt = new BrowserEvent();
                evt.init(ieEvent, src);
                retval = true;
                try {
                    if (hasCapture) {
                        ancestors = [];
                        // 构建个祖先列表
                        for (var parent = evt.currentTarget; parent; parent = parent.parentNode) {
                            ancestors.push(parent);
                        }
                        targetsMap = map[true];
                        // 触发捕获监听句柄
                        for (i = ancestors.length - 1; !evt.propagationStopped_ && i >= 0; i--) {
                            evt.currentTarget = ancestors[i];
                            retval &= fireListeners_(targetsMap, ancestors[i], type, true, evt);
                        }
                        if (hasBubble) {
                            targetsMap = map[false];
                            // todo
                            for (i = 0; !evt.propagationStopped_ && i < ancestors.length; i++) {
                                evt.currentTarget = ancestors[i];
                                retval &= fireListeners_(targetsMap, ancestors[i], type, false, evt);
                            }
                        }
                    } else {
                        // Bubbling, let IE handle the propagation.
                        retval = fireListener(listener, evt);
                    }
                } finally {
                    if (ancestors) 
                        ancestors.length = 0;
                }
                return retval;
            } // IE

            // Caught a non-IE DOM event. 1 additional argument which is the event object
            var be = new BrowserEvent(opt_evt, /** @type {EventTarget} */ (src));
            retval = fireListener(listener, be);
            return retval;
        }

        /**
         * 针对IE取到加上on前缀的事件名. This function caches the string in order
         * to avoid extra allocations in steady state.
         * @param {string} type Event type.
         * @return {string} The type string with 'on' prepended.
         * @private
         */
        function getOnString_(type) {
            if (type in onStringMap_) {
                return onStringMap_[type];
            }
            return onStringMap_[type] = onString_ + type;
        }

        /**
         * 这个函数listen相关方法中多次被用到.
         * 其中目地主要用于返回对象的handleEvent方法作为响应函数
         * @param {Object|Function} listener 一个事件响应函数或者一个包含handleEvent方法的对象.
         * @return {!Function} 如果传递的是一个函数则直接返回,否则返回一个匿名函数调用obj.handleEvent.
         *     如果同样的函数被传递多次, 会返回同一个函数.
         * @private
         */
        function wrapListener_(listener) {
            if (util.isNull(listener)) {
                throw new Error('Listener can not be null.');
            }

            if (util.isFunction(listener)) return listener;

            if (util.isNull(listener.handleEvent)) {
                throw new Error('An object listener must have handleEvent method.');
            }

            // 记录一个特殊属性, 保存其中的handleEvent wrapper
            return listener[LISTENER_WRAPPER_PROP_] ||
                (listener[LISTENER_WRAPPER_PROP_] = function(e) {
                    return listener.handleEvent(e);
                });
        }

        /**
         * 为原生的事件目标添加指定的函数监听事件. 一个函数只能添加一次,如果是第二次添加会返回该句柄对象的Key.
         * 注意: 一次性的句柄不会改变已存在的listener,反而正常的句柄会改变已存在的一次性句柄为长久性的.
         * @param {EventTarget} src 监听对象.
         * @param {?string} type 事件类型或事件类型数组.
         * @param {!Function} listener 监听函数.
         * @param {boolean} callOnce 事件是否一次性的.
         * @param {boolean=} opt_capt 捕获阶段是否触发事件 (defaults to false).
         * @param {Object=} opt_context 函数上下文
         * @return {Listener} Unique key for the listener.
         * @private
         */
        function listen_(src, type, listener, callOnce, opt_capt, opt_context) {
            if (!type) 
                throw Error('Invalid event type');

            var capture = !!opt_capt;
            var map = listenerTree_;
            if (!(type in map)) 
                map[type] = {count_: 0};

            map = map[type];
            if (!(capture in map)) {
                map[capture] = {count_: 0};
                map.count_++;
            }
            map = map[capture];

            var srcUid = util.getUid(src);
            var listenerArray, listenerObj;

            // Do not use `srcUid in map` here since that will cast the number to a
            // string which will allocate one string object.
            if (!map[srcUid]) {
                listenerArray = map[srcUid] = [];
                map.count_++;
            } else {
                listenerArray = map[srcUid];
                // 确定句柄之前没存在
                for (var i = 0; i < listenerArray.length; i++) {
                    listenerObj = listenerArray[i];
                    if (listenerObj.listener === listener && listenerObj.handler === opt_context) {
                        // 如果句柄已经被移除了我们不该返回他
                        // 可以创建一个新的listenerObj因为被标示移除的不久后就会被清理.
                        if (listenerObj.removed) 
                            break;
                        // 确保如果存在的句柄是一次性的, 则今后它不会再是一次性的了.
                        if (!callOnce) 
                            listenerArray[i].callOnce = false;
                        // 返回listenerObj.
                        return listenerArray[i];
                    }
                }
            }

            // 这一步非常重要,这个代理函数消除了句柄的不同, 允许IE下事件也能捕获
            var proxy = getProxy();
            listenerObj = new Listener(listener, proxy, src, type, capture, opt_context);
            listenerObj.callOnce = callOnce;

            // 保存两个有用属性, 在getProxy里面有用到
            proxy.src = src;
            proxy.listener = listenerObj;

            listenerArray.push(listenerObj);

            // 维护sources_对象
            if (!sources_[srcUid]) {
                sources_[srcUid] = [];
            }
            sources_[srcUid].push(listenerObj);

            // 通过类似浏览器的API把代理函数添加到监听对象上.绑的都是proxy
            if (src.addEventListener) {
                src.addEventListener(type, proxy, capture);
            } else {
                // 这个if分支曾经的代码是 else if (src.attachEvent) 然后有另外一个 else statement 抛出一个异常.
                // 这会导致IE6下有额外的对象分配
                // due to a wrapper object that had to be implemented around the element
                // and 所以被移除了.
                src.attachEvent(getOnString_(type), proxy);
            }

            var key = listenerObj.key;
            listeners_[key] = listenerObj;
            return listenerObj;
        }

        /**
         * 返回给定对象给定事件类型的句柄数组.
         * @param {Object} obj Object to get listeners for.
         * @param {?string} type 事件类型.
         * @param {boolean} capture Capture phase?.
         * @return {Array.<Listener>?} Array of listener objects.
         *     Returns null if object has no listeners of that type.
         * @private
         */
        function getListeners_(obj, type, capture) {
            var map = listenerTree_;
            if (type in map) {
                map = map[type];
                if (capture in map) {
                    map = map[capture];
                    var objUid = util.getUid(obj);
                    if (map[objUid]) {
                        return map[objUid];
                    }
                }
            }

            return null;
        }

        /**
         * 给定对象,事件类型,是否捕获得到所有符合条件的监听函数对象
         * @param {Object} obj Object to get listeners for.
         * @param {string} type Event type.
         * @param {boolean} capture Capture phase?.
         * @return {Array.<Listener>} Array of listener objects.
         */
        function getListeners(obj, type, capture) {
            if (obj instanceof EvtTarget) {
                return obj.getListeners(type, capture);
            } else {
                return getListeners_(obj, type, capture) || [];
            }
        }

        /**
         * 获取句柄对象. 不存在返回null.
         *
         * @param {EventTarget} src The target from which to get listeners.
         * @param {?string} type 事件类型没有'on'前缀.
         * @param {Function} listener The listener function to get.
         * @param {boolean=} opt_capt In DOM-compliant browsers, this determines
         *                            whether the listener is fired during the
         *                            capture or bubble phase of the event.
         * @param {Object=} opt_context 函数上下文
         * @return {?Listener} the found listener or null if not found.
         */
        function getListener(src, type, listener, opt_capt, opt_context) {
            var capture = !!opt_capt;
            if (src instanceof EvtTarget) {
                return src.getListener(type, listener, capture, opt_context);
            }

            var listenerArray = getListeners_(src, type, capture);
            if (listenerArray) {
                for (var i = 0; i < listenerArray.length; i++) {
                    // If unlistenByKey is called during an event dispatch
                    // then the listener array won't get cleaned up and there might be
                    // 'removed' listeners in the list. Ignore those.
                    if (!listenerArray[i].removed &&
                        listenerArray[i].listener === listener &&
                        listenerArray[i].capture === capture &&
                        listenerArray[i].handler === opt_context) {
                        // 如果已经存在这个处理器. 返回该处理器.
                        return listenerArray[i];
                    }
                }
            }
            return null;
        }

        /**
         * Returns whether an event target has any active listeners matching the
         * specified signature. If either the type or capture parameters are
         * unspecified, the function will match on the remaining criteria.
         *
         * @param {EventTarget} obj Target to get listeners for.
         * @param {string=} opt_type Event type.
         * @param {boolean=} opt_capture Whether to check for capture or bubble-phase
         *     listeners.
         * @return {boolean} Whether an event target has one or more listeners matching
         *     the requested type and/or capture phase.
         */
        function hasListener(obj, opt_type, opt_capture) {
            if (obj instanceof EvtTarget) {
                return obj.hasListener(opt_type, opt_capture);
            }

            var objUid = util.getUid(obj);
            var listeners = sources_[objUid];

            if (listeners) {
                var hasType = !util.isNull(opt_type);
                var hasCapture = !util.isNull(opt_capture);

                if (hasType && hasCapture) {
                    // Lookup in the listener tree whether the specified listener exists.
                    var map = listenerTree_[opt_type];
                    return !!map && !!map[opt_capture] && objUid in map[opt_capture];

                } else if (!(hasType || hasCapture)) {
                    // Simple check for whether the event target has any listeners at all.
                    return true;

                } else {
                    // Iterate through the listeners for the event target to find a match.
                    return array.some(listeners, function(listener) {
                        return (hasType && listener.type === opt_type) ||
                            (hasCapture && listener.capture === opt_capture);
                    });
                }
            }

            return false;
        }

        /**
         * 取得代理函数.
         * 这里对代理函数的执行结果稍有不同IE9以下对于proxy的返回值很在乎
         * @return {Function} 返回一个新的可被复用的匿名函数.
         */
        function getProxy() {
            // Use a local var f to prevent one allocation.
            var f = BrowserFeature.HAS_W3C_EVENT_SUPPORT ?
                function(eventObject) {
                    return handleBrowserEvent_(f.src, f.listener, eventObject);
                } :
                function(eventObject) {
                    var v = handleBrowserEvent_(f.src, f.listener, eventObject);
                    // 注意: 在IE中我们模拟了捕获阶段. 但当有个后代元素有个inline绑定函数
                    // 试图阻止默认行为时(<a href="..." onclick="return false">...</a>)
                    // 如果句柄返回true默认行为会被改写, 因此我们返回undefined.
                    if (!v) 
                        return v;
                };
            return f;
        }

        /**
         * 对dom元素或者EventTarget实例添加函数句柄.可以添加只调用一次的函数,
         * 若再次被添加则直接返回Listener对象.Note that if the
         * existing listener is a one-off listener(registered via listenOnce),
         * it will no longer be a one-off listener after a call to listen().
         *
         * @param {EventTarget} src 监听对象.
         * @param {string|Array.<string>} type Event type or array of event types.
         * @param {Function|Object} listener Callback method, or an object
         *     with a handleEvent function. WARNING: passing an Object is now
         *     softly deprecated.
         * @param {boolean=} opt_capt 捕获阶段是否触发,默认false
         * @param {Object=} opt_context 函数上下文
         * @return {Listener} Unique key for the listener.
         */
        function listen(src, type, listener, opt_capt, opt_context) {
            if (util.isArray(type)) {
                for (var i = 0; i < type.length; i++)
                    listen(src, type[i], listener, opt_capt, opt_context);
                return null;
            }

            listener = wrapListener_(listener);
            if (src instanceof EvtTarget)
                return src.listen(type, listener, opt_capt, opt_context);
            else
                return listen_(src, type, listener, /* callOnce */ false, opt_capt, opt_context);
        }

        /**
         * 移除通过listen()加上的事件句柄
         * @param {EventTarget} src The target to stop listening to events on.
         * @param {string|Array.<string>} type The name of the event without the 'on'
         *     prefix.
         * @param {Function|Object} listener The listener function to remove.
         * @param {boolean=} opt_capt In DOM-compliant browsers, this determines
         *     whether the listener is fired during the capture or bubble phase of the
         *     event.
         * @param {Object=} opt_context Element in whose scope to call the listener.
         *
         * @return {?boolean} indicating whether the listener was there to remove.
         */
        function unlisten(src, type, listener, opt_capt, opt_context) {
            var i;
            if (util.isArray(type)) {
                for (i = 0; i < type.length; i++)
                    unlisten(src, type[i], listener, opt_capt, opt_context);
                return null;
            }

            if (src instanceof EvtTarget) {
                return src.unlisten(type, listener, opt_capt, opt_context);
            }

            var capture = !!opt_capt;
            var listenerArray = getListeners_(src, type, capture);
            if (!listenerArray)
                return false;

            for (i = 0; i < listenerArray.length; i++) {
                if (listenerArray[i].listener === listener &&
                    listenerArray[i].capture === capture &&
                    listenerArray[i].handler === opt_context) {
                    return unlistenByKey(listenerArray[i]);
                }
            }

            return false;
        }

        /**
         * 为监听对象或者dom元素添加事件处理器, 触发过后处理器会被自动删除.
         * 如果句柄已经存在, 此方法什么都不做. 如果之前是通过listen()注册的,
         * listenOnce()不会改变其属性成为一次性句柄. 相应如果存在的是一次性句柄,
         * listenOnce也不会改变它们
         *
         * @param {EventTarget} src The node to listen to events on.
         * @param {string|Array.<string>} type Event type or array of event types.
         * @param {Function|Object} listener Callback method.
         * @param {boolean=} opt_capt Fire in capture phase?.
         * @param {Object=} opt_context 函数上下文
         *
         * @return {Listener} Unique key for the listener.
         */
        function listenOnce(src, type, listener, opt_capt, opt_context) {
            if (util.isArray(type)) {
                for (var i = 0; i < type.length; i++)
                    listenOnce(src, type[i], listener, opt_capt, opt_context);
                return null;
            }

            var listenableKey;
            listener = wrapListener_(listener);
            if (src instanceof EvtTarget) {
                listenableKey = src.listenOnce(type, listener, opt_capt, opt_context);
            } else {
                listenableKey = listen_(
                    /** @type {EventTarget} */ (src),
                    type, listener, /* callOnce */ true, opt_capt, opt_context);
            }

            return listenableKey;
        }

        /**
         * 移除通过listen()加上的事件句柄. 通过listen()返回的Listener对象
         * @param {Listener} key 通过listen()返回的Listener对象.
         * @return {boolean} 监听是否被成功移除.
         */
        function unlistenByKey(key) {
            // Remove this check when tests that rely on this are fixed.
            if (util.isNumber(key)) 
                return false;
            var listener = key;
            if (!listener) 
                return false;
            if (listener.removed) 
                return false;

            var src = listener.src;
            if (src instanceof EvtTarget) {
                return src.unlistenByKey(listener);
            }

            var type = listener.type;
            var proxy = listener.proxy;
            var capture = listener.capture;
            if (src.removeEventListener) {
                src.removeEventListener(type, proxy, capture);
            } else if (src.detachEvent) {
                src.detachEvent(getOnString_(type), proxy);
            }

            var srcUid = util.getUid(src);
            if (sources_[srcUid]) {
                var sourcesArray = sources_[srcUid];
                array.remove(sourcesArray, listener);
                if (sourcesArray.length === 0) {
                    delete sources_[srcUid];
                }
            }

            listener.markAsRemoved();

            // There are some esoteric situations where the hash code of an object
            // can change, and we won't be able to find the listenerArray anymore.
            // For example, if you're listening on a window, and the user navigates to
            // a different window, the UID will disappear.
            //
            // It should be impossible to ever find the original listenerArray, so it
            // doesn't really matter if we can't clean it up in this case.
            var listenerArray = listenerTree_[type][capture][srcUid];
            if (listenerArray) {
                array.remove(listenerArray, listener);
                if (listenerArray.length === 0) {
                    delete listenerTree_[type][capture][srcUid];
                    listenerTree_[type][capture].count_--;
                }
                if (listenerTree_[type][capture].count_ === 0) {
                    delete listenerTree_[type][capture];
                    listenerTree_[type].count_--;
                }
                if (listenerTree_[type].count_ === 0) {
                    delete listenerTree_[type];
                }
            }
            // 维护listeners_对象
            delete listeners_[listener.key];
            return true;
        }

        /**
         * 触发一个对象的某个事件的所有句柄.
         * @param {Object} obj 监听对象.
         * @param {string} type 事件类型.
         * @param {boolean} capture 捕获 or 冒泡.
         * @param {Object} eventObject Event object to be passed to listener.
         * @return {boolean} True所有函数返回true否则false.
         */
        function fireListeners(obj, type, capture, eventObject) {
            // 如果对象实现了Listenable接口则可以直接调用其fireListeners方法
            if (obj instanceof EvtTarget) {
                return obj.fireListeners(type, capture, eventObject);
            }

            var map = listenerTree_;
            if (type in map) {
                map = map[type];
                if (capture in map) {
                    return fireListeners_(map[capture], obj, type, capture, eventObject);
                }
            }
            return true;
        }

        /**
         * 这才是真正执行函数的地方
         * @param {Object} map listenerTree_的子树.
         * @param {Object} obj 被监听的对象.
         * @param {string} type 事件类型.
         * @param {boolean} capture 哪个阶段.
         * @param {Object} eventObject Event object to be passed to listener.
         * @return {boolean} True所有函数返回true否则false
         * @private
         */
        function fireListeners_(map, obj, type, capture, eventObject) {
            var retval = 1;
            var objUid = util.getUid(obj);
            if (map[objUid]) {
                // 在事件分发的过程里添加的事件句柄不应该在此次分发中触发.
                // 而应该在下次分发阶段触发
                // 所以就解释了为什么先要克隆一份句柄的列表
                // 否则列表有可能会变化
                var listenerArray = array.toArray(map[objUid]);
                for (var i = 0; i < listenerArray.length; i++) {
                    var listener = listenerArray[i];
                    // We might not have a listener if the listener was removed.
                    if (listener && !listener.removed) {
                        retval &= fireListener(listener, eventObject) !== false;
                    }
                }
            }

            return !!retval;
        }

        /**
         * 触发句柄监听器
         * @param {Listener} listener The listener object to call.
         * @param {Object} eventObject The event object to pass to the listener.
         * @return {boolean} 返回函数执行结果
         */
        function fireListener(listener, eventObject) {
            var listenerFn = listener.listener;
            var context = listener.handler || listener.src;

            if (listener.callOnce) {
                unlistenByKey(listener);
            }
            return listenerFn.call(context, eventObject);
        }

        /**
         * 用一个特定的EventWrapper对象在Node节点或者EventTarget实例上添加事件监听.
         * @param {EventTarget} src 监听对象.
         * @param {EventWrapper} wrapper Event wrapper to use.
         * @param {Function|Object} listener 处理器函数或者一个含有handleEvent方法的对象.
         * @param {boolean=} opt_capt 是否捕获模式 (defaults to false).
         * @param {Object=} opt_context 函数上下文.
         */
        function listenWithWrapper(src, wrapper, listener, opt_capt, opt_context) {
            wrapper.listen(src, listener, opt_capt, opt_context);
        }

        /**
         * 移除通过listenWithWrapper()添加的事件监听.
         * @param {EventTarget} src 监听对象.
         * @param {EventWrapper} wrapper Event wrapper to use.
         * @param {Function|Object} listener The listener function to remove.
         * @param {boolean=} opt_capt 是否捕获模式.
         * @param {Object=} opt_context 函数上下文.
         */
        function unlistenWithWrapper(src, wrapper, listener, opt_capt, opt_context) {
            wrapper.unlisten(src, listener, opt_capt, opt_context);
        }

        /**
         * 移除一个对象上的所有事件句柄. 也可传入可选的type参数.
         * @param {Object=} opt_obj Object to remove listeners from. Not
         *     specifying opt_obj is now DEPRECATED (it used to remove all
         *     registered listeners).
         * @param {string=} opt_type Type of event to, default is all types.
         * @return {number} 共移除了多少事件.
         */
        function removeAll(opt_obj, opt_type) {
            var count = 0;
            var noObj = util.isNull(opt_obj);
            var noType = util.isNull(opt_type);

            if (!noObj) {
                if (opt_obj && (opt_obj instanceof EvtTarget)) {
                    return opt_obj.removeAllListeners(opt_type);
                }
                var srcUid = util.getUid(/** @type {Object} */ (opt_obj));
                if (sources_[srcUid]) {
                    var sourcesArray = sources_[srcUid];
                    for (var i = sourcesArray.length - 1; i >= 0; i--) {
                        var listener = sourcesArray[i];
                        if (noType || opt_type === listener.type) {
                            unlistenByKey(listener);
                            count++;
                        }
                    }
                }
            } else {
                object.forEach(listeners_, function(listener) {
                    unlistenByKey(listener);
                    count++;
                });
            }

            return count;
        }

        /**
         * 移除所有通过事件系统注册的dom事件
         * @return {number} 移除的函数数目
         */
        function removeAllNativeListeners() {
            var count = 0;
            // listeners_ 里面的所有句柄都是原生对象的句柄,
            // 自定义监听对象的句柄不会保存在listeners_.
            object.forEach(listeners_, function(listener) {
                unlistenByKey(listener);
                count++;
            });
            return count;
        }

        return {
            listen: listen,
            unlisten: unlisten,
            getListeners: getListeners,
            getListener: getListener,
            hasListener: hasListener,
            listenOnce: listenOnce,
            unlistenByKey: unlistenByKey,
            fireListeners: fireListeners,
            fireListener: fireListener,
            listenWithWrapper: listenWithWrapper,
            unlistenWithWrapper: unlistenWithWrapper,
            removeAll: removeAll,
            removeAllNativeListeners: removeAllNativeListeners
        };
    }
);