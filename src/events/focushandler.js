/**
 * @fileoverview 这个模块提供的类可以在某个元素上监听它子孙元素的focusin和focusout事件.
 * "focus"和"blur"事件由于不能冒泡(或者表现不一致), 因此必须在元素本身上添加监听.
 * 本模块提供的方法可以只在组父级元素上绑定处理器函数, 并且在子孙元素焦点状态改变时收到通知.
 * @author Leo.Zhang
 * @email zmike86@gmail.com
 * @see ../../demos/focushandler.html
 */

define('@events.focusHandler',
    [
        '@util',
        '@events.util',
        '@events.browserEvent',
        '@events.eventTarget',
        '@ua.util'
    ],
    function(util, EventsUtil, BrowserEvent, EventTarget, ua) {

        'use strict';

        /**
         * 当元素的子孙获得/失去焦点时触发的处理器函数.
         * @param {Element|Document} element 监听元素.
         * @constructor
         * @extends {EventTarget}
         */
        var FocusHandler = function(element) {
            EventTarget.call(this);
            /**
             * 监听焦点的元素.
             * @type {Element|Document}
             * @private
             */
            this.element_ = element;
            // IE中用focusin/focusout,其他浏览器使用事件捕获特性for focus/blur
            var typeIn = ua.isIE ? 'focusin' : 'focus';
            var typeOut = ua.isIE ? 'focusout' : 'blur';
            /**
             * 保存处理器引用.
             * @private
             * @type {Listener}
             */
            this.listenKeyIn_ = EventsUtil.listen(this.element_, typeIn, this, !ua.isIE);
            /**
             * 保存处理器引用.
             * @private
             * @type {Listener}
             */
            this.listenKeyOut_ = EventsUtil.listen(this.element_, typeOut, this, !ua.isIE);
        };
        util.inherits(FocusHandler, EventTarget);

        /**
         * 触发的事件类型
         * @enum {string}
         */
        FocusHandler.EventType = {
            FOCUSIN: 'focusin',
            FOCUSOUT: 'focusout'
        };

        /**
         * 这个函数作为默认事件处理器会分发一个新的事件对象.
         * @param {BrowserEvent} e  The underlying browser event.
         */
        FocusHandler.prototype.handleEvent = function(e) {
            var be = e.getBrowserEvent();
            var event = new BrowserEvent(be);
            event.type = (e.type === 'focusin' || e.type === 'focus') ?
                FocusHandler.EventType.FOCUSIN : FocusHandler.EventType.FOCUSOUT;
            this.dispatchEvent(event);
        };

        /** @override */
        FocusHandler.prototype.disposeInternal = function() {
            FocusHandler.superClass_.disposeInternal.call(this);
            EventsUtil.unlistenByKey(this.listenKeyIn_);
            EventsUtil.unlistenByKey(this.listenKeyOut_);
            delete this.element_;
        };

        return FocusHandler;
    }
);