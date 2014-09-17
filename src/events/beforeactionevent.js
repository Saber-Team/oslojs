/**
 * @fileoverview BeforeActionEvent事件对象
 * @modified Leo.Zhang
 * @email zmike86@gmail.com
 */

sogou('Sogou.Events.BeforeActionEvent',
    [
        'Sogou.Util',
        'Sogou.Events.BrowserEvent',
        'Sogou.Events.ActionEventType'
    ],
    function(util, BrowserEvent, ActionEventType) {

        'use strict';

        /**
         * ActionEventType.BEFOREACTION的事件对象类.
         * BEFOREACTION gives a chance to the application so the keyboard focus
         * can be restored back, if required.
         * @param {!BrowserEvent} browserEvent Browser event object.
         * @constructor
         * @extends {BrowserEvent}
         */
        var BeforeActionEvent = function(browserEvent) {
            BrowserEvent.call(this, browserEvent.getBrowserEvent());
            this.type = ActionEventType.BEFOREACTION;
        };
        util.inherits(BeforeActionEvent, BrowserEvent);

        return BeforeActionEvent;
    }
);