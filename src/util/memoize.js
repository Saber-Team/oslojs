/**
 * @fileoverview 缓存执行结果的模块.
 * @author Leo.Zhang
 * @email zmike86@gmail.com
 * @see http://en.wikipedia.org/wiki/Memoization
 */

define(['./util'], function(util) {

  'use strict';

  var memo = {};

  /**
   * @define {boolean} 单元测试中也开启memoize.
   */
  memo.ENABLE_MEMOIZE = true;

  /**
   * 存储缓存的对象属性名.
   * @type {string}
   * @private
   */
  var CACHE_PROPERTY_ = 'oslo_memoize_cache_';

  /**
   * 简单的参数序列化函数. 对简单类型的参数 string, number, boolean,
   * null 和 undefined好用. 不支持带有 \x0B 字符的字符串.
   * @param {number} functionUid function uid.
   * @param {Object} args 形参. Note: 是类数组对象.
   * @return {string} 返回一个字符串作为缓存对象的key, serialized as \x0B-separated string.
   */
  function simpleSerializer(functionUid, args) {
    var context = [functionUid];
    for (var i = args.length - 1; i >= 0; --i) {
      context.push(typeof args[i], args[i]);
    }
    return context.join('\x0B');
  }

  /**
   * 清空缓存.
   * @param {Object} cacheOwner 记忆函数的拥有者或上下文.
   */
  memo.clearCache =function(cacheOwner) {
    cacheOwner[CACHE_PROPERTY_] = {};
  };

  /**
   * 一个包裹器装饰一个函数缓存他的执行结果. 但是调用时对于引用参数不能准确序列化,见simpleSerializer.
   * @param {Function} f 记忆函数. 函数返回值可能只依赖于他的形参和上下文..
   * @param {function(number, Object): string=} opt_serializer 自定义的序列化函数.
   * @this {Object} 函数上下文或拥有者.
   * @return {!Function} 返回闭包.
   */
  memo.memoize = function(f, opt_serializer) {
    var functionUid = util.getUid(f);
    var serializer = opt_serializer || simpleSerializer;

    return function() {
      if (memo.ENABLE_MEMOIZE) {
        // 严格模式下, 函数在全局执行时上下文 'this' 是undefined. See:
        // https://developer.mozilla.org/en/JavaScript/Strict_mode
        var thisOrGlobal = this || util.global;
        // Maps the serialized list of args to the corresponding return value.
        var cache = thisOrGlobal[CACHE_PROPERTY_] || (thisOrGlobal[CACHE_PROPERTY_] = {});
        var key = serializer(functionUid, arguments);
        // 返回函数执行结果
        return cache.hasOwnProperty(key) ? cache[key] : (cache[key] = f.apply(this, arguments));
      } else {
        return f.apply(this, arguments);
      }
    };
  };

  // export
  return memo;
});