/**
 * @fileoverview 函数节流类
 * @author Leo.Zhang
 * @email zmike86@gmail.com
 * @see ../../demos/timers.html
 */

define('@async.throttle',
    [
        '@util',
        '@disposable',
        '@timer'
    ],
    function(util, Disposable, Timer) {

        'use strict';

        /**
         * 构造函数的参数和Delay的一样, Throttle在指定时间间隔内只会执行最多1次必要动作.
         * 如果在waiting的时候得到了多次执行函数的指令, 仍然只在interval结束时执行一次.
         * @param {Function} listener 用户想要定时执行的方法.
         * @param {number} interval 执行间隔. 每个间隔内listener只会被触发一次.
         * @param {Object=} opt_context listener执行上下文.
         * @constructor
         * @extends {Disposable}
         */
        var Throttle = function(listener, interval, opt_context) {
            Disposable.call(this);

            /**
             * 要触发的函数.
             * @type {Function}
             * @private
             */
            this.listener_ = listener;

            /**
             * 节流的时间间隔
             * @type {number}
             * @private
             */
            this.interval_ = interval;

            /**
             * 函数上下文
             * @type {Object|undefined}
             * @private
             */
            this.context_ = opt_context;

            /**
             * 在timeout完成后调用onTimer_.
             * @type {Function}
             * @private
             */
            this.callback_ = util.bind(this.onTimer_, this);
        };

        util.inherits(Throttle, Disposable);


        /**
         * 指示挂起(pending)的action是否要被触发调用.
         * 因为只有一个shouldFire_所以不可能等待的行为都会触发,
         * 只有在最后一次之后才会触发一次多余的action.
         * @type {boolean}
         * @private
         */
        Throttle.prototype.shouldFire_ = false;


        /**
         * 表示throttle当前留下的调用数目.
         * 当这个数不是0, fire的调用会被推迟到有足够的时间使得挂起的调用都执行完毕.
         * @type {number}
         * @private
         */
        Throttle.prototype.pauseCount_ = 0;


        /**
         * timerid
         * @type {?number}
         * @private
         */
        Throttle.prototype.timer_ = null;


        /**
         * 通知throttle有情况发生了,这个动作可能是无限快的发生. throttle会节流这些调用以致callback不会过于频繁调用.
         * 实际上除了第一次会触发doAction_其余都是设置shouldFire_为true.
         */
        Throttle.prototype.fire = function() {
            // 如果timer_不存在且没有暂停等待的action才会doAction_
            if (!this.timer_ && !this.pauseCount_) {
                this.doAction_();
                // 否则：如果timer_存在(正在等待过程 或 pauseCount_不为0)
                // 标记shouldFire_为true
            } else {
                this.shouldFire_ = true;
            }
        };


        /**
         * 取消等待执行的定时器. throttle可以调用fire方法重启.
         */
        Throttle.prototype.stop = function() {
            if (this.timer_) {
                Timer.clear(this.timer_);
                this.timer_ = null;
                this.shouldFire_ = false;
            }
        };


        /**
         * 暂停throttle. 所有等待的回调都会被推迟到throttle恢复. 可多次调用pause.
         */
        Throttle.prototype.pause = function() {
            this.pauseCount_++;
        };


        /**
         * 恢复throttle. 如果暂停回调数目降到了0, 等待的回调会立马触发,但仍然是距离上次调用至少间隔指定时间.
         * 未来的调用会正常执行.
         */
        Throttle.prototype.resume = function() {
            this.pauseCount_--;
            // 当没有pauseCount_且shouldFire且没有timer在等待才执行doAction
            if (!this.pauseCount_ && this.shouldFire_ && !this.timer_) {
                this.shouldFire_ = false;
                this.doAction_();
            }
        };


        /** @override */
        Throttle.prototype.disposeInternal = function() {
            Throttle.superClass_.disposeInternal.call(this);
            this.stop();
        };


        /**
         * 定时器触发throttle
         * @private
         */
        Throttle.prototype.onTimer_ = function() {
            this.timer_ = null;
            // 有需要触发的 并且pauseCount_为0
            if (this.shouldFire_ && !this.pauseCount_) {
                this.shouldFire_ = false;
                this.doAction_();
            }
        };


        /**
         * 执行动作函数, 并在interval时间后执行onTimer_
         * @private
         */
        Throttle.prototype.doAction_ = function() {
            this.timer_ = Timer.callOnce(this.callback_, this.interval_);
            // 实际执行了用户想要的函数
            this.listener_.call(this.context_);
        };


        return Throttle;

    }
);