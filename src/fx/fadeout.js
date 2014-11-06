/**
 * @fileoverview fade－out
 * @author Leo.Zhang
 * @email zmike86@gmail.com
 * @see ../../demos/effects.html
 */

define('@fx.fadeOut',
    ['@util','@fx.Fade'],
    function(util, Fade) {

        'use strict';

        /**
         * 元素从显示变化到完全透明.
         * @param {Element} element 元素.
         * @param {number} time 时长.
         * @param {Function=} opt_acc 加速函数, returns 0-1 for inputs 0-1.
         * @extends {Fade}
         * @constructor
         */
        var FadeOut = function(element, time, opt_acc) {
            Fade.call(this, element, 1, 0, time, opt_acc);
        };

        util.inherits(FadeOut, Fade);


        return FadeOut;
    }
);