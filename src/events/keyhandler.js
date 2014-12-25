/**
 * @fileoverview 本模块包含的类处理键盘事件在各浏览器及系统的兼容性问题.
 * 包括重复触发和key code问题.
 * 不同的浏览器对键盘事件处理不同, 其中最重要的是只有几个浏览器会repeat
 * keydown events: IE, Opera, FF/Win32, Safari 3.而FF/Mac和Safari 2不会.
 *
 * For the purposes of this code, "Safari 3" means WebKit 525+, when WebKit
 * decided that they should try to match IE's key handling behavior.
 * Safari 3.0.4, which shipped with Leopard (WebKit 523), has the
 * Safari 2 behavior.
 *
 * Firefox, Safari, Opera prevent on keypress
 *
 * IE prevents on keydown
 *
 * Firefox does not fire keypress for shift, ctrl, alt
 * Firefox does fire keydown for shift, ctrl, alt, meta
 * Firefox does not repeat keydown for shift, ctrl, alt, meta
 *
 * Firefox does not fire keypress for up and down in an input
 *
 * Opera fires keypress for shift, ctrl, alt, meta
 * Opera does not repeat keypress for shift, ctrl, alt, meta
 *
 * Safari 2 and 3 do not fire keypress for shift, ctrl, alt
 * Safari 2 does not fire keydown for shift, ctrl, alt
 * Safari 3 *does* fire keydown for shift, ctrl, alt
 *
 * IE provides the keycode for keyup/down events and the charcode (in the
 * keycode field) for keypress.
 *
 * Mozilla provides the keycode for keyup/down and the charcode for keypress
 * unless it's a non text modifying key in which case the keycode is provided.
 *
 * Safari 3 provides the keycode and charcode for all events.
 *
 * Opera provides the keycode for keyup/down event and either the charcode or
 * the keycode (in the keycode field) for keypress events.
 *
 * Firefox x11 doesn't fire keydown events if a another key is already held down
 * until the first key is released. This can cause a key event to be fired with
 * a keyCode for the first key and a charCode for the second key.
 *
 * Safari in keypress
 *
 *        charCode keyCode which
 * ENTER:       13      13    13
 * F1:       63236   63236 63236
 * F8:       63243   63243 63243
 * ...
 * p:          112     112   112
 * P:           80      80    80
 *
 * Firefox, keypress:
 *
 *        charCode keyCode which
 * ENTER:        0      13    13
 * F1:           0     112     0
 * F8:           0     119     0
 * ...
 * p:          112       0   112
 * P:           80       0    80
 *
 * Opera, Mac+Win32, keypress:
 *
 *         charCode keyCode which
 * ENTER: undefined      13    13
 * F1:    undefined     112     0
 * F8:    undefined     119     0
 * ...
 * p:     undefined     112   112
 * P:     undefined      80    80
 *
 * IE7, keydown
 *
 *         charCode keyCode     which
 * ENTER: undefined      13 undefined
 * F1:    undefined     112 undefined
 * F8:    undefined     119 undefined
 * ...
 * p:     undefined      80 undefined
 * P:     undefined      80 undefined
 *
 * @author Leo.Zhang
 * @email zmike86@gmail.com
 * @see ../../demos/keyhandler.html
 */

