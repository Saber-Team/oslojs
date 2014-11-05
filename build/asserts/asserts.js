/** Oslo JavaScript Framework. */
define("Sogou.Asserts",["Sogou.Util","Sogou.Debug.Error","Sogou.String.Util"],function(a,b,c){"use strict";var d=a.DEBUG,e=function(a,d){d.unshift(a),b.call(this,c.subs.apply(null,d)),d.shift(),this.messagePattern=a};a.inherits(e,b),e.prototype.name="AssertionError";var f=function(a,b,c,d){var f="Assertion failed";if(c){f+=": "+c;var g=d}else a&&(f+=": "+a,g=b);throw new e(""+f,g||[])},g=function(a,b){return d&&!a&&f("",null,b,Array.prototype.slice.call(arguments,2)),a},h=function(a){if(d)throw new e("Failure"+(a?": "+a:""),Array.prototype.slice.call(arguments,1))},i=function(b,c){return d&&!a.isNumber(b)&&f("Expected number but got %s: %s.",[a.typeOf(b),b],c,Array.prototype.slice.call(arguments,2)),b},j=function(b,c){return d&&!a.isString(b)&&f("Expected string but got %s: %s.",[a.typeOf(b),b],c,Array.prototype.slice.call(arguments,2)),b},k=function(b,c){return d&&!a.isFunction(b)&&f("Expected function but got %s: %s.",[a.typeOf(b),b],c,Array.prototype.slice.call(arguments,2)),b},l=function(b,c){return d&&!a.isObject(b)&&f("Expected object but got %s: %s.",[a.typeOf(b),b],c,Array.prototype.slice.call(arguments,2)),b},m=function(b,c){return d&&!a.isArray(b)&&f("Expected array but got %s: %s.",[a.typeOf(b),b],c,Array.prototype.slice.call(arguments,2)),b},n=function(b,c){return d&&!a.isBoolean(b)&&f("Expected boolean but got %s: %s.",[a.typeOf(b),b],c,Array.prototype.slice.call(arguments,2)),b},o=function(a,b,c){return!d||a instanceof b||f("instanceof check failed.",null,c,Array.prototype.slice.call(arguments,3)),a},p=function(){for(var a in Object.prototype)h(a+" should not be enumerable in Object.prototype.")};return{ENABLE_ASSERTS:d,AssertionError:e,assert:g,fail:h,assertNumber:i,assertString:j,assertFunction:k,assertObject:l,assertArray:m,assertBoolean:n,assertInstanceof:o,assertObjectPrototypeIsIntact:p}});