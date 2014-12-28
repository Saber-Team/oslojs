/**
 * @fileoverview Python形式的迭代器函数.
 * 见 http://docs.python.org/library/itertools.html
 * @author Leo.Zhang
 * @email zmike86@gamil.com
 */

define([
    '../util/util',
    '../array/array',
    './iterator',
    './stopiteration'
  ],
  function(util, array, Iterator, StopIteration) {

    'use strict';

    /**
     * 返回一个能够遍历对象的迭代器. 可能有点晦涩, 看代码就明白.
     * @param {Iterator} obj  若对象本身就是迭代器将会返回自身. 若对象含有__iterator__
     *     方法,则此方法返回的迭代器会被利用. 若对象是类数组,我们就自己创建迭代器.
     * @return {!Iterator} 返回对象的迭代器.
     */
    function toIterator(obj) {
      if (obj instanceof Iterator) {
        return obj;
      }
      if (typeof obj.__iterator__ === 'function') {
        return obj.__iterator__(false);
      }
      if (util.isArrayLike(obj)) {
        var i = 0;
        var newIter = new Iterator();
        newIter.next = function() {
          while (true) {
            if (i >= obj.length) {
              throw StopIteration;
            }
            // 元素可能已被删除.
            if (!(i in obj)) {
              i++;
              continue;
            }
            return obj[i++];
          }
        };
        return newIter;
      }


      // TODO: 可以用ds.getValues()代替
      throw Error('Not implemented');
    }

    /**
     * 函数遍历可迭代对象.
     * @param {Iterator} iterable 迭代对象.
     * @param {function(this:T,?,?,?):?} f 执行的函数. 接收三个行参(数据项, undefined, 对象本身)
     *   返回值无关紧要. 第二个参数传undefined是因为想让该函数也可用在array.forEach的场景中.
     * @param {T=} opt_obj 函数上下文.
     * @template T
     */
    function forEach(iterable, f, opt_obj) {
      if (util.isArrayLike(iterable)) {
        /** @preserveTry */
        try {
          // NOTES: this passes the index number to the second parameter
          // of the callback contrary to the documentation above.
          array.forEach(/** @type {ArrayLike} */(iterable), f, opt_obj);
        } catch (ex) {
          if (ex !== StopIteration) {
            throw ex;
          }
        }
      } else {
        iterable = toIterator(iterable);
        /** @preserveTry */
        try {
          while (true) {
            f.call(opt_obj, iterable.next(), undefined, iterable);
          }
        } catch (ex) {
          if (ex !== StopIteration) {
            throw ex;
          }
        }
      }
    }

    /**
     * 遍历迭代对象, 返回只通过验证函数的项加入到新的迭代器中.
     * @param {Iterator} iterable 迭代对象.
     * @param {function(this:T,?,undefined,?):boolean} f 要执行的函数. 如果函数执行返回true则在新的
     *   迭代器中可以遍历到该项否则跳过该项.
     * @param {T=} opt_obj 函数上下文.
     * @return {!Iterator} 返回一个新的迭代器只遍历通过测试的项.
     * @template T
     */
    function filter(iterable, f, opt_obj) {
      var iterator = toIterator(iterable);
      var newIter = new Iterator();
      newIter.next = function() {
        while (true) {
          var val = iterator.next();
          if (f.call(opt_obj, val, undefined, iterator)) {
            return val;
          }
        }
      };
      return newIter;
    }

    /**
     * 返回只在特定范围遍历的迭代器,函数的参数个数是不固定的:
     * <pre>
     * range(5) = range(0, 5, 1)
     * range(2, 5) = range(2, 5, 1)
     * </pre>
     * @param {number} startOrStop 只有一个参数时代表终止值,起始值默认是0. 否则代表起始值.
     * @param {number=} opt_stop 提供的终止值.
     * @param {number=} opt_step 步进长度,也可以是负值.
     * @return {!Iterator} 返回新的迭代器.
     */
    function range(startOrStop, opt_stop, opt_step) {
      var start = 0;
      var stop = startOrStop;
      var step = opt_step || 1;
      if (arguments.length > 1) {
        start = startOrStop;
        stop = opt_stop;
      }
      if (step === 0) {
        throw Error('Range step argument must not be zero');
      }

      var newIter = new Iterator();
      newIter.next = function() {
        if (step > 0 && start >= stop || step < 0 && start <= stop) {
          throw StopIteration;
        }
        var rv = start;
        start += step;
        return rv;
      };
      return newIter;
    }

    /**
     * 将迭代器中各项连接起来.
     * @param {Iterator} iterable
     * @param {string} deliminator
     * @return {string}
     */
    function join(iterable, deliminator) {
      return toArray(iterable).join(deliminator);
    }

    /**
     * 多值映射返回新的迭代器.
     * @param {Iterable} iterable 迭代对象.
     * @param {function(this:T,?,undefined,?):?} f 一个处理函数要返回新的值.
     * @param {T=} opt_obj 函数上下文.
     * @return {!Iterator}
     * @template T
     */
    function map(iterable, f, opt_obj) {
      var iterator = toIterator(iterable);
      var newIter = new Iterator();
      newIter.next = function() {
        while (true) {
          var val = iterator.next();
          return f.call(opt_obj, val, undefined, iterator);
        }
      };
      return newIter;
    }

    /**
     * 逐步递增式处理可迭代对象各项.
     * @param {Iterable} iterable 迭代对象.
     * @param {function(this:T,V,?):V} f 执行函数接受两个行参(上次计算后的值或初始值, 和当前项).
     *     function(previousValue, currentElement) : newValue.
     * @param {V} val 处理函数的初始值.
     * @param {T=} opt_obj 函数上下文.
     * @return {V} Result of evaluating f repeatedly across the values of
     *     the iterator.
     * @template T,V
     */
    function reduce(iterable, f, val, opt_obj) {
      var rval = val;
      forEach(iterable, function(val) {
        rval = f.call(opt_obj, rval, val);
      });
      return rval;
    }

    /**
     * 只要有一项返回true则返回true.
     * @param {Iterable} iterable 迭代对象.
     * @param {function(this:T,?,undefined,?):boolean} f 执行函数返回布尔值.
     * @param {T=} opt_obj 函数上下文.
     * @return {boolean} 返回是否有值通过测试.
     * @template T
     */
    function some(iterable, f, opt_obj) {
      iterable = toIterator(iterable);
      /** @preserveTry */
      try {
        while (true) {
          if (f.call(opt_obj, iterable.next(), undefined, iterable)) {
            return true;
          }
        }
      } catch (ex) {
        if (ex !== StopIteration) {
          throw ex;
        }
      }
      return false;
    }

    /**
     * 全部通过测试则返回true否则返回false.
     * @param {Iterable} iterable 迭代对象.
     * @param {function(this:T,?,undefined,?):boolean} f 检测函数返回布尔值.
     * @param {T=} opt_obj 函数上下文.
     * @return {boolean} true 是否全部通过测试.
     * @template T
     */
    function every(iterable, f, opt_obj) {
      iterable = toIterator(iterable);
      /** @preserveTry */
      try {
        while (true) {
          if (!f.call(opt_obj, iterable.next(), undefined, iterable)) {
            return false;
          }
        }
      } catch (ex) {
        if (ex !== StopIteration) {
          throw ex;
        }
      }
      return true;
    }

    /**
     * 接收多个迭代器并且在迭代的时候遍历其中的项.
     * @param {...Iterator} var_args 任意数量的迭代对象.
     * @return {!Iterator} 返回新的迭代器.
     */
    function chain(var_args) {
      var args = arguments;
      var length = args.length;
      var i = 0;
      var newIter = new Iterator();

      /**
       * @return {*} The next item in the iteration.
       * @this {Iterator}
       */
      newIter.next = function() {
        /** @preserveTry */
        try {
          if (i >= length) {
            throw StopIteration;
          }
          var current = toIterator(args[i]);
          return current.next();
        } catch (ex) {
          if (ex !== StopIteration || i >= length) {
            throw ex;
          } else {
            // In case we got a StopIteration increment counter and try again.
            i++;
            return this.next();
          }
        }
      };

      return newIter;
    }

    /**
     * Builds a new iterator that iterates over the original, but skips elements as
     * long as a supplied function returns true.
     * @param {Iterable} iterable 迭代对象.
     * @param {function(this:T,?,undefined,?):boolean} f 遍历用到的函数,返回布尔值.
     * @param {T=} opt_obj 函数上下文.
     * @return {!Iterator} A new iterator that drops elements from the
     *     original iterator as long as {@code f} is true.
     * @template T
     */
    function dropWhile(iterable, f, opt_obj) {
      var iterator = toIterator(iterable);
      var newIter = new Iterator();
      var dropping = true;
      newIter.next = function() {
        while (true) {
          var val = iterator.next();
          if (dropping && f.call(opt_obj, val, undefined, iterator)) {
            continue;
          } else {
            dropping = false;
          }
          return val;
        }
      };
      return newIter;
    }

    /**
     * Builds a new iterator that iterates over the original, but only as long as a
     * supplied function returns true.
     * @param {Iterable} iterable  The iterator object.
     * @param {function(this:T,?,undefined,?):boolean} f  The function to call for
     *     every value. This function
     *     takes 3 arguments (the value, undefined, and the iterator) and should
     *     return a boolean.
     * @param {T=} opt_obj This is used as the 'this' object in f when called.
     * @return {!Iterator} A new iterator that keeps elements in the
     *     original iterator as long as the function is true.
     * @template T
     */
    function takeWhile(iterable, f, opt_obj) {
      var iterator = toIterator(iterable);
      var newIter = new Iterator();
      var taking = true;
      newIter.next = function() {
        while (true) {
          if (taking) {
            var val = iterator.next();
            if (f.call(opt_obj, val, undefined, iterator)) {
              return val;
            } else {
              taking = false;
            }
          } else {
            throw StopIteration;
          }
        }
      };
      return newIter;
    }

    /**
     * 将迭代器转化成熟组
     * @param {Iterable} iterable
     * @return {!Array}
     */
    function toArray(iterable) {
      // Fast path for array-like.
      if (util.isArrayLike(iterable)) {
        return array.toArray(/** @type {!ArrayLike} */(iterable));
      }
      iterable = toIterator(iterable);
      var array = [];
      forEach(iterable, function(val) {
        array.push(val);
      });
      return array;
    }

    /**
     * 遍历两个对象返回他们是否长度相等且数据项各个都相等.
     * @param {Iterable} iterable1 对象1.
     * @param {Iterable} iterable2 对象2.
     * @return {boolean} 返回是否相等.
     */
    function equals(iterable1, iterable2) {
      iterable1 = toIterator(iterable1);
      iterable2 = toIterator(iterable2);
      var b1, b2;
      /** @preserveTry */
      try {
        while (true) {
          b1 = b2 = false;
          var val1 = iterable1.next();
          b1 = true;
          var val2 = iterable2.next();
          b2 = true;
          if (val1 !== val2) {
            return false;
          }
        }
      } catch (ex) {
        if (ex !== StopIteration) {
          throw ex;
        } else {
          if (b1 && !b2) {
            // iterable1 done but iterable2 is not done.
            return false;
          }
          if (!b2) {
            /** @preserveTry */
            try {
              // iterable2 not done?
              val2 = iterable2.next();
              // iterable2 not done but iterable1 is done
              return false;
            } catch (ex1) {
              if (ex1 !== StopIteration) {
                throw ex1;
              }
              // iterable2 done as well... They are equal
              return true;
            }
          }
        }
      }
      return false;
    }

    /**
     * 加强版的next方法, 在不能遍历的情况下不是抛出异常而是返回默认值.
     * @param {Iterable} iterable 迭代对象.
     * @param {*} 默认项.
     * @return {*} 返回下一项或者默认项.
     */
    function nextOrValue(iterable, defaultValue) {
      try {
        return toIterator(iterable).next();
      } catch (e) {
        if (e !== StopIteration) {
          throw e;
        }
        return defaultValue;
      }
    }

    /**
     * Cartesian product of zero or more sets.  Gives an iterator that gives every
     * combination of one element chosen from each set.  For example,
     * ([1, 2], [3, 4]) gives ([1, 3], [1, 4], [2, 3], [2, 4]).
     * @see http://docs.python.org/library/itertools.html#itertools.product
     * @param {...!ArrayLike.<*>} var_args Zero or more sets, as arrays.
     * @return {!Iterator} An iterator that gives each n-tuple (as an
     *     array).
     */
    function product(var_args) {
      var someArrayEmpty = array.some(arguments, function(arr) {
        return !arr.length;
      });

      // An empty set in a cartesian product gives an empty set.
      if (someArrayEmpty || !arguments.length) {
        return new Iterator();
      }

      var iter = new Iterator();
      var arrays = arguments;

      // The first indicies are [0, 0, ...]
      var indicies = array.repeat(0, arrays.length);

      iter.next = function() {

        if (indicies) {
          var retVal = array.map(indicies, function(valueIndex, arrayIndex) {
            return arrays[arrayIndex][valueIndex];
          });

          // Generate the next-largest indicies for the next call.
          // Increase the rightmost index. If it goes over, increase the next
          // rightmost (like carry-over addition).
          for (var i = indicies.length - 1; i >= 0; i--) {
            // Assertion prevents compiler warning below.
            // asserts.assert(indicies);
            if (indicies[i] < arrays[i].length - 1) {
              indicies[i]++;
              break;
            }

            // We're at the last indicies (the last element of every array), so
            // the iteration is over on the next call.
            if (i == 0) {
              indicies = null;
              break;
            }
            // Reset the index in this column and loop back to increment the
            // next one.
            indicies[i] = 0;
          }
          return retVal;
        }

        throw StopIteration;
      };

      return iter;
    }


    /**
     * Create an iterator to cycle over the iterable's elements indefinitely.
     * For example, ([1, 2, 3]) would return : 1, 2, 3, 1, 2, 3, ...
     * @see: http://docs.python.org/library/itertools.html#itertools.cycle.
     * @param {!Iterable} iterable The iterable object.
     * @return {!Iterator} An iterator that iterates indefinitely over
     * the values in {@code iterable}.
     */
    function cycle(iterable) {
      var baseIterator = toIterator(iterable);

      // We maintain a cache to store the iterable elements as we iterate
      // over them. The cache is used to return elements once we have
      // iterated over the iterable once.
      var cache = [];
      var cacheIndex = 0;

      var iter = new Iterator();

      // This flag is set after the iterable is iterated over once
      var useCache = false;

      iter.next = function() {
        var returnElement = null;

        // Pull elements off the original iterator if not using cache
        if (!useCache) {
          try {
            // Return the element from the iterable
            returnElement = baseIterator.next();
            cache.push(returnElement);
            return returnElement;
          } catch (e) {
            // If an exception other than StopIteration is thrown
            // or if there are no elements to iterate over (the iterable was empty)
            // throw an exception
            if (e !== StopIteration || array.isEmpty(cache)) {
              throw e;
            }
            // set useCache to true after we know that a 'StopIteration' exception
            // was thrown and the cache is not empty (to handle the 'empty iterable'
            // use case)
            useCache = true;
          }
        }

        returnElement = cache[cacheIndex];
        cacheIndex = (cacheIndex + 1) % cache.length;

        return returnElement;
      };

      return iter;
    }

    return {
      toIterator: toIterator,
      forEach: forEach,
      filter: filter,
      range: range,
      join: join,
      map: map,
      reduce: reduce,
      some: some,
      every: every,
      chain: chain,
      dropWhile: dropWhile,
      takeWhile: takeWhile,
      toArray: toArray,
      equals: equals,
      nextOrValue: nextOrValue,
      product: product,
      cycle: cycle
    };
  }
);