/**
 * @fileoverview BgColorTransform
 * @modified Leo.Zhang
 * @email zmike86@gmail.com
 * @see ../../demos/effects.html
 */

define('Sogou.FX.BgColorTransform',
    [
        'Sogou.Util',
        'Sogou.Color',
        'Sogou.Events.Util',
        'Sogou.FX.EventType',
        'Sogou.Style.Util',
        'Sogou.FX.EffectBase'
    ],
    function(util, color, EventUtil, EventType, style, EffectBase) {

        'use strict';

        /**
         * 背景色切换动画
         * 坐标数组需要代表颜色的R,G,B
         * @param {Element} element 元素.
         * @param {Array.<number>} start 三位数组表示 RGB 颜色值.
         * @param {Array.<number>} end 三位数组表示结束 RGB 颜色.
         * @param {number} time 时长.
         * @param {Function=} opt_acc 加速函数, returns 0-1 for inputs 0-1.
         * @extends {EffectBase}
         * @constructor
         */
        var BgColorTransform = function(element, start, end, time, opt_acc) {
            if (start.length !== 3 || end.length !== 3) {
                throw Error('Start and end points must be 3D');
            }

            EffectBase.apply(this, arguments);
        };

        util.inherits(BgColorTransform, EffectBase);


        /**
         * 设置背景色.
         */
        BgColorTransform.prototype.setColor = function() {
            var coordsAsInts = [];
            for (var i = 0; i < this.coords.length; i++) {
                coordsAsInts[i] = Math.round(this.coords[i]);
            }
            this.element.style.backgroundColor = 'rgb(' + coordsAsInts.join(',') + ')';
        };


        /** @override */
        BgColorTransform.prototype.updateStyle = function() {
            this.setColor();
        };


        /**
         * 从给定的背景色渐变到目前的背景色
         * start坐标数组需要代表颜色的R,G,B
         * @param {Element} element 元素.
         * @param {Array.<number>} start 开始颜色.
         * @param {number} time 时长.
         * @param {HandlerManager=} opt_handlerManager Optional event handler
         *     to use when listening for events.
         */
        BgColorTransform.fadeIn = function(element, start, time, opt_handlerManager) {
            var initialBgColor = element.style.backgroundColor || '';
            var computedBgColor = style.getBackgroundColor(element);
            var end;

            if (computedBgColor && computedBgColor !== 'transparent' &&
                computedBgColor !== 'rgba(0, 0, 0, 0)') {
                end = color.hexToRgb(color.parse(computedBgColor).hex);
            } else {
                end = [255, 255, 255];
            }

            var anim = new BgColorTransform(element, start, end, time);

            function setBgColor() {
                element.style.backgroundColor = initialBgColor;
            }

            if (opt_handlerManager) {
                opt_handlerManager.listen(anim, EventType.END, setBgColor);
            } else {
                EventUtil.listen(anim, EventType.END, setBgColor);
            }

            anim.play();
        };


        return BgColorTransform;
    }
);