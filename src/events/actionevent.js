/**
 * @fileoverview ActionEvent事件对象
 * @modified Leo.Zhang
 * @email zmike86@gmail.com
 */

define('Sogou.Events.ActionEvent',
    [
        'Sogou.Util',
        'Sogou.Events.BrowserEvent',
        'Sogou.Events.ActionEventType'
    ],
    function(util, BrowserEvent, ActionEventType) {

        'use strict';

        /**
         * 相对于ActionEventType.ACTION事件.
         * @param {!BrowserEvent} browserEvent Browser event object.
         * @constructor
         * @extends {BrowserEvent}
         */
        var ActionEvent = function(browserEvent) {
            BrowserEvent.call(this, browserEvent.getBrowserEvent());
            this.type = ActionEventType.ACTION;
        };
        util.inherits(ActionEvent, BrowserEvent);

        return ActionEvent;
    }
);