/** 
 * Sogou JavaScript Library 
 * 2014-08-31 build 
 */
sogou("Sogou.Events.EventBase",[],function(){"use strict";function a(a,b){this.type=a,this.target=b,this.currentTarget=this.target}return a.prototype={constructor:a,propagationStopped_:!1,defaultPrevented:!1,returnValue_:!0,stopPropagation:function(){this.propagationStopped_=!0},preventDefault:function(){this.defaultPrevented=!0,this.returnValue_=!1}},a.stopPropagation=function(a){a.stopPropagation()},a.preventDefault=function(a){a.preventDefault()},a});