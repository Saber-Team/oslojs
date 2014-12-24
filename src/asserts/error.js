/**
 * @fileoverview 自定义的断言错误类
 * @author Leo.Zhang
 * @email zmike86@gmail.com
 */

define([
    '../util/util',
    '../string/util',
    '../debug/error'
  ],
  function(util, string, DebugError) {

    'use strict';

    /**
     * 断言失败的错误对象.
     * @param {string} messagePattern 错误消息的字符串模式.
     * @param {!Array.<*>} messageArgs 替换字符串模式的数组项.
     * @constructor
     * @extends {DebugError}
     */
    var AssertionError = function(messagePattern, messageArgs) {

      messageArgs.unshift(messagePattern);
      DebugError.call(this, string.subs.apply(null, messageArgs));
      // 替换后去掉数组第一项的模式防止永久改变了数组.
      messageArgs.shift();

      /**
       * 错误消息模式. 错误捕获函数可以通过对象的这个属性唯一确定the assertion.
       * @type {string}
       */
      this.messagePattern = messagePattern;
    };

    util.inherits(AssertionError, DebugError);


    /** @override */
    AssertionError.prototype.name = 'AssertionError';


    return AssertionError;

  });