/** 
 * Sogou JavaScript Library 
 * 2014-08-29 build 
 */
sogou("Sogou.Disposable",["Sogou.Util"],function(a){"use strict";function b(){}return b.isDisposed=function(a){return a&&"function"==typeof a.isDisposed?a.isDisposed():!1},a.mixin(b.prototype,{disposed_:!1,onDisposeCallbacks_:null,isDisposed:function(){return this.disposed_},dispose:function(){this.disposed_||(this.disposed_=!0,this.disposeInternal())},registerDisposable:function(b){this.addOnDisposeCallback(a.partial(a.dispose,b))},addOnDisposeCallback:function(b,c){this.onDisposeCallbacks_||(this.onDisposeCallbacks_=[]),this.onDisposeCallbacks_.push(a.bind(b,c))},disposeInternal:function(){if(this.onDisposeCallbacks_)for(;this.onDisposeCallbacks_.length;)this.onDisposeCallbacks_.shift()()}}),b});