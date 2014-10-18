/** 
 * Sogou JavaScript Library 
 * 2014-10-19 build 
 */
define("Sogou.Async.Delay",["Sogou.Util","Sogou.Disposable","Sogou.Timer"],function(a,b,c){"use strict";var d=function(c,d,e){b.call(this),this.listener_=c,this.interval_=d||0,this.context_=e,this.callback_=a.bind(this.doAction_,this)};return a.inherits(d,b),d.prototype.id_=0,d.prototype.disposeInternal=function(){d.superClass_.disposeInternal.call(this),this.stop(),delete this.listener_,delete this.context_},d.prototype.start=function(b){this.stop(),this.id_=c.callOnce(this.callback_,a.isNull(b)?this.interval_:b)},d.prototype.stop=function(){this.isActive()&&c.clear(this.id_),this.id_=0},d.prototype.fire=function(){this.stop(),this.doAction_()},d.prototype.fireIfActive=function(){this.isActive()&&this.fire()},d.prototype.isActive=function(){return 0!==this.id_},d.prototype.doAction_=function(){this.id_=0,this.listener_&&this.listener_.call(this.context_)},d});