/**
 * @fileoverview 包含按键码值的常量. 代码模块来自于国外的库
 * @author Leo.Zhang
 * @email zmike86@gmail.com
 * @see ../../demos/keyhandler.html
 */

define([
    '../util/util',
    '../ua/util'
  ],
  function(util, ua) {

    'use strict';

    /**
     * 普通字符的码值
     * 没有做本地化,一些非美式键盘码值可能存在错误
     * See comments below.
     * @enum {number}
     */
    var KeyCodes = {
      WIN_KEY_FF_LINUX: 0,
      MAC_ENTER: 3,
      BACKSPACE: 8,
      TAB: 9,
      NUM_CENTER: 12,  // NUMLOCK on FF/Safari Mac
      ENTER: 13,
      SHIFT: 16,
      CTRL: 17,
      ALT: 18,
      PAUSE: 19,
      CAPS_LOCK: 20,
      ESC: 27,
      SPACE: 32,
      PAGE_UP: 33,     // also NUM_NORTH_EAST
      PAGE_DOWN: 34,   // also NUM_SOUTH_EAST
      END: 35,         // also NUM_SOUTH_WEST
      HOME: 36,        // also NUM_NORTH_WEST
      LEFT: 37,        // also NUM_WEST
      UP: 38,          // also NUM_NORTH
      RIGHT: 39,       // also NUM_EAST
      DOWN: 40,        // also NUM_SOUTH
      PRINT_SCREEN: 44,
      INSERT: 45,      // also NUM_INSERT
      DELETE: 46,      // also NUM_DELETE
      ZERO: 48,
      ONE: 49,
      TWO: 50,
      THREE: 51,
      FOUR: 52,
      FIVE: 53,
      SIX: 54,
      SEVEN: 55,
      EIGHT: 56,
      NINE: 57,
      FF_SEMICOLON: 59, // Firefox (Gecko) fires this for semicolon instead of 186
      FF_EQUALS: 61, // Firefox (Gecko) fires this for equals instead of 187
      QUESTION_MARK: 63, // needs localization
      A: 65,
      B: 66,
      C: 67,
      D: 68,
      E: 69,
      F: 70,
      G: 71,
      H: 72,
      I: 73,
      J: 74,
      K: 75,
      L: 76,
      M: 77,
      N: 78,
      O: 79,
      P: 80,
      Q: 81,
      R: 82,
      S: 83,
      T: 84,
      U: 85,
      V: 86,
      W: 87,
      X: 88,
      Y: 89,
      Z: 90,
      META: 91, // WIN_KEY_LEFT
      WIN_KEY_RIGHT: 92,
      CONTEXT_MENU: 93,
      NUM_ZERO: 96,
      NUM_ONE: 97,
      NUM_TWO: 98,
      NUM_THREE: 99,
      NUM_FOUR: 100,
      NUM_FIVE: 101,
      NUM_SIX: 102,
      NUM_SEVEN: 103,
      NUM_EIGHT: 104,
      NUM_NINE: 105,
      NUM_MULTIPLY: 106,
      NUM_PLUS: 107,
      NUM_MINUS: 109,
      NUM_PERIOD: 110,
      NUM_DIVISION: 111,
      F1: 112,
      F2: 113,
      F3: 114,
      F4: 115,
      F5: 116,
      F6: 117,
      F7: 118,
      F8: 119,
      F9: 120,
      F10: 121,
      F11: 122,
      F12: 123,
      NUMLOCK: 144,
      SCROLL_LOCK: 145,

      // OS-specific media keys like volume controls and browser controls.
      FIRST_MEDIA_KEY: 166,
      LAST_MEDIA_KEY: 183,

      SEMICOLON: 186,            // needs localization
      DASH: 189,                 // needs localization
      EQUALS: 187,               // needs localization
      COMMA: 188,                // needs localization
      PERIOD: 190,               // needs localization
      SLASH: 191,                // needs localization
      APOSTROPHE: 192,           // needs localization
      TILDE: 192,                // needs localization
      SINGLE_QUOTE: 222,         // needs localization
      OPEN_SQUARE_BRACKET: 219,  // needs localization
      BACKSLASH: 220,            // needs localization
      CLOSE_SQUARE_BRACKET: 221, // needs localization
      WIN_KEY: 224,
      MAC_FF_META: 224, // Firefox (Gecko) fires this for the meta key instead of 91
      WIN_IME: 229,

      // We've seen users whose machines fire this keycode at regular one
      // second intervals. The common thread among these users is that
      // they're all using Dell Inspiron laptops, so we suspect that this
      // indicates a hardware/bios problem.
      // http://en.community.dell.com/support-forums/laptop/f/3518/p/19285957/19523128.aspx
      PHANTOM: 255
    };

    /**
     * 键盘事件是否会改变文本需要判断, 如果包含的键值会改变则返回true.
     * @param {BrowserEvent} e A key event.
     * @return {boolean} Whether it's a text modifying key.
     */
    KeyCodes.isTextModifyingKeyEvent = function(e) {
      // 功能键不会生成字符
      if (e.altKey && !e.ctrlKey || e.metaKey ||
        e.keyCode >= KeyCodes.F1 && e.keyCode <= KeyCodes.F12) {
        return false;
      }

      // 下列键值一般无害, 即使同CTRL, ALT, SHIFT一起使用.
      switch (e.keyCode) {
        case KeyCodes.ALT:
        case KeyCodes.CAPS_LOCK:
        case KeyCodes.CONTEXT_MENU:
        case KeyCodes.CTRL:
        case KeyCodes.DOWN:
        case KeyCodes.END:
        case KeyCodes.ESC:
        case KeyCodes.HOME:
        case KeyCodes.INSERT:
        case KeyCodes.LEFT:
        case KeyCodes.MAC_FF_META:
        case KeyCodes.META:
        case KeyCodes.NUMLOCK:
        case KeyCodes.NUM_CENTER:
        case KeyCodes.PAGE_DOWN:
        case KeyCodes.PAGE_UP:
        case KeyCodes.PAUSE:
        case KeyCodes.PHANTOM:
        case KeyCodes.PRINT_SCREEN:
        case KeyCodes.RIGHT:
        case KeyCodes.SCROLL_LOCK:
        case KeyCodes.SHIFT:
        case KeyCodes.UP:
        case KeyCodes.WIN_KEY:
        case KeyCodes.WIN_KEY_RIGHT:
          return false;
        case KeyCodes.WIN_KEY_FF_LINUX:
          return !ua.isGECKO;
        default:
          return e.keyCode < KeyCodes.FIRST_MEDIA_KEY ||
            e.keyCode > KeyCodes.LAST_MEDIA_KEY;
      }
    };

    /**
     * 如果按下的键会在当前浏览器触发keypress事件则返回true.
     * 根据MSDN [1] IE仅会在如下的键触发keypress事件:
     * - Letters: A - Z (uppercase and lowercase)
     * - Numerals: 0 - 9
     * - Symbols: ! @ # $ % ^ & * ( ) _ - + = < [ ] { } , . / ? \ | ' ` " ~
     * - System: ESC, SPACEBAR, ENTER
     *
     * That's not entirely correct though, for instance there's no distinction
     * between upper and lower case letters.
     *
     * [1] http://msdn2.microsoft.com/en-us/library/ms536939(VS.85).aspx)
     *
     * Safari行为类似于IE, 但ESC不会触发keypress.
     * 另外, IE6在ctrl/alt按下但shift没按下的时候不会触发字母按键的keydown或keypress事件.
     * IE7在这种情况下不会触发keypress但会触发keydown.
     *
     * @param {number} keyCode A key code.
     * @param {number=} opt_heldKeyCode Key code of a currently-held key.
     * @param {boolean=} opt_shiftKey 是否按下了shift key.
     * @param {boolean=} opt_ctrlKey 是否按下了control key.
     * @param {boolean=} opt_altKey 是否按下了alt key.
     * @return {boolean} 是否指定的键值会触发keypress事件.
     */
    KeyCodes.firesKeyPressEvent = function(keyCode, opt_heldKeyCode,
                                           opt_shiftKey, opt_ctrlKey, opt_altKey) {
      if (!ua.isIE && !(ua.isWEBKIT && ua.isVersionOrHigher('525'))) {
        return true;
      }

      if (ua.isMAC && opt_altKey) {
        return KeyCodes.isCharacterKey(keyCode);
      }

      // Alt but not AltGr which is represented as Alt+Ctrl.
      if (opt_altKey && !opt_ctrlKey) {
        return false;
      }

      // Saves Ctrl or Alt + key for IE and WebKit 525+, which won't fire keypress.
      // Non-IE browsers and WebKit prior to 525 won't get this far so no need to
      // check the user agent.
      if (!opt_shiftKey &&
        (opt_heldKeyCode === KeyCodes.CTRL ||
          opt_heldKeyCode === KeyCodes.ALT ||
          ua.isMAC && opt_heldKeyCode === KeyCodes.META)) {
        return false;
      }

      // Some keys with Ctrl/Shift do not issue keypress in WEBKIT.
      if (ua.isWEBKIT && opt_ctrlKey && opt_shiftKey) {
        switch (keyCode) {
          case KeyCodes.BACKSLASH:
          case KeyCodes.OPEN_SQUARE_BRACKET:
          case KeyCodes.CLOSE_SQUARE_BRACKET:
          case KeyCodes.TILDE:
          case KeyCodes.SEMICOLON:
          case KeyCodes.DASH:
          case KeyCodes.EQUALS:
          case KeyCodes.COMMA:
          case KeyCodes.PERIOD:
          case KeyCodes.SLASH:
          case KeyCodes.APOSTROPHE:
          case KeyCodes.SINGLE_QUOTE:
            return false;
        }
      }

      // When Ctrl+<somekey> is held in IE, it only fires a keypress once, but it
      // continues to fire keydown events as the event repeats.
      if (ua.isIE && opt_ctrlKey && opt_heldKeyCode === keyCode) {
        return false;
      }

      switch (keyCode) {
        case KeyCodes.ENTER:
          // IE9 does not fire KEYPRESS on ENTER.
          return !(ua.isIE && ua.isDocumentModeOrHigher(9));
        case KeyCodes.ESC:
          return !ua.isWEBKIT;
      }

      return KeyCodes.isCharacterKey(keyCode);
    };

    /**
     * 如果按下的键会生成一个字符则返回true.
     * 这个方法不包含非美式键盘的情况(Russian, Hebrew, etc.).
     * @param {number} keyCode A key code.
     * @return {boolean} Whether it's a character key.
     */
    KeyCodes.isCharacterKey = function(keyCode) {
      if (keyCode >= KeyCodes.ZERO && keyCode <= KeyCodes.NINE) {
        return true;
      }

      if (keyCode >= KeyCodes.NUM_ZERO && keyCode <= KeyCodes.NUM_MULTIPLY) {
        return true;
      }

      if (keyCode >= KeyCodes.A && keyCode <= KeyCodes.Z) {
        return true;
      }

      // Safari sends zero key code for non-latin characters.
      if (ua.isWEBKIT && keyCode === 0) {
        return true;
      }

      switch (keyCode) {
        case KeyCodes.SPACE:
        case KeyCodes.QUESTION_MARK:
        case KeyCodes.NUM_PLUS:
        case KeyCodes.NUM_MINUS:
        case KeyCodes.NUM_PERIOD:
        case KeyCodes.NUM_DIVISION:
        case KeyCodes.SEMICOLON:
        case KeyCodes.FF_SEMICOLON:
        case KeyCodes.DASH:
        case KeyCodes.EQUALS:
        case KeyCodes.FF_EQUALS:
        case KeyCodes.COMMA:
        case KeyCodes.PERIOD:
        case KeyCodes.SLASH:
        case KeyCodes.APOSTROPHE:
        case KeyCodes.SINGLE_QUOTE:
        case KeyCodes.OPEN_SQUARE_BRACKET:
        case KeyCodes.BACKSLASH:
        case KeyCodes.CLOSE_SQUARE_BRACKET:
          return true;
        default:
          return false;
      }
    };

    /**
     * 基于Gecko的浏览器(FireFox)在keycode返回值上有所不同. 这个方法将键值转化成标准的值.
     * @param {number} keyCode 原来的key code.
     * @return {number} 标准化后的key code.
     */
    KeyCodes.normalizeGeckoKeyCode = function(keyCode) {
      switch (keyCode) {
        case KeyCodes.FF_EQUALS:
          return KeyCodes.EQUALS;
        case KeyCodes.FF_SEMICOLON:
          return KeyCodes.SEMICOLON;
        case KeyCodes.MAC_FF_META:
          return KeyCodes.META;
        case KeyCodes.WIN_KEY_FF_LINUX:
          return KeyCodes.WIN_KEY;
        default:
          return keyCode;
      }
    };

    return KeyCodes;
  }
);