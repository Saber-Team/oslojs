/**
 * @fileoverview 提供自定义的错误类确保stack能正确维护.
 *     不要直接抛出Sogou.Debug.Error(msg), Error(msg)更高效些.
 * @modified Leo.Zhang
 * @email zmike86@gmail.com
 */

define('Sogou.Debug.Error', ['Sogou.Util'], function(util) {

    'use strict';

    /**
     * 提供一个自定义Error类.
     * @param {*=} opt_msg 错误信息.
     * @constructor
     * @extends {Error}
     */
    var DebugError = function(opt_msg) {

        // 确保有调用队栈追踪.
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
