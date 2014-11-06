/**
 * @fileoverview scroll
 * @author Leo.Zhang
 * @email zmike86@gmail.com
 * @see ../../demos/effects.html
 */

define('@fx.Scroll',
    [
        '@util',
        '@style.bidi',
        '@fx.effectBase'
    ],
    function(util, bidi, EffectBase) {

        'use strict';

        /**
         * 将一个节点从 A 滚动到 B
         * @param {Element} element 元素.
         * @param {Array.<number>} start 二位数组分别是开始的 left and top.
         * @param {Array.<number>} end 二位数组分别是 left and top.
         * @param {number} time 时长.
         * @param {Function=} opt_acc 加速函数, returns 0-1 for inputs 0-1.
         * @extends {PredefinedEffect}
         * @constructor
         */
        var Scroll = function(element, start, end, time, opt_acc) {
            if (start.length !== 2 || end.length !== 2) {
                throw Error('Start and end points must be 2D');
            }

            EffectBase.apply(this, arguments);
        };

        util.inherits(Scroll, EffectBase);


        /**
         * 更新样式
         * @protected
         * @override
         */
        Scroll.prototype.updateStyle = function() {
            if (this.isRightPositioningForRtlEnabled()) {
                bidi.setScrollOffset(this.element, Math.round(this.coords[0]));
            } else {
                this.element.scrollLeft = Math.round(this.coords[0]);
            }
            this.element.scrollTop = Math.round(this.coords[1]);
        };


        return Scroll;
    }
);