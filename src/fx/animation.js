/**
 * @fileoverview 动画类
 * @from DojoToolkit
 * @author Leo.Zhang
 * @email zmike86@gmail.com
 */

define('@fx.animation',
    [
        '@util',
        '@fx.transitionBase',
        '@fx.eventType',
        '@fx.util',
        '@fx.animationEvent'
    ],
    function(util, TransitionBase, FXEventType, fx, AnimationEvent) {

        'use strict';

        /**
         * 动画类
         * @param {Array.<number>} start 开始坐标点数组
         * @param {Array.<number>} end 结束坐标点数组
         * @param {number} duration 毫秒时长
         * @param {Function=} opt_acc 动画加速函数, returns 0-1 for inputs 0-1.
         * @constructor
         * @extends {TransitionBase}
         */
        var Animation = function(start, end, duration, opt_acc) {
            TransitionBase.call(this);

            if (!util.isArray(start) || !util.isArray(end)) {
                throw Error('Start and end parameters must be arrays');
            }
            if (start.length !== end.length) {
                throw Error('Start and end points must be the same length');
            }

            /**
             * 开始坐标
             * @type {Array.<number>}
             * @protected
             */
            this.startPoint = start;

            /**
             * 结束坐标
             * @type {Array.<number>}
             * @protected
             */
            this.endPoint = end;

            /**
             * 时长
             * @type {number}
             * @protected
             */
            this.duration = duration;

            /**
             * 加速函数
             * @type {Function|undefined}
             * @private
             */
            this.accel_ = opt_acc;

            /**
             * 当前坐标
             * @type {Array.<number>}
             * @protected
             */
            this.coords = [];

            /**
             * 元素是否RTL渲染模式.
             * @type {boolean}
             * @private
             */
            this.useRightPositioningForRtl_ = false;
        };

        util.inherits(Animation, TransitionBase);


        // 混入原型
        util.mixin(Animation.prototype, {
            /**
             * 是否对元素设置了rtl模式.
             * @param {boolean} useRightPositioningForRtl True if "right" should be used for
             *     positioning.
             */
            enableRightPositioningForRtl: function(useRightPositioningForRtl) {
                this.useRightPositioningForRtl_ = useRightPositioningForRtl;
            },

            /**
             * 判断是否rtl模式的元素.
             * @return {boolean}
             */
            isRightPositioningForRtlEnabled: function() {
                return this.useRightPositioningForRtl_;
            },

            /**
             * 帧频率
             * @type {number}
             * @private
             */
            fps_: 0,

            /**
             * 进度
             * @type {number}
             * @protected
             */
            progress: 0,

            /**
             * 上一帧的时间戳
             * @type {?number}
             * @protected
             */
            lastFrame: null,

            /**
             * 开始或回复动画
             * @param {boolean=} opt_restart 如果是暂停状态是否从开始处重新播放
             * @return {boolean}
             * @override
             */
            play: function(opt_restart) {
                if (opt_restart || this.isStopped()) {
                    this.progress = 0;
                    this.coords = this.startPoint;
                } else if (this.isPlaying()) {
                    return false;
                }

                fx.unregisterAnimation(this);

                var now = /** @type {number} */ (util.now());

                this.startTime = now;
                if (this.isPaused()) {
                    this.startTime -= this.duration * this.progress;
                }

                this.endTime = this.startTime + this.duration;
                this.lastFrame = this.startTime;

                if (!this.progress) {
                    this.onBegin();
                }

                this.onPlay();

                if (this.isPaused()) {
                    this.onResume();
                }

                this.setStatePlaying();

                fx.registerAnimation(this);
                this.cycle(now);

                return true;
            },

            /**
             * 停止动画
             * @param {boolean=} opt_gotoEnd 是否归位到结束
             * @override
             */
            stop: function(opt_gotoEnd) {
                fx.unregisterAnimation(this);
                this.setStateStopped();

                if (!!opt_gotoEnd) {
                    this.progress = 1;
                }

                this.updateCoords_(this.progress);

                this.onStop();
                this.onEnd();
            },

            /**
             * 暂停动画 (if it's playing).
             * @override
             */
            pause: function() {
                if (this.isPlaying()) {
                    fx.unregisterAnimation(this);
                    this.setStatePaused();
                    this.onPause();
                }
            },

            /**
             * @return {number} 0-1之间的数代表当前进度
             */
            getProgress: function() {
                return this.progress;
            },

            /**
             * 设置动画的进度
             * @param {number} progress The new progress of the animation.
             */
            setProgress: function(progress) {
                this.progress = progress;
                if (this.isPlaying()) {
                    var now = (util.now());
                    // 如果正在播放, 重新计算startTime 和 endTime 保持动画的一致:
                    // now = startTime + progress * duration.
                    this.startTime = now - this.duration * this.progress;
                    this.endTime = this.startTime + this.duration;
                }
            },

            /**
             * 西沟动画对象. 分发destroy事件,移除事件绑定
             * @override
             * @protected
             */
            disposeInternal: function() {
                if (!this.isStopped()) {
                    this.stop(false);
                }
                this.onDestroy();
                Animation.superClass_.disposeInternal.call(this);
            },

            /** @override */
            onAnimationFrame: function(now) {
                this.cycle(now);
            },

            /**
             * 延时后真正的处理函数.
             * @param {number} now 当前时间戳.
             */
            cycle: function(now) {
                this.progress = (now - this.startTime) / (this.endTime - this.startTime);

                if (this.progress >= 1) {
                    this.progress = 1;
                }

                this.fps_ = 1000 / (now - this.lastFrame);
                this.lastFrame = now;

                this.updateCoords_(this.progress);

                // Animation has finished.
                if (this.progress === 1) {
                    this.setStateStopped();
                    fx.unregisterAnimation(this);

                    this.onFinish();
                    this.onEnd();

                // Animation is still under way.
                } else if (this.isPlaying()) {
                    this.onAnimate();
                }
            },

            /**
             * 依据当前状态计算位置.  Applies the accelleration function if it exists.
             * @param {number} t 当前动画进度的百分比
             * @private
             */
            updateCoords_: function(t) {
                if (util.isFunction(this.accel_)) {
                    t = this.accel_(t);
                }
                this.coords = new Array(this.startPoint.length);
                for (var i = 0; i < this.startPoint.length; i++) {
                    this.coords[i] = (this.endPoint[i] - this.startPoint[i]) * t +
                        this.startPoint[i];
                }
            },

            /**
             * 分发 ANIMATE 事件.
             * @protected
             */
            onAnimate: function() {
                this.dispatchAnimationEvent(FXEventType.ANIMATE);
            },

            /**
             * 分发 DESTROY 事件.
             * @protected
             */
            onDestroy: function() {
                this.dispatchAnimationEvent(FXEventType.DESTROY);
            },

            /** @override */
            dispatchAnimationEvent: function(type) {
                this.dispatchEvent(new AnimationEvent(type, this));
            }
        });


        return Animation;

    }
);