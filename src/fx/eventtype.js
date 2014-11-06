/**
 * @fileoverview 定义了动画模块的基础事件。
 * @author Leo.Zhang
 * @email zmike86@gmail.com
 */

define('@fx.eventType', [], {
    /**
     * 从头开始或者恢复动画的时候都会触发
     */
    PLAY: 'play',
    /**
     * 只有从头开始才会触发
     */
    BEGIN: 'begin',
    RESUME: 'resume',
    /**
     * 自然结束或者被调用stop都会触发end事件
     */
    END: 'end',
    STOP: 'stop',
    /**
     * 只有自然结束动画才会触发
     */
    FINISH: 'finish',
    PAUSE: 'pause',
    /**
     * 每一帧动画触发。
     */
    ANIMATE: 'animate',
    DESTROY: 'destroy'
});