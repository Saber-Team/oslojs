/** 
 * Sogou JavaScript Library 
 * 2014-10-19 build 
 */
define("Sogou.FX.EffectBase",["Sogou.Util","Sogou.Style.Util","Sogou.FX.Animation"],function(a,b,c){"use strict";var d=function(a,b,d,e,f){c.call(this,b,d,e,f),this.element=a,this.rightToLeft_=null};return a.inherits(d,c),d.prototype.updateStyle=a.nullFunction,d.prototype.rightToLeft_=null,d.prototype.isRightToLeft=function(){return a.isNull(this.rightToLeft_)&&(this.rightToLeft_=b.isRightToLeft(this.element)),this.rightToLeft_},d.prototype.onAnimate=function(){this.updateStyle(),d.superClass_.onAnimate.call(this)},d.prototype.onEnd=function(){this.updateStyle(),d.superClass_.onEnd.call(this)},d.prototype.onBegin=function(){this.updateStyle(),d.superClass_.onBegin.call(this)},d});