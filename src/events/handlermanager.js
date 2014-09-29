/**
 * @fileoverview 这个类可以方便的处理绑定多个事件. 可以通过dispose方法清除所有这个对象的句柄.
 * @modified Leo.Zhang
 * @email zmike86@126.com
 *
 * 用法:
 * <pre>
 * function Something() {
 *   HandlerManager.call(this);
 *
 *   ... set up object ...
 *
 *   // Add event listeners
 *   this.listen(this.starEl, EventType.CLICK, this.handleStar);
 *   this.listen(this.headerEl, EventType.CLICK, this.expand);
 *   this.listen(this.collapseEl, EventType.CLICK, this.collapse);
 *   this.listen(this.infoEl, EventType.MOUSEOVER, this.showHover);
 *   this.listen(this.infoEl, EventType.MOUSEOUT, this.hideHover);
 * }
 * inherits(Something, HandlerManager);
 *
 * Something.prototype.disposeInternal = function() {
 *   Something.superClass_.disposeInternal.call(this);
 *   dom.removeNode(this.container);
 * };
 *
 *
 * // Then elsewhere:
 *
 * var activeSomething = null;
 * function openSomething() {
 *   activeSomething = new Something();
 * }
 *
 * function closeSomething() {
 *   if (activeSomething) {
 *     activeSomething.dispose();  // Remove event listeners
 *     activeSomething = null;
 *   }
 * }
 * </pre>
 */

