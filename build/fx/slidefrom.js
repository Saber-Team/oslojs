/** Sogou JavaScript Framework.  2014-10-27 build */
define("Sogou.FX.SlideFrom",["Sogou.Util","Sogou.Style.Bidi","Sogou.FX.Slide"],function(a,b,c){"use strict";var d=function(a,d,e,f){var g=this.isRightPositioningForRtlEnabled()?b.getOffsetStart(a):a.offsetLeft,h=[g,a.offsetTop];c.call(this,a,h,d,e,f)};return a.inherits(d,c),d.prototype.onBegin=function(){var a=this.isRightPositioningForRtlEnabled()?b.getOffsetStart(this.element):this.element.offsetLeft;this.startPoint=[a,this.element.offsetTop],d.superClass_.onBegin.call(this)},d});