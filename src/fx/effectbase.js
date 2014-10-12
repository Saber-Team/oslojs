/**
 * @fileoverview 预定义动画类型
 * @modified Leo.Zhang
 * @email zmike86@gmail.com
 * @see ../../demos/effects.html
 */

define('Sogou.FX.EffectBase',
    [
        'Sogou.Util',
        'Sogou.Style.Util',
        'Sogou.FX.Animation'
    ],
    function(util, style, Animation) {

        'use strict';

        /**
         * 预定义一些动画的抽象类
         * @param {Element} element Dom节点
         * @param {Array.<number>} start 开始坐标
         * @param {Array.<number>} end 结束坐标
         * @param {number} time 动画时长毫秒
         * @param {Function=} opt_acc 加速函数,输入和输出都是[0,1]区间.
         * @extends {Animation}
         * @constructor
         */
        var EffectBase = function(element, start, end, time, opt_acc) {

            Animation.call(this, start, end, time, opt_acc);

            /**
             * DOM节点
             * @type {Element}
             */
            this.element = element;

            /**
             * 是否由右→左渲染right-to-left
             * @type {boolean|undefined}
             * @private
             */
            this.rightToLeft_;

        };

        util.inherits(EffectBase, Animation);


        /**
         * 更新元素的样式.
         * @protected
         */
        EffectBase.prototype.updateStyle = util.nullFunction;


        /**
         * 元素渲染模式是否right-to-left. 这个属性可以后设置.
         * @type {boolean|undefined}
         * @private
         */
        EffectBase.prototype.rightToLeft_;


        /**
         * 判断函数,返回元素是否是right-to-left.
         * @return {boolean}
         */
        EffectBase.prototype.isRightToLeft = function() {
            if (util.isNull(this.rightToLeft_)) {
                this.rightToLeft_ = style.isRightToLeft(this.element);
            }
            return this.rightToLeft_;
        };


        /** @override */
        EffectBase.prototype.onAnimate = function() {
            this.updateStyle();
            EffectBase.superClass_.onAnimate.call(this);
        };


        /** @override */
        EffectBase.prototype.onEnd = function() {
            this.updateStyle();
            EffectBase.superClass_.onEnd.call(this);
        };


        /** @override */
        EffectBase.prototype.onBegin = function() {
            this.updateStyle();
            EffectBase.superClass_.onBegin.call(this);
        };


        return EffectBase;

    }
);