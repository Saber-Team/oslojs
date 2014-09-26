/**
 * @fileoverview mousewheel event
 * @modified Leo.Zhang
 * @email zmike86@gmail.com
 */

sogou('Sogou.Events.MouseWheelEvent',
    [
        'Sogou.Util',
        'Sogou.Events.BrowserEvent',
        'Sogou.Events.MouseWheelEventType'
    ],
    function(util, BrowserEvent, EventType) {

        'use strict';

        /**
         * mousewheel事件的基类. 和MouseWheelHandler一起使用.
         * @param {number} detail 滚动行数.
         * @param {Event} browserEvent 浏览器事件对象.
         * @param {number} deltaX X轴方向滚动距离(rows).
         * @param {number} deltaY Y轴方向滚动距离(rows).
         * @constructor
         * @extends {BrowserEvent}
         */
        var MouseWheelEvent = function(detail, browserEvent, deltaX, deltaY) {
            BrowserEvent.call(this, browserEvent);
            this.type = EventType.MOUSEWHEEL;
            /**
             * 滚动行数
             * @type {number}
             * 注意: 尽量用deltaX和deltaY instead.
             */
            this.detail = detail;
            /**
             * X轴方向滚动行数.
             * 注意不是所有浏览器都能区分横,纵向滚动事件,对于不支持的浏览器deltaX永远是0,
             * 即使用户滚了滚轮或者用trackpad做的滑动.
             * 目前支持的浏览器有: Webkit Firefox 3.1+
             * @type {number}
             */
            this.deltaX = deltaX;
            /**
             * Y轴方向滚动行数.
             * @type {number}
             */
            this.deltaY = deltaY;
        };
        util.inherits(MouseWheelEvent, BrowserEvent);

        return MouseWheelEvent;
    }
);