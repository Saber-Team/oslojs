/**
 * @fileoverview 自定义可分发事件的对象基类,是整个框架事件系统的基础.
 * @modified Leo.Zhang
 * @email zmike86@gmail.com
 */

sogou('Sogou.Events.EventTarget',
    [
        'Sogou.Util',
        'Sogou.Disposable',
        'Sogou.Array',
        'Sogou.Events.EventBase',
        'Sogou.Events.ListenerMap',
        'Sogou.Object'
    ],
    function(util, Disposable, array, EventBase, ListenerMap, object) {

        'use strict';

        /**
         * 允许最大有多少个祖先对象. 循环的时候不能超过此界限.
         * @const {number}
         * @private
         */
        var MAX_ANCESTORS_ = 100;

        /**
         * EventTarget继承了Disposable.
         * 拥有W3C的EventTarget-like特性(捕获/冒泡机制, 停止冒泡和组织默认行为等)
         * 可以继承这个类,使得你的类也变成可监听的listenable
         *
         * 除非冒泡停止, 否则EventTarget分发的事件会向上冒泡到父级对象.
         * 该对象通过{@code getParentEventTarget}获得.
         * 设置冒泡父级对象用{@code setParentEventTarget}.
         * 如果子类想让父级对象只读的话可以重写setter, 比如抛出个异常.
         *
         * 用法:
         * <pre>
         *   var source = new EventTarget();
         *   function handleEvent(e) {
         *       alert('Type: ' + e.type + '; Target: ' + e.target);
         *   }
         *   source.listen('foo', handleEvent);
         *   // Or: Events.Util.listen(source, 'foo', handleEvent);
         *   ...
         *   source.dispatchEvent('foo');  // will call handleEvent
         *   ...
         *   source.unlisten('foo', handleEvent);
         *   // Or: Events.Util.unlisten(source, 'foo', handleEvent);
         * </pre>
         *
         * @constructor
         * @extends {Disposable}
         */
        function EventTarget() {
            Disposable.call(this);
            /**
             * 事件类型-句柄数组的hash表.
             * @private {!ListenerMap}
             */
            this.eventTargetListeners_ = new ListenerMap(this);
            /**
             * 当混入其他对象时这个属性可用于寻找原始的event.target对象.
             * @private {!Object}
             */
            this.actualEventTarget_ = this;
        }
        util.inherits(EventTarget, Disposable);

        util.mixin(EventTarget.prototype, {
            /**
             * 一个标记. 构造器已经实现Listenable接口, 我们可以在运行时动态查找相应标记.
             * 此构造函数的实例是可被监听的.
             */
            isListenable: true,
            /**
             * 冒泡阶段的父级对象.
             * @type {EventTarget}
             * @private
             */
            parentEventTarget_: null,
            /**
             * 返回冒泡时用到的逻辑父组件.
             * @return {EventTarget} 逻辑父组件或者null.
             * @override
             */
            getParentEventTarget: function() {
                return this.parentEventTarget_;
            },
            /**
             * 设置父节点,用于捕获冒泡
             * @param {EventTarget} parent
             */
            setParentEventTarget: function(parent) {
                this.parentEventTarget_ = parent;
            },
            /** @override */
            dispatchEvent: function(e) {
                var ancestorsTree,
                    ancestor = this.getParentEventTarget();
                if (ancestor) {
                    ancestorsTree = [];
                    var ancestorCount = 1;
                    for (; ancestor; ancestor = ancestor.getParentEventTarget()) {
                        ancestorsTree.push(ancestor);
                        if (++ancestorCount >= MAX_ANCESTORS_) {
                            // todo
                            throw '';
                        }
                    }
                }
                // 这步是真正的分发事件, 前面只是构建了ancestorsTree
                return EventTarget.dispatchEventInternal_(
                    this.actualEventTarget_, e, ancestorsTree);
            },
            /**
             * 从当前对象移除所有句柄. EventTarget的子类可能需要重写此方法解除所有dom绑定
             * 和额外的句柄.
             * @override
             */
            disposeInternal: function() {
                EventTarget.superClass_.disposeInternal.call(this);
                this.removeAllListeners();
                this.parentEventTarget_ = null;
            },
            /** @override */
            listen: function(type, listener, opt_useCapture, opt_listenerScope) {
                return this.eventTargetListeners_.add(
                    type, listener, false /* callOnce */, opt_useCapture, opt_listenerScope);
            },
            /** @override */
            listenOnce: function(type, listener, opt_useCapture, opt_listenerScope) {
                return this.eventTargetListeners_.add(
                    type, listener, true /* callOnce */, opt_useCapture, opt_listenerScope);
            },
            /** @override */
            unlisten: function(type, listener, opt_useCapture, opt_listenerScope) {
                return this.eventTargetListeners_.remove(
                    type, listener, opt_useCapture, opt_listenerScope);
            },
            /** @override */
            unlistenByKey: function(key) {
                return this.eventTargetListeners_.removeByKey(key);
            },
            /** @override */
            removeAllListeners: function(opt_type) {
                // TODO: 这步判断可以移除.
                if (!this.eventTargetListeners_)
                    return 0;
                return this.eventTargetListeners_.removeAll(opt_type);
            },
            /** @override */
            fireListeners: function(type, capture, eventObject) {
                // TODO: 这段代码在listenerArray为空的情况下不会创建数组.
                // 这些优化可能微不足道, 可直接调用getListeners(type, capture), 简单些.
                var listenerArray = this.eventTargetListeners_.listeners[type];
                if (!listenerArray) {
                    return true;
                }
                listenerArray = array.toArray(listenerArray);

                var rv = true;
                for (var i = 0; i < listenerArray.length; ++i) {
                    var listener = listenerArray[i];
                    // listener被标记为removed.
                    if (listener && !listener.removed && listener.capture === capture) {
                        var listenerFn = listener.listener;
                        var listenerHandler = listener.handler || listener.src;

                        if (listener.callOnce) {
                            this.unlistenByKey(listener);
                        }
                        rv = listenerFn.call(listenerHandler, eventObject) !== false && rv;
                    }
                }

                return rv && eventObject.returnValue_ !== false;
            },
            /** @override */
            getListeners: function(type, capture) {
                return this.eventTargetListeners_.getListeners(type, capture);
            },
            /** @override */
            getListener: function(type, listener, capture, opt_listenerScope) {
                return this.eventTargetListeners_.getListener(
                    type, listener, capture, opt_listenerScope);
            },
            /** @override */
            hasListener: function(opt_type, opt_capture) {
                return this.eventTargetListeners_.hasListener(opt_type, opt_capture);
            }
        });

        /**
         * 在祖先树上依次触发事件.
         * @param {!Object} target 分发事件的源.
         * @param {EventBase|Object|string} e 事件对象.
         * @param {Array.<EventTarget>=} opt_ancestorsTree 祖先事件源保存在一个数组里, 顺序由近至远. 无祖先就是Null.
         * @return {boolean} 任何一个句柄里调用了preventDefault(或者任何句柄返回false)结果就是false.
         * @private
         */
        EventTarget.dispatchEventInternal_ = function(target, e, opt_ancestorsTree) {
            var type = e.type || /** @type {string} */ (e);
            var i;

            // 如果接收的是个字符串, 基于EventBase创建事件对象, 保证preventDefault和stopPropagation
            // 两个方法可用.
            if (util.isString(e)) {
                e = new EventBase(e, target);
            } else if (!(e instanceof EventBase)) {
                var oldEvent = e;
                e = new EventBase(type, target);
                object.extend(e, oldEvent);
            } else {
                e.target = e.target || target;
            }

            var rv = true, currentTarget;

            // 祖先树触发捕获阶段.
            if (opt_ancestorsTree) {
                for (i = opt_ancestorsTree.length - 1; !e.propagationStopped_ && i >= 0;
                     i--) {
                    currentTarget = e.currentTarget = opt_ancestorsTree[i];
                    rv = currentTarget.fireListeners(type, true, e) && rv;
                }
            }

            // 当前对象触发.
            if (!e.propagationStopped_) {
                currentTarget = e.currentTarget = target;
                rv = currentTarget.fireListeners(type, true, e) && rv;
                if (!e.propagationStopped_) {
                    rv = currentTarget.fireListeners(type, false, e) && rv;
                }
            }

            // 祖先树触发冒泡阶段.
            if (opt_ancestorsTree) {
                for (i = 0; !e.propagationStopped_ && i < opt_ancestorsTree.length; i++) {
                    currentTarget = e.currentTarget = opt_ancestorsTree[i];
                    rv = currentTarget.fireListeners(type, false, e) && rv;
                }
            }

            return rv;
        };

        return EventTarget;
    }
);