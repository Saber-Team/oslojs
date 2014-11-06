/**
 * @fileoverview swipe
 * @author Leo.Zhang
 * @email zmike86@gmail.com
 * @see ../../demos/effects.html
 * @notes  direction是dom中不常用的属性，标识文本的流动方向
 *         http://www.w3school.com.cn/cssref/pr_text_direction.asp
 *
 */

define('@fx.swipe',
    [
        '@util',
        '@style.bidi',
        '@fx.effectBase'
    ],
    function(util, bidi, EffectBase) {

        'use strict';

        /**
         * 卷开或卷入一个元素到指定尺寸。
         * 这个元素必须是绝对定位
         * @param {Element} element Dom节点
         * @param {Array.<number>} start 开始尺寸 (W, H).
         * @param {Array.<number>} end 结束尺寸 (W, H).
         * @param {number} time 动画毫秒时长
         * @param {Function=} opt_acc 加速函数
         * @extends {PredefinedEffect}
         * @constructor
         */
        var Swipe = function(element, start, end, time, opt_acc) {
            if (start.length !== 2 || end.length !== 2) {
                throw Error('Start and end points must be 2D');
            }

            EffectBase.apply(this, arguments);

            /**
             * 计算较大的宽度
             * @type {number}
             * @private
             */
            this.maxWidth_ = Math.max(this.endPoint[0], this.startPoint[0]);

            /**
             * 计算较大的高度
             * @type {number}
             * @private
             */
            this.maxHeight_ = Math.max(this.endPoint[1], this.startPoint[1]);
        };

        util.inherits(Swipe, EffectBase);


        /**
         * 通过改变宽高和设置clip改变元素的尺寸.
         * @protected
         * @override
         */
        Swipe.prototype.updateStyle = function() {
            // 取当前宽高
            var x = this.coords[0];
            var y = this.coords[1];
            this.clip_(Math.round(x), Math.round(y), this.maxWidth_, this.maxHeight_);
            this.element.style.width = Math.round(x) + 'px';
            var marginX = (this.isRightPositioningForRtlEnabled() &&
                this.isRightToLeft()) ? 'marginRight' : 'marginLeft';

            this.element.style[marginX] = Math.round(x) - this.maxWidth_ + 'px';
            this.element.style.marginTop = Math.round(y) - this.maxHeight_ + 'px';
        };


        /**
         * Helper function for setting element clipping.
         * @param {number} x 当前宽
         * @param {number} y 当前高
         * @param {number} w Maximum element width.
         * @param {number} h Maximum element height.
         * @private
         */
        Swipe.prototype.clip_ = function(x, y, w, h) {
            this.element.style.clip =
                'rect(' + (h - y) + 'px ' + w + 'px ' + h + 'px ' + (w - x) + 'px)';
        };


        return Swipe;
    }
);