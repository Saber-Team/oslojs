/**
 * @fileoverview 提供了一个定时器的类,其他类或对象可对监听tick事件.
 * 其实就是Interval的一个封装类. 全局代码完全木有用到setInterval.
 * 这个文件很重要虽然只有区区300行, 但是在动画的实现, hashchange
 * 和async等等实现上都起到重要作用。
 * @author Leo.Zhang
 * @email zmike86@gmail.com
 * @see ../../demos/timers.html
 */

define('@Timer',
    ['@util', '@events.eventTarget'],
    function(util, EventTarget) {

        'use strict';

        /**
         * 处理时间事件的类.
         * 这个类是EventTarget的子类
         * @param {number=} opt_interval 毫秒数(Default: 1ms).
         * @param {Object=} opt_timerObject  一个拥有setTimeout, setInterval,
         *     clearTimeout and clearInterval四个方法的对象 (eg Window).
         * @constructor
         * @extends {EventTarget}
         */
        var Timer = function(opt_interval, opt_timerObject) {
            EventTarget.call(this);
            /**
             * 间隔毫秒数
             * @type {number}
             * @private
             */
            this.interval_ = opt_interval || 1;
            /**
             * 实现了setTimout, setInterval, clearTimeout和clearInterval的对象.
             * 默认是window对象
             * @type {Object}
             * @private
             */
            this.timerObject_ = opt_timerObject || window;
            /**
             * 给tick的监听器绑定函数上下文为timer实例对象.
             * this.tick_就是监听器函数.
             * @type {Function}
             * @private
             */
            this.boundTick_ = util.bind(this.tick_, this);
            /**
             * Firefox 有时候会短于间隔时间触发执行的代码(sometimes MUCH sooner).
             * 所以我们保留这个last_私有属性比较上次触发的时间, 以便重新计算间隔时间.
             * 可以看Timer.intervalScale
             * @type {number}
             * @private
             */
            this.last_ = +new Date();
        };
        util.inherits(Timer, EventTarget);

        /**
         * 最大值时间间隔.
         * 间隔时间过大(大于32位有符号整型的最大值)会引起很多浏览器边界溢出. 最终会很快执行
         * 函数. 所以不能超过这个值, 谁会设置24.8天啊
         * @type {number}
         * @private
         */
        var MAX_TIMEOUT_ = 2147483647;

        /**
         * timer是否被激活.
         * @type {boolean}
         */
        Timer.prototype.enabled = false;

        /**
         * 针对FF的经典bug. 用这个变量保存一个系数,当小于规定的时间间隔触发了函数,
         * 定时器会被重新计算补齐时间差. last_字段会作为比较.
         * @type {number}
         */
        var intervalScale = 0.8;

        /**
         * 保存timer id(可空类型)
         * @type {?number}
         * @private
         */
        Timer.prototype.timer_ = null;

        /**
         * 返回了时间间隔的数值.
         * @return {number} interval Number of ms between ticks.
         */
        Timer.prototype.getInterval = function() {
            return this.interval_;
        };

        /**
         * 设置timer的执行间隔.
         * 根据this.enabled决定替换现有interval还是直接停止.
         * @param {number} interval Number of ms between ticks.
         */
        Timer.prototype.setInterval = function(interval) {
            this.interval_ = interval;
            if (this.timer_ && this.enabled) {
                // Stop and then start the timer to reset the interval.
                this.stop();
                this.start();
            } else if (this.timer_) {
                this.stop();
            }
        };

        /**
         * 计时器需要执行的函数主体.
         * 函数执行上下文被绑定成this了, 也就是此Timer实例
         * @private
         */
        Timer.prototype.tick_ = function() {
            // 这个判断也有必要
            // 防止间隔时间内设置了enabled = false;
            if (this.enabled) {
                // 计算间隔时间
                var elapsed = (+new Date()) - this.last_;
                // 如果FF下出现了bug则不执行任何操作,补差时间后再执行
                if (elapsed > 0 && elapsed < this.interval_ * intervalScale) {
                    this.timer_ = this.timerObject_.setTimeout(this.boundTick_,
                        this.interval_ - elapsed);
                    return;
                }

                // 防止setInterval注册重复的timeout
                // 当tick_执行代码时.
                if (this.timer_) {
                    this.timerObject_.clearTimeout(this.timer_);
                    this.timer_ = null;
                }

                this.dispatchTick();
                // The timer could be stopped in the timer event handler.
                if (this.enabled) {
                    this.timer_ = this.timerObject_.setTimeout(this.boundTick_,
                        this.interval_);
                    this.last_ = +new Date();
                }
            }
        };

        /**
         * 分发TICK事件. 子类可以重写覆盖.
         */
        Timer.prototype.dispatchTick = function() {
            this.dispatchEvent(Timer.TICK);
        };

        /**
         * 开始计时. 并且约定时间后执行的代码
         */
        Timer.prototype.start = function() {
            this.enabled = true;
            // 如果没有this.timer_就设置定时，否则不做任何动作。
            if (!this.timer_) {
                // IMPORTANT!
                // window.setInterval在FireFox中有个bug - 它是基于绝对时间触发而不是相对时间.
                // 也就是说假如你的电脑休眠或者hibernating了一天,定时器如果每秒触发的话,当电脑
                // 重新进入系统时, 会连续快速触发3600*24次.
                // 这个bug已经被修复了, 但需要时间摒弃带有这些bug的版本, 所以我们使用setTimeout.
                //     https://bugzilla.mozilla.org/show_bug.cgi?id=376643
                this.timer_ = this.timerObject_.setTimeout(this.boundTick_, this.interval_);
                this.last_ = +new Date();
            }
        };

        /**
         * 停止计时器. 只做停止的动作.
         */
        Timer.prototype.stop = function() {
            this.enabled = false;
            if (this.timer_) {
                this.timerObject_.clearTimeout(this.timer_);
                this.timer_ = null;
            }
        };

        /** @override */
        Timer.prototype.disposeInternal = function() {
            // 这里没有unlisten任何监听函数, 因为listen都是外部组件赋予的
            // 功能, 所以unlisten也应该由外部组件dispose时执行.
            // 本实例只绑定了boundTick_到timer, 调用stop足矣clear.
            Timer.superClass_.disposeInternal.call(this);
            this.stop();
            delete this.timerObject_;
        };

        /**
         * 静态方法，触发一次定时器. 异步触发.
         * @param {Function|{handleEvent:Function}} listener 处理器函数或者含有handleEvent方法的对象.
         * @param {number=} opt_delay 间隔时间,默认是0.
         * @param {Object=} opt_context 函数上下文.
         * @return {number} 返回timer ID.
         */
        Timer.callOnce = function(listener, opt_delay, opt_context) {
            if (typeof listener === 'function') {
                if (opt_context)
                    listener = util.bind(listener, opt_context);
            } else if (listener && typeof listener.handleEvent === 'function') {
                // using typeof to prevent strict js warning
                listener = util.bind(listener.handleEvent, listener);
            } else {
                throw Error('Invalid listener argument');
            }

            if (opt_delay > MAX_TIMEOUT_) {
                // Timeouts greater than MAX_INT return immediately due to integer
                // overflow in many browsers.  Since MAX_INT is 24.8 days, just don't
                // schedule anything at all.
                return -1;
            } else {
                return window.setTimeout(listener, opt_delay || 0);
            }
        };

        /**
         * 静态方法. 取消callOnce定义的定时器.
         * @param {?number} timerId a timer ID.
         */
        Timer.clear = function(timerId) {
            window.clearTimeout(timerId);
        };

        // 事件名称
        Timer.TICK = 'tick';

        return Timer;
    }
);