/** 
 * Sogou JavaScript Library 
 * 2014-10-19 build 
 */
define("Sogou.FX.Util",["Sogou.Util","Sogou.Async.AnimationDelay","Sogou.Async.Delay","Sogou.Object"],function(a,b,c,d){"use strict";var e=b.TIMEOUT,f={},g=null,h=null,i=function(b){var c=a.getUid(b);c in f||(f[c]=b),l()},j=function(b){var c=a.getUid(b);delete f[c],d.isEmpty(f)&&m()},k=function(b){var c=h&&h.isActive();a.dispose(h),h=null,g=b,c&&l()},l=function(){h||(h=g?new b(function(a){n(a)},g):new c(function(){n(a.now())},e));var d=h;d.isActive()||d.start()},m=function(){h&&h.stop()},n=function(a){d.forEach(f,function(b){b.onAnimationFrame(a)}),d.isEmpty(f)||l()};return{TIMEOUT:e,registerAnimation:i,unregisterAnimation:j,setAnimationWindow:k}});