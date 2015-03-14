/**
 * @fileoverview
 * @author Leo.Zhang
 * @email zmike86@gmail.com
 */

define([
  '../util/util',
  './error'
], function(util, DebugError) {

  'use strict';

  /**
   * 受保护的函数的调用者会在发生异常时接收到此异常对象.
   * @param {*} cause entry point函数抛出的异常对象.
   * @constructor
   * @extends {DebugError}
   */
  var ProtectedFunctionError = function(cause) {
    var message = ProtectedFunctionError.MESSAGE_PREFIX +
      (cause && cause.message ? String(cause.message) : String(cause));

    DebugError.call(this, message);

    /**
     * entry point抛出的原始异常对象.
     * @type {*}
     */
    this.cause = cause;

    var stack = cause && cause.stack;
    if (stack && util.isString(stack)) {
      this.stack = /** @type {string} */ (stack);
    }
  };

  util.inherits(ProtectedFunctionError, DebugError);

  /**
   * 错误消息前缀.
   * @type {string}
   */
  ProtectedFunctionError.MESSAGE_PREFIX =
    'Error in protected function: ';

  return ProtectedFunctionError;

});