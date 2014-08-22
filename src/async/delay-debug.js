/**
 * @fileoverview 此类用于以下情形: 函数必须在指定的事件后被执行, 且间隔执行多次。
 *     比如显示tooltip, menu的时候会做个延时。
 * @modified Leo.Zhang
 * @email zmike86@gmail.com
 * @see ../demos/timers.html
 */

;sogou('Sogou.Async.Delay',
    [
        'Sogou.Util',
        'Sogou.Disposable',
        'Sogou.Timer'
    ],
    function(util, Disposable, Timer) {

        'use strict';

        /**
         * 延迟触发函数。时间间隔可以在初始化时指定，也可以在每次delay函数开始时指定。
         * @param {Function} listener 执行函数
         * @param {number=} opt_interval 间隔的毫秒数
         * @param {Object=} opt_context 函数上下文
         * @constructor
         * @extends {Disposable}
         */
        var Delay = function(listener, opt_interval, opt_context) {
            Disposable.call(this);
            /**
             * 执行函数
             * @type {Function}
             * @private
             */
            this.listener_ = listener;
            /**
             * 时间间隔
             * @type {number}
             * @private
             */
            this.interval_ = opt_interval || 0;
            /**
             * 函数上下文
             * @type {Object|undefined}
             * @private
             */
            this.context_ = opt_context;
            /**
             * 当延时完毕后需要执行的回调函数.
             * @type {Function}
             * @private
             */
            this.callback_ = util.bind(this.doAction_, this);
        };
        util.inherits(Delay, Disposable);

        /**
         * timeout返回的id, or 0 when inactive.
         * @type {number}
         * @private
         */
        Delay.prototype.id_ = 0;

        /**
         * Disposes of the object, cancelling the timeout if it is still outstanding and
         * removing all object references.
         * @override
         * @protected
         */
        Delay.prototype.disposeInternal = function() {
            Delay.superClass_.disposeInternal.call(this);
            this.stop();
            delete this.listener_;
            delete this.context_;
        };

        /**
         * 启动延时对象。函数的初次触发会在指定的时间间隔后。
         * 在已经启动的timer上调用start方法会重置timer。
         * @param {number=} opt_interval 支持传入新的时间间隔
         */
        Delay.prototype.start = function(opt_interval) {
            this.stop();
            this.id_ = Timer.callOnce(
                this.callback_,
                util.isNull(opt_interval) ? this.interval_ : opt_interval);
        };

        /**
         * 停止计时器
         */
        Delay.prototype.stop = function() {
            if (this.isActive())
                Timer.clear(this.id_);
            this.id_ = 0;
        };

        /**
         * 手动触发要延时的action即便timer已经注销或者还未发生. 为了保护fire方法, 首先调用stop.
         */
        Delay.prototype.fire = function() {
            this.stop();
            this.doAction_();
        };

        /**
         * 只有当delay对象的timer还未被触发时才执行.Stops the delay timer.
         */
        Delay.prototype.fireIfActive = function() {
            if (this.isActive())
                this.fire();
        };

        /**
         * @return {boolean} 返回当前delay对象是否未被触发.
         */
        Delay.prototype.isActive = function() {
            return this.id_ != 0;
        };

        /**
         * 执行函数
         * @private
         */
        Delay.prototype.doAction_ = function() {
            this.id_ = 0;
            if (this.listener_)
                this.listener_.call(this.context_);
        };

        return Delay;
    }
);