/** Sogou JavaScript Framework.  2014-10-31 build */
define("Sogou.Events.InputHandler",["Sogou.Util","Sogou.Timer","Sogou.Dom.Util","Sogou.Events.BrowserEvent","Sogou.Events.HandlerManager","Sogou.Events.EventTarget","Sogou.Events.KeyCodes","Sogou.UA.Util"],function(a,b,c,d,e,f,g,h){"use strict";var i=function(a){f.call(this),this.element_=a;var b=h.isIE||h.isWEBKIT&&!h.isVersionOrHigher("531")&&"TEXTAREA"===a.tagName;this.handlerManager_=new e(this),this.handlerManager_.listen(this.element_,b?["keydown","paste","cut","drop","input"]:"input",this)};return a.inherits(i,f),i.EventType={INPUT:"input"},i.prototype.timer_=null,i.prototype.handleEvent=function(a){if("input"===a.type)this.cancelTimerIfSet_(),h.isOPERA&&this.element_!==c.getOwnerDocument(this.element_).activeElement||this.dispatchEvent(this.createInputEvent_(a));else{if("keydown"===a.type&&!g.isTextModifyingKeyEvent(a))return;var d="keydown"===a.type?this.element_.value:null;h.isIE&&a.keyCode===g.WIN_IME&&(d=null);var e=this.createInputEvent_(a);this.cancelTimerIfSet_(),this.timer_=b.callOnce(function(){this.timer_=null,this.element_.value!==d&&this.dispatchEvent(e)},0,this)}},i.prototype.cancelTimerIfSet_=function(){null!==this.timer_&&(b.clear(this.timer_),this.timer_=null)},i.prototype.createInputEvent_=function(a){var b=new d(a.getBrowserEvent());return b.type=i.EventType.INPUT,b},i.prototype.disposeInternal=function(){i.superClass_.disposeInternal.call(this),this.handlerManager_.dispose(),this.cancelTimerIfSet_(),delete this.element_},i});