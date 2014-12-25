/**
 * @fileoverview 也是一个池子类,但比Pool类更高效因为没有额外的维护
 *   正在使用的数据项.
 * @author Leo.Zhang
 * @email zmike86@gmail.com
 */

define([
    '../util/util',
    '../disposable/disposable'
  ],
  function(util, Disposable) {

    'use strict';

    /**
     * 构造之后此类不会创建任何数据池需要管理的对象.
     * 要么是从池子中取数据,要么是release数据到池子中, create返回的对象直接被利用,
     * 不会存储在池子中.
     * IMPORTANT: 对象返回池子之前要被clean. object.clean方法可以直接清理对象,
     * 直接用这个方法就没必要使用pool.
     * @param {number} initialCount 初始化池子中的数据项个数.
     * @param {number} maxCount 池子中最大数据项个数.
     * @constructor
     * @extends {Disposable}
     */
    var SimplePool = function(initialCount, maxCount) {
      Disposable.call(this);

      /**
       * 最大值
       * @type {number}
       * @private
       */
      this.maxCount_ = maxCount;

      /**
       * Queue保存池子中可用的对象.
       * @type {Array}
       * @private
       */
      this.freeQueue_ = [];

      this.createInitial_(initialCount);
    };

    util.inherits(SimplePool, Disposable);

    /**
     * 创建新对象的方法. 之所以私有是不必真的有子类重写,
     * 若没有子类重写则调用原有的公有方法.
     * @type {Function}
     * @private
     */
    SimplePool.prototype.createObjectFn_ = null;

    /**
     * 析构对象的方法. 之所以私有是不必真的有子类重写,
     * 若没有子类重写则调用原有的公有方法.
     * @type {Function}
     * @private
     */
    SimplePool.prototype.disposeObjectFn_ = null;

    /**
     * 设置创建对象的方法.
     * @param {Function} createObjectFn 函数返回新创建的对象.
     */
    SimplePool.prototype.setCreateObjectFn = function(createObjectFn) {
      this.createObjectFn_ = createObjectFn;
    };

    /**
     * 设置析构对象的方法.
     * @param {Function} disposeObjectFn 析构方法.
     */
    SimplePool.prototype.setDisposeObjectFn = function(
      disposeObjectFn) {
      this.disposeObjectFn_ = disposeObjectFn;
    };

    /**
     * 拿一个新的数据项, 如果没有了则自动创建.
     * @return {*} 池子中的数据项或新创建的对象.
     */
    SimplePool.prototype.getObject = function() {
      if (this.freeQueue_.length) {
        return this.freeQueue_.pop();
      }
      return this.createObject();
    };

    /**
     * 释放一个对象,放进池子中. 如果池子已满则析构该对象.
     * @param {*} obj 要释放的对象.
     */
    SimplePool.prototype.releaseObject = function(obj) {
      if (this.freeQueue_.length < this.maxCount_) {
        this.freeQueue_.push(obj);
      } else {
        this.disposeObject(obj);
      }
    };

    /**
     * 初始化一些对象.
     * @param {number} initialCount 初始化数目.
     * @private
     */
    SimplePool.prototype.createInitial_ = function(initialCount) {
      if (initialCount > this.maxCount_) {
        throw Error('[SimplePool] Initial cannot be greater than max');
      }
      for (var i = 0; i < initialCount; i++) {
        this.freeQueue_.push(this.createObject());
      }
    };

    /**
     * 创建新对象. 需要子类重写.
     * @return {*} 返回新对象.
     */
    SimplePool.prototype.createObject = function() {
      if (this.createObjectFn_) {
        return this.createObjectFn_();
      } else {
        return {};
      }
    };

    /**
     * 需要被复写的方法. 默认实现删除对象所有属性.
     * @param {*} obj 要析构的对象.
     */
    SimplePool.prototype.disposeObject = function(obj) {
      if (this.disposeObjectFn_) {
        this.disposeObjectFn_(obj);
      } else if (util.isObject(obj)) {
        if (util.isFunction(obj.dispose)) {
          obj.dispose();
        } else {
          for (var i in obj) {
            delete obj[i];
          }
        }
      }
    };

    /**
     * 析构函数.
     * @override
     * @protected
     */
    SimplePool.prototype.disposeInternal = function() {
      SimplePool.superClass_.disposeInternal.call(this);
      // Call disposeObject on each object held by the pool.
      var freeQueue = this.freeQueue_;
      while (freeQueue.length) {
        this.disposeObject(freeQueue.pop());
      }
      delete this.freeQueue_;
    };

    return SimplePool;
  }
);