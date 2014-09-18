/** 
 * Sogou JavaScript Library 
 * 2014-09-18 build 
 */
sogou("Sogou.Events.Listener",[],function(){"use strict";function a(){return++a.counter_}a.counter_=0;function b(b,c,d,e,f,g){this.listener=b,this.proxy=c,this.src=d,this.type=e,this.capture=!!f,this.handler=g,this.key=a(),this.callOnce=!1,this.removed=!1}return b.prototype.markAsRemoved=function(){this.removed=!0,this.listener=null,this.proxy=null,this.src=null,this.handler=null},b});