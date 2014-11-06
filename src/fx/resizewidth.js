/**
 * @fileoverview resize width only
 * @author Leo.Zhang
 * @email zmike86@gmail.com
 * @see ../../demos/effects.html
 */

define('@fx.resizeWidth',
    [
        '@util',
        '@fx.effectBase'
    ],
    function(util, EffectBase) {

        'use strict';

        /**
         * 变化元素的宽度
         * @param {Element} element 元素.
         * @param {number} start 开始宽度.
         * @param {number} end 结束宽度.
         * @param {number} time 时长.
         * @param {Function=} opt_acc 加速函数, returns 0-1 for inputs 0-1.
         * @extends {EffectBase}
         * @constructor
         */
        var ResizeWidth = function(element, start, end, time, opt_acc) {
            EffectBase.call(this, element, [start], [end], time, opt_acc);
        };

        util.inherits(ResizeWidth, EffectBase);


        /**
         * 改变元素宽度.
         * @protected
         * @override
         */
        ResizeWidth.prototype.updateStyle = function() {
            this.element.style.width = Math.round(this.coords[0]) + 'px';
        };


        return ResizeWidth;
    }
);