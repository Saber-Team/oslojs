/** Sogou JavaScript Framework.  2014-10-29 build */
define("Sogou.Math.Util",["Sogou.Array"],function(a){"use strict";function b(a){return Math.floor(Math.random()*a)}function c(a,b){return a+Math.random()*(b-a)}function d(a,b,c){return Math.min(Math.max(a,b),c)}function e(a,b){var c=a%b;return 0>c*b?c+b:c}function f(a,b,c){return Math.abs(a-b)<=(c||1e-6)}function g(a){return e(a,360)}function h(a){return 180*a/Math.PI}function i(a,b,c,d){return g(h(Math.atan2(d-b,c-a)))}function j(a){return 0===a?0:0>a?-1:1}function k(){return a.reduce(arguments,function(a,b){return a+b},0)}function l(){return k.apply(null,arguments)/arguments.length}function m(){var b=arguments.length;if(2>b)return 0;var c=l.apply(null,arguments),d=k.apply(null,a.map(arguments,function(a){return Math.pow(a-c,2)}))/(b-1);return Math.sqrt(d)}function n(a){return isFinite(a)&&0===a%1}function o(a){return isFinite(a)&&!isNaN(a)}function p(a,b){return Math.floor(a+(b||2e-15))}function q(a,b){return Math.ceil(a-(b||2e-15))}return{randomInt:b,uniformRandom:c,clamp:d,modulo:e,nearlyEquals:f,angle:i,sign:j,sum:k,average:l,standardDeviation:m,isInt:n,isFiniteNumber:o,safeFloor:p,safeCeil:q}});