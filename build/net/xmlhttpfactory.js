/** 
 * Sogou JavaScript Library 
 * 2014-10-11 build 
 */
sogou("Sogou.Net.XmlHttpFactory",["Sogou.Util"],function(a){"use strict";var b=function(){};return b.prototype.cachedOptions_=null,b.prototype.createInstance=a.abstractMethod,b.prototype.getOptions=function(){return this.cachedOptions_||(this.cachedOptions_=this.internalGetOptions())},b.prototype.internalGetOptions=a.abstractMethod,b});