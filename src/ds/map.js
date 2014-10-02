/**
 * @fileoverview Hash Map structure的实现. Map累实现了很多ds包下的方法所以这些方法在hash对象
 *     依然可用. 对于复杂的key types也适用. 简单key如numbers或strings, 特殊key如__proto__
 *     也不必担心.
 * @modified Leo.Zhang
 * @email zmike86@gmail.com
 */

define('Sogou.DS.Map',
    [
        'Sogou.Util',
        'Sogou.Iter.Iterator',
        'Sogou.Iter.StopIteration',
        'Sogou.Object'
    ],
    function(util, Iterator, StopIteration, object) {

        'use strict';

        /**
         * Safe way to test for hasOwnProperty. It even allows testing for
         * 'hasOwnProperty'.
         * @param {Object} obj 要测试的对象.
         * @param {*} key 指定key.
         * @return {boolean} 是否含有指定key.
         * @private
         */
        var hasKey_ = function(obj, key) {
            return Object.prototype.hasOwnProperty.call(obj, key);
        };

        /**
         * Hash Map data structure.
         * @param {*=} opt_map 初始化用到的map对象.
         * @param {...*} var_args 如果行参数目大于2, 那么这些参数会当做key-value对.
         * @constructor
         */
        var Map = function(opt_map, var_args) {

            /**
             * 一个原生的js对象实现map.
             * @type {!Object}
             * @private
             */
            this.map_ = {};

            /**
             * 数组保存keys.这么做两个理由:
             *   1. 用for (var key in this.map_)迭代key每次都会生成js对象(在IE中), 这对于IE6下的GC
             *      性能非常不好.
             *   2. 当没有辅佐对象的时候我们需要有个地方保存所有的keys,这是唯一可以鉴别key是来自与对象外部还是
             *      内部属性.
             *
             * 数组中也包含了删除的key, 所以有必要检查map是否仍然含有某些key(在IE中不会分配内存).
             * @type {!Array.<string>}
             * @private
             */
            this.keys_ = [];

            var argLength = arguments.length;

            if (argLength > 1) {
                if (argLength % 2) {
                    throw Error('Uneven number of arguments');
                }
                for (var i = 0; i < argLength; i += 2) {
                    this.set(arguments[i], arguments[i + 1]);
                }
            } else if (opt_map) {
                this.addAll(/** @type {Object} */ (opt_map));
            }
        };

        /**
         * 键值对数目.
         * @private
         * @type {number}
         */
        Map.prototype.count_ = 0;

        /**
         * 迭代时监测变化用的版本号.
         * @private
         * @type {number}
         */
        Map.prototype.version_ = 0;

        /**
         * @return {number} 返回key-value对的数目.
         */
        Map.prototype.getCount = function() {
            return this.count_;
        };

        /**
         * 返回值数组.
         * @return {!Array}
         */
        Map.prototype.getValues = function() {
            this.cleanupKeysArray_();

            var rv = [];
            for (var i = 0; i < this.keys_.length; i++) {
                var key = this.keys_[i];
                rv.push(this.map_[key]);
            }
            return rv;
        };

        /**
         * 返回键数组.
         * @return {!Array.<string>}
         */
        Map.prototype.getKeys = function() {
            this.cleanupKeysArray_();
            return /** @type {!Array.<string>} */ (this.keys_.concat());
        };

        /**
         * 是否含有某个指定key.
         * @param {*} key 指定的key.
         * @return {boolean}
         */
        Map.prototype.containsKey = function(key) {
            return hasKey_(this.map_, key);
        };

        /**
         * 是否含有指定的值. 复杂度O(n).
         * @param {*} val 检测的值.
         * @return {boolean}
         */
        Map.prototype.containsValue = function(val) {
            for (var i = 0; i < this.keys_.length; i++) {
                var key = this.keys_[i];
                if (hasKey_(this.map_, key) && this.map_[key] === val) {
                    return true;
                }
            }
            return false;
        };

        /**
         * 两个map是否相等.
         * @param {Map} otherMap 测试的另外的map对象.
         * @param {function(?, ?) : boolean=} opt_equalityFn 判定是否相等的函数.
         * @return {boolean} 返回是否相等.
         */
        Map.prototype.equals = function(otherMap, opt_equalityFn) {
            if (this === otherMap) {
                return true;
            }

            if (this.count_ !== otherMap.getCount()) {
                return false;
            }

            var equalityFn = opt_equalityFn || Map.defaultEquals;

            this.cleanupKeysArray_();
            for (var key, i = 0; key = this.keys_[i]; i++) {
                if (!equalityFn(this.get(key), otherMap.get(key))) {
                    return false;
                }
            }

            return true;
        };

        /**
         * 默认的是否相等的helper函数.
         * @param {*} a 第一个对象.
         * @param {*} b 第二个对象.
         * @return {boolean} 是否相同对象.
         */
        Map.defaultEquals = function(a, b) {
            return a === b;
        };

        /**
         * @return {boolean} map是否为空.
         */
        Map.prototype.isEmpty = function() {
            return this.count_ === 0;
        };

        /**
         * 清空key-value对.
         */
        Map.prototype.clear = function() {
            this.map_ = {};
            this.keys_.length = 0;
            this.count_ = 0;
            this.version_ = 0;
        };

        /**
         * 根据指定的key删除key-value对. 复杂度O(logN)是因为有条件触发: 只有当count是
         * keys array长度1/2时清理keys array.
         * @param {*} key 要删除的key.
         * @return {boolean} 是否删除成功.
         */
        Map.prototype.remove = function(key) {
            if (hasKey_(this.map_, key)) {
                delete this.map_[key];
                this.count_--;
                this.version_++;

                // 如果到达了边界条件则删除keys array中不存在的一些值.
                if (this.keys_.length > 2 * this.count_) {
                    this.cleanupKeysArray_();
                }

                return true;
            }
            return false;
        };

        /**
         * 清理一些临时的keys array删除其中一些不再在map出现的.
         * @private
         */
        Map.prototype.cleanupKeysArray_ = function() {
            if (this.count_ !== this.keys_.length) {
                // First remove keys that are no longer in the map.
                var srcIndex = 0;
                var destIndex = 0;
                while (srcIndex < this.keys_.length) {
                    var key = this.keys_[srcIndex];
                    if (hasKey_(this.map_, key)) {
                        this.keys_[destIndex++] = key;
                    }
                    srcIndex++;
                }
                this.keys_.length = destIndex;
            }

            if (this.count_ !== this.keys_.length) {
                // If the count still isn't correct, that means we have duplicates. This can
                // happen when the same key is added and removed multiple times. Now we have
                // to allocate one extra Object to remove the duplicates. This could have
                // been done in the first pass, but in the common case, we can avoid
                // allocating an extra object by only doing this when necessary.
                var seen = {};
                var srcIndex = 0;
                var destIndex = 0;
                while (srcIndex < this.keys_.length) {
                    var key = this.keys_[srcIndex];
                    if (!hasKey_(seen, key)) {
                        this.keys_[destIndex++] = key;
                        seen[key] = 1;
                    }
                    srcIndex++;
                }
                this.keys_.length = destIndex;
            }
        };

        /**
         * 获得给定的值. 如果没有返回undefined.
         * @param {*} key 指定的key.
         * @param {*=} opt_val 没找到的话默认的返回值.
         * @return {*}
         */
        Map.prototype.get = function(key, opt_val) {
            if (hasKey_(this.map_, key)) {
                return this.map_[key];
            }
            return opt_val;
        };

        /**
         * 添加key-value pair.
         * @param {*} key The key.
         * @param {*} value The value to add.
         * @return {*} Some subclasses return a value.
         */
        Map.prototype.set = function(key, value) {
            if (!hasKey_(this.map_, key)) {
                this.count_++;
                this.keys_.push(key);
                // Only change the version if we add a new key.
                this.version_++;
            }
            this.map_[key] = value;
        };

        /**
         * 往结构里增加项 from another Map or Object.
         * @param {Object} map  Object containing the data to add.
         */
        Map.prototype.addAll = function(map) {
            var keys, values;
            if (map instanceof Map) {
                keys = map.getKeys();
                values = map.getValues();
            } else {
                keys = object.getKeys(map);
                values = object.getValues(map);
            }
            // 用array.forEach方法的话会简单些但是要引入array模块增加了文件体积.
            for (var i = 0; i < keys.length; i++) {
                this.set(keys[i], values[i]);
            }
        };

        /**
         * Clones a map and returns a new map.
         * @return {!Map} A new map with the same key-value pairs.
         */
        Map.prototype.clone = function() {
            return new Map(this);
        };

        /**
         * 返回一个新的键值交换的map对象. 如果多个key对应了一个value,
         * the chosen transposed value is implementation-dependent.
         * 同这个方法一样 {object.transpose(Object)}.
         * @return {!Map} The transposed map.
         */
        Map.prototype.transpose = function() {
            var transposed = new Map();
            for (var i = 0; i < this.keys_.length; i++) {
                var key = this.keys_[i];
                var value = this.map_[key];
                transposed.set(value, key);
            }

            return transposed;
        };

        /**
         * @return {!Object} Object representation of the map.
         */
        Map.prototype.toObject = function() {
            this.cleanupKeysArray_();
            var obj = {};
            for (var i = 0; i < this.keys_.length; i++) {
                var key = this.keys_[i];
                obj[key] = this.map_[key];
            }
            return obj;
        };

        /**
         * 返回一个迭代器迭代keys.  Removal of keys
         * while iterating might have undesired side effects.
         * @return {!Iterator} An iterator over the keys in the map.
         */
        Map.prototype.getKeyIterator = function() {
            return this.__iterator__(true);
        };

        /**
         * 返回一个迭代器迭代values.  Removal of
         * keys while iterating might have undesired side effects.
         * @return {!Iterator} An iterator over the values in the map.
         */
        Map.prototype.getValueIterator = function() {
            return this.__iterator__(false);
        };

        /**
         * Returns an iterator that iterates over the values or the keys in the map.
         * This throws an exception if the map was mutated since the iterator was
         * created.
         * @param {boolean=} opt_keys True to iterate over the keys. False to iterate
         *     over the values.  The default value is false.
         * @return {!Iterator} An iterator over the values or keys in the map.
         */
        Map.prototype.__iterator__ = function(opt_keys) {
            // Clean up keys to minimize the risk of iterating over dead keys.
            this.cleanupKeysArray_();

            var i = 0;
            var keys = this.keys_;
            var map = this.map_;
            var version = this.version_;
            var selfObj = this;

            var newIter = new Iterator();
            newIter.next = function() {
                while (true) {
                    if (version !== selfObj.version_) {
                        throw Error('The map has changed since the iterator was created');
                    }
                    if (i >= keys.length) {
                        throw StopIteration;
                    }
                    var key = keys[i++];
                    return opt_keys ? key : map[key];
                }
            };
            return newIter;
        };

        return Map;
    }
);