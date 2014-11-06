/**
 * @fileoverview fade out and hide
 * @author Leo.Zhang
 * @email zmike86@gmail.com
 * @see ../../demos/effects.html
 */

define('@fx.fadeOutAndHide',
    [
        '@util',
        '@fx.fade'
    ],
    function(util, Fade) {

        'use strict';

        /**
         * 淡隐并隐藏
         * @param {Element} element 元素.
         * @param {number} time 时长.
         * @param {Function=} opt_acc 加速函数, returns 0-1 for inputs 0-1.
         * @extends {Fade}
         * @constructor
         */
        var FadeOutAndHide = function(element, time, opt_acc) {
            Fade.call(this, element, 1, 0, time, opt_acc);
        };

        util.inherits(FadeOutAndHide, Fade);


        /** @override */
        FadeOutAndHide.prototype.onBegin = function() {
            this.show();
            FadeOutAndHide.superClass_.onBegin.call(this);
        };


        /** @override */
        FadeOutAndHide.prototype.onEnd = function() {
            this.hide();
            FadeOutAndHide.superClass_.onEnd.call(this);
        };


        return FadeOutAndHide;
    }
);