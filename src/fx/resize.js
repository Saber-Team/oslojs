/**
 * @fileoverview resize
 * @modified Leo.Zhang
 * @email zmike86@gmail.com
 * @see ../../demos/effects.html
 */

define('Sogou.FX.Resize',
    [
        'Sogou.Util',
        'Sogou.FX.EffectBase'
    ],
    function(util, EffectBase) {

        'use strict';

        /**
         * 缩放尺寸
         * @param {Element} element 元素.
         * @param {Array.<number>} start 二位数组存开始储宽高.
         * @param {Array.<number>} end 二位数组存储结束宽高.
         * @param {number} time 时长.
         * @param {Function=} opt_acc 加速函数, returns 0-1 for inputs 0-1.
         * @extends {EffectBase}
         * @constructor
         */
        var Resize = function(element, start, end, time, opt_acc) {
            if (start.length !== 2 || end.length !== 2) {
                throw Error('Start and end points must be 2D');
            }
            EffectBase.apply(this, arguments);
        };

        util.inherits(Resize, EffectBase);


        /**
         * 设置宽高.
         * @protected
         * @override
         */
        Resize.prototype.updateStyle = function() {
            this.element.style.width = Math.round(this.coords[0]) + 'px';
            this.element.style.height = Math.round(this.coords[1]) + 'px';
        };


        return Resize;
    }
);