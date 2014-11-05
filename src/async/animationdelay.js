/**
 * @fileoverview 延时触发的动画自动触发并不依赖用户自己的设置.
 * @author Leo.Zhang
 * @email zmike86@gmail.com
 */

define('@async.animationdelay',
    [
        '@util',
        '@disposable',
        '@events.util',
        '@functions'
    ],
    function(util, Disposable, EventUtil, fns) {

        'use strict';

        /**
         * Firefox中触发requestAnimationFrame时得到的事件名称.
         * @type {string}
         * @const
         * @private
         */
        var MOZ_BEFORE_PAINT_EVENT_ = 'MozBeforePaint';


        /**
         * 延时触发动画的类,和Oslo.async.Delay有相同的接口.
         * 默认检测是否可用requestAnimationFrame, 不存在的话退化到
         * Oslo.async.animationDelay.TIMEOUT.
         * 关于requestAnimationFrame详见:
         * @see http://paulirish.com/2011/requestanimationframe-for-smart-animating/
         * @param {function(number)} listener 执行的函数.传入时间戳作为参数, in unix ms.
         * @param {Window=} opt_window 执行delay的window对象.
         * @param {Object=} opt_context 函数上下文
         * @constructor
         * @extends {Disposable}
         */
        var AnimationDelay = function(listener, opt_window, opt_context) {
            Disposable.call(this);
            /**
             * 执行的函数.
             * @type {function(number)}
             * @private
             */
            this.listener_ = listener;
            /**
             * 函数上下文.
             * @type {Object|undefined}
             * @private
             */
            this.context_ = opt_context;
            /**
             * @type {Window}
             * @private
             */
            this.win_ = opt_window || window;
            /**
             * 到时后执行的包裹函数.
             * @type {function()}
             * @private
             */
            this.callback_ = util.bind(this.doAction_, this);
        };
        util.inherits(AnimationDelay, Disposable);


        /**
         * timeout id或者listener对象或者null(非激活).
         * @type {Listener|number|null}
         * @private
         */
        AnimationDelay.prototype.id_ = null;


        /**
         * 是否使用dom listeners.
         * @type {?boolean}
         * @private
         */
        AnimationDelay.prototype.usingListeners_ = false;


        /**
         * 默认的延时时长. 是在退化成setTimeout后使用.
         * @type {number}
         * @const
         */
        AnimationDelay.TIMEOUT = 20;


        /**
         * 开始计时器. 在下一动画帧之前会执行提供的listener.
         */
        AnimationDelay.prototype.start = function() {
            this.stop();
            this.usingListeners_ = false;

            var raf = this.getRaf_();
            var cancelRaf = this.getCancelRaf_();
            if (raf && !cancelRaf && this.win_.mozRequestAnimationFrame) {
                // 因为Firefox (Gecko)在另外的线程运行动画, 并且requestAnimationFrame的回调也在该线程完成.
                // 这样做破坏了JS隐藏的线程安全性(implicit thread-safety), 而且会导致诸如线程变量不同步的等等隐患.
                // 调用cycleAnimations_ 使用MozBeforePaint事件代替callback可以解决这个问题.
                // 只在mozRequestAnimationFrame可用的时候这样做,并不是W3C的requestAnimationFrame方法.
                this.id_ = EventUtil.listen(this.win_, MOZ_BEFORE_PAINT_EVENT_, this.callback_);
                this.win_.mozRequestAnimationFrame(null);
                this.usingListeners_ = true;
            }
            else if (raf && cancelRaf) {
                this.id_ = raf.call(this.win_, this.callback_);
            }
            else {
                this.id_ = this.win_.setTimeout(
                    // Firefox 13之前, Gecko传递一个非标准的参数到回调函数里,这个参数对我们没有意义.
                    fns.lock(this.callback_), AnimationDelay.TIMEOUT);
            }
        };


        /**
         * 如果定时器启动则停止定时器. 若定时器没有启动则什么也不做.
         */
        AnimationDelay.prototype.stop = function() {
            if (this.isActive()) {
                var raf = this.getRaf_();
                var cancelRaf = this.getCancelRaf_();
                if (raf && !cancelRaf && this.win_.mozRequestAnimationFrame) {
                    EventUtil.unlistenByKey(this.id_);
                }
                else if (raf && cancelRaf) {
                    cancelRaf.call(this.win_, /** @type {number} */ (this.id_));
                }
                else {
                    this.win_.clearTimeout(/** @type {number} */ (this.id_));
                }
            }
            this.id_ = null;
        };


        /**
         * 手动触发delay后的动作而不论定时器是否触发过; 为了保证动作触发需要停止定时器.
         */
        AnimationDelay.prototype.fire = function() {
            this.stop();
            this.doAction_();
        };


        /**
         * 只在定时器激活状态下手动触发.
         */
        AnimationDelay.prototype.fireIfActive = function() {
            if (this.isActive())
                this.fire();
        };


        /**
         * @return {boolean} True 返回定时器是否激活状态.
         */
        AnimationDelay.prototype.isActive = function() {
            return this.id_ !== null;
        };


        /**
         * 延时过后触发函数
         * @private
         */
        AnimationDelay.prototype.doAction_ = function() {
            if (this.usingListeners_ && this.id_) {
                EventUtil.unlistenByKey(this.id_);
            }
            this.id_ = null;

            // 不用requestAnimationFrame返回的时间戳是因为它可能是 Date.now-style time 或者
            // high-resolution time(根据浏览器的实现而定). 用util.now()会消除浏览器间的不同并且和
            // Oslo.fx.animation兼容.
            this.listener_.call(this.context_, util.now());
        };


        /** @override */
        AnimationDelay.prototype.disposeInternal = function() {
            this.stop();
            AnimationDelay.superClass_.disposeInternal.call(this);
        };


        /**
         * @return {?function(function(number)): number} 如果requestAnimationFrame
         *     方法可用则返回否则返回null.
         * @private
         */
        AnimationDelay.prototype.getRaf_ = function() {
            var win = this.win_;
            return win.requestAnimationFrame ||
                win.webkitRequestAnimationFrame ||
                win.mozRequestAnimationFrame ||
                win.oRequestAnimationFrame ||
                win.msRequestAnimationFrame ||
                null;
        };


        /**
         * @return {?function(number): number} 返回可用的cancelAnimationFrame函数.
         * @private
         */
        AnimationDelay.prototype.getCancelRaf_ = function() {
            var win = this.win_;
            return win.cancelRequestAnimationFrame ||
                win.webkitCancelRequestAnimationFrame ||
                win.mozCancelRequestAnimationFrame ||
                win.oCancelRequestAnimationFrame ||
                win.msCancelRequestAnimationFrame ||
                null;
        };


        return AnimationDelay;

    }
);