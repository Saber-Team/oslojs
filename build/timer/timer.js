/** Sogou JavaScript Framework.  2014-10-27 build */
define("Sogou.Timer",["Sogou.Util","Sogou.Events.EventTarget"],function(a,b){"use strict";var c=function(c,d){b.call(this),this.interval_=c||1,this.timerObject_=d||window,this.boundTick_=a.bind(this.tick_,this),this.last_=+new Date};a.inherits(c,b);var d=2147483647;c.prototype.enabled=!1;var e=.8;return c.prototype.timer_=null,c.prototype.getInterval=function(){return this.interval_},c.prototype.setInterval=function(a){this.interval_=a,this.timer_&&this.enabled?(this.stop(),this.start()):this.timer_&&this.stop()},c.prototype.tick_=function(){if(this.enabled){var a=+new Date-this.last_;if(a>0&&a<this.interval_*e)return this.timer_=this.timerObject_.setTimeout(this.boundTick_,this.interval_-a),void 0;this.timer_&&(this.timerObject_.clearTimeout(this.timer_),this.timer_=null),this.dispatchTick(),this.enabled&&(this.timer_=this.timerObject_.setTimeout(this.boundTick_,this.interval_),this.last_=+new Date)}},c.prototype.dispatchTick=function(){this.dispatchEvent(c.TICK)},c.prototype.start=function(){this.enabled=!0,this.timer_||(this.timer_=this.timerObject_.setTimeout(this.boundTick_,this.interval_),this.last_=+new Date)},c.prototype.stop=function(){this.enabled=!1,this.timer_&&(this.timerObject_.clearTimeout(this.timer_),this.timer_=null)},c.prototype.disposeInternal=function(){c.superClass_.disposeInternal.call(this),this.stop(),delete this.timerObject_},c.callOnce=function(b,c,e){if("function"==typeof b)e&&(b=a.bind(b,e));else{if(!b||"function"!=typeof b.handleEvent)throw Error("Invalid listener argument");b=a.bind(b.handleEvent,b)}return c>d?-1:window.setTimeout(b,c||0)},c.clear=function(a){window.clearTimeout(a)},c.TICK="tick",c});