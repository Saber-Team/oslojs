/** Sogou JavaScript Framework.  2014-10-31 build */
define("Sogou.FX.ResizeWidth",["Sogou.Util","Sogou.FX.EffectBase"],function(a,b){"use strict";var c=function(a,c,d,e,f){b.call(this,a,[c],[d],e,f)};return a.inherits(c,b),c.prototype.updateStyle=function(){this.element.style.width=Math.round(this.coords[0])+"px"},c});