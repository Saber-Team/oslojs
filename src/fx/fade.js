/**
 * @fileoverview fade
 * @author Leo.Zhang
 * @email zmike86@gmail.com
 * @see ../../demos/effects.html
 */

define('@fx.Fade',
    [
        '@util',
        '@style.util',
        '@fx.effectBase'
    ],
    function(util, style, EffectBase) {

        'use strict';

        /**
         * 变化元素的透明度,可以在两个值之间连续变幻.float ＝ [0,1]
         * @param {Element} element 使用的元素.
         * @param {Array.<number>|number} start 一位数组或一个数字表示开始的透明度.
         * @param {Array.<number>|number} end 一位数组或一个数字表示结束的透明度.
         * @param {number} time 动画时长ms.
         * @param {Function=} opt_acc 加速函数, returns 0-1 for inputs 0-1.
         * @extends {EffectBase}
         * @constructor
         */
        var Fade = function(element, start, end, time, opt_acc) {
            if (util.isNumber(start))
                start = [start];

            if (util.isNumber(end))
                end = [end];

            EffectBase.call(this, element, start, end, time, opt_acc);

            if (start.length !== 1 || end.length !== 1) {
                throw Error('Start and end points must be 1D');
            }
        };

        util.inherits(Fade, EffectBase);


        /**
         * 更新元素样式.
         * @protected
         * @override
         */
        Fade.prototype.updateStyle = function() {
            style.setOpacity(this.element, this.coords[0]);
        };


        /**
         * 显示元素,这里去掉显示设置而是使用样式表里默认的设置.
         */
        Fade.prototype.show = function() {
            this.element.style.display = '';
        };


        /**
         * 隐藏元素.
         */
        Fade.prototype.hide = function() {
            this.element.style.display = 'none';
        };


        return Fade;
    }
);