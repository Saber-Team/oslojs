/** 
 * Sogou JavaScript Library 
 * 2014-10-19 build 
 */
define("Sogou.Net.DefaultXmlHttpFactory",["Sogou.Util","Sogou.Net.XmlHttpFactory"],function(a,b){"use strict";var c=function(){b.call(this)};return a.inherits(c,b),c.prototype.createInstance=function(){var a=this.getProgId_();return a?new ActiveXObject(a):new XMLHttpRequest},c.prototype.internalGetOptions=function(){var a=this.getProgId_(),b={};return a&&(b[0]=!0,b[1]=!0),b},c.prototype.ieProgId_,c.prototype.getProgId_=function(){if(!this.ieProgId_&&"undefined"==typeof XMLHttpRequest&&"undefined"!=typeof ActiveXObject){for(var a=["MSXML2.XMLHTTP.6.0","MSXML2.XMLHTTP.3.0","MSXML2.XMLHTTP","Microsoft.XMLHTTP"],b=0;b<a.length;b++){var c=a[b];try{return new ActiveXObject(c),this.ieProgId_=c,c}catch(d){}}throw Error("Could not create ActiveXObject. ActiveX might be disabled, or MSXML might not be installed")}return this.ieProgId_},c});