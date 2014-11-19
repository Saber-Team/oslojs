/**
 * @fileoverview 提供自定义的错误类确保stack能正确维护.
 * 不要直接抛出Sogou.Debug.Error(msg), Error(msg)更高效些.
 * @author Leo.Zhang
 * @email zmike86@gmail.com
 */

define('@debug.Error', ['@util'], function(util) {

    'use strict';

    /**
     * 提供一个自定义Error类继承原生Error类.
     * @param {*=} opt_msg 错误信息.
     * @constructor
     * @extends {Error}
     */
    var DebugError = function(opt_msg) {

        // 确保有调用堆栈追踪. V8环境下可用captureStackTrace
        // chrome和node都可以
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, DebugError);
        } else {
            this.stack = new Error().stack || '';
        }

        if (opt_msg) {
            this.message = String(opt_msg);
        }
    };

    util.inherits(DebugError, Error);

    /** @override */
    DebugError.prototype.name = 'CustomError';

    return DebugError;
});
