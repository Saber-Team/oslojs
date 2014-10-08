/** 
 * Sogou JavaScript Library 
 * 2014-10-09 build 
 */
define("Sogou.History.Event",["Sogou.Util","Sogou.Events.EventBase","Sogou.History.EventType"],function(a,b,c){"use strict";function d(a,d){b.call(this,c.NAVIGATE),this.token=a,this.isNavigation=d}return a.inherits(d,b),d});