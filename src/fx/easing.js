/**
 * @fileoverview 一些预设的加速函数. 代码copy自dojo library.
 * @modified Leo.Zhang
 * @email zmike86@gmail.com
 */

define('Sogou.FX.Easing', [], function() {

    'use strict';

    /**
     * 移出视口且有加速效果
     * @param {number} t 输入值在[0,1].
     * @return {number} 输出值在[0,1].
     */
    function bounceOut(t) {
        var s = 7.5625;
        var p = 2.75;
        var l;
        if (t < (1/p)) {
            l = s * Math.pow(t, 2);
        } else {
            if (t < (2/p)) {
                t -= (1.5/p);
                l = s * Math.pow(t, 2) + 0.75;
            } else {
                if (t < (2.5/p)) {
                    t -= (2.25/p);
                    l = s * Math.pow(t, 2) + 0.9375;
                } else {
                    t -= (2.625/p);
                    l = s * Math.pow(t, 2) + 0.984375;
                }
            }
        }
        return l;
    }

    return {
        /**
         * Ease in - 先慢后快
         * @param {number} t 输入值在[0,1].
         * @return {number} 输出值在[0,1].
         */
        easeIn: function(t) {
            return t * t * t;
        },

        /**
         * Ease out - 先快后慢
         * @param {number} t 输入值在[0,1].
         * @return {number} 输出值在[0,1].
         */
        easeOut: function(t) {
            return 1 - Math.pow(1 - t, 3);
        },

        /**
         * Ease in and out - 慢快慢
         * @param {number} t 输入值在[0,1].
         * @return {number} 输出值在[0,1].
         */
        inAndOut: function(t) {
            return 3 * t * t - 2 * t * t * t;
        },

        /**
         * Back in -
         * @param {number} t 输入值在[0,1].
         * @return {number} 输出值在[0,1].
         */
        backIn: function(t) {
            var s = 1.70158;
            return Math.pow(t, 2) * ((s + 1) * t - s);
        },

        /**
         * Back out -
         * @param {number} t 输入值在[0,1].
         * @return {number} 输出值在[0,1].
         */
        backOut: function(t) {
            t = t - 1;
            var s = 1.70158;
            return Math.pow(t, 2) * ((s + 1) * t + s) + 1;
        },

        /**
         * 进入视口且有反弹效果
         * @param {number} t 输入值在[0,1].
         * @return {number} 输出值在[0,1].
         */
        bounceIn:function(t) {
            return (1 - bounceOut(1 - t));
        },

        bounceOut: bounceOut
    };
});