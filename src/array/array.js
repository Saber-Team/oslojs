/**
 * @fileoverview 操作数组的一些基本方法.我本意不要涉及字符串的操作,虽然很多方法类似,
 * 但是参数的类型和返回值的类型不注意很容易出错,对于弱类型语言应警惕.关于String的操作可以
 * 按需加载Oslo.string包下的模块进行处理。
 * @author Leo.Zhang
 * @email zmike86@gmail.com
 */

define(['../util/util'], function(util) {

  'use strict';


  var AP = Array.prototype;
  var OP = Object.prototype;


  /**
   * 遍历数组,跳过空值Skips holes in the array.
   * See {@link http://tinyurl.com/developer-mozilla-org-array-foreach}
   * @param {Array.<T>} arr
   * @param {?function(this: S, T, number, ?): ?} f 忽略返回值.
   * @param {S=} opt_obj 调用函数上下文.
   * @template T,S
   */
  var forEach = AP.forEach ?
    function(arr, f, opt_obj) {
      AP.forEach.call(arr, f, opt_obj);
    } :
    function(arr, f, opt_obj) {
      var l = arr.length;  // must be fixed during loop... see docs
      for (var i = 0; i < l; i++) {
        if (i in arr) {
          f.call(opt_obj, arr[i], i, arr);
        }
      }
    };


  /**
   * 从后向前遍历数组.
   * @param {Array.<T>} arr Array or array like object over which to iterate.
   * @param {?function(this: S, T, number, ?): ?} f The function to call for every
   *     element. This function
   *     takes 3 arguments (the element, the index and the array). 忽略返回值.
   * @param {S=} opt_obj 函数上下文.
   * @template T,S
   */
  function forEachRight(arr, f, opt_obj) {
    var l = arr.length;  // must be fixed during loop... see docs
    for (var i = l - 1; i >= 0; --i) {
      if (i in arr) {
        f.call(opt_obj, arr[i], i, arr);
      }
    }
  }


  /**
   * 查找指定元素, 无返回-1.
   * See {@link http://tinyurl.com/developer-mozilla-org-array-indexof}
   * @param {Array|ArrayLike} arr 要搜寻的数组.
   * @param {*} obj 搜寻目标.
   * @param {number=} opt_fromIndex 从哪里开始搜索.默认从下标0处.
   * @return {number} 返回在数组中的索引.
   */
  var indexOf = AP.indexOf ?
    function(arr, obj, opt_fromIndex) {
      return AP.indexOf.call(arr, obj, opt_fromIndex);
    } :
    function(arr, obj, opt_fromIndex) {
      var fromIndex = util.isNull(opt_fromIndex) ?
        0 : (opt_fromIndex < 0 ?
        Math.max(0, arr.length + opt_fromIndex) : opt_fromIndex);

      for (var i = fromIndex; i < arr.length; i++) {
        if (i in arr && arr[i] === obj)
          return i;
      }
      return -1;
    };


  /**
   * 返回指定项在数组中的最后出现的位置, 无则-1.
   * See {@link http://tinyurl.com/developer-mozilla-org-array-lastindexof}
   * @param {array} arr 要搜寻的数组.
   * @param {*} obj 搜寻目标.
   * @param {?number=} opt_fromIndex 从哪个位置开始向前遍历. 忽略则默认从尾元素开始.
   * @return {number} 返回在数组中匹配的最后的索引.
   */
  var lastIndexOf = AP.lastIndexOf ?
    function(arr, obj, opt_fromIndex) {
      // FireFox在没传第三个参数的时候表现正常.但若用户没传第三个参数,代理方法里却把undefined值
      // (或者null)传给原生方法, FF会把它当做0从而导致返回值永远是-1. 测试31.0版本仍没修复此问题.
      var fromIndex = util.isNull(opt_fromIndex) ? arr.length - 1 : opt_fromIndex;
      return AP.lastIndexOf.call(arr, obj, fromIndex);
    } :
    function(arr, obj, opt_fromIndex) {
      var fromIndex = util.isNull(opt_fromIndex) ? arr.length - 1 : opt_fromIndex;
      if (fromIndex < 0) {
        fromIndex = Math.max(0, arr.length + fromIndex);
      }

      for (var i = fromIndex; i >= 0; i--) {
        if (i in arr && arr[i] === obj)
          return i;
      }
      return -1;
    };


  /**
   * 移除数组中指定位置 i处的元素
   * @param {Array|ArrayLike} arr 一个数组或者类数组对象.
   * @param {number} i 要移除元素的下标.
   * @return {boolean} 返回是否成功移除.
   */
  function removeAt(arr, i) {
    // splice返回删除项数组
    return AP.splice.call(arr, i, 1).length === 1;
  }


  /**
   * 在数组中移除指定的元素,如果存在移除成功否则失败.
   * @param {Array|ArrayLike} arr 宿主数组.
   * @param {*} obj 移除项.
   * @return {boolean} 成功返回True.
   */
  function remove(arr, obj) {
    var i = indexOf(arr, obj);
    var rv;
    if ((rv = i >= 0))
      removeAt(arr, i);
    return rv;
  }


  /**
   * 在数组中搜索符合条件的第一个项.
   * @param {Array.<T>|ArrayLike} arr 要遍历的对象.
   * @param {?function(this:S, T, number, ?) : boolean} f 匹配函数.有3个形参(the element, the index and the array)
   *     返回布尔值.
   * @param {S=} opt_obj 函数执行上下文.
   * @return {T} 第一个通过测试的项,也可能是null.
   * @template T,S
   */
  function find(arr, f, opt_obj) {
    var i = findIndex(arr, f, opt_obj);
    return i < 0 ? null : util.isString(arr) ? arr.charAt(i) : arr[i];
  }


  /**
   * 在数组中搜索符合条件的第一个项的索引.
   * @param {Array.<T>|ArrayLike} arr 要遍历的对象.
   * @param {?function(this:S, T, number, ?) : boolean} f 匹配函数.有3个形参(the element, the index and the array)
   *     返回布尔值.
   * @param {S=} opt_obj 函数执行上下文.
   * @return {number} 返回第一个通过测试的元素的索引, 无通过者返回-1.
   * @template T,S
   */
  function findIndex(arr, f, opt_obj) {
    var l = arr.length;  // must be fixed during loop... see docs
    var arr2 = util.isString(arr) ? arr.split('') : arr;
    for (var i = 0; i < l; i++) {
      // int in array 判断数值是否在数组长度范围内
      if (i in arr2 && f.call(opt_obj, arr2[i], i, arr))
        return i;
    }
    return -1;
  }


  /**
   * 在数组中从后向前遍历搜寻符合条件的第一个项..
   * @param {Array.<T>} arr Array or array like object over which to iterate.
   * @param {?function(this:S, T, number, ?) : boolean} f 匹配函数.有3个形参(the element, the index and the array)
   *     返回布尔值.
   * @param {Object=} opt_obj 函数上下文.
   * @return {number} 返回项所在位置.
   * @template T,S
   */
  function findIndexRight(arr, f, opt_obj) {
    var l = arr.length;  // must be fixed during loop... see docs
    var arr2 = util.isString(arr) ? arr.split('') : arr;
    for (var i = l - 1; i >= 0; i--) {
      if (i in arr2 && f.call(opt_obj, arr2[i], i, arr))
        return i;
    }
    return -1;
  }


  /**
   * 用数组扩展数组. 原数组进行原地操作, 不会产生新的数组对象.
   * 用法:
   * var a = [];
   * array.extend(a, [0, 1]);
   * a; // [0, 1]
   * array.extend(a, 2);
   * a; // [0, 1, 2]
   *
   * @param {Array} arr1 要改变的数组.
   * @param {...*} var_args 附加数组项.
   */
  function extend(arr1, var_args) {
    for (var i = 1; i < arguments.length; i++) {
      var arr2 = arguments[i];
      // 若参数类型是数组或Arguments,直接调用数组的apply传递该参数
      var isArrayLike;
      if (util.isArray(arr2) ||
        // 检测是否Arguments对象.ES5中规定Arguments对象的[[Class]]属性是"Arguments"
        // 但只有V8和JSC/Safari得到正确结果.通过对象的callee属性是否存在判定是否一个
        // arguments对象.
        (isArrayLike = util.isArrayLike(arr2)) &&
        // 严格模式下直接读取arguments.callee会抛出异常,所以换种方式hasOwnProperty.
        Object.prototype.hasOwnProperty.call(arr2, 'callee')) {
        arr1.push.apply(arr1, arr2);
      } else if (isArrayLike) {
        // Otherwise loop over arr2 to prevent copying the object.
        var len1 = arr1.length;
        var len2 = arr2.length;
        for (var j = 0; j < len2; j++) {
          arr1[len1 + j] = arr2[j];
        }
      } else {
        arr1.push(arr2);
      }
    }
  }


  /**
   * 遍历数组,以前一个返回值作为下一次的输入,最终返回遍历后计算结果.
   * See {@link http://tinyurl.com/developer-mozilla-org-array-reduce}
   * 用法:
   * var a = [1, 2, 3, 4];
   * Oslo.array.reduce(a, function(r, v, i, arr) {
         *   return r + v;
         * }, 0);
   * returns 10
   *
   * @param {Array.<T>|ArrayLike} arr 宿主数组.
   * @param {?function(this:S, R, T, number, ?) : R} f 匹配函数.有4个形参 (函数执行的初始值,
   *     当前数组项, 当前数组项索引, 数组本身)
   *     function(previousValue, currentValue, index, array).
   * @param {?} val 初始值.
   * @param {S=} opt_obj 函数执行上下文.
   * @return {R}
   * @template T,S,R
   */
  function reduce(arr, f, val, opt_obj) {
    if (arr.reduce) {
      if (opt_obj) {
        return arr.reduce(util.bind(f, opt_obj), val);
      } else {
        return arr.reduce(f, val);
      }
    }
    var rval = val;
    forEach(arr, function(val, index) {
      rval = f.call(opt_obj, rval, val, index, arr);
    });
    return rval;
  }


  /**
   * 从后向前遍历数组,以前一个返回值作为下一次的输入,最终返回遍历后计算结果.
   * See {@link http://tinyurl.com/developer-mozilla-org-array-reduceright}
   * 用法:
   * var a = ['a', 'b', 'c'];
   * Oslo.array.reduceRight(a, function(r, v, i, arr) {
     *     return r + v;
     * }, '');
   * returns 'cba'
   *
   * @param {Array.<T>|ArrayLike} arr 宿主数组.
   * @param {?function(this:S, R, T, number, ?) : R} f 匹配函数.有4个形参 (函数执行的初始值,
   *     当前数组项, 当前数组项索引, 数组本身)
   *     function(previousValue, currentValue, index, array).
   * @param {?} val 初始值.
   * @param {S=} opt_obj 函数执行上下文.
   * @return {R}
   * @template T,S,R
   */
  function reduceRight(arr, f, val, opt_obj) {
    if (arr.reduceRight) {
      if (opt_obj) {
        return arr.reduceRight(util.bind(f, opt_obj), val);
      } else {
        return arr.reduceRight(f, val);
      }
    }
    var rval = val;
    forEachRight(arr, function(val, index) {
      rval = f.call(opt_obj, rval, val, index, arr);
    });
    return rval;
  }


  /**
   * 对数组进行过滤匹配.
   * See {@link http://tinyurl.com/developer-mozilla-org-array-filter}
   * @param {Array.<T>|ArrayLike} arr 要遍历的对象.
   * @param {?function(this:S, T, number, ?):boolean} f 匹配函数.有3个形参(当前项,当前索引,数组本身)
   *     返回布尔值.只保留返回true的项.
   * @param {S=} opt_obj 匹配函数上下文.
   * @return {!Array} 通过项组成的新数组.
   * @template T,S
   */
  var filter = AP.filter ?
    function(arr, f, opt_obj) {
      return AP.filter.call(arr, f, opt_obj);
    } :
    function(arr, f, opt_obj) {
      var l = arr.length;  // must be fixed during loop... see docs
      var res = [];
      var resLength = 0;
      for (var i = 0; i < l; i++) {
        if (i in arr) {
          var val = arr[i];  // in case f mutates arr2
          if (f.call(opt_obj, val, i, arr)) {
            res[resLength++] = val;
          }
        }
      }
      return res;
    };


  /**
   * 遍历数组项进行统一操作.
   * See {@link http://tinyurl.com/developer-mozilla-org-array-map}
   * @param {Array.<T>|ArrayLike} arr 要遍历的对象.
   * @param {?function(this:S, T, number, ?):?} f 操作函数. 有3个形参(当前项,当前索引,数组本身)
   *     返回操作结果作为数组项.这个方法会生成一个新数组.
   * @param {S=} opt_obj 函数上下文.
   * @return {!Array} 返回一个新数组.
   * @template T,S
   */
  var map = AP.map ?
    function(arr, f, opt_obj) {
      return AP.map.call(arr, f, opt_obj);
    } :
    function(arr, f, opt_obj) {
      var l = arr.length;  // must be fixed during loop... see docs
      var res = new Array(l);
      for (var i = 0; i < l; i++) {
        if (i in arr) {
          res[i] = f.call(opt_obj, arr[i], i, arr);
        }
      }
      return res;
    };


  /**
   * 遍历数组若任意一项经由操作函数返回true则some()返回true(剩余项不会被检查). 当且仅当全部false,
   * some()返回false.
   * See {@link http://tinyurl.com/developer-mozilla-org-array-some}
   *
   * @param {Array.<T>|ArrayLike} arr 要遍历的对象.
   * @param {?function(this:S, T, number, ?) : boolean} f 操作函数.有3个形参(当前项,当前索引,数组本身)
   *     返回布尔值.
   * @param {S=} opt_obj 函数上下文.
   * @return {boolean} true 有数据项通过检查.
   * @template T,S
   */
  var some = AP.some ?
    function(arr, f, opt_obj) {
      return AP.some.call(arr, f, opt_obj);
    } :
    function(arr, f, opt_obj) {
      var l = arr.length;  // must be fixed during loop... see docs
      for (var i = 0; i < l; i++) {
        if (i in arr && f.call(opt_obj, arr[i], i, arr)) {
          return true;
        }
      }
      return false;
    };


  /**
   * 遍历数组若全部项经由操作函数返回true则some()返回true.否则some()返回false.
   * See {@link http://tinyurl.com/developer-mozilla-org-array-every}
   * @param {Array.<T>|ArrayLike} arr 要遍历的对象.
   * @param {?function(this:S, T, number, ?) : boolean} f 操作函数.有3个形参(当前项,当前索引,数组本身)
   *     返回布尔值.
   * @param {S=} opt_obj 函数上下文.
   * @return {boolean} false 全部数据项通过检查.
   * @template T,S
   */
  var every = AP.every ?
    function(arr, f, opt_obj) {
      return AP.every.call(arr, f, opt_obj);
    } :
    function(arr, f, opt_obj) {
      var l = arr.length;  // must be fixed during loop... see docs
      for (var i = 0; i < l; i++) {
        if (i in arr && !f.call(opt_obj, arr[i], i, arr)) {
          return false;
        }
      }
      return true;
    };


  /**
   * 将数组转化成对象, key由自定义函数确定.
   * @param {Array.<T>|ArrayLike} arr 要遍历的数组或类数组对象.它之中的数组项作为新对象的value.
   * @param {?function(this:S, T, number, ?) : string} keyFunc 操作函数.有3个形参(当前项,当前索引,
   *     数组本身)并且返回字符串作为新对象的key.
   * @param {S=} opt_obj keyFunc的上下文.
   * @return {!Object.<T>} 返回新对象.
   * @template T,S
   */
  function toObject(arr, keyFunc, opt_obj) {
    var ret = {};
    forEach(arr, function(element, index) {
      ret[keyFunc.call(opt_obj, element, index, arr)] = element;
    });
    return ret;
  }


  /**
   * 将对象转化成数组.
   * @param {ArrayLike} object 转化的对象.
   * @return {!Array} 对象要有个length属性,每一个非负的小于length属性都会被包含进数组.
   *     没有length属性会返回空数组.
   */
  function toArray(object) {
    var length = object.length;
    if (length > 0) {
      var rv = new Array(length);
      for (var i = 0; i < length; i++) {
        rv[i] = object[i];
      }
      return rv;
    }
    return [];
  }

  return {
    indexOf: indexOf,
    lastIndexOf: lastIndexOf,
    find: find,
    findIndex: findIndex,
    findIndexRight: findIndexRight,
    forEach: forEach,
    forEachRight: forEachRight,
    filter: filter,
    /**
     * 是否数组含有指定项.
     * @param {Array|ArrayLike} arr 数组.
     * @param {*} obj 指定项.
     * @return {boolean}
     */
    contains: function(arr, obj) { return indexOf(arr, obj) >= 0; },
    extend: extend,
    map: map,
    some: some,
    every: every,
    reduce: reduce,
    reduceRight: reduceRight,
    remove: remove,
    removeAt: removeAt,
    toObject: toObject,
    toArray: toArray,
    /**
     * 去掉重复的项, 只保留第一次出现的元素.这个方法会改变原数组, 但不会改变唯一元素的先后顺序.
     * 对于对象来说, 相同的项是由util.getUid定义的{@link util.getUid}.
     * Runtime: N,
     * Worstcase space: 2N (no dupes)
     *
     * @param {Array} arr 操作的数组
     * @param {Array=} opt_rv 可选的参数,若传递则将结果保存在该数组中,原数组则不会改变.
     */
    unique: function(arr, opt_rv) {
      var returnArray = opt_rv || arr;
      var seen = {}, cursorInsert = 0, cursorRead = 0;

      while (cursorRead < arr.length) {
        var current = arr[cursorRead++];

        // 将类型前缀加上避免重复keys (e.g. true and 'true').
        var key = util.isObject(current) ?
          'o' + util.getUid(current) :
          (typeof current).charAt(0) + current;

        if (!OP.hasOwnProperty.call(seen, key)) {
          seen[key] = true;
          returnArray[cursorInsert++] = current;
        }
      }
      returnArray.length = cursorInsert;
    },
    /**
     * Knuth洗牌算法.也叫 Fisher-Yates shuffle.
     * 默认随机函数用原生的Math.random().
     * Runtime: O(n)
     *
     * @param {!Array} arr 要洗牌的数组.
     * @param {function():number=} opt_randFn 洗牌随机函数.没有形参返回值于 [0, 1).
     */
    shuffle: function(arr, opt_randFn) {
      var randFn = opt_randFn || Math.random;

      for (var i = arr.length - 1; i > 0; i--) {
        // Choose a random array index in [0, i] (inclusive with i).
        var j = Math.floor(randFn() * (i + 1));

        var tmp = arr[i];
        arr[i] = arr[j];
        arr[j] = tmp;
      }
    }
  };
});