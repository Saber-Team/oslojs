/**
 * @fileoverview mousewheel event
 * @modified Leo.Zhang
 * @email zmike86@gmail.com
 */

;sogou('Sogou.Events.MouseWheelEvent',
    [
        'Sogou.Util',
        'Sogou.Events.BrowserEvent',
        'Sogou.Events.MouseWheelEventType'
    ],
    function(util, BrowserEvent, EventType) {

        'use strict';

        /**
         * A base class for mouse wheel events. This is used with the
         * MouseWheelHandler.
         *
         * @param {number} detail The number of rows the user scrolled.
         * @param {Event} browserEvent Browser event object.
         * @param {number} deltaX The number of rows the user scrolled in the X
         *     direction.
         * @param {number} deltaY The number of rows the user scrolled in the Y
         *     direction.
         * @constructor
         * @extends {BrowserEvent}
         */
        var MouseWheelEvent = function(detail, browserEvent, deltaX, deltaY) {
            BrowserEvent.call(this, browserEvent);
            this.type = EventType.MOUSEWHEEL;
            /**
             * The number of lines the user scrolled
             * @type {number}
             * NOTE: Informally deprecated. Use deltaX and deltaY instead, they provide
             * more information.
             */
            this.detail = detail;
            /**
             * The number of "lines" scrolled in the X direction.
             *
             * Note that not all browsers provide enough information to distinguish
             * horizontal and vertical scroll events, so for these unsupported browsers,
             * we will always have a deltaX of 0, even if the user scrolled their mouse
             * wheel or trackpad sideways.
             *
             * Currently supported browsers are Webkit and Firefox 3.1 or later.
             *
             * @type {number}
             */
            this.deltaX = deltaX;
            /**
             * The number of lines scrolled in the Y direction.
             * @type {number}
             */
            this.deltaY = deltaY;
        };
        util.inherits(MouseWheelEvent, BrowserEvent);

        return MouseWheelEvent;
    }
);