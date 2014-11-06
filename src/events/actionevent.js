/**
 * @fileoverview ActionEvent事件对象
 * @author Leo.Zhang
 * @email zmike86@gmail.com
 */

define('@events.actionEvent',
    [
        '@util',
        '@events.browserEvent',
        '@events.actionEventType'
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