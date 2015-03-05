/**
 * @fileoverview 此模块为客户端程序提供全局的注册器, 所有的entry point都
 *   可被instrumented. 需要添加错误监控的模块要通过本模块来注册它们的entry points.
 *   本模块考虑到entry points可能随时添加但monitorAll的调用时机并不确定. 用私有变量
 *   monitorsMayExist_做开关如果entry point后注册则立即instrument此entry point.
 * @author Leo.Zhang
 * @email zmike86@gmail.com
 */

define([
  '../util/util',
  '../asserts/asserts'
], function(util, asserts) {

  'use strict';

  /**
   * @interface
   */
  var EntryPointMonitor = function() {};

  /**
   * Try to remove an instrumentation wrapper created by this monitor.
   * If the function passed to unwrap is not a wrapper created by this
   * monitor, then we will do nothing.
   *
   * Notice that some wrappers may not be unwrappable. For example, if other
   * monitors have applied their own wrappers, then it will be impossible to
   * unwrap them because their wrappers will have captured our wrapper.
   *
   * So it is important that entry points are unwrapped in the reverse
   * order that they were wrapped.
   *
   * @param {!Function} fn A function to unwrap.
   * @return {!Function} The unwrapped function, or {@code fn} if it was not
   *     a wrapped function created by this monitor.
   */
  EntryPointMonitor.prototype.unwrap;

  /**
   * 数组保存所有的entry point回调函数.
   * @type {!Array.<function(!Function)>}
   * @private
   */
  var refList_ = [];

  /**
   * 存储包裹所有entry points的Monitors.
   * @type {!Array.<!EntryPointMonitor>}
   * @private
   */
  var monitors_ = [];

  /**
   * 是否曾经调用过entryPointRegistry.monitorAll.
   * @type {boolean}
   * @private
   */
  var monitorsMayExist_ = false;

  return {
    /**
     * 注册entry point.
     * 当调用entryPointRegistry.monitorAll方法时所有保存在refList的entry point
     * 会被instrumented. 如果之前调用过, 则会在本函数内立即instrumented.
     * @param {function(!Function)} callback 回调函数, 接收一个transformer的函数作为参数
     * 而具体的instrument entry point的工作是transformer做的. callback只起到包裹作用.
     */
    register: function(callback) {
      // Don't use push(), so that this can be compiled out.
      refList_[refList_.length] = callback;
      // If no one calls monitorAll, this can be compiled out.
      if (monitorsMayExist_) {
        var monitors = monitors_;
        for (var i = 0; i < monitors.length; i++) {
          // 传入transformer
          callback(util.bind(monitors[i].wrap, monitors[i]));
        }
      }
    },

    /**
     * 对所有的entry points配置添加monitor.
     * 注册过的entry points会立即被monitor包裹. 未来注册的entry point, 会在注册时
     * 自动被monitor wrapped.
     * @param {!EntryPointMonitor} monitor entry point monitor一般是debug.ErrorHandler
     *     的实例.
     */
    monitorAll: function(monitor) {
      monitorsMayExist_ = true;
      var transformer = util.bind(monitor.wrap, monitor);
      for (var i = 0; i < refList_.length; i++) {
        refList_[i](transformer);
      }
      monitors_.push(monitor);
    },

    /**
     * 对所有的entry points解除参数monitor的包裹作用. 如果是未来注册的entry point
     * 则不会受到影响. 如果最后添加的monitor不是传入的monitor则会操作失败.
     * @param {!EntryPointMonitor} monitor 最后一个包装entry points的monitor.
     * @throws {Error} If the monitor is not the most recently configured monitor.
     */
    unmonitorAllIfPossible: function(monitor) {
      var monitors = monitors_;

      asserts.assert(monitor === monitors[monitors.length - 1],
        'Only the most recent monitor can be unwrapped.');

      var transformer = util.bind(monitor.unwrap, monitor);
      for (var i = 0; i < refList_.length; i++) {
        refList_[i](transformer);
      }
      monitors.length--;
    }
  };

});