/**
 * @fileoverview 根据浏览器的厂商和版本号进行特性的判断.
 * @author Leo.Zhang
 * @email zmike86@gmail.com
 */

define('@events.browserFeature', ['@ua.util'], function(ua) {

    'use strict';

    /**
     * 一个枚举值表明了浏览器的能力.这样做依赖了UA检测, 依据是浏览器官方的指南
     * 指南声明了各版本浏览器的兼容和特性随着浏览器更新需要不断变化
     * @enum {boolean}
     */
    return {
        /**
         * Whether the button attribute of the event is W3C compliant.  False in
         * Internet Explorer prior to version 9; document-version dependent.
         */
        HAS_W3C_BUTTON: !ua.isIE || ua.isDocumentModeOrHigher(9),

        /**
         * Whether the browser supports full W3C event model.
         */
        HAS_W3C_EVENT_SUPPORT: !ua.isIE || ua.isDocumentModeOrHigher(9),

        /**
         * To prevent default in IE7-8 for certain keydown events we need set the
         * keyCode to -1.
         */
        SET_KEY_CODE_TO_PREVENT_DEFAULT: ua.isIE && !ua.isVersionOrHigher('9'),

        /**
         * Whether the {@code navigator.onLine} property is supported.
         */
        HAS_NAVIGATOR_ONLINE_PROPERTY: !ua.isWEBKIT || ua.isVersionOrHigher('528'),

        /**
         * Whether HTML5 network online/offline events are supported.
         */
        HAS_HTML5_NETWORK_EVENT_SUPPORT:
            ua.isGECKO && ua.isVersionOrHigher('1.9b') ||
                ua.isIE && ua.isVersionOrHigher('8') ||
                ua.isOPERA && ua.isVersionOrHigher('9.5') ||
                ua.isWEBKIT && ua.isVersionOrHigher('528'),

        /**
         * Whether HTML5 network events fire on document.body, or otherwise the
         * window.
         */
        HTML5_NETWORK_EVENTS_FIRE_ON_BODY:
            ua.isGECKO && !ua.isVersionOrHigher('8') || ua.isIE && !ua.isVersionOrHigher('9'),

        /**
         * Whether touch is enabled in the browser.
         */
        TOUCH_ENABLED:
            ('ontouchstart' in window ||
                !!(window.document &&
                    document.documentElement &&
                    'ontouchstart' in document.documentElement) ||
                // IE10 uses non-standard touch events, so it has a different check.
                !!(window.navigator && window.navigator.msMaxTouchPoints))
    };

});