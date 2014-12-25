/**
 * @fileoverview 事件基类.事件系统在任何JS框架中都非常重要.
 * 各大公司的JS团队对于事件模型的填补,有些就是最佳实践.
 * @author Leo.Zhang
 * @email zmike86@gmail.com
 */

define(function() {

  'use strict';

  /**
   * 支持preventDefault和stopPropagation方法。
   * @param {string} type 事件类型.
   * @param {Object=} opt_target 事件源引用. 这个对象需要实现EventTarget接口.
   *     详见 {@link http://developer.mozilla.org/en/DOM/EventTarget}.
   * @constructor
   */
  function EventBase(type, opt_target) {
    /**
     * 类型
     * @type {string}
     */
    this.type = type;
    /**
     * 事件源
     * @type {Object|undefined}
     */
    this.target = opt_target;
    /**
     * 当前事件源。
     * @type {Object|undefined}
     */
    this.currentTarget = this.target;
  }

  EventBase.prototype = {
    constructor: EventBase,
    /**
     * IE是否内部停止了捕获,冒泡阶段.
     * @type {boolean}
     * @suppress {underscore} 不推荐在Events包外get这个变量.
     */
    propagationStopped_: false,
    /**
     * 标识是否事件默认行为被禁止了.
     * 遵循W3C标准 {@link http://www.w3.org/TR/DOM-Level-3-Events/#events-event-type-defaultPrevented}.
     * @type {boolean}
     */
    defaultPrevented: false,
    /**
     * IE内部捕获,冒泡阶段时每个handler的返回值.
     * @type {boolean}
     * @suppress {underscore} 不推荐在Events包外get这个变量.
     */
    returnValue_: true,
    /**
     * 阻止事件的冒泡行为.
     */
    stopPropagation: function() {
      this.propagationStopped_ = true;
    },
    /**
     * 阻止默认行为, 比如一个外链的跳转.
     */
    preventDefault: function() {
      this.defaultPrevented = true;
      this.returnValue_ = false;
    }
  };

  /**
   * 阻止事件冒泡. 等同于调用e.stopPropagation(), 但是这个静态方法可以直接作为Events.Util.listen的回调函数.
   * @param {!EventBase} e 事件对象.
   */
  EventBase.stopPropagation = function(e) {
    e.stopPropagation();
  };

  /**
   * 阻止事件默认行为. 等同于调用e.preventDefault(), 但是这个静态方法可以直接作为Events.Util.listen的回调函数.
   * @param {!E} e 事件对象.
   */
  EventBase.preventDefault = function(e) {
    e.preventDefault();
  };

  return EventBase;
});