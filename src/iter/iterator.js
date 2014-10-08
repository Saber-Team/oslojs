/**
 * @fileoverview Python风格的迭代器.
 * @modified Leo.Zhang
 * @email zmike86@gmail.com
 * 一个Iterable对象是一类对象,具有如下特征之一:
 *     a. 是本模块提供的Iterator类的实例
 *     b. 是一个对象,有length属性,即类数组对象
 *     c. 是一个对象,有__iterator__属性
 */

define('Sogou.Iter.Iterator',
    ['Sogou.Iter.StopIteration'],
    function(StopIteration) {

        'use strict';

        /**
         * 这是一个接口. 迭代器实现next方法并且当迭代超过边界时抛出StopIteration. Iterators没有hasNext方法.
         * 最好使用helper functions做迭代,或者只在JavaScript 1.7环境中使用for in loops.
         * @constructor
         */
        var Iterator = function() {};

        /**
         * 迭代元的下一个值. 越界的话会抛出StopIteration.
         * @return {*}
         */
        Iterator.prototype.next = function() {
            throw StopIteration;
        };

        /**
         * 返回迭代器自己. 实现了JavaScript 1.7中的iterator protocol.
         * @param {boolean=} opt_keys 是否返回keys or values. 默认只返回values.
         *     使用的地方: the for-in loop (true) and the for-each-in loop (false).
         *     Even though the param gives a hint about what the iterator will return
         *     there is no guarantee that it will return the keys when true is passed.
         * @return {!Iterator} 返回迭代器自身.
         */
        Iterator.prototype.__iterator__ = function(opt_keys) {
            return this;
        };

        return Iterator;
    }
);