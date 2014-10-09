/**
 * @fileoverview 动画事件
 * @modified Leo.Zhang
 * @email zmike86@gmail.com
 */

define('Sogou.FX.AnimationEvent',
    [
        'Sogou.Util',
        'Sogou.Array',
        'Sogou.Events.EventBase'
    ],
    function(util, array, EventBase) {

        'use strict';

        /**
         * 动画事件
         * @param {string} type 事件类型.
         * @param {Animation} anim 动画对象.
         * @constructor
         * @extends {Event}
         */
        var AnimationEvent = function(type, anim) {

            EventBase.call(this, type);

            /**
             * 当前曲线位置.
             * @type {Array.<number>}
             */
            this.coords = anim.coords;

            /**
             * 动画曲线x轴坐标.
             * @type {number}
             */
            this.x = anim.coords[0];

            /**
             * 动画曲线y轴坐标.
             * @type {number}
             */
            this.y = anim.coords[1];

            /**
             * 动画曲线z轴坐标.
             * @type {number}
             */
            this.z = anim.coords[2];

            /**
             * 当前经过的时长.
             * @type {number}
             */
            this.duration = anim.duration;

            /**
             * 当前进度.
             * @type {number}
             */
            this.progress = anim.getProgress();

            /**
             * Frames per second so far.
             */
            this.fps = anim.fps_;

            /**
             * 动画状态.
             * @type {number}
             */
            this.state = anim.getStateInternal();

        };
        util.inherits(AnimationEvent, EventBase);


        /**
         * 返回当前所处的动画曲线位置(rounded to nearest integer).
         * @return {Array.<number>} An array of the coordinates rounded to
         *     the nearest integer.
         */
        AnimationEvent.prototype.coordsAsInts = function() {
            return array.map(this.coords, Math.round);
        };


        return AnimationEvent;

    }
);