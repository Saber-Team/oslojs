/**
 * @fileoverview fade in and show
 * @author Leo.Zhang
 * @email zmike86@gmail.com
 * @see ../../demos/effects.html
 */

define('@fx.fadeInAndShow',
    ['@util','@fx.Fade'],
    function(util, Fade) {

        'use strict';

        /**
         * 先让元素可见再变成不透明.
         * @param {Element} element 元素.
         * @param {number} time 时长.
         * @param {Function=} opt_acc 加速函数, returns 0-1 for inputs 0-1.
         * @extends {Fade}
         * @constructor
         */
        var FadeInAndShow = function(element, time, opt_acc) {
            Fade.call(this, element, 0, 1, time, opt_acc);
        };

        util.inherits(FadeInAndShow, Fade);


        /** @override */
        FadeInAndShow.prototype.onBegin = function() {
            this.show();
            FadeInAndShow.superClass_.onBegin.call(this);
        };


        return FadeInAndShow;
    }
);