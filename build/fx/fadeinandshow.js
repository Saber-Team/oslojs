/** Oslo JavaScript Framework. */
define("@fx.fadeInAndShow",["@util","@fx.Fade"],function(a,b){"use strict";var c=function(a,c,d){b.call(this,a,0,1,c,d)};return a.inherits(c,b),c.prototype.onBegin=function(){this.show(),c.superClass_.onBegin.call(this)},c});