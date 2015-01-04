/**
 * @fileoverview 动画过渡处理基类。
 * @author Leo.Zhang
 * @email zmike86@gmail.com
 */

define([
    '../util/util',
    '../events/target',
    './eventtype'
  ],
  function(util, EventTarget, EventType) {

    'use strict';

    /**
     * 动画对象基类
     * @constructor
     * @extends {EventTarget}
     */
    var TransitionBase = function() {
      EventTarget.call(this);

      /**
       * 动画的内部状态
       * @type {TransitionBase.State}
       * @private
       */
      this.state_ = TransitionBase.State.STOPPED;

      /**
       * 动画开始的时间戳
       * @type {?number}
       * @protected
       */
      this.startTime = null;

      /**
       * 结束或被叫停的时间戳
       * @type {?number}
       * @protected
       */
      this.endTime = null;
    };
    util.inherits(TransitionBase, EventTarget);

    /**
     * 状态码
     * @enum {number}
     */
    TransitionBase.State = {
      STOPPED: 0,
      PAUSED: -1,
      PLAYING: 1
    };

    /**
     * 播放
     * @param {boolean=} opt_restart 是否restart the animation.
     * @return {boolean} 返回是否成功开始.
     * @override
     */
    TransitionBase.prototype.play = util.abstractMethod;

    /**
     * Stops the animation.
     * @param {boolean=} opt_gotoEnd 是否跳跃到动画的结尾.
     * @override
     */
    TransitionBase.prototype.stop = util.abstractMethod;

    /**
     * Pauses the animation.
     */
    TransitionBase.prototype.pause = util.abstractMethod;

    /**
     * 返回动画内部状态.
     * @return {TransitionBase.State} State of the animation.
     */
    TransitionBase.prototype.getStateInternal = function() {
      return this.state_;
    };

    /**
     * Sets the current state of the animation to playing.
     * @protected
     */
    TransitionBase.prototype.setStatePlaying = function() {
      this.state_ = TransitionBase.State.PLAYING;
    };

    /**
     * Sets the current state of the animation to paused.
     * @protected
     */
    TransitionBase.prototype.setStatePaused = function() {
      this.state_ = TransitionBase.State.PAUSED;
    };

    /**
     * Sets the current state of the animation to stopped.
     * @protected
     */
    TransitionBase.prototype.setStateStopped = function() {
      this.state_ = TransitionBase.State.STOPPED;
    };

    /**
     * @return {boolean} 当前是否处于播放.
     */
    TransitionBase.prototype.isPlaying = function() {
      return this.state_ === TransitionBase.State.PLAYING;
    };

    /**
     * @return {boolean} 当前是否暂停状态.
     */
    TransitionBase.prototype.isPaused = function() {
      return this.state_ === TransitionBase.State.PAUSED;
    };

    /**
     * @return {boolean} 当前状态是否停止.
     */
    TransitionBase.prototype.isStopped = function() {
      return this.state_ === TransitionBase.State.STOPPED;
    };

    /**
     * 分发BEGIN事件. 子类应该重写此方法.
     * @protected
     */
    TransitionBase.prototype.onBegin = function() {
      this.dispatchAnimationEvent(EventType.BEGIN);
    };

    /**
     * 分发END事件. 子类应该重写此方法.
     * @protected
     */
    TransitionBase.prototype.onEnd = function() {
      this.dispatchAnimationEvent(EventType.END);
    };

    /**
     * 分发FINISH事件. 子类应该重写此方法.
     * @protected
     */
    TransitionBase.prototype.onFinish = function() {
      this.dispatchAnimationEvent(EventType.FINISH);
    };

    /**
     * 分发PAUSE事件. 子类应该重写此方法.
     * @protected
     */
    TransitionBase.prototype.onPause = function() {
      this.dispatchAnimationEvent(EventType.PAUSE);
    };

    /**
     * 分发PLAY事件. 子类应该重写此方法.
     * @protected
     */
    TransitionBase.prototype.onPlay = function() {
      this.dispatchAnimationEvent(EventType.PLAY);
    };

    /**
     * 分发RESUME事件. 子类应该重写此方法.
     * @protected
     */
    TransitionBase.prototype.onResume = function() {
      this.dispatchAnimationEvent(EventType.RESUME);
    };

    /**
     * 分发STOP事件. 子类应该重写此方法.
     * @protected
     */
    TransitionBase.prototype.onStop = function() {
      this.dispatchAnimationEvent(EventType.STOP);
    };

    /**
     * @param {string} type 事件类型.
     * @protected
     */
    TransitionBase.prototype.dispatchAnimationEvent = function(type) {
      this.dispatchEvent(type);
    };

    return TransitionBase;
  }
);