/**
 * @fileoverview slidefrom
 * @author Leo.Zhang
 * @email zmike86@gmail.com
 * @see ../../demos/effects.html
 */

define('@fx.slideFrom',
    [
        '@util',
        '@style.bidi',
        '@fx.slide'
    ],
    function(util, bidi, Slide) {

        'use strict';

        /**
         * 从当前位置移动到一点
         * @param {Element} element Dom节点
         * @param {Array.<number>} end 结束坐标 (X, Y).
         * @param {number} time 动画时长毫秒
         * @param {Function=} opt_acc 动画加速函数，输入输出都是 0-1 之间
         * @extends {Slide}
         * @constructor
         */
        var SlideFrom = function(element, end, time, opt_acc) {
            var offsetLeft = this.isRightPositioningForRtlEnabled() ?
                bidi.getOffsetStart(element) : element.offsetLeft;

            var start = [offsetLeft, element.offsetTop];

            Slide.call(this, element, start, end, time, opt_acc);
        };

        util.inherits(SlideFrom, Slide);


        /** @override */
        SlideFrom.prototype.onBegin = function() {
            var offsetLeft = this.isRightPositioningForRtlEnabled() ?
                bidi.getOffsetStart(this.element) : this.element.offsetLeft;

            this.startPoint = [offsetLeft, this.element.offsetTop];

            SlideFrom.superClass_.onBegin.call(this);
        };


        return SlideFrom;
    }
);