/** Sogou JavaScript Framework.  2014-10-29 build */
define("Sogou.Events.KeyHandler",["Sogou.Util","Sogou.Events.Util","Sogou.Events.BrowserEvent","Sogou.Events.EventTarget","Sogou.Events.EventType","Sogou.Events.KeyCodes","Sogou.Events.KeyEvent","Sogou.UA.Util"],function(a,b,c,d,e,f,g,h){"use strict";var i={3:f.ENTER,12:f.NUMLOCK,63232:f.UP,63233:f.DOWN,63234:f.LEFT,63235:f.RIGHT,63236:f.F1,63237:f.F2,63238:f.F3,63239:f.F4,63240:f.F5,63241:f.F6,63242:f.F7,63243:f.F8,63244:f.F9,63245:f.F10,63246:f.F11,63247:f.F12,63248:f.PRINT_SCREEN,63272:f.DELETE,63273:f.HOME,63275:f.END,63276:f.PAGE_UP,63277:f.PAGE_DOWN,63289:f.NUMLOCK,63302:f.INSERT},j={Up:f.UP,Down:f.DOWN,Left:f.LEFT,Right:f.RIGHT,Enter:f.ENTER,F1:f.F1,F2:f.F2,F3:f.F3,F4:f.F4,F5:f.F5,F6:f.F6,F7:f.F7,F8:f.F8,F9:f.F9,F10:f.F10,F11:f.F11,F12:f.F12,"U+007F":f.DELETE,Home:f.HOME,End:f.END,PageUp:f.PAGE_UP,PageDown:f.PAGE_DOWN,Insert:f.INSERT},k=h.isMAC&&h.isGECKO,l=h.isIE||h.isWEBKIT&&h.isVersionOrHigher("525"),m=function(a,b){d.call(this),a&&this.attach(a,b)};return a.inherits(m,d),m.prototype.element_=null,m.prototype.keyPressKey_=null,m.prototype.keyDownKey_=null,m.prototype.keyUpKey_=null,m.prototype.lastKey_=-1,m.prototype.keyCode_=-1,m.prototype.altKey_=!1,m.prototype.handleKeyDown_=function(a){h.isWEBKIT&&(this.lastKey_===f.CTRL&&!a.ctrlKey||this.lastKey_===f.ALT&&!a.altKey||h.isMAC&&this.lastKey_===f.META&&!a.metaKey)&&this.resetState(),-1===this.lastKey_&&(a.ctrlKey&&a.keyCode!==f.CTRL?this.lastKey_=f.CTRL:a.altKey&&a.keyCode!==f.ALT?this.lastKey_=f.ALT:a.metaKey&&a.keyCode!==f.META&&(this.lastKey_=f.META)),l&&!f.firesKeyPressEvent(a.keyCode,this.lastKey_,a.shiftKey,a.ctrlKey,a.altKey)?this.handleEvent(a):(this.keyCode_=h.isGECKO?f.normalizeGeckoKeyCode(a.keyCode):a.keyCode,k&&(this.altKey_=a.altKey))},m.prototype.resetState=function(){this.lastKey_=-1,this.keyCode_=-1},m.prototype.handleKeyup_=function(a){this.resetState(),this.altKey_=a.altKey},m.prototype.handleEvent=function(a){var b,c,d=a.getBrowserEvent(),l=d.altKey;h.isIE&&a.type===e.KEYPRESS?(b=this.keyCode_,c=b!==f.ENTER&&b!==f.ESC?d.keyCode:0):h.isWEBKIT&&a.type===e.KEYPRESS?(b=this.keyCode_,c=d.charCode>=0&&d.charCode<63232&&f.isCharacterKey(b)?d.charCode:0):h.isOPERA?(b=this.keyCode_,c=f.isCharacterKey(b)?d.keyCode:0):(b=d.keyCode||this.keyCode_,c=d.charCode||0,k&&(l=this.altKey_),h.isMAC&&c===f.QUESTION_MARK&&b===f.WIN_KEY&&(b=f.SLASH));var m=b,n=d.keyIdentifier;b?b>=63232&&b in i?m=i[b]:25===b&&a.shiftKey&&(m=9):n&&n in j&&(m=j[n]);var o=m===this.lastKey_;this.lastKey_=m;var p=new g(m,c,o,d);p.altKey=l,this.dispatchEvent(p)},m.prototype.getElement=function(){return this.element_},m.prototype.attach=function(a,c){this.keyUpKey_&&this.detach(),this.element_=a,this.keyPressKey_=b.listen(this.element_,e.KEYPRESS,this,c),this.keyDownKey_=b.listen(this.element_,e.KEYDOWN,this.handleKeyDown_,c,this),this.keyUpKey_=b.listen(this.element_,e.KEYUP,this.handleKeyup_,c,this)},m.prototype.detach=function(){this.keyPressKey_&&(b.unlistenByKey(this.keyPressKey_),b.unlistenByKey(this.keyDownKey_),b.unlistenByKey(this.keyUpKey_),this.keyPressKey_=null,this.keyDownKey_=null,this.keyUpKey_=null),this.element_=null,this.lastKey_=-1,this.keyCode_=-1},m.prototype.disposeInternal=function(){m.superClass_.disposeInternal.call(this),this.detach()},m});