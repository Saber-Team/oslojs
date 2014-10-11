/** 
 * Sogou JavaScript Library 
 * 2014-10-11 build 
 */
define("Sogou.Net.XmlHttp",["Sogou.Net.DefaultXmlHttpFactory"],function(a){"use strict";var b=function(){return b.factory_.createInstance()};return b.getOptions=function(){return b.factory_.getOptions()},b.OptionType={USE_NULL_FUNCTION:0,LOCAL_REQUEST_ERROR:1},b.ReadyState={UNINITIALIZED:0,LOADING:1,LOADED:2,INTERACTIVE:3,COMPLETE:4},b.factory_,b.setGlobalFactory=function(a){b.factory_=a},b.setGlobalFactory(new a),b});