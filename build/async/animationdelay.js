/** Sogou JavaScript Framework.  2014-10-31 build */
define("Sogou.Async.AnimationDelay",["Sogou.Util","Sogou.Disposable","Sogou.Events.Util","Sogou.Functions"],function(a,b,c,d){"use strict";var e="MozBeforePaint",f=function(c,d,e){b.call(this),this.listener_=c,this.context_=e,this.win_=d||window,this.callback_=a.bind(this.doAction_,this)};return a.inherits(f,b),f.prototype.id_=null,f.prototype.usingListeners_=!1,f.TIMEOUT=20,f.prototype.start=function(){this.stop(),this.usingListeners_=!1;var a=this.getRaf_(),b=this.getCancelRaf_();a&&!b&&this.win_.mozRequestAnimationFrame?(this.id_=c.listen(this.win_,e,this.callback_),this.win_.mozRequestAnimationFrame(null),this.usingListeners_=!0):this.id_=a&&b?a.call(this.win_,this.callback_):this.win_.setTimeout(d.lock(this.callback_),f.TIMEOUT)},f.prototype.stop=function(){if(this.isActive()){var a=this.getRaf_(),b=this.getCancelRaf_();a&&!b&&this.win_.mozRequestAnimationFrame?c.unlistenByKey(this.id_):a&&b?b.call(this.win_,this.id_):this.win_.clearTimeout(this.id_)}this.id_=null},f.prototype.fire=function(){this.stop(),this.doAction_()},f.prototype.fireIfActive=function(){this.isActive()&&this.fire()},f.prototype.isActive=function(){return null!==this.id_},f.prototype.doAction_=function(){this.usingListeners_&&this.id_&&c.unlistenByKey(this.id_),this.id_=null,this.listener_.call(this.context_,a.now())},f.prototype.disposeInternal=function(){this.stop(),f.superClass_.disposeInternal.call(this)},f.prototype.getRaf_=function(){var a=this.win_;return a.requestAnimationFrame||a.webkitRequestAnimationFrame||a.mozRequestAnimationFrame||a.oRequestAnimationFrame||a.msRequestAnimationFrame||null},f.prototype.getCancelRaf_=function(){var a=this.win_;return a.cancelRequestAnimationFrame||a.webkitCancelRequestAnimationFrame||a.mozCancelRequestAnimationFrame||a.oCancelRequestAnimationFrame||a.msCancelRequestAnimationFrame||null},f});