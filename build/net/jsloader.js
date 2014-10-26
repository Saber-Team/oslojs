/** Sogou JavaScript Framework.  2014-10-27 build */
define("Sogou.Net.JSloader",["Sogou.Util","Sogou.Array","Sogou.Async.Deferred","Sogou.Debug.Error","Sogou.Dom.Util","Sogou.Dom.TagName"],function(a,b,c,d,e,f){"use strict";var g,h="sogou_verification",i=5e3,j=[];function k(a,c){if(a.length){var d=j.length;if(b.extend(j,a),!d){a=j;var e=function(){var b=a.shift(),d=l(b,c);a.length&&d.addBoth(e)};e()}}}function l(b,d){var g=d||{},h=g.document||document,j=e.createDom(f.SCRIPT),k={script_:j,timeout_:void 0},l=new c(o,k),m=null,s=a.isNull(g.timeout)?i:g.timeout;s>0&&(m=window.setTimeout(function(){p(j,!0),l.errback(new r(q.TIMEOUT,"Timeout reached for loading script "+b))},s),k.timeout_=m),j.onload=j.onreadystatechange=function(){if(!j.readyState||"loaded"==j.readyState||"complete"==j.readyState){var a=g.cleanupWhenDone||!1;p(j,a,m),l.callback(null)}},j.onerror=function(){p(j,!0,m),l.errback(new r(q.LOAD_ERROR,"Error while loading script "+b))},e.setProperties(j,{type:"text/javascript",charset:"UTF-8",src:b});var t=n(h);return t.appendChild(j),l}function m(b,d,e){a.global[h]||(a.global[h]={});var f=a.global[h];if(a.isDef(f[d]))return c.fail(new r(q.VERIFY_OBJECT_ALREADY_EXISTS,"Verification object "+d+" already defined."));var g=l(b,e),i=new c(a.bind(g.cancel,g));return g.addCallback(function(){var c=f[d];a.isDef(c)?(i.callback(c),delete f[d]):i.errback(new r(q.VERIFY_ERROR,"Script "+b+" loaded, but verification object "+d+" was not defined."))}),g.addErrback(function(b){a.isDef(f[d])&&delete f[d],i.errback(b)}),i}function n(a){var b=a.getElementsByTagName(f.HEAD);return b&&0!==b.length?b[0]:a.documentElement}function o(){var a=this;a&&a.script_&&a.script_&&"SCRIPT"==a.script_.tagName&&p(a.script_,!0,a.timeout_)}function p(b,c,d){a.isNull(d)||a.global.clearTimeout(d),b.onload=a.nullFunction,b.onerror=a.nullFunction,b.onreadystatechange=a.nullFunction,c&&window.setTimeout(function(){e.removeNode(b)},0)}var q={LOAD_ERROR:0,TIMEOUT:1,VERIFY_ERROR:2,VERIFY_OBJECT_ALREADY_EXISTS:3},r=function(a,b){var c="Jsloader error (code #"+a+")";b&&(c+=": "+b),d.call(this,c),this.code=a};return a.inherits(r,d),{GLOBAL_VERIFY_OBJS_:h,DEFAULT_TIMEOUT:i,Options:g,loadMany:k,load:l,loadAndVerify:m,cancel_:o,cleanup_:p,ErrorCode:q,JsloaderError:r}});