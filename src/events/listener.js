/**
 * @fileoverview 事件的监听函数, 通常称作句柄对象, 对它封装成类
 * @modified Leo.Zhang
 * @email zmike86@gmail.com
 */

sogou('Sogou.Events.Listener', [], function() {

    'use strict';

    function reserveKey() {
        return ++reserveKey.counter_;
    }

    reserveKey.counter_ = 0;

    /**
     * 封装存储句柄信息的类
     * @param {!Function} listener 函数.
     * @param {Function} proxy Wrapper for the listener that patches the event.
     * @param {EventTarget} src 事件源.
     * @param {string} type 事件类型.
     * @param {boolean} capture 捕获还是冒泡阶段.
     * @param {Object=} opt_context 回调函数上下文.
     * @constructor
     */
    function Listener(listener, proxy, src, type, capture, opt_context) {
        /**
         * Callback function.
         * @type {Function}
         */
        this.listener = listener;
        /**
         * 原始句柄的一个封装. 仅对原生的浏览器事件有用
         * (用于模拟捕获阶段和为事件对象打补丁).
         * @type {Function}
         */
        this.proxy = proxy;
        /**
         * Object or node that callback is listening to
         * @type {EventTarget}
         */
        this.src = src;
        /**
         * The event type.
         * @const {string}
         */
        this.type = type;
        /**
         * Whether the listener is being called in the capture or bubble phase
         * @const {boolean}
         */
        this.capture = !!capture;
        /**
         * 句柄执行时的上下文.
         * @type {Object|undefined}
         */
        this.handler = opt_context;
        /**
         * 每个句柄对象都有一个key.
         * @const {number}
         * @override
         */
        this.key = reserveKey();
        /**
         * 调用过后是否删除.
         * @type {boolean}
         */
        this.callOnce = false;
        /**
         * 是否已经被删除.
         * @type {boolean}
         */
        this.removed = false;
    }

    /**
     * Marks this listener as removed. This also remove references held by
     * this listener object (such as listener and event source).
     */
    Listener.prototype.markAsRemoved = function() {
        this.removed = true;
        this.listener = null;
        this.proxy = null;
        this.src = null;
        this.handler = null;
    };

    return Listener;

});