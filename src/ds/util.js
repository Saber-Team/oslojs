/**
 * @fileoverview 这个模块是一个函数集合. 支持所有实现了collection-like的类
 *     诸如Map, Set, Array, Object.
 * @author Leo.Zhang
 * @email zmike86@gmail.com
 */

define([
    '../util/util',
    '../array/array',
    '../object/object'
  ],
  function(util, array, object) {

    'use strict';

    /**
     * 返回类集合对象(collection-like object)的项数.
     * @param {Object} col 对象.
     * @return {number} 返回长度.
     */
    function getCount(col) {
      if (typeof col.getCount === 'function') {
        return col.getCount();
      }
      if (util.isArrayLike(col) || util.isString(col)) {
        return col.length;
      }
      return object.getCount(col);
    }

    /**
     * 获得集合的所有value.
     * @param {Object} col 类集合对象.
     * @return {!Array} 以数组形式返回.
     */
    function getValues(col) {
      if (typeof col.getValues === 'function') {
        return col.getValues();
      }
      if (util.isString(col)) {
        return col.split('');
      }
      if (util.isArrayLike(col)) {
        var rv = [];
        var l = col.length;
        for (var i = 0; i < l; i++) {
          rv.push(col[i]);
        }
        return rv;
      }
      return object.getValues(col);
    }

    /**
     * 返回集合的所有key. 有的对象没有key作为索引这样的对象会返回undefined.
     * @param {Object} col 类集合对象.
     * @return {!Array|undefined} 返回类集合对象所有的key.
     */
    function getKeys(col) {
      if (typeof col.getKeys === 'function') {
        return col.getKeys();
      }
      // if we have getValues but no getKeys we know this is a key-less collection
      if (typeof col.getValues === 'function') {
        return undefined;
      }
      if (util.isArrayLike(col) || util.isString(col)) {
        var rv = [];
        var l = col.length;
        for (var i = 0; i < l; i++) {
          rv.push(i);
        }
        return rv;
      }

      return object.getKeys(col);
    }

    /**
     * 是否对象含有某个指定的值. 复杂度O(n)内部使用 (===).
     * @param {Object} col 类集合对象.
     * @param {*} val 指定的值.
     * @return {boolean}
     */
    function contains(col, val) {
      if (typeof col.contains === 'function') {
        return col.contains(val);
      }
      if (typeof col.containsValue === 'function') {
        return col.containsValue(val);
      }
      if (util.isArrayLike(col) || util.isString(col)) {
        return array.contains(/** @type {Array} */ (col), val);
      }
      return object.containsValue(col, val);
    }

    /**
     * 集合是否为空.
     * @param {Object} col 类集合对象.
     * @return {boolean}
     */
    function isEmpty(col) {
      if (typeof col.isEmpty === 'function') {
        return col.isEmpty();
      }

      if (util.isArrayLike(col) || util.isString(col)) {
        return col.length === 0;
      }

      return object.isEmpty(col);
    }

    /**
     * 清空集合.
     * @param {Object} col 类集合对象.
     */
    function clear(col) {
      // NOTE(arv): This should not contain strings because strings are immutable
      if (typeof col.clear === 'function') {
        col.clear();
      } else if (util.isArrayLike(col)) {
        array.clear(/** @type {ArrayLike} */ (col));
      } else {
        object.clear(col);
      }
    }

    /**
     * 遍历集合对象
     * @param {S} col 类集合对象.
     * @param {function(this:T,?,?,S):?} f 遍历函数.
     * @param {T=} opt_obj 函数上下文.
     * @template T,S 泛型
     */
    function forEach(col, f, opt_obj) {
      if (typeof col.forEach === 'function') {
        col.forEach(f, opt_obj);
      } else if (util.isArrayLike(col)) {
        array.forEach(/** @type {Array} */ (col), f, opt_obj);
      } else {
        var keys = getKeys(col);
        var values = getValues(col);
        var l = values.length;
        for (var i = 0; i < l; i++) {
          f.call(opt_obj, values[i], keys && keys[i], col);
        }
      }
    }

    /**
     * 过滤集合对象
     * @param {S} col 类集合对象.
     * @param {function(this:T,?,?,S):boolean} f 遍历函数.
     * @param {T=} opt_obj 函数上下文.
     * @return {!Object|!Array} 返回一个新的集合.
     * @template T,S
     */
    function filter(col, f, opt_obj) {
      if (typeof col.filter === 'function') {
        return col.filter(f, opt_obj);
      }
      if (util.isArrayLike(col)) {
        return array.filter(/** @type {!Array} */ (col), f, opt_obj);
      }

      var rv, i;
      var keys = getKeys(col);
      var values = getValues(col);
      var l = values.length;
      if (keys) {
        rv = {};
        for (i = 0; i < l; i++) {
          if (f.call(opt_obj, values[i], keys[i], col)) {
            rv[keys[i]] = values[i];
          }
        }
      } else {
        // 没用array.filter因为要确保key是undefined.
        rv = [];
        for (i = 0; i < l; i++) {
          if (f.call(opt_obj, values[i], undefined, col)) {
            rv.push(values[i]);
          }
        }
      }
      return rv;
    }

    /**
     * 映射类集合对象.
     * @param {S} col 类集合对象.
     * @param {function(this:T,?,?,S):V} f 遍历函数.
     * @param {T=} opt_obj 函数上下文.
     * @return {!Object.<V>|!Array.<V>} 返回新的集合. 如果是一个key-less集合则返回一个数组,否则返回纯JS对象.
     * @template T,S,V
     */
    function map(col, f, opt_obj) {
      if (typeof col.map === 'function') {
        return col.map(f, opt_obj);
      }
      if (util.isArrayLike(col)) {
        return array.map(/** @type {!Array} */ (col), f, opt_obj);
      }

      var rv, i;
      var keys = getKeys(col);
      var values = getValues(col);
      var l = values.length;
      if (keys) {
        rv = {};
        for (i = 0; i < l; i++) {
          rv[keys[i]] = f.call(opt_obj, values[i], keys[i], col);
        }
      } else {
        rv = [];
        for (i = 0; i < l; i++) {
          rv[i] = f.call(opt_obj, values[i], undefined, col);
        }
      }
      return rv;
    }

    /**
     * 检测类集合对象.
     * @param {S} col 类集合对象.
     * @param {function(this:T,?,?,S):boolean} f 遍历函数.
     * @param {T=} opt_obj 函数上下文.
     * @return {boolean} True if any value passes the test.
     * @template T,S
     */
    function some(col, f, opt_obj) {
      if (typeof col.some === 'function') {
        return col.some(f, opt_obj);
      }
      if (util.isArrayLike(col)) {
        return array.some(/** @type {!Array} */ (col), f, opt_obj);
      }
      var keys = getKeys(col);
      var values = getValues(col);
      var l = values.length;
      for (var i = 0; i < l; i++) {
        if (f.call(opt_obj, values[i], keys && keys[i], col)) {
          return true;
        }
      }
      return false;
    }

    /**
     * 对集合的每个值调用f. 所有函数都返回true则every返回true. 否则返回false并不接着执行遍历.
     * @param {S} col 类集合对象.
     * @param {function(this:T,?,?,S):boolean} f 遍历函数.
     * @param {T=} opt_obj 函数上下文.
     * @return {boolean} 若所有项通过测试返回true.
     * @template T,S
     */
    function every(col, f, opt_obj) {
      if (typeof col.every === 'function') {
        return col.every(f, opt_obj);
      }
      if (util.isArrayLike(col)) {
        return array.every(/** @type {!Array} */ (col), f, opt_obj);
      }
      var keys = getKeys(col);
      var values = getValues(col);
      var l = values.length;
      for (var i = 0; i < l; i++) {
        if (!f.call(opt_obj, values[i], keys && keys[i], col)) {
          return false;
        }
      }
      return true;
    }

    return {
      getCount: getCount,
      getValues: getValues,
      getKeys: getKeys,
      contains: contains,
      isEmpty: isEmpty,
      clear: clear,
      forEach: forEach,
      filter: filter,
      map: map,
      some: some,
      every: every
    };
  }
);