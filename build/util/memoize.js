/** 
 * Sogou JavaScript Library 
 * 2014-10-19 build 
 */
define("Sogou.Memo",["Sogou.Util"],function(a){"use strict";var b=!0,c="sogou_memoize_cache_";function d(a,b){for(var c=[a],d=b.length-1;d>=0;--d)c.push(typeof b[d],b[d]);return c.join("")}return{memoize:function(e,f){var g=a.getUid(e),h=f||d;return function(){if(b){var d=this||a.global,f=d[c]||(d[c]={}),i=h(g,arguments);return f.hasOwnProperty(i)?f[i]:f[i]=e.apply(this,arguments)}return e.apply(this,arguments)}},clearCache:function(a){a[c]={}}}});