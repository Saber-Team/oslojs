/**
 * @fileoverview 创建函数的使用包.
 * @modified Leo.Zhang
 * @email zmike86@gmail.com
 */

define('Sogou.Functions', [], function() {

    'use strict';

    /**
     * 永远返回一个值的函数.
     * @param {T} retValue 返回的值.
     * @return {function():T} The new function.
     * @template T
     */
    function constant(retValue) {
        return function() {
            return retValue;
        };
    }


    /**
     * 永远返回false的函数
     * @type {function(...): boolean}
     */
    var FALSE = constant(false);


    /**
     * 永远返回true的函数
     * @type {function(...): boolean}
     */
    var TRUE = constant(true);


    /**
     * 永远返回NULL的函数
     * @type {function(...): null}
     */
    var NULL = constant(null);


    /**
     * 只返回第一个参数的函数
     * @param {T=} opt_returnValue 第一个形参.
     * @param {...*} var_args 其余形参.
     * @return {T} The first argument passed in, or undefined if nothing was passed.
     * @template T
     */
    function identity(opt_returnValue, var_args) {
        return opt_returnValue;
    }


    /**
     * 永远返回error的函数.
     * @param {string} message The error message.
     * @return {!Function} The error-throwing function.
     */
    function error(message) {
        return function() {
            throw Error(message);
        };
    }


    /**
     * 抛出给定的异常对象.
     * @param {*} err An object to be thrown.
     * @return {!Function} The error-throwing function.
     */
    function fail(err) {
        return function() {
            throw err;
        }
    }


    /**
     * 给定一个函数和传参的个数,返回新的函数在执行老函数时只传一定数目的参数.
     * @param {Function} f 原始函数.
     * @param {number=} opt_numArgs 要保留的参数数目. 默认是 0.
     * @return {!Function} 返回新的函数执行时只传递前个n参数.
     */
    function lock(f, opt_numArgs) {
        opt_numArgs = opt_numArgs || 0;
        return function() {
            // 可以这么调用 this指向arguments对象,但其他数组方法不一定可行
            return f.apply(this, Array.prototype.slice.call(arguments, 0, opt_numArgs));
        };
    }


    /**
     * 返回一个函数按顺序调用给定的函数队列.最终返回最后一个函数调用结果.
     * 比如, (sequence(f, g))(x) 相当于 f(x),g(x).
     * @param {...Function} var_args 函数队列.
     * @return {!Function} A function that calls all inputs in sequence.
     */
    function sequence(var_args) {
        var functions = arguments;
        var length = functions.length;
        return function() {
            var result;
            for (var i = 0; i < length; i++) {
                result = functions[i].apply(this, arguments);
            }
            return result;
        };
    }


    /**
     * 多个函数返回值的与操作.
     * 比如, (and(f, g))(x) 相当于 f(x) && g(x).
     * @param {...Function} var_args 函数队列.
     * @return {function(...[?]):boolean} A function that ANDs its component
     *      functions.
     */
    function and(var_args) {
        var functions = arguments;
        var length = functions.length;
        return function() {
            for (var i = 0; i < length; i++) {
                if (!functions[i].apply(this, arguments)) {
                    return false;
                }
            }
            return true;
        };
    }


    /**
     * 多个函数返回值的或操作.
     * 比如, (or(f, g))(x) 相当于 f(x) || g(x).
     * @param {...Function} var_args 函数队列.
     * @return {function(...[?]):boolean} A function that ORs its component
     *    functions.
     */
    function or(var_args) {
        var functions = arguments;
        var length = functions.length;
        return function() {
            for (var i = 0; i < length; i++) {
                if (functions[i].apply(this, arguments)) {
                    return true;
                }
            }
            return false;
        };
    }


    /**
     * 函数值求反操作.
     * 比如, (not(f))(x) 相当于 !f(x).
     * @param {!Function} f The original function.
     * @return {function(...[?]):boolean} A function that delegates to f and returns
     * opposite.
     */
    function not(f) {
        return function() {
            return !f.apply(this, arguments);
        };
    }


    /**
     * 用给定的参数和构造函数创建一个实例对象.
     * 不能直接 new F(var_args)因为参数个数不定.
     * Intended to be bound to create object factories.
     * @param {!Function} constructor 构造函数.
     * @param {...*} var_args 传给构造函数的参数.
     * @return {!Object} 返回constructor的一个新的实例.
     */
    function create(constructor, var_args) {
        /** @constructor */
        var temp = function() {};
        temp.prototype = constructor.prototype;

        // obj will have constructor's prototype in its chain and
        // 'obj instanceof constructor' will be true.
        var obj = new temp();

        // obj is initialized by constructor.
        // arguments is only array-like so lacks shift(), but can be used with
        // the Array prototype function.
        constructor.apply(obj, Array.prototype.slice.call(arguments, 1));
        return obj;
    }


    return {
        constant: constant,
        FALSE: FALSE,
        TRUE: TRUE,
        NULL: NULL,
        fail: fail,
        error: error,
        identity: identity,
        lock: lock,
        and: and,
        or: or,
        not: not,
        sequence: sequence,
        create: create
    };
});