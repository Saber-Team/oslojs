/**
 * @fileoverview BeforeActionEvent事件对象
 * @author Leo.Zhang
 * @email zmike86@gmail.com
 */

define([
    '../util/util',
    './browserevent',
    './actioneventtype'
  ],
  function(util, BrowserEvent, ActionEventType) {

    'use strict';

    /**
     * ActionEventType.BEFOREACTION的事件对象类.
     * 这种类型的事件使得程序有可以保留键盘的focus状态用于日后恢复.
     * @param {!BrowserEvent} browserEvent 浏览器事件对象.
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