/** Oslo JavaScript Framework. */
define("Sogou.Events.BeforeActionEvent",["Sogou.Util","Sogou.Events.BrowserEvent","Sogou.Events.ActionEventType"],function(a,b,c){"use strict";var d=function(a){b.call(this,a.getBrowserEvent()),this.type=c.BEFOREACTION};return a.inherits(d,b),d});