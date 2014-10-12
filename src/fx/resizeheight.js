/**
 * @fileoverview resize height only
 * @modified Leo.Zhang
 * @email zmike86@gmail.com
 * @see ../../demos/effects.html
 */

define('Sogou.FX.ResizeHeight',
    [
        'Sogou.Util',
        'Sogou.FX.EffectBase'
    ],
    function(util, EffectBase) {

        'use strict';

        /**
         * 变化元素的高度
         * @param {Element} element 元素.
         * @param {number} start 开始高度.
         * @param {number} end 结束高度.
         * @param {number} time 时长.
         * @param {Function=} opt_acc 加速函数, returns 0-1 for inputs 0-1.
         * @extends {EffectBase}
         * @constructor
         */
        var ResizeHeight = function(element, start, end, time, opt_acc) {
            EffectBase.call(this, element, [start], [end], time, opt_acc);
        };

        util.inherits(ResizeHeight, EffectBase);


        /**
         * 只设置元素的高度.
         * @protected
         * @override
         */
        ResizeHeight.prototype.updateStyle = function() {
            this.element.style.height = Math.round(this.coords[0]) + 'px';
        };


        return ResizeHeight;
    }
);