/** Oslo JavaScript Framework. */
define("@asserts.Error",["@util","@string.util","@debug.Error"],function(a,b,c){"use strict";var d=function(a,d){d.unshift(a),c.call(this,b.subs.apply(null,d)),d.shift(),this.messagePattern=a};return a.inherits(d,c),d.prototype.name="AssertionError",d});