define('Sogou.Events.HandlerManager',
    [
        'Sogou.Util',
        'Sogou.Disposable',
        'Sogou.Events.Util',
        'Sogou.Object'
    ],
    function(util, Disposable, EventUtil, object) {

        'use strict';

        /**
         * Utility array used to unify the cases of listening for an array of types
         * and listening for a single event, without using recursion or allocating
         * an array each time.
         * @type {Array.<string>}
         * @private
         */
        var typeArray_ = [];

        /**
         * 它的实例有能力处理多个事件的绑定.
         * 允许快捷方式listen和一步清除所有事件绑定.
         * @param {Object=} opt_context 函数上下文
         * @constructor
         * @extends {Disposable}
         */
        function HandlerManager(opt_context) {
            Disposable.call(this);
            this.context_ = opt_context;
            /**
             * hash结构存储添加的句柄. key是listener的key,value是listener本身
             * @type {!Object.<!Listener.Key>}
             * @private
             */
            this.keys_ = {};
        }
        util.inherits(HandlerManager, Disposable);

        // 原型方法
        util.mixin(HandlerManager.prototype, {
            /**
             * 添加句柄处理器函数. 没提供函数默认用HandlerManager's handleEvent方法.
             * @param {EventTarget} src 事件源
             * @param {string|Array.<string>} type 事件类型
             * @param {Function|Object=} opt_fn 处理器函数或者一个含有handleEvent方法的对象.
             * @param {boolean=} opt_capture 是否捕获模式.
             * @param {Object=} opt_context 函数上下文
             * @return {HandlerManager} 返回自身可以链式调用
             */
            listen: function(src, type, opt_fn, opt_capture, opt_context) {
                if (!util.isArray(type)) {
                    typeArray_[0] = /** @type {string} */(type);
                    type = typeArray_;
                }
                for (var i = 0; i < type.length; i++) {
                    var listenerObj = EventUtil.listen(src, type[i], opt_fn || this,
                        opt_capture || false, opt_context || this.context_ || this);

                    if (util.DEBUG && !listenerObj) {
                        // Some tests mock events.listen, thus ensuring that
                        // they are never testing the real thing anyway, hence this is safe
                        // (except that #getListenerCount() will return the wrong value).
                        return this;
                    }

                    var key = listenerObj.key;
                    this.keys_[key] = listenerObj;
                }

                return this;
            },
            /**
             * 添加一次性事件监听.
             * @param {EventTarget} src 事件源
             * @param {string|Array.<string>} type 事件类型
             * @param {Function|Object=} opt_fn Optional 处理器函数或者一个含有handleEvent方法的对象.
             * @param {boolean=} opt_capture 是否捕获模式.
             * @param {Object=} opt_context 函数上下文
             * @return {HandlerManager} 返回自身可以链式调用
             */
            listenOnce: function(src, type, opt_fn, opt_capture, opt_context) {
                if (util.isArray(type)) {
                    for (var i = 0; i < type.length; i++) {
                        this.listenOnce(src, type[i], opt_fn, opt_capture, opt_context);
                    }
                } else {
                    var listenerObj = EventUtil.listenOnce(src, type, opt_fn || this, opt_capture,
                        opt_context || this.context_ || this);
                    var key = listenerObj.key;
                    this.keys_[key] = listenerObj;
                }

                return this;
            },
            /**
             * @return {number} 绑定事件句柄数量
             */
            getListenerCount: function() {
                var count = 0;
                for (var key in this.keys_) {
                    if (Object.prototype.hasOwnProperty.call(this.keys_, key)) {
                        count++;
                    }
                }
                return count;
            },
            /**
             * 移除处理器.
             * @param {EventTarget} src 事件源
             * @param {string|Array.<string>} type 事件类型
             * @param {Function|Object=} opt_fn 处理器函数或者一个含有handleEvent方法的对象.
             * @param {boolean=} opt_capture 是否捕获模式.
             * @param {Object=} opt_context 函数上下文
             * @return {HandlerManager} 返回自身可以链式调用
             */
            unlisten: function(src, type, opt_fn, opt_capture, opt_context) {
                if (util.isArray(type)) {
                    for (var i = 0; i < type.length; i++) {
                        this.unlisten(src, type[i], opt_fn, opt_capture, opt_context);
                    }
                } else {
                    var listener = EventUtil.getListener(src, type, opt_fn || this,
                        opt_capture, opt_context || this.context_ || this);

                    if (listener) {
                        EventUtil.unlistenByKey(listener);
                        delete this.keys_[listener.key];
                    }
                }

                return this;
            },
            /**
             * 移除所有句柄
             */
            removeAll: function() {
                object.forEach(this.keys_, EventUtil.unlistenByKey);
                this.keys_ = {};
            },
            /**
             * 析构当前对象
             * @override
             * @protected
             */
            disposeInternal: function() {
                HandlerManager.superClass_.disposeInternal.call(this);
                this.removeAll();
            },
            /**
             * Default event handler
             * @param {Event} e Event object.
             */
            handleEvent: function(e) {
                throw Error('HandlerManager.handleEvent not implemented');
            },
            /**
             * 用一个特定的EventWrapper对象在Node节点或者EventTarget实例上添加事件监听.
             * @param {EventTarget} src The node to listen to events on.
             * @param {EventWrapper} wrapper Event wrapper to use.
             * @param {Function|Object} listener 处理器函数或者一个含有handleEvent方法的对象.
             * @param {boolean=} opt_capt 是否在捕获阶段触发(defaults to false).
             * @param {Object=} opt_context 函数上下文
             * @return {HandlerManager} 返回自身可以链式调用
             */
            listenWithWrapper: function(src, wrapper, listener, opt_capt, opt_context) {
                wrapper.listen(src, listener, opt_capt, opt_context || this.context_ || this,
                    this);
                return this;
            },
            /**
             * 移除通过listenWithWrapper()添加的事件监听.
             * @param {EventTarget} src The target to stop listening to events on.
             * @param {EventWrapper} wrapper Event wrapper to use.
             * @param {Function|Object} listener The listener function to remove.
             * @param {boolean=} opt_capt 是否捕获模式.
             * @param {Object=} opt_context 函数上下文
             * @return {HandlerManager} 返回自身可以链式调用
             */
            unlistenWithWrapper: function(src, wrapper, listener, opt_capt, opt_context) {
                wrapper.unlisten(src, listener, opt_capt, opt_context || this.context_ || this, this);
                return this;
            }
        });

        return HandlerManager;
    }
);