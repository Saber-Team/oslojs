/**
 * @fileoverview ColorTransform
 * @author Leo.Zhang
 * @email zmike86@gmail.com
 */

define('@fx.colorTransform',
    [
        '@util',
        '@fx.effectBase'
    ],
    function(util, EffectBase) {

        'use strict';

        /**
         * 渐变元素前景色.
         * @param {Element} element 元素.
         * @param {Array.<number>} start 开始颜色 R,G,B.
         * @param {Array.<number>} end 结束颜色 R,G,B.
         * @param {number} time 时长.
         * @param {Function=} opt_acc 加速函数, returns 0-1 for inputs 0-1.
         * @constructor
         * @extends {EffectBase}
         */
        var ColorTransform = function(element, start, end, time, opt_acc) {
            if (start.length !== 3 || end.length !== 3) {
                throw Error('Start and end points must be 3D');
            }
            EffectBase.apply(this, arguments);
        };

        util.inherits(ColorTransform, EffectBase);


        /**
         * 改变前景色.
         * @protected
         * @override
         */
        ColorTransform.prototype.updateStyle = function() {
            var coordsAsInts = [];
            for (var i = 0; i < this.coords.length; i++) {
                coordsAsInts[i] = Math.round(this.coords[i]);
            }
            this.element.style.color = 'rgb(' + coordsAsInts.join(',') + ')';
        };


        return ColorTransform;
    }
);