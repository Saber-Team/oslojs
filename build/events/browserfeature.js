/** Oslo JavaScript Framework. */
define("@events.browserfeature",["@ua.util"],function(a){"use strict";return{HAS_W3C_BUTTON:!a.isIE||a.isDocumentModeOrHigher(9),HAS_W3C_EVENT_SUPPORT:!a.isIE||a.isDocumentModeOrHigher(9),SET_KEY_CODE_TO_PREVENT_DEFAULT:a.isIE&&!a.isVersionOrHigher("9"),HAS_NAVIGATOR_ONLINE_PROPERTY:!a.isWEBKIT||a.isVersionOrHigher("528"),HAS_HTML5_NETWORK_EVENT_SUPPORT:a.isGECKO&&a.isVersionOrHigher("1.9b")||a.isIE&&a.isVersionOrHigher("8")||a.isOPERA&&a.isVersionOrHigher("9.5")||a.isWEBKIT&&a.isVersionOrHigher("528"),HTML5_NETWORK_EVENTS_FIRE_ON_BODY:a.isGECKO&&!a.isVersionOrHigher("8")||a.isIE&&!a.isVersionOrHigher("9"),TOUCH_ENABLED:"ontouchstart"in window||!!(window.document&&document.documentElement&&"ontouchstart"in document.documentElement)||!(!window.navigator||!window.navigator.msMaxTouchPoints)}});