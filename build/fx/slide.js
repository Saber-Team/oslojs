/** Oslo JavaScript Framework. */
define("@fx.slide",["@util","@fx.effectBase"],function(a,b){"use strict";var c=function(a,c,d){if(2!==c.length||2!==d.length)throw Error("Start and end points must be 2D");b.apply(this,arguments)};return a.inherits(c,b),c.prototype.updateStyle=function(){var a=this.isRightPositioningForRtlEnabled()&&this.isRightToLeft()?"right":"left";this.element.style[a]=Math.round(this.coords[0])+"px",this.element.style.top=Math.round(this.coords[1])+"px"},c});