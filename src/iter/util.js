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
     * @param {function(this:T,?,undefined,?):boolean} f 要执行的函数. If the return value is true the element will be
     *     included  in the returned iteror.  If it is false the element is not
     *     included.
     * @param {T=} opt_obj The object to be used as the value of 'this' within
     *     {@code f}.
     * @return {!Iterator} A new iterator in which only elements that
     *     passed the test are present.
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
     * Creates a new iterator that returns the values in a range.  This function
     * can take 1, 2 or 3 arguments:
     * <pre>
     * range(5) same as range(0, 5, 1)
     * range(2, 5) same as range(2, 5, 1)
     * </pre>
     *
     * @param {number} startOrStop  The stop value if only one argument is provided.
     *     The start value if 2 or more arguments are provided.  If only one
     *     argument is used the start value is 0.
     * @param {number=} opt_stop  The stop value.  If left out then the first
     *     argument is used as the stop value.
     * @param {number=} opt_step  The number to increment with between each call to
     *     next.  This can be negative.
     * @return {!Iterator} A new iterator that returns the values in the
     *     range.
     */
    function range(startOrStop, opt_stop, opt_step) {
      var start = 0;
      var stop = startOrStop;
      var step = opt_step || 1;
      if (arguments.length > 1) {
        start = startOrStop;
        stop = opt_stop;
      }
      if (step == 0) {
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
     * Joins the values in a iterator with a delimiter.
     * @param {Iterator} iterable  The iterator to get the values from.
     * @param {string} deliminator  The text to put between the values.
     * @return {string} The joined value string.
     */
    function join(iterable, deliminator) {
      return toArray(iterable).join(deliminator);
    }


    /**
     * For every element in the iterator call a function and return a new iterator
     * with that value.
     *
     * @param {Iterable} iterable The iterator to iterate over.
     * @param {function(this:T,?,undefined,?):?} f The function to call for every
     *     element.  This function
     *     takes 3 arguments (the element, undefined, and the iterator) and should
     *     return a new value.
     * @param {T=} opt_obj The object to be used as the value of 'this' within
     *     {@code f}.
     * @return {!Iterator} A new iterator that returns the results of
     *     applying the function to each element in the original iterator.
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
     * Passes every element of an iterator into a function and accumulates the
     * result.
     *
     * @param {Iterable} iterable The iterator to iterate over.
     * @param {function(this:T,V,?):V} f The function to call for every
     *     element. This function takes 2 arguments (the function's previous result
     *     or the initial value, and the value of the current element).
     *     function(previousValue, currentElement) : newValue.
     * @param {V} val The initial value to pass into the function on the first call.
     * @param {T=} opt_obj  The object to be used as the value of 'this'
     *     within f.
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
     * Goes through the values in the iterator. Calls f for each these and if any of
     * them returns true, this returns true (without checking the rest). If all
     * return false this will return false.
     *
     * @param {Iterable} iterable  The iterator object.
     * @param {function(this:T,?,undefined,?):boolean} f  The function to call for
     *     every value. This function
     *     takes 3 arguments (the value, undefined, and the iterator) and should
     *     return a boolean.
     * @param {T=} opt_obj The object to be used as the value of 'this' within
     *     {@code f}.
     * @return {boolean} true if any value passes the test.
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
     * Goes through the values in the iterator. Calls f for each these and if any of
     * them returns false this returns false (without checking the rest). If all
     * return true this will return true.
     *
     * @param {Iterable} iterable  The iterator object.
     * @param {function(this:T,?,undefined,?):boolean} f  The function to call for
     *     every value. This function
     *     takes 3 arguments (the value, undefined, and the iterator) and should
     *     return a boolean.
     * @param {T=} opt_obj The object to be used as the value of 'this' within
     *     {@code f}.
     * @return {boolean} true if every value passes the test.
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
     * Takes zero or more iterators and returns one iterator that will iterate over
     * them in the order chained.
     * @param {...Iterator} var_args  Any number of iterator objects.
     * @return {!Iterator} Returns a new iterator that will iterate over
     *     all the given iterators' contents.
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
     * @param {Iterable} iterable  The iterator object.
     * @param {function(this:T,?,undefined,?):boolean} f  The function to call for
     *     every value. This function
     *     takes 3 arguments (the value, undefined, and the iterator) and should
     *     return a boolean.
     * @param {T=} opt_obj The object to be used as the value of 'this' within
     *     {@code f}.
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
     * Converts the iterator to an array
     * @param {Iterable} iterable  The iterator to convert to an array.
     * @return {!Array} An array of the elements the iterator iterates over.
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
     * Iterates over 2 iterators and returns true if they contain the same sequence
     * of elements and have the same length.
     * @param {Iterable} iterable1  The first iterable object.
     * @param {Iterable} iterable2  The second iterable object.
     * @return {boolean} true if the iterators contain the same sequence of
     *     elements and have the same length.
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
          if (val1 != val2) {
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
     * Advances the iterator to the next position, returning the given default value
     * instead of throwing an exception if the iterator has no more entries.
     * @param {Iterable} iterable The iterable object.
     * @param {*} defaultValue The value to return if the iterator is empty.
     * @return {*} The next item in the iteration, or defaultValue if the iterator
     *     was empty.
     */
    function nextOrValue(iterable, defaultValue) {
      try {
        return toIterator(iterable).next();
      } catch (e) {
        if (e != StopIteration) {
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
            // goog.asserts.assert(indicies);
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
            if (e != StopIteration || array.isEmpty(cache)) {
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