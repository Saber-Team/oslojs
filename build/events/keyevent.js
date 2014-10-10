/** 
 * Sogou JavaScript Library 
 * 2014-10-10 build 
 */
define("Sogou.Events.KeyEvent",["Sogou.Util","Sogou.Events.BrowserEvent","Sogou.Events.KeyEventType"],function(a,b,c){"use strict";var d=function(a,d,e,f){b.call(this,f),this.type=c.KEY,this.keyCode=a,this.charCode=d,this.repeat=e};return a.inherits(d,b),d});