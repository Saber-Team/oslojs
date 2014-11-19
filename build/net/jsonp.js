/** Oslo JavaScript Framework. */
define("@net.Jsonp",["@util","@uri.Uri","@net.JSloader"],function(a,b,c){"use strict";var d=function(a,c){this.uri_=new b(a),this.callbackParamName_=c?c:"callback",this.timeout_=5e3};return d.CALLBACKS="_callbacks_",d.scriptCounter_=0,d.prototype.setRequestTimeout=function(a){this.timeout_=a},d.prototype.getRequestTimeout=function(){return this.timeout_},d.prototype.send=function(b,e,f,g){var h=b||null,i=g||"_"+(d.scriptCounter_++).toString(36)+a.now().toString(36);a.global[d.CALLBACKS]||(a.global[d.CALLBACKS]={});var j=this.uri_.clone();if(h&&d.addPayloadToUri_(h,j),e){var k=d.newReplyHandler_(i,e);a.global[d.CALLBACKS][i]=k,j.setParameterValues(this.callbackParamName_,d.CALLBACKS+"."+i)}var l=c.load(j.toString(),{timeout:this.timeout_,cleanupWhenDone:!0}),m=d.newErrorHandler_(i,h,f);return l.addErrback(m),{id_:i,deferred_:l}},d.prototype.cancel=function(a){a&&(a.deferred_&&a.deferred_.cancel(),a.id_&&d.cleanup_(a.id_,!1))},d.newErrorHandler_=function(a,b,c){return function(){d.cleanup_(a,!1),c&&c(b)}},d.newReplyHandler_=function(a,b){return function(){d.cleanup_(a,!0),b.apply(void 0,arguments)}},d.cleanup_=function(b,c){a.global[d.CALLBACKS][b]&&(c?delete a.global[d.CALLBACKS][b]:a.global[d.CALLBACKS][b]=a.nullFunction)},d.addPayloadToUri_=function(a,b){for(var c in a)(!a.hasOwnProperty||a.hasOwnProperty(c))&&b.setParameterValues(c,a[c]);return b},d});