/** Sogou JavaScript Framework.  2014-10-27 build */
define("Sogou.Net.XmlHttp",["Sogou.Net.DefaultXmlHttpFactory"],function(a){"use strict";var b=null,c=function(){return b.createInstance()};return c.getOptions=function(){return b.getOptions()},c.OptionType={USE_NULL_FUNCTION:0,LOCAL_REQUEST_ERROR:1},c.ReadyState={UNINITIALIZED:0,LOADING:1,LOADED:2,INTERACTIVE:3,COMPLETE:4},c.setGlobalFactory=function(a){b=a},c.setGlobalFactory(new a),c});