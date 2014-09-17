/** 
 * Sogou JavaScript Library 
 * 2014-09-17 build 
 */
!function(a,b){"use strict";var c=Object.prototype.toString;function d(b){for(var c,d=b.split("."),e=a;d.length&&(c=d.shift());){if(!e[c])throw e+"'s "+c+" do not exist";e=e[c]}return e}function e(a){var b=[];if("[object String]"===c.call(a))b.push(d(a));else if("[object Array]"===c.call(a))for(var e=0;e<a.length;++e)b.push(d(a[e]));return b}function f(c,d){var e=c.split("."),f=a;e[0]in f||!f.execScript||f.execScript("var "+e[0]);for(var g;e.length&&(g=e.shift());)e.length||d===b?f=f[g]?f[g]:f[g]={}:f[g]=d}a.sogou="undefined"!=typeof module&&module.exports?function(a,b,c){module.exports=c()}:"function"==typeof a.define&&a.define.amd?a.define:function(b,c,d){var g=e(c);f(b,d.apply(a,g))}}(this);