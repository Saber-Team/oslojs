/**
 * @fileoverview 获得浏览器厂商的前缀(Vendor prefix getters).
 * @author Leo.Zhang
 * @email zmike86@gmail.com
 */

define('@dom.vender', ['@ua.util'], function(ua) {

    'use strict';

    return {
        /**
         * JS设置CSS属性的时候某些厂商的变量前缀不同, 尤其是CSS3的新属性
         * @return {?string} The JS vendor prefix or null if there is none.
         */
        getVendorJsPrefix: function() {
            if (ua.isWEBKIT)
                return 'Webkit';
            else if (ua.isGECKO)
                return 'Moz';
            else if (ua.isIE)
                return 'ms';
            else if (ua.isOPERA)
                return 'O';
            return null;
        },
        /**
         * 返回CSS属性因不同厂商而不同的前缀, 与上个方法不同, 这个方法返回的是CSS前缀
         * @return {?string} The vendor prefix or null if there is none.
         */
        getVendorPrefix: function() {
            if (ua.isWEBKIT)
                return '-webkit';
            else if (ua.isGECKO)
                return '-moz';
            else if (ua.isIE)
                return '-ms';
            else if (ua.isOPERA)
                return '-o';
            return null;
        }
    };
});