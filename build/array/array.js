/** 
 * Sogou JavaScript Library 
 * 2014-09-17 build 
 */
sogou("Sogou.Array",["Sogou.Util"],function(a){"use strict";var b=Array.prototype,c=Object.prototype,d=b.forEach?function(a,c,d){b.forEach.call(a,c,d)}:function(a,b,c){for(var d=a.length,e=0;d>e;e++)e in a&&b.call(c,a[e],e,a)};function e(a,b,c){for(var d=a.length,e=d-1;e>=0;--e)e in a&&b.call(c,a[e],e,a)}var f=b.indexOf?function(a,c,d){return b.indexOf.call(a,c,d)}:function(b,c,d){for(var e=a.isNull(d)?0:0>d?Math.max(0,b.length+d):d,f=e;f<b.length;f++)if(f in b&&b[f]===c)return f;return-1},g=b.lastIndexOf?function(c,d,e){var f=a.isNull(e)?c.length-1:e;return b.lastIndexOf.call(c,d,f)}:function(b,c,d){var e=a.isNull(d)?b.length-1:d;0>e&&(e=Math.max(0,b.length+e));for(var f=e;f>=0;f--)if(f in b&&b[f]===c)return f;return-1};function h(a,c){return 1===b.splice.call(a,c,1).length}function i(a,b){var c,d=f(a,b);return(c=d>=0)&&h(a,d),c}function j(b,c,d){var e=k(b,c,d);return 0>e?null:a.isString(b)?b.charAt(e):b[e]}function k(b,c,d){for(var e=b.length,f=a.isString(b)?b.split(""):b,g=0;e>g;g++)if(g in f&&c.call(d,f[g],g,b))return g;return-1}function l(b,c,d){for(var e=b.length,f=a.isString(b)?b.split(""):b,g=e-1;g>=0;g--)if(g in f&&c.call(d,f[g],g,b))return g;return-1}function m(b){for(var c=1;c<arguments.length;c++){var d,e=arguments[c];if(a.isArray(e)||(d=a.isArrayLike(e))&&Object.prototype.hasOwnProperty.call(e,"callee"))b.push.apply(b,e);else if(d)for(var f=b.length,g=e.length,h=0;g>h;h++)b[f+h]=e[h];else b.push(e)}}function n(b,c,e,f){if(b.reduce)return f?b.reduce(a.bind(c,f),e):b.reduce(c,e);var g=e;return d(b,function(a,d){g=c.call(f,g,a,d,b)}),g}function o(b,c,d,f){if(b.reduceRight)return f?b.reduceRight(a.bind(c,f),d):b.reduceRight(c,d);var g=d;return e(b,function(a,d){g=c.call(f,g,a,d,b)}),g}var p=b.filter?function(a,c,d){return b.filter.call(a,c,d)}:function(a,b,c){for(var d=a.length,e=[],f=0,g=0;d>g;g++)if(g in a){var h=a[g];b.call(c,h,g,a)&&(e[f++]=h)}return e},q=b.map?function(a,c,d){return b.map.call(a,c,d)}:function(a,b,c){for(var d=a.length,e=new Array(d),f=0;d>f;f++)f in a&&(e[f]=b.call(c,a[f],f,a));return e},r=b.some?function(a,c,d){return b.some.call(a,c,d)}:function(a,b,c){for(var d=a.length,e=0;d>e;e++)if(e in a&&b.call(c,a[e],e,a))return!0;return!1},s=b.every?function(a,c,d){return b.every.call(a,c,d)}:function(a,b,c){for(var d=a.length,e=0;d>e;e++)if(e in a&&!b.call(c,a[e],e,a))return!1;return!0};function t(a,b,c){var e={};return d(a,function(d,f){e[b.call(c,d,f,a)]=d}),e}function u(a){var b=a.length;if(b>0){for(var c=new Array(b),d=0;b>d;d++)c[d]=a[d];return c}return[]}return{indexOf:f,lastIndexOf:g,find:j,findIndex:k,findIndexRight:l,forEach:d,forEachRight:e,filter:p,contains:function(a,b){return f(a,b)>=0},extend:m,map:q,some:r,every:s,reduce:n,reduceRight:o,remove:i,removeAt:h,toObject:t,toArray:u,unique:function(b,d){for(var e=d||b,f={},g=0,h=0;h<b.length;){var i=b[h++],j=a.isObject(i)?"o"+a.getUid(i):(typeof i).charAt(0)+i;c.hasOwnProperty.call(f,j)||(f[j]=!0,e[g++]=i)}e.length=g},shuffle:function(a,b){for(var c=b||Math.random,d=a.length-1;d>0;d--){var e=Math.floor(c()*(d+1)),f=a[d];a[d]=a[e],a[e]=f}}}});