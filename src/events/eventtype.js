/**
 * @fileoverview Event Types.
 * @modified Leo.Zhang
 * @email zmike86@gmail.com
 */

define('Sogou.Events.EventType',
    ['Sogou.UA.Util'],
    function(ua) {

    'use strict';

    /**
     * @enum {string}
     */
    return {
        // 鼠标事件
        CLICK: 'click',
        DBLCLICK: 'dblclick',
        MOUSEDOWN: 'mousedown',
        MOUSEUP: 'mouseup',
        MOUSEOVER: 'mouseover',
        MOUSEOUT: 'mouseout',
        MOUSEMOVE: 'mousemove',
        SELECTSTART: 'selectstart', // IE, Safari, Chrome

        // 键盘事件
        KEYPRESS: 'keypress',
        KEYDOWN: 'keydown',
        KEYUP: 'keyup',

        // 焦点事件
        BLUR: 'blur',
        FOCUS: 'focus',
        DEACTIVATE: 'deactivate', // IE only
        // 注意: 以下两个事件在跨浏览器方面表现并不稳定.
        //     WebKit和Opera实现了DOMFocusIn/Out.IE实现了focusin/out.
        //     Gecko两者都没实现 see bug at https://bugzilla.mozilla.org/show_bug.cgi?id=396927.
        // The DOM Events Level 3 Draft deprecates DOMFocusIn in favor of focusin:
        //     http://dev.w3.org/2006/webapi/DOM-Level-3-Events/html/DOM3-Events.html
        // You can use FOCUS in Capture phase until implementations converge.
        FOCUSIN: ua.isIE ? 'focusin' : 'DOMFocusIn',
        FOCUSOUT: ua.isIE ? 'focusout' : 'DOMFocusOut',

        // 表单事件
        CHANGE: 'change',
        SELECT: 'select',
        SUBMIT: 'submit',
        INPUT: 'input',
        PROPERTYCHANGE: 'propertychange', // IE only

        // 拖拽事件
        DRAGSTART: 'dragstart',
        DRAG: 'drag',
        DRAGENTER: 'dragenter',
        DRAGOVER: 'dragover',
        DRAGLEAVE: 'dragleave',
        DROP: 'drop',
        DRAGEND: 'dragend',

        // WebKit touch events.
        TOUCHSTART: 'touchstart',
        TOUCHMOVE: 'touchmove',
        TOUCHEND: 'touchend',
        TOUCHCANCEL: 'touchcancel',

        // Misc
        BEFOREUNLOAD: 'beforeunload',
        CONSOLEMESSAGE: 'consolemessage',
        CONTEXTMENU: 'contextmenu',
        DOMCONTENTLOADED: 'DOMContentLoaded',
        ERROR: 'error',
        HELP: 'help',
        LOAD: 'load',
        LOSECAPTURE: 'losecapture',
        READYSTATECHANGE: 'readystatechange',
        RESIZE: 'resize',
        SCROLL: 'scroll',
        UNLOAD: 'unload',

        // HTML 5 History events
        // See http://www.w3.org/TR/html5/history.html#event-definitions
        HASHCHANGE: 'hashchange',
        PAGEHIDE: 'pagehide',
        PAGESHOW: 'pageshow',
        POPSTATE: 'popstate',

        // 复制粘贴事件使用有限. 需要确认在目标浏览器上支持这些事件.
        // http://www.quirksmode.org/dom/events/cutcopypaste.html
        COPY: 'copy',
        PASTE: 'paste',
        CUT: 'cut',
        BEFORECOPY: 'beforecopy',
        BEFORECUT: 'beforecut',
        BEFOREPASTE: 'beforepaste',

        // HTML5 online/offline events.
        // http://www.w3.org/TR/offline-webapps/#related
        ONLINE: 'online',
        OFFLINE: 'offline',

        // HTML5 worker events
        MESSAGE: 'message',
        CONNECT: 'connect',

        // CSS transition events. Based on the browser support described at:
        // https://developer.mozilla.org/en/css/css_transitions#Browser_compatibility
        TRANSITIONEND: ua.isWEBKIT ? 'webkitTransitionEnd' :
            (ua.isOPERA ? 'oTransitionEnd' : 'transitionend'),

        // IE specific events.
        // See http://msdn.microsoft.com/en-us/library/ie/hh673557(v=vs.85).aspx
        MSGESTURECHANGE: 'MSGestureChange',
        MSGESTUREEND: 'MSGestureEnd',
        MSGESTUREHOLD: 'MSGestureHold',
        MSGESTURESTART: 'MSGestureStart',
        MSGESTURETAP: 'MSGestureTap',
        MSGOTPOINTERCAPTURE: 'MSGotPointerCapture',
        MSINERTIASTART: 'MSInertiaStart',
        MSLOSTPOINTERCAPTURE: 'MSLostPointerCapture',
        MSPOINTERCANCEL: 'MSPointerCancel',
        MSPOINTERDOWN: 'MSPointerDown',
        MSPOINTERMOVE: 'MSPointerMove',
        MSPOINTEROVER: 'MSPointerOver',
        MSPOINTEROUT: 'MSPointerOut',
        MSPOINTERUP: 'MSPointerUp',

        // Native IMEs/input tools events.
        TEXTINPUT: 'textinput',
        COMPOSITIONSTART: 'compositionstart',
        COMPOSITIONUPDATE: 'compositionupdate',
        COMPOSITIONEND: 'compositionend',

        // Webview tag events
        // See http://developer.chrome.com/dev/apps/webview_tag.html
        EXIT: 'exit',
        LOADABORT: 'loadabort',
        LOADCOMMIT: 'loadcommit',
        LOADREDIRECT: 'loadredirect',
        LOADSTART: 'loadstart',
        LOADSTOP: 'loadstop',
        RESPONSIVE: 'responsive',
        SIZECHANGED: 'sizechanged',
        UNRESPONSIVE: 'unresponsive'
    };
});