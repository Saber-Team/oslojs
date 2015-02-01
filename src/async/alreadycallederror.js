define([
  '../debug/error'
], function(DebugError) {

  'use strict';

  /**
   * 一个自定义错误类用于当Deferred对象已经被触发called时抛出.
   * @param {!Deferred} deferred The Deferred.
   * @constructor
   * @extends {DebugError}
   */
  var AlreadyCalledError = function(deferred) {
    DebugError.call(this);

    /**
     * The Deferred that raised this error.
     * @type {Deferred}
     */
    this.deferred = deferred;
  };

  util.inherits(AlreadyCalledError, DebugError);

  /** @override */
  AlreadyCalledError.prototype.message = 'Deferred has already fired';

  /** @override */
  AlreadyCalledError.prototype.name = 'AlreadyCalledError';

  return AlreadyCalledError;
});