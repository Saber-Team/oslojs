/** Oslo JavaScript Framework. */
define("@dom.vender",["@ua.util"],function(a){"use strict";return{getVendorJsPrefix:function(){return a.isWEBKIT?"Webkit":a.isGECKO?"Moz":a.isIE?"ms":a.isOPERA?"O":null},getVendorPrefix:function(){return a.isWEBKIT?"-webkit":a.isGECKO?"-moz":a.isIE?"-ms":a.isOPERA?"-o":null}}});