/** Oslo JavaScript Framework. */
define(["../util/util","../array/array","../debug/error","../functions/functions","./cancelederror","./alreadycallederror"],function(a,b,c,d,e,f){"use strict";var g=function(a,b){if(this.sequence_=[],this.onCancelFunction_=a,this.defaultScope_=b||null,g.LONG_STACK_TRACES&&(this.constructorStack_=null,Error.captureStackTrace)){var c={stack:""};Error.captureStackTrace(c,g),"string"==typeof c.stack&&(this.constructorStack_=c.stack.replace(/^[^\n]*\n/,""))}};return g.prototype.fired_=!1,g.prototype.hadError_=!1,g.prototype.result_=void 0,g.prototype.blocked_=!1,g.prototype.blocking_=!1,g.prototype.silentlyCanceled_=!1,g.prototype.unhandledExceptionTimeoutId_,g.prototype.parent_=null,g.prototype.branches_=0,g.STRICT_ERRORS=a.DEBUG,g.LONG_STACK_TRACES=a.DEBUG,g.prototype.cancel=function(a){if(this.hasFired())this.result_ instanceof g&&this.result_.cancel();else{if(this.parent_){var b=this.parent_;delete this.parent_,a?b.cancel(a):b.branchCancel_()}this.onCancelFunction_?this.onCancelFunction_.call(this.defaultScope_,this):this.silentlyCanceled_=!0,this.hasFired()||this.errback(new e(this))}},g.prototype.branchCancel_=function(){this.branches_--,this.branches_<=0&&this.cancel()},g.prototype.continue_=function(a,b){this.blocked_=!1,this.updateResult_(a,b)},g.prototype.updateResult_=function(a,b){this.fired_=!0,this.result_=b,this.hadError_=!a,this.fire_()},g.prototype.check_=function(){if(this.hasFired()){if(!this.silentlyCanceled_)throw new f(this);this.silentlyCanceled_=!1}},g.prototype.callback=function(a){if(this.check_(),a instanceof g)throw"An execution sequence may not be initiated with a blocking Deferred.";this.updateResult_(!0,a)},g.prototype.errback=function(a){if(this.check_(),a instanceof g)throw"An execution sequence may not be initiated with a blocking Deferred.";this.makeStackTraceLong_(a),this.updateResult_(!1,a)},g.prototype.makeStackTraceLong_=function(b){g.LONG_STACK_TRACES&&this.constructorStack_&&a.isObject(b)&&b.stack&&/^[^\n]+(\n   [^\n]+)+/.test(b.stack)&&(b.stack=b.stack+"\nDEFERRED OPERATION:\n"+this.constructorStack_)},g.prototype.addCallback=function(a,b){return this.addCallbacks(a,null,b)},g.prototype.addErrback=function(a,b){return this.addCallbacks(null,a,b)},g.prototype.addBoth=function(a,b){return this.addCallbacks(a,a,b)},g.prototype.addCallbacks=function(a,b,c){return this.blocking_?this:(this.sequence_.push([a,b,c]),this.hasFired()&&this.fire_(),this)},g.prototype.chainDeferred=function(a){return this.addCallbacks(a.callback,a.errback,a),this},g.prototype.branch=function(a){var b=new g;return this.chainDeferred(b),a&&(b.parent_=this,this.branches_++),b},g.prototype.awaitDeferred=function(b){return this.addCallback(a.bind(b.branch,b))},g.prototype.hasFired=function(){return this.fired_},g.prototype.isError=function(a){return a instanceof Error},g.prototype.hasErrback_=function(){return b.some(this.sequence_,function(b){return a.isFunction(b[1])})},g.prototype.fire_=function(){this.unhandledExceptionTimeoutId_&&this.hasFired()&&this.hasErrback_()&&(a.global.clearTimeout(this.unhandledExceptionTimeoutId_),delete this.unhandledExceptionTimeoutId_),this.parent_&&(this.parent_.branches_--,delete this.parent_);for(var b=this.result_,c=!1,f=!1;this.sequence_.length&&!this.blocked_;){var h=this.sequence_.shift(),i=h[0],j=h[1],k=h[2],l=this.hadError_?j:i;if(l)try{var m=l.call(k||this.defaultScope_,b);a.isDef(m)&&(this.hadError_=this.hadError_&&(m===b||this.isError(m)),this.result_=b=m),b instanceof g&&(f=!0,this.blocked_=!0)}catch(n){b=n,this.hadError_=!0,this.makeStackTraceLong_(b),this.hasErrback_()||(c=!0)}}this.result_=b,f?(b.addCallbacks(a.bind(this.continue_,this,!0),a.bind(this.continue_,this,!1)),b.blocking_=!0):!g.STRICT_ERRORS||!this.isError(b)||b instanceof e||(this.hadError_=!0,c=!0),c&&(this.unhandledExceptionTimeoutId_=a.global.setTimeout(d.fail(b),0))},g.succeed=function(a){var b=new g;return b.callback(a),b},g.fail=function(a){var b=new g;return b.errback(a),b},g.canceled=function(){var a=new g;return a.cancel(),a},g.when=function(a,b,c){return a instanceof g?a.branch(!0).addCallback(b,c):g.succeed(a).addCallback(b,c)},g});