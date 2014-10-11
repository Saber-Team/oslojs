/** 
 * Sogou JavaScript Library 
 * 2014-10-11 build 
 */
define("Sogou.FX.Util",["Sogou.Util","Sogou.Async.AnimationDelay","Sogou.Async.Delay","Sogou.Object"],function(a,b,c,d){"use strict";var e=b.TIMEOUT,f={},g=null,h=null,i=function(b){var c=a.getUid(b);c in f||(f[c]=b),m()},j=function(b){var c=a.getUid(b);delete f[c],d.isEmpty(f)&&n()},k=function(){g=null,a.dispose(h),h=null,f={}},l=function(b){var c=h&&h.isActive();a.dispose(h),h=null,g=b,c&&m()},m=function(){h||(h=g?new b(function(a){o(a)},g):new c(function(){o(a.now())},e));var d=h;d.isActive()||d.start()},n=function(){h&&h.stop()},o=function(a){d.forEach(f,function(b){b.onAnimationFrame(a)}),d.isEmpty(f)||m()};return{TIMEOUT:e,registerAnimation:i,unregisterAnimation:j,tearDown:k,setAnimationWindow:l}});