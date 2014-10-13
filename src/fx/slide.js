/**
 * @fileoverview slide
 * @modified Leo.Zhang
 * @email zmike86@gmail.com
 * @see ../../demos/effects.html
 */

define('Sogou.FX.Slide',
    [
        'Sogou.Util',
        'Sogou.FX.EffectBase'
    ],
    function(util, EffectBase) {

        'use strict';

        /**
         * 把元素从A移动到B
         * @param {Element} element Dom节点
         * @param {Array.<number>} start 开始坐标 (X, Y).
         * @param {Array.<number>} end 结束坐标 (X, Y).
         * @param {number} time 动画时长毫秒
         * @param {Function=} opt_acc 动画加速函数，输入输出都是 0-1 之间
         * @extends {PredefinedEffect}
         * @constructor
         */
        var Slide = function(element, start, end, time, opt_acc) {
            if (start.length !== 2 || end.length !== 2) {
                throw Error('Start and end points must be 2D');
            }
            EffectBase.apply(this, arguments);
        };

        util.inherits(Slide, EffectBase);


        /** @override */
        Slide.prototype.updateStyle = function() {
            var pos = (this.isRightPositioningForRtlEnabled() && this.isRightToLeft()) ?
                'right' : 'left';
            this.element.style[pos] = Math.round(this.coords[0]) + 'px';
            this.element.style.top = Math.round(this.coords[1]) + 'px';
        };


        return Slide;
    }
);