/**
 * @fileoverview 动画控制器，提供通用方法和常规控制
 * @modified Leo.Zhang
 * @email zmike86@gmail.com
 */

define('Sogou.FX.Util',
    [
        'Sogou.Util',
        'Sogou.Async.AnimationDelay',
        'Sogou.Async.Delay',
        'Sogou.Object'
    ],
    function(util, AnimationDelay, Delay, object) {

        'use strict';

        /**
         * 默认的延时时长，毫秒单位
         * @type {number}
         * @const
         */
        var TIMEOUT = AnimationDelay.TIMEOUT;


        /**
         * 全局定时器需要操作的动画对象
         * @type {Object.<number, Animation>}
         * @private
         */
        var activeAnimations_ = {};


        /**
         * window对象.
         * @type {Window}
         * @private
         */
        var animationWindow_ = null;


        /**
         * 延时在这里也被包装成一个类,这个对象作为门面统一了接口.
         * @type {Delay|AnimationDelay}
         * @private
         */
        var animationDelay_ = null;


        /**
         * 注册动画对象
         * @param {Animation} animation 要注册的animation对象
         */
        var registerAnimation = function(animation) {
            var uid = util.getUid(animation);
            if (!(uid in activeAnimations_)) {
                activeAnimations_[uid] = animation;
            }

            // 开始动画
            requestAnimationFrame_();
        };


        /**
         * 移除全局动画对象
         * @param {Animation} animation The animation to unregister.
         */
        var unregisterAnimation = function(animation) {
            var uid = util.getUid(animation);
            delete activeAnimations_[uid];

            // 如果动画缓存对象空了则停止delay timers.
            if (object.isEmpty(activeAnimations_)) {
                cancelAnimationFrame_();
            }
        };


        /**
         * 注册window. window对象可以提供原生的timing control API. 注意window对象一定要是可见的,
         * 不可见的window可能经过优化后停止动画. 这个window对象不是必须等于动画运行的的window对象,但必须可.
         * 详见: https://developer.mozilla.org/en/DOM/window.mozRequestAnimationFrame.
         * @param {Window} animationWindow 用于控制动画的window对象.
         */
        var setAnimationWindow = function(animationWindow) {
            // 如果有正在等待执行的动画timer,延时后需要重启. 避免动画过程中如果更换了window对象
            // 会丢掉应继续执行的动画timer的uids.
            //
            // 实践中,在设置animation window 和 timer control functions之前这种情况不会发生.
            var hasTimer = animationDelay_ && animationDelay_.isActive();

            util.dispose(animationDelay_);
            animationDelay_ = null;
            animationWindow_ = animationWindow;

            // 重启timer.
            if (hasTimer) {
                requestAnimationFrame_();
            }
        };


        /**
         * 进行动画的一帧，通过requestAnimationFrame和cancelAnimationFrame操作
         * @private
         */
        var requestAnimationFrame_ = function() {
            if (!animationDelay_) {
                // 由于不能确定全局window对象就是调用requestAnimationFrame的对象 (如 chrome extension
                // windows). 默认用Delay, 除非程序设置了animation window.
                if (animationWindow_) {
                    // requestAnimationFrame 会调用 cycleAnimations_ 传入当前时间 in ms.
                    animationDelay_ = new AnimationDelay(
                        function(now) {
                            cycleAnimations_(now);
                        }, animationWindow_);
                }
                else {
                    animationDelay_ = new Delay(function() {
                        cycleAnimations_(util.now());
                    }, TIMEOUT);
                }
            }

            var delay = animationDelay_;
            if (!delay.isActive()) {
                delay.start();
            }
        };


        /**
         * 停止取消requestAnimationFrame_()创建的动画帧.
         * @private
         */
        var cancelAnimationFrame_ = function() {
            if (animationDelay_) {
                animationDelay_.stop();
            }
        };


        /**
         * 循环遍历所有注册的动画对象.
         * @param {number} now 当前毫秒
         * @private
         */
        var cycleAnimations_ = function(now) {
            object.forEach(activeAnimations_, function(anim) {
                anim.onAnimationFrame(now);
            });

            if (!object.isEmpty(activeAnimations_)) {
                requestAnimationFrame_();
            }
        };


        // export
        return {
            TIMEOUT: TIMEOUT,
            registerAnimation: registerAnimation,
            unregisterAnimation: unregisterAnimation,
            setAnimationWindow: setAnimationWindow
        };
    }
);