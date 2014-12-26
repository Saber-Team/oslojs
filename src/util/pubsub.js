/**
 * @fileoverview 主题订阅类.
 * @author Leo.Zhang
 * @email zmike86@gmail.com
 */

define([
    './util',
    '../disposable/disposable',
    '../array/array'
  ],
  function(util, Disposable, array) {

    'use strict';

    /**
     * 基于主题的订阅者模式. 维护了主题和订阅者映射关系.
     * 当某个主题发出消息,订阅该主题的所有函数都会被按顺序触发.
     * 未被捕获的异常会终止发布.
     * 主题可以是任何字符串值,除了对象的一些原生属性, e.g. "constructor",
     * "toString", "hasOwnProperty", etc.
     * @constructor
     * @extends {Disposable}
     */
    var PubSub = function() {
      Disposable.call(this);
      this.subscriptions_ = [];
      this.topics_ = {};
    };

    util.inherits(PubSub, Disposable);

    /**
     * 订阅者数组. 每个订阅者有三元组: 主题id, 函数, 可选的函数上下文.
     * 每个元祖占据数组中的一个位置, 如果主题id在n的位置, 函数就在 (n + 1),
     * 上下文对象在 (n + 2), 下一个主题在 (n + 3).
     * (这种表示方式减少对象创建, 并且比数组存储对象和三个并行数组的方式要快,特别是IE.)
     * 如果通过unsubscribe或者unsubscribeByKey取消订阅, 对应的三个数组项都会被删除.
     * 这意味着订阅者的最大数目限制在数组最大长度除以3 (2^32 - 1) / 3 = 1,431,655,765.
     * @type {?Array}
     * @private
     */
    PubSub.prototype.subscriptions_ = null;

    /**
     * 订阅者的key. 就是在订阅者数组中该对象的索引.
     * @type {number}
     * @private
     */
    PubSub.prototype.key_ = 1;

    /**
     * 主题和订阅者key的映射对象.
     * @type {?Object.<!Array.<number>>}
     * @private
     */
    PubSub.prototype.topics_ = null;

    /**
     * 一个数组保存发布阶段取消订阅的订阅者key, 一旦发布完成则全部取消.
     * @type {?Array.<number>}
     * @private
     */
    PubSub.prototype.pendingKeys_ = null;

    /**
     * 一个锁保证取消订阅时不处于主题发布阶段. publish开始和结束时会重置该值.
     * @type {number}
     * @private
     */
    PubSub.prototype.publishDepth_ = 0;

    /**
     * 订阅主题. 多次订阅一个主题若传入相同的函数也不会去重.
     * 返回订阅key, 可以调用unsubscribeByKey取消订阅.
     * @param {string} topic 主题.
     * @param {Function} fn 函数.
     * @param {Object=} opt_context 函数上下文.
     * @return {number} Subscription key.
     */
    PubSub.prototype.subscribe = function(topic, fn, opt_context) {
      var keys = this.topics_[topic];
      if (!keys) {
        // First subscription to this topic; initialize subscription key array.
        keys = this.topics_[topic] = [];
      }

      // Push the tuple representing the subscription onto the subscription array.
      var key = this.key_;
      this.subscriptions_[key] = topic;
      this.subscriptions_[key + 1] = fn;
      this.subscriptions_[key + 2] = opt_context;
      this.key_ = key + 3;

      // Push the subscription key onto the list of subscriptions for the topic.
      keys.push(key);

      // 返回订阅者key.
      return key;
    };

    /**
     * 只订阅主题一次,函数调用后自动注销.
     * @param {string} topic 主题.
     * @param {Function} fn 订阅函数.
     * @param {Object=} opt_context 函数上下文.
     * @return {number} Subscription key.
     */
    PubSub.prototype.subscribeOnce = function(topic, fn, opt_context) {
      // Behold the power of lexical closures!
      var key = this.subscribe(topic, function(var_args) {
        fn.apply(opt_context, arguments);
        this.unsubscribeByKey(key);
      }, this);
      return key;
    };

    /**
     * 取消订阅主题. 只取消第一个找到的订阅函数.
     * 返回是否移除成功.
     * @param {string} topic 主题.
     * @param {Function} fn 取消订阅的函数.
     * @param {Object=} opt_context 函数上下文.
     * @return {boolean} Whether a matching subscription was removed.
     */
    PubSub.prototype.unsubscribe = function(topic, fn, opt_context) {
      var keys = this.topics_[topic];
      if (keys) {
        // Find the subscription key for the given combination of topic, function,
        // and context object.
        var subscriptions = this.subscriptions_;
        var key = array.find(keys, function(k) {
          return subscriptions[k + 1] === fn && subscriptions[k + 2] === opt_context;
        });
        // Zero is not a valid key.
        if (key) {
          return this.unsubscribeByKey(/** @type {number} */ (key));
        }
      }

      return false;
    };

    /**
     * 根据key取消订阅. 没有存储此key则什么也不做.
     * @param {number} key 订阅key.
     * @return {boolean} 返回是否移除成功.
     */
    PubSub.prototype.unsubscribeByKey = function(key) {
      if (this.publishDepth_ !== 0) {
        // Defer removal until after publishing is complete.
        if (!this.pendingKeys_) {
          this.pendingKeys_ = [];
        }
        this.pendingKeys_.push(key);
        return false;
      }

      var topic = this.subscriptions_[key];
      if (topic) {
        // Subscription tuple found.
        var keys = this.topics_[topic];
        if (keys) {
          array.remove(keys, key);
        }
        delete this.subscriptions_[key];
        delete this.subscriptions_[key + 1];
        delete this.subscriptions_[key + 2];
      }

      return !!topic;
    };

    /**
     * 发布消息. 若其中一个订阅者抛出异常则终止操作.
     * @param {string} topic 发布主题.
     * @param {...*} var_args 提供给订阅者的参数.
     * @return {boolean} 是否调用了订阅者.
     */
    PubSub.prototype.publish = function(topic, var_args) {
      var keys = this.topics_[topic];
      if (keys) {
        // We must lock subscriptions and remove them at the end, so we don't
        // adversely affect the performance of the common case by cloning the key
        // array.
        this.publishDepth_++;

        // 调用订阅者函数. keys数组的长度在迭代过程中一定要确定, 因为订阅者会
        // 在发布的时候添加进来.
        var args = array.slice(arguments, 1);
        for (var i = 0, len = keys.length; i < len; i++) {
          var key = keys[i];
          this.subscriptions_[key + 1].apply(
            this.subscriptions_[key + 2], args);
        }

        // Unlock subscriptions.
        this.publishDepth_--;

        if (this.pendingKeys_ && this.publishDepth_ === 0) {
          var pendingKey;
          while ((pendingKey = this.pendingKeys_.pop())) {
            this.unsubscribeByKey(pendingKey);
          }
        }

        // At least one subscriber was called.
        return i !== 0;
      }

      // 没有订阅者
      return false;
    };

    /**
     * 清除指定主题的订阅者.
     * @param {string=} opt_topic 主题.
     */
    PubSub.prototype.clear = function(opt_topic) {
      if (opt_topic) {
        var keys = this.topics_[opt_topic];
        if (keys) {
          array.forEach(keys, this.unsubscribeByKey, this);
          delete this.topics_[opt_topic];
        }
      } else {
        this.subscriptions_.length = 0;
        this.topics_ = {};
        // 没有重置this.key_的意图, 是想在整个页面周期内订阅者key一直唯一.
        // Reusing subscription keys could lead to subtle errors in client code.
      }
    };

    /**
     * 返回给定主题的订阅者数目.
     * @param {string=} opt_topic 主题.
     * @return {number} 订阅者数目.
     */
    PubSub.prototype.getCount = function(opt_topic) {
      if (opt_topic) {
        var keys = this.topics_[opt_topic];
        return keys ? keys.length : 0;
      }

      var count = 0;
      for (var topic in this.topics_) {
        count += this.getCount(topic);
      }

      return count;
    };

    /** @override */
    PubSub.prototype.disposeInternal = function() {
      PubSub.superClass_.disposeInternal.call(this);
      delete this.subscriptions_;
      delete this.topics_;
      delete this.pendingKeys_;
    };

    return PubSub;
  }
);