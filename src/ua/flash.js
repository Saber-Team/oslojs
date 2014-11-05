/**
 * @fileoverview Flash检测模块.
 * @author Leo.Zhang
 * @email zmike86@gmail.com
 * @see ../../demos/useragent.html
 */

define('@ua.flash', ['@string.util'], function(string) {

    'use strict';

    /**
     * 我们是否检测到浏览器flash插件
     * @type {boolean}
     * @private
     */
    var detectedFlash_ = false;

    /**
     * 安装flash的具体版本, 如7.0.61
     * @type {string}
     * @private
     */
    var detectedFlashVersion_ = '';

    // chrome & FF
    if (navigator.plugins && navigator.plugins.length) {
        var plugin = navigator.plugins['Shockwave Flash'];
        if (plugin) {
            detectedFlash_ = true;
            if (plugin.description)
                detectedFlashVersion_ = getVersion_(plugin.description);
        }
        if (navigator.plugins['Shockwave Flash 2.0']) {
            detectedFlash_ = true;
            detectedFlashVersion_ = '2.0.0.11';
        }
    // chrome & FF
    } else if (navigator.mimeTypes && navigator.mimeTypes.length) {
        var mimeType = navigator.mimeTypes['application/x-shockwave-flash'];
        detectedFlash_ = mimeType && mimeType.enabledPlugin;
        if (detectedFlash_)
            detectedFlashVersion_ = getVersion_(mimeType.enabledPlugin.description);
    // IE
    } else {
        var ax;
        /** @preserveTry */
        try {
            // 先检查是否7是因为可以直接用GetVariable方法.
            ax = new ActiveXObject('ShockwaveFlash.ShockwaveFlash.7');
            detectedFlash_ = true;
            detectedFlashVersion_ = getVersion_(ax.GetVariable('$version'));
        } catch (e) {
            // 在检测6, 某些版本调用GetVariable会崩溃.
            /** @preserveTry */
            try {
                ax = new ActiveXObject('ShockwaveFlash.ShockwaveFlash.6');
                detectedFlash_ = true;
                // 赋值为Flash 6的第一个版本
                detectedFlashVersion_ = '6.0.21';
            } catch (e2) {
                /** @preserveTry */
                try {
                    // Try the default activeX
                    ax = new ActiveXObject('ShockwaveFlash.ShockwaveFlash');
                    detectedFlash_ = true;
                    detectedFlashVersion_ = getVersion_(ax.GetVariable('$version'));
                } catch (e3) {
                    // No flash
                }
            }
        }
    }

    /**
     * 这段代码来自于Apple建议的sniffer.
     * @param {string} desc e.g. Shockwave Flash 7.0 r61.
     * @return {string} 7.0.61.
     * @private
     */
    function getVersion_(desc) {
        var matches = desc.match(/[\d]+/g);
        matches.length = 3;  // To standardize IE vs FF
        return matches.join('.');
    }

    return {
        HAS_FLASH: detectedFlash_,
        VERSION: detectedFlashVersion_,
        /**
         * 给定一个版本号.检测是否当前flash的版本高于等于给定的版本号.
         * @param {string} version 给定版本号.
         * @return {boolean}
         */
        isVersion: function(version) {
            return string.compareVersions(detectedFlashVersion_, version) >= 0;
        }
    }

});