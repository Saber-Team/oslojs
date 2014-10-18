/** 
 * Sogou JavaScript Library 
 * 2014-10-19 build 
 */
define("Sogou.FX.Resize",["Sogou.Util","Sogou.FX.EffectBase"],function(a,b){"use strict";var c=function(a,c,d){if(2!==c.length||2!==d.length)throw Error("Start and end points must be 2D");b.apply(this,arguments)};return a.inherits(c,b),c.prototype.updateStyle=function(){this.element.style.width=Math.round(this.coords[0])+"px",this.element.style.height=Math.round(this.coords[1])+"px"},c});