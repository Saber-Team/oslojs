/**
 * @fileoverview Class for FIFO Queue data structure.
 * @modified Leo.Zhang
 * @email zmike86@gmail.com
 */

define('Sogou.DS.Queue', ['Sogou.Array'], function(array) {

    'use strict';

    /**
     * Class Definition
     * @constructor
     */
    var Queue = function() {
        this.elements_ = [];
        /**
         * 队列中第一个元素的索引.
         * @private
         * @type {number}
         */
        this.head_ = 0;
        /**
         * 队尾索引
         * @type {number}
         */
        this.tail_ = 0;
    };

    Queue.prototype = {
        constructor: Queue,

        /**
         * 入队列.
         * @param {*} element 元素.
         */
        enqueue: function(element) {
            this.elements_[this.tail_++] = element;
        },

        /**
         * 出队列.
         * @return {*} 若队列为空返回undefined.
         */
        dequeue: function() {
            if (this.head_ === this.tail_) {
                return undefined;
            }
            var result = this.elements_[this.head_];
            delete this.elements_[this.head_];
            this.head_++;
            return result;
        },

        /**
         * 选择下一个元素.
         * @return {*} 下一个元素.
         */
        peek: function() {
            if (this.head_ === this.tail_) {
                return undefined;
            }
            return this.elements_[this.head_];
        },

        /**
         * 返回队列长度.
         * @return {number} 队列中的元素数.
         */
        getCount: function() {
            return this.tail_ - this.head_;
        },

        /**
         * 是否空队列.
         * @return {boolean} true队列长度为0.
         */
        isEmpty: function() {
            return this.tail_ - this.head_ === 0;
        },

        /**
         * 清空队列.
         */
        clear: function() {
            this.elements_.length = 0;
            this.head_ = 0;
            this.tail_ = 0;
        },

        /**
         * 队列是否含有某个元素.
         * @param {*} obj 元素.
         * @return {boolean} 是否含有此值.
         */
        contains: function(obj) {
            return array.contains(this.elements_, obj);
        },

        /**
         * 从队列中删除第一次出现的元素.
         * @param {*} obj Object to remove.
         * @return {boolean} 返回是否删除成功.
         */
        remove: function(obj) {
            var index = array.indexOf(this.elements_, obj);
            if (index < 0) {
                return false;
            }
            if (index === this.head_) {
                this.dequeue();
            } else {
                array.removeAt(this.elements_, index);
                this.tail_--;
            }
            return true;
        },

        /**
         * 返回队列所有元素.
         * @return {Array}
         */
        getValues: function() {
            return this.elements_.slice(this.head_, this.tail_);
        }

    };

    return Queue;

});