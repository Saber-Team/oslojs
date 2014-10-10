/** 
 * Sogou JavaScript Library 
 * 2014-10-10 build 
 */
define("Sogou.Iter.Util",["Sogou.Util","Sogou.Array","Sogou.Iter.Iterator","Sogou.Iter.StopIteration"],function(a,b,c,d){"use strict";function e(b){if(b instanceof c)return b;if("function"==typeof b.__iterator__)return b.__iterator__(!1);if(a.isArrayLike(b)){var e=0,f=new c;return f.next=function(){for(;;){if(e>=b.length)throw d;{if(e in b)return b[e++];e++}}},f}throw Error("Not implemented")}function f(c,f,g){if(a.isArrayLike(c))try{b.forEach(c,f,g)}catch(h){if(h!==d)throw h}else{c=e(c);try{for(;;)f.call(g,c.next(),void 0,c)}catch(h){if(h!==d)throw h}}}function g(a,b,d){var f=e(a),g=new c;return g.next=function(){for(;;){var a=f.next();if(b.call(d,a,void 0,f))return a}},g}function h(a,b,e){var f=0,g=a,h=e||1;if(arguments.length>1&&(f=a,g=b),0==h)throw Error("Range step argument must not be zero");var i=new c;return i.next=function(){if(h>0&&f>=g||0>h&&g>=f)throw d;var a=f;return f+=h,a},i}function i(a,b){return q(a).join(b)}function j(a,b,d){var f=e(a),g=new c;return g.next=function(){for(;;){var a=f.next();return b.call(d,a,void 0,f)}},g}function k(a,b,c,d){var e=c;return f(a,function(a){e=b.call(d,e,a)}),e}function l(a,b,c){a=e(a);try{for(;;)if(b.call(c,a.next(),void 0,a))return!0}catch(f){if(f!==d)throw f}return!1}function m(a,b,c){a=e(a);try{for(;;)if(!b.call(c,a.next(),void 0,a))return!1}catch(f){if(f!==d)throw f}return!0}function n(){var a=arguments,b=a.length,f=0,g=new c;return g.next=function(){try{if(f>=b)throw d;var c=e(a[f]);return c.next()}catch(g){if(g!==d||f>=b)throw g;return f++,this.next()}},g}function o(a,b,d){var f=e(a),g=new c,h=!0;return g.next=function(){for(;;){var a=f.next();if(!h||!b.call(d,a,void 0,f))return h=!1,a}},g}function p(a,b,f){var g=e(a),h=new c,i=!0;return h.next=function(){for(;;){if(!i)throw d;var a=g.next();if(b.call(f,a,void 0,g))return a;i=!1}},h}function q(b){if(a.isArrayLike(b))return c.toArray(b);b=e(b);var c=[];return f(b,function(a){c.push(a)}),c}function r(a,b){a=e(a),b=e(b);var c,f;try{for(;;){c=f=!1;var g=a.next();c=!0;var h=b.next();if(f=!0,g!=h)return!1}}catch(i){if(i!==d)throw i;if(c&&!f)return!1;if(!f)try{return h=b.next(),!1}catch(j){if(j!==d)throw j;return!0}}return!1}function s(a,b){try{return e(a).next()}catch(c){if(c!=d)throw c;return b}}function t(){var a=b.some(arguments,function(a){return!a.length});if(a||!arguments.length)return new c;var e=new c,f=arguments,g=b.repeat(0,f.length);return e.next=function(){if(g){for(var a=b.map(g,function(a,b){return f[b][a]}),c=g.length-1;c>=0;c--){if(g[c]<f[c].length-1){g[c]++;break}if(0==c){g=null;break}g[c]=0}return a}throw d},e}function u(a){var f=e(a),g=[],h=0,i=new c,j=!1;return i.next=function(){var a=null;if(!j)try{return a=f.next(),g.push(a),a}catch(c){if(c!=d||b.isEmpty(g))throw c;j=!0}return a=g[h],h=(h+1)%g.length,a},i}return{toIterator:e,forEach:f,filter:g,range:h,join:i,map:j,reduce:k,some:l,every:m,chain:n,dropWhile:o,takeWhile:p,toArray:q,equals:r,nextOrValue:s,product:t,cycle:u}});