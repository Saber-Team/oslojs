/** 
 * Sogou JavaScript Library 
 * 2014-09-26 build 
 */
sogou("Sogou.Events.MouseWheelEvent",["Sogou.Util","Sogou.Events.BrowserEvent","Sogou.Events.MouseWheelEventType"],function(a,b,c){"use strict";var d=function(a,d,e,f){b.call(this,d),this.type=c.MOUSEWHEEL,this.detail=a,this.deltaX=e,this.deltaY=f};return a.inherits(d,b),d});