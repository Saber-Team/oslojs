/** Sogou JavaScript Framework.  2014-10-31 build */
define("Sogou.Async.Throttle",["Sogou.Util","Sogou.Disposable","Sogou.Timer"],function(a,b,c){"use strict";var d=function(c,d,e){b.call(this),this.listener_=c,this.interval_=d,this.context_=e,this.callback_=a.bind(this.onTimer_,this)};return a.inherits(d,b),d.prototype.shouldFire_=!1,d.prototype.pauseCount_=0,d.prototype.timer_=null,d.prototype.fire=function(){this.timer_||this.pauseCount_?this.shouldFire_=!0:this.doAction_()},d.prototype.stop=function(){this.timer_&&(c.clear(this.timer_),this.timer_=null,this.shouldFire_=!1)},d.prototype.pause=function(){this.pauseCount_++},d.prototype.resume=function(){this.pauseCount_--,this.pauseCount_||!this.shouldFire_||this.timer_||(this.shouldFire_=!1,this.doAction_())},d.prototype.disposeInternal=function(){d.superClass_.disposeInternal.call(this),this.stop()},d.prototype.onTimer_=function(){this.timer_=null,this.shouldFire_&&!this.pauseCount_&&(this.shouldFire_=!1,this.doAction_())},d.prototype.doAction_=function(){this.timer_=c.callOnce(this.callback_,this.interval_),this.listener_.call(this.context_)},d});