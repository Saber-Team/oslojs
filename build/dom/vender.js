/** 
 * Sogou JavaScript Library 
 * 2014-10-09 build 
 */
define("Sogou.Dom.Vender",["Sogou.UA.Util"],function(a){"use strict";return{getVendorJsPrefix:function(){return a.isWEBKIT?"Webkit":a.isGECKO?"Moz":a.isIE?"ms":a.isOPERA?"O":null},getVendorPrefix:function(){return a.isWEBKIT?"-webkit":a.isGECKO?"-moz":a.isIE?"-ms":a.isOPERA?"-o":null}}});