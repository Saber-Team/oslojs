/**
 * @fileoverview 拖拽事件.
 * @author Leo.Zhang
 * @email zmike86@gmail.com
 */

define('@fx.draggerEvent', ['@util', '@events.eventBase'], function(util, EventBase) {

    'use strict';

    /**
     * 拖拽事件对象
     * @param {string} type 事件类型.
     * @param {Dragger} dragobj Dragger实例.
     * @param {number} clientX
     * @param {number} clientY
     * @param {BrowserEvent} browserEvent 标准化的浏览器事件.
     * @param {number=} opt_actX limited x.
     * @param {number=} opt_actY limited y.
     * @param {boolean=} opt_dragCanceled 是否被取消了.
     * @constructor
     * @extends {EventBase}
     */
    var DragEvent = function(type, dragobj, clientX, clientY, browserEvent,
                             opt_actX, opt_actY, opt_dragCanceled) {
        EventBase.call(this, type);

        /**
         * 视口x坐标
         * @type {number}
         */
        this.clientX = clientX;

        /**
         * 视口y坐标
         * @type {number}
         */
        this.clientY = clientY;

        /**
         * 标准化的浏览器事件.
         * @type {BrowserEvent}
         */
        this.browserEvent = browserEvent;

        /**
         * 被限制范围后真实的x坐标
         * @type {number}
         */
        this.left = util.isDef(opt_actX) ? opt_actX : dragobj.deltaX;

        /**
         * 被限制范围后真实的y坐标
         * @type {number}
         */
        this.top = util.isDef(opt_actY) ? opt_actY : dragobj.deltaY;

        /**
         * 相关的dragger实例
         * @type {Dragger}
         */
        this.dragger = dragobj;

        /**
         * 分发事件时拖拽是否被取消了. 这个参数用于区分正常的drag end还是drag cancelation
         * 引发的drag end. 以下三种情况会发生
         * 1) with drag END
         * event on FireFox when user drags the mouse out of the window,
         * 2) with
         * drag END event on IE7 which is generated on MOUSEMOVE event when user
         * moves the mouse into the document after the mouse button has been
         * released,
         * 3) 触发了TOUCHCANCEL 而不是 TOUCHEND (on touch events).
         * @type {boolean}
         */
        this.dragCanceled = !!opt_dragCanceled;
    };

    util.inherits(DragEvent, EventBase);

    return DragEvent;
});
