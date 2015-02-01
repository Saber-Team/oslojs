define([
  '../debug/error'
], function(DebugError) {

  'use strict';

  /**
   * 一个自定义的错误类用于当Deferred对象取消时出错.
   * @param {!Deferred} deferred Deferred对象.
   * @constructor
   * @extends {DebugError}
   */
  var CanceledError = function(deferred) {
    DebugError.call(this);

    /**
     * The Deferred that raised this error.
     * @type {Deferred}
     */
    this.deferred = deferred;
  };

  util.inherits(CanceledError, DebugError);

  /** @override */
  CanceledError.prototype.message = 'Deferred was canceled';

  /** @override */
  CanceledError.prototype.name = 'CanceledError';

  return CanceledError;
});