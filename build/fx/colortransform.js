/** 
 * Sogou JavaScript Library 
 * 2014-10-19 build 
 */
define("Sogou.FX.ColorTransform",["Sogou.Util","Sogou.FX.EffectBase"],function(a,b){"use strict";var c=function(a,c,d){if(3!==c.length||3!==d.length)throw Error("Start and end points must be 3D");b.apply(this,arguments)};return a.inherits(c,b),c.prototype.updateStyle=function(){for(var a=[],b=0;b<this.coords.length;b++)a[b]=Math.round(this.coords[b]);this.element.style.color="rgb("+a.join(",")+")"},c});