/**
 * @fileoverview fade-in
 * @modified Leo.Zhang
 * @email zmike86@gmail.com
 * @see ../../demos/effects.html
 */

define('Sogou.FX.FadeIn',
    ['Sogou.Util','Sogou.FX.Fade'],
    function(util, Fade) {

        'use strict';

        /**
         * 从完全透明变化到实心不透明.
         * @param {Element} element 元素.
         * @param {number} time 时长.
         * @param {Function=} opt_acc 加速函数, returns 0-1 for inputs 0-1.
         * @extends {Fade}
         * @constructor
         */
        var FadeIn = function(element, time, opt_acc) {
            Fade.call(this, element, 0, 1, time, opt_acc);
        };

        util.inherits(FadeIn, Fade);

        return FadeIn;
    }
);