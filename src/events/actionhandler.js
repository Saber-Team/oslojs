/**
 * @fileoverview 这个模块对于点击和键盘事件做了统一的门面. 页面逻辑层代码可以更容易组织
 *     处理器代码只监听一个统一的事件.
 * 如果有如下代码-:
 * <code>
 *     this.eventmanager.listen(el, CLICK, this.onClick_);
 * <code>
 *
 * 可以替换为新的方式:
 * <code>
 *     this.eventmanager.listen(new ActionHandler(el), ACTION, this.onAction_);
 *<code>
 *
 * @modified Leo.Zhang
 * @email zmike86@gmail.com
 */

sogou('Sogou.Events.ActionHandler',
    [
        'Sogou.Util',
        'Sogou.Events.Util',
        'Sogou.Events.BrowserEvent',
        'Sogou.Events.EventTarget',
        'Sogou.Events.EventType',
        'Sogou.Events.KeyCodes',
        'Sogou.UA.Util',
        'Sogou.Events.ActionEvent',
        'Sogou.Events.BeforeActionEvent'
    ],
    function(util, EventsUtil, BrowserEvent, EventTarget, EventType, KeyCodes, ua,
             ActionEvent, BeforeActionEvent) {

        'use strict';

        /**
         * 一个对元素进行action事件监听的句柄类.
         * @param {Element|Document} element 要监听的元素.
         * @constructor
         * @extends {EventTarget}
         */
        var ActionHandler = function(element) {
            EventTarget.call(this);
            /**
             * 内部保存元素引用.
             * @type {Element|Document}
             * @private
             */
            this.element_ = element;

            EventsUtil.listen(element, ActionHandler.KEY_EVENT_TYPE_, this.handleKeyDown_, false, this);
            EventsUtil.listen(element, EventType.CLICK, this.handleClick_, false, this);
        };
        util.inherits(ActionHandler, EventTarget);

        /**
         * 要监听的键盘事件.
         * @type {string}
         * @private
         */
        ActionHandler.KEY_EVENT_TYPE_ = ua.isGECKO ? EventType.KEYPRESS : EventType.KEYDOWN;

        /**
         * 键盘事件处理器.
         * @param {!BrowserEvent} e The key press event.
         * @private
         */
        ActionHandler.prototype.handleKeyDown_ = function(e) {
            if (e.keyCode === KeyCodes.ENTER ||
                ua.isWEBKIT && e.keyCode === KeyCodes.MAC_ENTER) {
                this.dispatchEvents_(e);
            }
        };

        /**
         * 鼠标事件处理器.
         * @param {!BrowserEvent} e The click event.
         * @private
         */
        ActionHandler.prototype.handleClick_ = function(e) {
            this.dispatchEvents_(e);
        };

        /**
         * 分发BeforeAction和Action事件.
         * @param {!BrowserEvent} e The event causing dispatches.
         * @private
         */
        ActionHandler.prototype.dispatchEvents_ = function(e) {
            var beforeActionEvent = new BeforeActionEvent(e);

            // 应用层程序可以在beforeactionevent处理器里添加逻辑返回false阻止actionevent的发生.
            // For example, Gmail uses this event to restore keyboard focus
            if (!this.dispatchEvent(beforeActionEvent)) {
                return;
            }

            // 对原始事件进行封装
            var actionEvent = new ActionEvent(e);
            try {
                this.dispatchEvent(actionEvent);
            } finally {
                // Stop propagating the event
                e.stopPropagation();
            }
        };

        /** @override */
        ActionHandler.prototype.disposeInternal = function() {
            ActionHandler.superClass_.disposeInternal.call(this);
            EventsUtil.unlisten(this.element_, ActionHandler.KEY_EVENT_TYPE_,
                this.handleKeyDown_, false, this);
            EventsUtil.unlisten(this.element_, EventType.CLICK, this.handleClick_, false, this);
            delete this.element_;
        };

        return ActionHandler;
    }
);