/**
 * @fileoverview 拖拽事件.
 * @modified Leo.Zhang
 * @email zmike86@gmail.com
 */

define('Sogou.FX.DraggerEvent',
    ['Sogou.Util', 'Sogou.Events.EventBase'],
    function(util, EventBase) {

        'use strict';

        /**
         * 拖拽事件对象
         * @param {string} type 事件类型.
         * @param {Dragger} dragobj Dragger实例.
         * @param {number} clientX X-coordinate relative to the viewport.
         * @param {number} clientY Y-coordinate relative to the viewport.
         * @param {BrowserEvent} browserEvent The closure object
         *   representing the browser event that caused this drag event.
         * @param {number=} opt_actX Optional actual x for drag if it has been limited.
         * @param {number=} opt_actY Optional actual y for drag if it has been limited.
         * @param {boolean=} opt_dragCanceled Whether the drag has been canceled.
         * @constructor
         * @extends {EventBase}
         */
        var DragEvent = function(type, dragobj, clientX, clientY, browserEvent,
                                 opt_actX, opt_actY, opt_dragCanceled) {
            EventBase.call(this, type);

            /**
             * X-coordinate relative to the viewport
             * @type {number}
             */
            this.clientX = clientX;

            /**
             * Y-coordinate relative to the viewport
             * @type {number}
             */
            this.clientY = clientY;

            /**
             * The closure object representing the browser event that caused this drag
             * event.
             * @type {BrowserEvent}
             */
            this.browserEvent = browserEvent;

            /**
             * The real x-position of the drag if it has been limited
             * @type {number}
             */
            this.left = util.isDef(opt_actX) ? opt_actX : dragobj.deltaX;

            /**
             * The real y-position of the drag if it has been limited
             * @type {number}
             */
            this.top = util.isDef(opt_actY) ? opt_actY : dragobj.deltaY;

            /**
             * Reference to the drag object for this event
             * @type {goog.fx.Dragger}
             */
            this.dragger = dragobj;

            /**
             * Whether drag was canceled with this event. Used to differentiate between
             * a legitimate drag END that can result in an action and a drag END which is
             * a result of a drag cancelation. For now it can happen 1) with drag END
             * event on FireFox when user drags the mouse out of the window, 2) with
             * drag END event on IE7 which is generated on MOUSEMOVE event when user
             * moves the mouse into the document after the mouse button has been
             * released, 3) when TOUCHCANCEL is raised instead of TOUCHEND (on touch
             * events).
             * @type {boolean}
             */
            this.dragCanceled = !!opt_dragCanceled;
        };

        util.inherits(DragEvent, EventBase);

        return DragEvent;
    }
);
