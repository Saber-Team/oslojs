/**
 * @fileoverview 断言功能.
 * 有的编译器可以去掉无用的断言代码,但还是应该由程序员自己控制, 调试模式下可以添加断言代码
 * 否则不要添加. 有断言代码的地方类型判断有时也要松散对待. 比如,
 * <code>assert(foo)</code>会限制 <code>foo</code> is truthy value.
 * @author Leo.Zhang
 * @email zmike86@gmail.com
 */

define([
    '../util/util',
    '../asserts/error',
    '../string/util'
  ],
  function(util, AssertionError, string) {

    'use strict';

    /**
     * @define {boolean} 是否开启断言.
     */
    var ENABLE_ASSERTS = util.DEBUG;


    /**
     * 抛出一个断言异常并在错误消息前面加上"Assertion failed"前缀.
     * @param {string} defaultMessage 默认的错误消息.
     * @param {Array.<*>} defaultArgs 默认消息代替项.
     * @param {string|undefined} givenMessage 提供的错误消息.
     * @param {Array.<*>} givenArgs 消息代替项.
     * @throws {AssertionError} When the value is not a number.
     * @private
     */
    var doAssertFailure_ = function(defaultMessage, defaultArgs, givenMessage, givenArgs) {
      var message = 'Assertion failed';
      var args;
      if (givenMessage) {
        message += ': ' + givenMessage;
        args = givenArgs;
      } else if (defaultMessage) {
        message += ': ' + defaultMessage;
        args = defaultArgs;
      }
      // The '' + works around an Opera 10 bug in the unit tests. Without it,
      // a stack trace is added to var message above. With this, a stack trace is
      // not added until this line (it causes the extra garbage to be added after
      // the assertion message instead of in the middle of it).
      throw new AssertionError('' + message, args || []);
    };


    /**
     * 断言是否为真.
     * @param {*} condition 检查条件.
     * @param {string=} opt_message 错误消息.
     * @param {...*} var_args 错误消息代替项.
     * @return {*} The value of the condition.
     * @throws {AssertionError} When the condition evaluates to false.
     */
    var assert = function(condition, opt_message, var_args) {
      if (ENABLE_ASSERTS && !condition) {
        doAssertFailure_('', null, opt_message,
          Array.prototype.slice.call(arguments, 2));
      }
      return condition;
    };


    /**
     * 失败. 适用场景:
     * <pre>
     *  switch(type) {
         *    case FOO: doSomething(); break;
         *    case BAR: doSomethingElse(); break;
         *    default: fail('Unrecognized type: ' + type);
         *      // We have only 2 types - "default:" section is unreachable code.
         *  }
     * </pre>
     *
     * @param {string=} opt_message Error message in case of failure.
     * @param {...*} var_args The items to substitute into the failure message.
     * @throws {AssertionError} Failure.
     */
    var fail = function(opt_message, var_args) {
      if (ENABLE_ASSERTS) {
        throw new AssertionError(
            'Failure' + (opt_message ? ': ' + opt_message : ''),
          Array.prototype.slice.call(arguments, 1));
      }
    };


    /**
     * 断言是否数字.
     * @param {*} value 要检查的值.
     * @param {string=} opt_message 错误消息.
     * @param {...*} var_args 错误消息替代项.
     * @return {number} The value, guaranteed to be a number when asserts enabled.
     * @throws {AssertionError} When the value is not a number.
     */
    var assertNumber = function(value, opt_message, var_args) {
      if (ENABLE_ASSERTS && !util.isNumber(value)) {
        doAssertFailure_('Expected number but got %s: %s.',
          [util.typeOf(value), value], opt_message,
          Array.prototype.slice.call(arguments, 2));
      }
      return /** @type {number} */ (value);
    };


    /**
     * 断言是否字符串.
     * @param {*} value 要检查的值.
     * @param {string=} opt_message Error message in case of failure.
     * @param {...*} var_args The items to substitute into the failure message.
     * @return {string} The value, guaranteed to be a string when asserts enabled.
     * @throws {AssertionError} When the value is not a string.
     */
    var assertString = function(value, opt_message, var_args) {
      if (ENABLE_ASSERTS && !util.isString(value)) {
        doAssertFailure_('Expected string but got %s: %s.',
          [util.typeOf(value), value], opt_message,
          Array.prototype.slice.call(arguments, 2));
      }
      return /** @type {string} */ (value);
    };


    /**
     * 检查是否函数对象.
     * @param {*} value 要检查的值.
     * @param {string=} opt_message 错误消息.
     * @param {...*} var_args The items to substitute into the failure message.
     * @return {!Function} The value, guaranteed to be a function when asserts
     *     enabled.
     * @throws {AssertionError} When the value is not a function.
     */
    var assertFunction = function(value, opt_message, var_args) {
      if (ENABLE_ASSERTS && !util.isFunction(value)) {
        doAssertFailure_('Expected function but got %s: %s.',
          [util.typeOf(value), value], opt_message,
          Array.prototype.slice.call(arguments, 2));
      }
      return /** @type {!Function} */ (value);
    };


    /**
     * 检查是否对象.
     * @param {*} value 检查值.
     * @param {string=} opt_message Error message in case of failure.
     * @param {...*} var_args The items to substitute into the failure message.
     * @return {!Object} The value, guaranteed to be a non-null object.
     * @throws {AssertionError} When the value is not an object.
     */
    var assertObject = function(value, opt_message, var_args) {
      if (ENABLE_ASSERTS && !util.isObject(value)) {
        doAssertFailure_('Expected object but got %s: %s.',
          [util.typeOf(value), value],
          opt_message, Array.prototype.slice.call(arguments, 2));
      }
      return /** @type {!Object} */ (value);
    };


    /**
     * 检查是否数组对象.
     * @param {*} value 检查值.
     * @param {string=} opt_message Error message in case of failure.
     * @param {...*} var_args The items to substitute into the failure message.
     * @return {!Array} The value, guaranteed to be a non-null array.
     * @throws {AssertionError} When the value is not an array.
     */
    var assertArray = function(value, opt_message, var_args) {
      if (ENABLE_ASSERTS && !util.isArray(value)) {
        doAssertFailure_('Expected array but got %s: %s.',
          [util.typeOf(value), value], opt_message,
          Array.prototype.slice.call(arguments, 2));
      }
      return /** @type {!Array} */ (value);
    };


    /**
     * 检查是否布尔值.
     * @param {*} value 检查对象.
     * @param {string=} opt_message Error message in case of failure.
     * @param {...*} var_args The items to substitute into the failure message.
     * @return {boolean} The value, guaranteed to be a boolean when asserts are
     *     enabled.
     * @throws {AssertionError} When the value is not a boolean.
     */
    var assertBoolean = function(value, opt_message, var_args) {
      if (ENABLE_ASSERTS && !util.isBoolean(value)) {
        doAssertFailure_('Expected boolean but got %s: %s.',
          [util.typeOf(value), value], opt_message,
          Array.prototype.slice.call(arguments, 2));
      }
      return /** @type {boolean} */ (value);
    };


    /**
     * 判断是否指定类的实例.
     * @param {*} value 检查的值.
     * @param {function(new: T, ...)} type 自定义的构造函数.
     * @param {string=} opt_message 失败时的错误消息.
     * @param {...*} var_args 错误消息中替代的参数队列.
     * @throws {AssertionError} 不是实例的化抛出异常.
     * @return {!T}
     * @template T
     */
    var assertInstanceof = function(value, type, opt_message, var_args) {
      if (ENABLE_ASSERTS && !(value instanceof type)) {
        doAssertFailure_('instanceof check failed.', null,
          opt_message, Array.prototype.slice.call(arguments, 3));
      }
      return value;
    };


    /**
     * Checks that no enumerable keys are present in Object.prototype. Such keys
     * would break most code that use {@code for (var ... in ...)} loops.
     */
    var assertObjectPrototypeIsIntact = function() {
      for (var key in Object.prototype) {
        fail(key + ' should not be enumerable in Object.prototype.');
      }
    };


    return {
      ENABLE_ASSERTS: ENABLE_ASSERTS,
      assert: assert,
      fail: fail,
      assertNumber: assertNumber,
      assertString: assertString,
      assertFunction: assertFunction,
      assertObject: assertObject,
      assertArray: assertArray,
      assertBoolean: assertBoolean,
      assertInstanceof: assertInstanceof,
      assertObjectPrototypeIsIntact: assertObjectPrototypeIsIntact
    };
  }
);