define([
    '../util/util',
    './util',
    './browserevent',
    './eventtarget',
    './eventtype',
    './keycodes',
    './keyevent',
    '../ua/util'
  ],
  function(util, EventsUtil, BrowserEvent, EventTarget, EventType, KeyCodes, KeyEvent, ua) {

    'use strict';

    /**
     * 在Safari 2中返回不正确的key codes.
     * @type {Object}
     * @private
     */
    var safariKey_ = {
      '3': KeyCodes.ENTER, // 13
      '12': KeyCodes.NUMLOCK, // 144
      '63232': KeyCodes.UP, // 38
      '63233': KeyCodes.DOWN, // 40
      '63234': KeyCodes.LEFT, // 37
      '63235': KeyCodes.RIGHT, // 39
      '63236': KeyCodes.F1, // 112
      '63237': KeyCodes.F2, // 113
      '63238': KeyCodes.F3, // 114
      '63239': KeyCodes.F4, // 115
      '63240': KeyCodes.F5, // 116
      '63241': KeyCodes.F6, // 117
      '63242': KeyCodes.F7, // 118
      '63243': KeyCodes.F8, // 119
      '63244': KeyCodes.F9, // 120
      '63245': KeyCodes.F10, // 121
      '63246': KeyCodes.F11, // 122
      '63247': KeyCodes.F12, // 123
      '63248': KeyCodes.PRINT_SCREEN, // 44
      '63272': KeyCodes.DELETE, // 46
      '63273': KeyCodes.HOME, // 36
      '63275': KeyCodes.END, // 35
      '63276': KeyCodes.PAGE_UP, // 33
      '63277': KeyCodes.PAGE_DOWN, // 34
      '63289': KeyCodes.NUMLOCK, // 144
      '63302': KeyCodes.INSERT // 45
    };

    /**
     * 一些键的id出现在W3C draft for DOM3. 详见:
     * http://www.w3.org/TR/DOM-Level-3-Events/keyset.html#KeySet-Set
     * 目前Safari支持,应该分平台考虑.
     * @type {Object}
     * @private
     */
    var keyIdentifier_ = {
      'Up': KeyCodes.UP, // 38
      'Down': KeyCodes.DOWN, // 40
      'Left': KeyCodes.LEFT, // 37
      'Right': KeyCodes.RIGHT, // 39
      'Enter': KeyCodes.ENTER, // 13
      'F1': KeyCodes.F1, // 112
      'F2': KeyCodes.F2, // 113
      'F3': KeyCodes.F3, // 114
      'F4': KeyCodes.F4, // 115
      'F5': KeyCodes.F5, // 116
      'F6': KeyCodes.F6, // 117
      'F7': KeyCodes.F7, // 118
      'F8': KeyCodes.F8, // 119
      'F9': KeyCodes.F9, // 120
      'F10': KeyCodes.F10, // 121
      'F11': KeyCodes.F11, // 122
      'F12': KeyCodes.F12, // 123
      'U+007F': KeyCodes.DELETE, // 46
      'Home': KeyCodes.HOME, // 36
      'End': KeyCodes.END, // 35
      'PageUp': KeyCodes.PAGE_UP, // 33
      'PageDown': KeyCodes.PAGE_DOWN, // 34
      'Insert': KeyCodes.INSERT // 45
    };

    /**
     * 在此条件下需要在keydown时缓存alt key且在key press时复用.
     * FF on Mac does not set the alt flag in the key press event.
     * @type {boolean}
     * @private
     */
    var SAVE_ALT_FOR_KEYPRESS_ = ua.isMAC && ua.isGECKO;

    /**
     * 是否用keydown事件触发. 否则用keypress.
     * @type {boolean}
     * @private
     */
    var USES_KEYDOWN_ = ua.isIE || ua.isWEBKIT && ua.isVersionOrHigher('525');

    /**
     * 键盘事件处理器封装类.
     * @param {Element|Document=} opt_element 监听元素.
     * @param {boolean=} opt_capture 是否处理捕获阶段(默认false).
     * @constructor
     * @extends {EventTarget}
     */
    var KeyHandler = function(opt_element, opt_capture) {
      EventTarget.call(this);

      if (opt_element) {
        this.attach(opt_element, opt_capture);
      }
    };

    util.inherits(KeyHandler, EventTarget);

    /**
     * 监听元素.
     * @type {Element|Document|null}
     * @private
     */
    KeyHandler.prototype.element_ = null;

    /**
     * key press listener.
     * @type {Listener}
     * @private
     */
    KeyHandler.prototype.keyPressKey_ = null;

    /**
     * key down listener.
     * @type {Listener}
     * @private
     */
    KeyHandler.prototype.keyDownKey_ = null;

    /**
     * key up listener.
     * @type {Listener}
     * @private
     */
    KeyHandler.prototype.keyUpKey_ = null;

    /**
     * 用于检测键盘的连续事件.
     * @private
     * @type {number}
     */
    KeyHandler.prototype.lastKey_ = -1;

    /**
     * 记录key down事件中的Keycode. 大多数浏览器不会在keypress事件报告keycode,
     * 我们要在此之前的key down阶段记录keycode.
     * @private
     * @type {number}
     */
    KeyHandler.prototype.keyCode_ = -1;

    /**
     * key down事件中的alt key. Mac上的FF不会在key press事件中带有alt key,
     * 我们要在此之前的key down阶段记录keycode.
     * @type {boolean}
     * @private
     */
    KeyHandler.prototype.altKey_ = false;

    /**
     * 对只在keydown/up事件才有keycode的浏览器存储其keycode.
     * 对于不会触发key pressed的一些组合键情况(用keycodes模块的firesKeyPressEvent方法判断)
     * 仍然会触发事件处理器.
     * @param {BrowserEvent} e The key down event.
     * @private
     */
    KeyHandler.prototype.handleKeyDown_ = function(e) {
      // Ctrl-Tab 和 Alt-Tab 会移动焦点去别的窗口在我们处理key-up event之前.
      // If the last-key was one of these we reset the state.
      if (ua.isWEBKIT) {
        if (this.lastKey_ === KeyCodes.CTRL && !e.ctrlKey ||
          this.lastKey_ === KeyCodes.ALT && !e.altKey ||
          ua.isMAC && this.lastKey_ === KeyCodes.META && !e.metaKey) {
          this.resetState();
        }
      }

      if (this.lastKey_ === -1) {
        if (e.ctrlKey && e.keyCode !== KeyCodes.CTRL) {
          this.lastKey_ = KeyCodes.CTRL;
        }
        else if (e.altKey && e.keyCode !== KeyCodes.ALT) {
          this.lastKey_ = KeyCodes.ALT;
        }
        else if (e.metaKey && e.keyCode !== KeyCodes.META) {
          this.lastKey_ = KeyCodes.META;
        }
      }

      if (USES_KEYDOWN_ && !KeyCodes.firesKeyPressEvent(
        e.keyCode, this.lastKey_, e.shiftKey, e.ctrlKey, e.altKey)) {
        this.handleEvent(e);
      } else {
        this.keyCode_ = ua.isGECKO ?
          KeyCodes.normalizeGeckoKeyCode(e.keyCode) : e.keyCode;
        if (SAVE_ALT_FOR_KEYPRESS_) {
          this.altKey_ = e.altKey;
        }
      }
    };

    /**
     * 重置上一状态的值.
     * Needed to be called for webkit which will not generate a key up for meta key
     * operations. This should only be called when having finished with repeat key possiblities.
     */
    KeyHandler.prototype.resetState = function() {
      this.lastKey_ = -1;
      this.keyCode_ = -1;
    };

    /**
     * 清楚之前缓存的key code,重置键重复的状态(key repeat status).用-1是因为Safari 3 Windows beta
     * 某些键值返回0(比如Home键和End键).
     * @param {BrowserEvent} e The keyup event.
     * @private
     */
    KeyHandler.prototype.handleKeyup_ = function(e) {
      this.resetState();
      this.altKey_ = e.altKey;
    };

    /**
     * 事件处理器.
     * @param {BrowserEvent} e
     */
    KeyHandler.prototype.handleEvent = function(e) {
      var be = e.getBrowserEvent();
      var keyCode, charCode;
      var altKey = be.altKey;

      // IE在keypress事件中的keyCode是字符码值. 有两个例外, Enter,Escape.
      if (ua.isIE && e.type === EventType.KEYPRESS) {
        keyCode = this.keyCode_;
        charCode = (keyCode !== KeyCodes.ENTER && keyCode !== KeyCodes.ESC ?
          be.keyCode : 0);

        // Safari在keypress事件中的keyCode是字符码值.
        // 但同时也含有charCode属性.
      } else if (ua.isWEBKIT && e.type === EventType.KEYPRESS) {
        keyCode = this.keyCode_;
        charCode = be.charCode >= 0 && be.charCode < 63232 &&
          KeyCodes.isCharacterKey(keyCode) ?
          be.charCode : 0;

        // Opera含有keyCode字段指示字符码值.
      } else if (ua.isOPERA) {
        keyCode = this.keyCode_;
        charCode = KeyCodes.isCharacterKey(keyCode) ?
          be.keyCode : 0;

        // Mozilla则通过charCode字段指示字符码值.
      } else {
        keyCode = be.keyCode || this.keyCode_;
        charCode = be.charCode || 0;
        if (SAVE_ALT_FOR_KEYPRESS_) {
          altKey = this.altKey_;
        }
        // On the Mac, shift-/ triggers a question mark char code and no key code
        // (normalized to WIN_KEY), so we synthesize the latter.
        if (ua.isMAC && charCode === KeyCodes.QUESTION_MARK &&
          keyCode === KeyCodes.WIN_KEY) {
          keyCode = KeyCodes.SLASH;
        }
      }

      var key = keyCode;
      var keyIdentifier = be.keyIdentifier;

      // 解决浏览器在码值方面的bug, 直接依据浏览器判断
      if (keyCode) {
        if (keyCode >= 63232 && keyCode in safariKey_) {
          //Safari 3修改了这个问题,该问题只存在于Safari 2.
          key = safariKey_[keyCode];
        } else {
          // Safari Shift+Tab返回25而不是9.
          if (keyCode === 25 && e.shiftKey) {
            key = 9;
          }
        }
      } else if (keyIdentifier && keyIdentifier in keyIdentifier_) {
        // This is needed for Safari Windows because it currently doesn't give a
        // keyCode/which for non printable keys.
        key = keyIdentifier_[keyIdentifier];
      }

      // 如果两次得到了(keypress或者keydown)相同的keycode但没有触发keyup事件, 则很可能是连续
      // 按键导致的(比如用户长按某键不放)
      var repeat = (key === this.lastKey_);
      this.lastKey_ = key;

      var event = new KeyEvent(key, charCode, repeat, be);
      event.altKey = altKey;
      this.dispatchEvent(event);
    };

    /**
     * 返回监听元素.
     * @return {Element|Document|null}
     */
    KeyHandler.prototype.getElement = function() {
      return this.element_;
    };

    /**
     * 绑定事件.
     * @param {Element|Document} element 元素.
     * @param {boolean=} opt_capture 是否在捕获阶段监听(默认false).
     */
    KeyHandler.prototype.attach = function(element, opt_capture) {
      if (this.keyUpKey_) {
        this.detach();
      }

      this.element_ = element;

      this.keyPressKey_ = EventsUtil.listen(this.element_,
        EventType.KEYPRESS, this, opt_capture);

      // 大多数浏览器(Safari 2例外)在keypress事件中不包含keyCode(IE有keyCode但实际是char code,
      // Mozilla只在没有charCode的属性时才会加一个keyCode属性).因此我们在keydown事件中存储keycode.
      this.keyDownKey_ = EventsUtil.listen(this.element_,
        EventType.KEYDOWN, this.handleKeyDown_, opt_capture, this);

      this.keyUpKey_ = EventsUtil.listen(this.element_,
        EventType.KEYUP, this.handleKeyup_, opt_capture, this);
    };

    /**
     * 移除句柄处理器.
     */
    KeyHandler.prototype.detach = function() {
      if (this.keyPressKey_) {
        EventsUtil.unlistenByKey(this.keyPressKey_);
        EventsUtil.unlistenByKey(this.keyDownKey_);
        EventsUtil.unlistenByKey(this.keyUpKey_);
        this.keyPressKey_ = null;
        this.keyDownKey_ = null;
        this.keyUpKey_ = null;
      }
      this.element_ = null;
      this.lastKey_ = -1;
      this.keyCode_ = -1;
    };

    /** @override */
    KeyHandler.prototype.disposeInternal = function() {
      KeyHandler.superClass_.disposeInternal.call(this);
      this.detach();
    };

    return KeyHandler;
  }
);