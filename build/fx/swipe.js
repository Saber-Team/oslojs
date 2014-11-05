/** Oslo JavaScript Framework. */
define("Sogou.FX.Swipe",["Sogou.Util","Sogou.Style.Bidi","Sogou.FX.EffectBase"],function(a,b,c){"use strict";var d=function(a,b,d){if(2!==b.length||2!==d.length)throw Error("Start and end points must be 2D");c.apply(this,arguments),this.maxWidth_=Math.max(this.endPoint[0],this.startPoint[0]),this.maxHeight_=Math.max(this.endPoint[1],this.startPoint[1])};return a.inherits(d,c),d.prototype.updateStyle=function(){var a=this.coords[0],b=this.coords[1];this.clip_(Math.round(a),Math.round(b),this.maxWidth_,this.maxHeight_),this.element.style.width=Math.round(a)+"px";var c=this.isRightPositioningForRtlEnabled()&&this.isRightToLeft()?"marginRight":"marginLeft";this.element.style[c]=Math.round(a)-this.maxWidth_+"px",this.element.style.marginTop=Math.round(b)-this.maxHeight_+"px"},d.prototype.clip_=function(a,b,c,d){this.element.style.clip="rect("+(d-b)+"px "+c+"px "+d+"px "+(c-a)+"px)"},d});