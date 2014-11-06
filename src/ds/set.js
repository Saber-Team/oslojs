/**
 * @fileoverview Datastructure: Set.
 * @author Leo.Zhang
 * @email zmike86@gmail.com
 *
 * 这个模块实现了Set数据结构. 增删元素复杂度 O(1). 元素可以是值类型或者引用类型.
 * 如果添加了 1 和 new Number(1), 是不一样的元素. 甚至可以添加多个 new Number(1)
 * 因为是不同引用.
 */

define('@ds.set', ['@util', '@ds.util', '@ds.map'],
    function(util, ds, Map) {

        'use strict';

        /**
         * 获得元素作为set一员的唯一键.
         * 值类型如果类型相同且toString返回相同则认为是同一物.对象引用相同则相等.
         * @param {*} val Object or primitive value to get a key for.
         * @return {string} A unique key for this value/object.
         * @private
         */
        function getKey_(val) {
            var type = typeof val;
            if (type === 'object' && val || type === 'function') {
                return 'o' + util.getUid(/** @type {Object} */ (val));
            } else {
                return type.substr(0, 1) + val;
            }
        }


        /**
         * Set可以包含值类型和引用类型对象. 增删操作复杂度O(1).
         * 值类型如果类型相同且toString返回相同则认为是同一物.对象引用相同则相等.
         * 警告:
         * A Set can contain both 1 and (new Number(1)), because they are not the same.
         * 警告:
         * Adding (new Number(1)) twice will yield two distinct elements, because they
         * are two different objects.
         * 警告: Any object that is added to a Set will be modified!  Because util.getUid()
         * is used to identify objects, every object in the set will be mutated.
         * @param {Array|Object=} opt_values 初始化的对象.
         * @constructor
         */
        var Set = function(opt_values) {
            this.map_ = new Map;
            if (opt_values) {
                this.addAll(opt_values);
            }
        };


        /**
         * @return {number} 集合中的元素数目.
         * @override
         */
        Set.prototype.getCount = function() {
            return this.map_.getCount();
        };


        /**
         * 添加元素.
         * @param {*} element The primitive or object to add.
         * @override
         */
        Set.prototype.add = function(element) {
            this.map_.set(getKey_(element), element);
        };


        /**
         * 向集合中添加一队元素.
         * @param {Array|Object} col A collection containing the elements to add.
         */
        Set.prototype.addAll = function(col) {
            var values = ds.getValues(col);
            var l = values.length;
            for (var i = 0; i < l; i++) {
                this.add(values[i]);
            }
        };


        /**
         * 从集合中删除指定的集合中含有的元素.
         * @param {Array|Object} col 指定的collection.
         */
        Set.prototype.removeAll = function(col) {
            var values = ds.getValues(col);
            var l = values.length;
            for (var i = 0; i < l; i++) {
                this.remove(values[i]);
            }
        };


        /**
         * 从集合中删除元素.
         * @param {*} element The primitive or object to remove.
         * @return {boolean} Whether the element was found and removed.
         * @override
         */
        Set.prototype.remove = function(element) {
            return this.map_.remove(getKey_(element));
        };


        /**
         * 清除所有集合元素.
         */
        Set.prototype.clear = function() {
            this.map_.clear();
        };


        /**
         * 测试集合是否为空.
         * @return {boolean}
         */
        Set.prototype.isEmpty = function() {
            return this.map_.isEmpty();
        };


        /**
         * 是否含有指定元素.
         * @param {*} element 测试元素.
         * @return {boolean}
         * @override
         */
        Set.prototype.contains = function(element) {
            return this.map_.containsKey(getKey_(element));
        };


        /**
         * 是否含有指定集合中所有的元素. 指定集合中重复的元素会被忽略.
         * e.g. (new Set([1, 2])).containsAll([1, 1]) is True.
         * @param {Object} col A collection-like object.
         * @return {boolean} True if the set contains all elements.
         */
        Set.prototype.containsAll = function(col) {
            return ds.every(col, this.contains, this);
        };


        /**
         * 返回新的Set作为本Set和给定集合的交集.
         * @param {Array|Object} col A collection.
         * @return {!Set} A new set containing all the values (primitives
         *     or objects) present in both this set and the given collection.
         */
        Set.prototype.intersection = function(col) {
            var result = new Set();

            var values = ds.getValues(col);
            for (var i = 0; i < values.length; i++) {
                var value = values[i];
                if (this.contains(value)) {
                    result.add(value);
                }
            }

            return result;
        };


        /**
         * 获取当前set中不在给定集合中的元素,返回set..
         * @param {Array|Object} col A collection.
         * @return {!Set}
         */
        Set.prototype.difference = function(col) {
            var result = this.clone();
            result.removeAll(col);
            return result;
        };


        /**
         * 返回包含所有元素的数组.
         * @return {!Array} An array containing all the elements in this set.
         */
        Set.prototype.getValues = function() {
            return this.map_.getValues();
        };


        /**
         * 克隆当前set.
         * @return {!Set} A new set containing all the same elements as
         *     this set.
         */
        Set.prototype.clone = function() {
            return new Set(this);
        };


        /**
         * 判断两集合是否相等. 无关元素顺序,是否重复. This operation is O(n).
         * @param {Object} col A collection.
         * @return {boolean} True if the given collection consists of the same elements
         *     as this set, regardless of order, without repetition.
         */
        Set.prototype.equals = function(col) {
            return (this.getCount() === ds.getCount(col)) && this.isSubsetOf(col);
        };


        /**
         * 测试是否当前set是给定集合的子集. This operation is O(n).
         * @param {Object} col A collection.
         * @return {boolean} True if this set is a subset of the given collection.
         */
        Set.prototype.isSubsetOf = function(col) {
            var colCount = ds.getCount(col);
            if (this.getCount() > colCount) {
                return false;
            }
            // TODO Find the minimal collection size where the conversion makes
            // the contains() method faster.
            if (!(col instanceof Set) && colCount > 5) {
                // Convert to a Set so that ds.contains runs in
                // O(1) time instead of O(n) time.
                col = new Set(col);
            }
            return ds.every(this, function(value) {
                return ds.contains(col, value);
            });
        };


        /**
         * 返回当前集合的迭代器.
         * @return {!Iterator} An iterator over the elements in this set.
         */
        Set.prototype.__iterator__ = function() {
            return this.map_.__iterator__(false);
        };

        return Set;
    }
);