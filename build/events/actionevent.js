/** 
 * Sogou JavaScript Library 
 * 2014-10-11 build 
 */
define("Sogou.Events.ActionEvent",["Sogou.Util","Sogou.Events.BrowserEvent","Sogou.Events.ActionEventType"],function(a,b,c){"use strict";var d=function(a){b.call(this,a.getBrowserEvent()),this.type=c.ACTION};return a.inherits(d,b),d});