/** Sogou JavaScript Framework.  2014-10-27 build */
define("Sogou.Object",[],function(){"use strict";var a=["constructor","hasOwnProperty","isPrototypeOf","propertyIsEnumerable","toLocaleString","toString","valueOf"],b=Object.prototype,c=b.hasOwnProperty;function d(a,b){return b in a}function e(a,b){for(var c in a)if(a[c]===b)return!0;return!1}function f(a,b,c){for(var d in a)b.call(c,a[d],d,a)}function g(a,b,c){var d={};for(var e in a)b.call(c,a[e],e,a)&&(d[e]=a[e]);return d}function h(a,b,c){var d={};for(var e in a)d[e]=b.call(c,a[e],e,a);return d}function i(a,b,c){for(var d in a)if(b.call(c,a[d],d,a))return!0;return!1}function j(a,b,c){for(var d in a)if(!b.call(c,a[d],d,a))return!1;return!0}function k(b){for(var d,e,f=1;f<arguments.length;f++){e=arguments[f];for(d in e)b[d]=e[d];for(var g=0;g<a.length;g++)d=a[g],c.call(e,d)&&(b[d]=e[d])}}return{containsKey:d,containsValue:e,forEach:f,filter:g,map:h,some:i,every:j,extend:k,getValues:function(a){var b=[],c=0;for(var d in a)b[c++]=a[d];return b},getKeys:function(a){var b=[],c=0;for(var d in a)b[c++]=d;return b},createImmutableView:function(a){var b=a;return Object.isFrozen&&!Object.isFrozen(a)&&(b=Object.create(a),Object.freeze(b)),b},isImmutableView:function(a){return!!Object.isFrozen&&Object.isFrozen(a)},isEmpty:function(a){var b;for(b in a)return!1;return!0}}});