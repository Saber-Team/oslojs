/** Oslo JavaScript Framework. */
define("@ds.simplePool",["@util","@Disposable"],function(a,b){"use strict";var c=function(a,c){b.call(this),this.maxCount_=c,this.freeQueue_=[],this.createInitial_(a)};return a.inherits(c,b),c.prototype.createObjectFn_=null,c.prototype.disposeObjectFn_=null,c.prototype.setCreateObjectFn=function(a){this.createObjectFn_=a},c.prototype.setDisposeObjectFn=function(a){this.disposeObjectFn_=a},c.prototype.getObject=function(){return this.freeQueue_.length?this.freeQueue_.pop():this.createObject()},c.prototype.releaseObject=function(a){this.freeQueue_.length<this.maxCount_?this.freeQueue_.push(a):this.disposeObject(a)},c.prototype.createInitial_=function(a){if(a>this.maxCount_)throw Error("[goog.structs.SimplePool] Initial cannot be greater than max");for(var b=0;a>b;b++)this.freeQueue_.push(this.createObject())},c.prototype.createObject=function(){return this.createObjectFn_?this.createObjectFn_():{}},c.prototype.disposeObject=function(b){if(this.disposeObjectFn_)this.disposeObjectFn_(b);else if(a.isObject(b))if(a.isFunction(b.dispose))b.dispose();else for(var c in b)delete b[c]},c.prototype.disposeInternal=function(){c.superClass_.disposeInternal.call(this);for(var a=this.freeQueue_;a.length;)this.disposeObject(a.pop());delete this.freeQueue_},c});