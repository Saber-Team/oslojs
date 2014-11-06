/**
 * @fileoverview Datastructure: Pool.
 * @author Leo.Zhang
 * @email zmike86@gmail.com
 *
 * A generic class for handling pools of objects.
 * When an object is released, it is attempted to be reused.
 */

define('@ds.Pool',
    ['@util', '@Disposable', '@ds.util', '@ds.Queue', '@ds.Set'],
    function(util, Disposable, ds, Queue, Set) {

        'use strict';

        /**
         * 当池子最大(小)值产生矛盾时抛出的错误消息.
         * I.e., when it is attempted for maxCount to be less than minCount.
         * @type {string}
         * @private
         */
        var ERROR_MIN_MAX_ = '[Oslo.ds.pool] Min can not be greater than max';


        /**
         * 当析构一个池子对象时倘若其中含有正在使用的对象则抛出此异常
         * (i.e., haven't been released).
         * @type {string}
         * @private
         */
        var ERROR_DISPOSE_UNRELEASED_OBJS_ = '[Oslo.ds.pool] Objects not released';


        /**
         * A generic pool class.
         * @param {number=} opt_minCount 下界 (Default: 1).
         * @param {number=} opt_maxCount 上界 (Default: 10).
         * @constructor
         * @extends {Disposable}
         */
        var Pool = function(opt_minCount, opt_maxCount) {
            Disposable.call(this);

            /**
             * 容器下界
             * @type {number}
             * @private
             */
            this.minCount_ = opt_minCount || 0;

            /**
             * 容器上界
             * @type {number}
             * @private
             */
            this.maxCount_ = opt_maxCount || 10;

            if (this.minCount_ > this.maxCount_) {
                throw Error(ERROR_MIN_MAX_);
            }

            /**
             * 存储池子中处于空闲状态的数据.
             * @type {Queue}
             * @private
             */
            this.freeQueue_ = new Queue();

            /**
             * 存储池子中正在被使用的数据.
             * @type {Set}
             * @private
             */
            this.inUseSet_ = new Set();

            /**
             * 以毫秒为单位标识对象可用前的延时. 0 means no minimum delay is enforced.
             * @type {number}
             * @protected
             */
            this.delay = 0;

            /**
             * 从上个对象可用到现在的时间间隔,以毫秒为单位, in milliseconds since the
             * epoch (i.e., the result of Date#toTime). 如果是null, no access has occurred yet.
             * @type {number?}
             * @protected
             */
            this.lastAccess = null;

            // Make sure that the minCount constraint is satisfied.
            this.adjustForMinMax();
        };

        util.inherits(Pool, Disposable);

        /**
         * 设置下界.
         * @param {number} min The minimum count of the pool.
         */
        Pool.prototype.setMinimumCount = function(min) {
            // Check count constraints.
            if (min > this.maxCount_) {
                throw Error(Pool.ERROR_MIN_MAX_);
            }
            this.minCount_ = min;

            // Adjust the objects in the pool as needed.
            this.adjustForMinMax();
        };


        /**
         * 设置上界.
         * @param {number} max The maximium count of the pool.
         */
        Pool.prototype.setMaximumCount = function(max) {
            // Check count constraints.
            if (max < this.minCount_) {
                throw Error(Pool.ERROR_MIN_MAX_);
            }
            this.maxCount_ = max;

            // Adjust the objects in the pool as needed.
            this.adjustForMinMax();
        };


        /**
         * 设置获取对象的最小时间间隔. 默认是0, 意味着随时存取池中的对象.
         * @param {number} delay The minimum delay, in milliseconds.
         */
        Pool.prototype.setDelay = function(delay) {
            this.delay = delay;
        };


        /**
         * @return {Object|undefined} 若池子中有可用数据则返回一个数据对象否则返回undefined.
         */
        Pool.prototype.getObject = function() {
            var time = util.now();
            if (!util.isNull(this.lastAccess) &&
                time - this.lastAccess < this.delay) {
                return undefined;
            }

            var obj = this.removeFreeObject_();
            if (obj) {
                this.lastAccess = time;
                this.inUseSet_.add(obj);
            }

            return obj;
        };


        /**
         * 用使用集合中release一个对象使之成为free object.
         * @param {Object} obj The object to return to the pool of free objects.
         * @return {boolean} 是否操作成功.
         */
        Pool.prototype.releaseObject = function(obj) {
            if (this.inUseSet_.remove(obj)) {
                this.addFreeObject(obj);
                return true;
            }
            return false;
        };


        /**
         * 从池子中移除一个对象使其状态变为in use.
         * 注意: 对于返回对象不会标记成 in use.
         * @return {Object|undefined} 返回对象, 没有对象返回undefined.
         * @private
         */
        Pool.prototype.removeFreeObject_ = function() {
            var obj;
            while (this.getFreeCount() > 0) {
                obj = /** @type {Object} */(this.freeQueue_.dequeue());

                if (!this.objectCanBeReused(obj)) {
                    this.adjustForMinMax();
                } else {
                    break;
                }
            }

            if (!obj && this.getCount() < this.maxCount_) {
                obj = this.createObject();
            }

            return obj;
        };


        /**
         * 将对象加入free object的行列. 若对象没有添加成功(比如超过上界)则析构它.
         * @param {Object} obj 要添加的对象.
         */
        Pool.prototype.addFreeObject = function(obj) {
            this.inUseSet_.remove(obj);
            if (this.objectCanBeReused(obj) && this.getCount() < this.maxCount_) {
                this.freeQueue_.enqueue(obj);
            } else {
                this.disposeObject(obj);
            }
        };


        /**
         * 如果池子中的对象数目不处于上界下界之间,适当增加或减少.
         * NOTE: It is possible that the number of objects in the pool will still be
         * greater than the maximum count of objects allowed. This will be the case
         * if no more free objects can be disposed of to get below the minimum count
         * (i.e., all objects are in use).
         */
        Pool.prototype.adjustForMinMax = function() {
            var freeQueue = this.freeQueue_;

            // Make sure the at least the minimum number of objects are created.
            while (this.getCount() < this.minCount_) {
                freeQueue.enqueue(this.createObject());
            }

            // Make sure no more than the maximum number of objects are created.
            while (this.getCount() > this.maxCount_ && this.getFreeCount() > 0) {
                this.disposeObject(/** @type {Object} */(freeQueue.dequeue()));
            }
        };


        /**
         * 需要被子类复写返回期望类型的实例.
         * @return {Object} The created object.
         */
        Pool.prototype.createObject = function() {
            return {};
        };


        /**
         * 应该在子类被复写. 默认的实现会移除对象所有属性.
         * Calls the object's dispose() method, if available.
         * @param {Object} obj The object to dispose.
         */
        Pool.prototype.disposeObject = function(obj) {
            if (typeof obj.dispose === 'function') {
                obj.dispose();
            } else {
                for (var i in obj) {
                    obj[i] = null;
                }
            }
        };


        /**
         * 需要在子类被复写. 检测对象是否可用 and should not be returned by getObject().
         * Calls the object's canBeReused() method, if available.
         * @param {Object} obj The object to test.
         * @return {boolean} Whether the object can be reused.
         */
        Pool.prototype.objectCanBeReused = function(obj) {
            if (typeof obj.canBeReused === 'function') {
                return obj.canBeReused();
            }
            return true;
        };


        /**
         * 检查池子中是否含有某个对象.
         * @param {Object} obj The object to check the pool for.
         * @return {boolean} Whether the pool contains the object.
         */
        Pool.prototype.contains = function(obj) {
            return this.freeQueue_.contains(obj) || this.inUseSet_.contains(obj);
        };


        /**
         * 返回池子中可用和正在用的数据总和.
         * @return {number} Number of objects currently in the pool.
         */
        Pool.prototype.getCount = function() {
            return this.freeQueue_.getCount() + this.inUseSet_.getCount();
        };


        /**
         * 获取正在使用的数目.
         * @return {number} Number of objects currently in use in the pool.
         */
        Pool.prototype.getInUseCount = function() {
            return this.inUseSet_.getCount();
        };


        /**
         * 获取池子中可用对象的数目.
         * @return {number} Number of objects currently free in the pool.
         */
        Pool.prototype.getFreeCount = function() {
            return this.freeQueue_.getCount();
        };


        /**
         * 判断池子是否为空.
         * @return {boolean}
         */
        Pool.prototype.isEmpty = function() {
            return this.freeQueue_.isEmpty() && this.inUseSet_.isEmpty();
        };


        /**
         * Disposes of the pool and all objects currently held in the pool.
         * @override
         * @protected
         */
        Pool.prototype.disposeInternal = function() {
            Pool.superClass_.disposeInternal.call(this);
            if (this.getInUseCount() > 0) {
                throw Error(ERROR_DISPOSE_UNRELEASED_OBJS_);
            }
            delete this.inUseSet_;

            // Call disposeObject on each object held by the pool.
            var freeQueue = this.freeQueue_;
            while (!freeQueue.isEmpty()) {
                this.disposeObject(/** @type {Object} */ (freeQueue.dequeue()));
            }
            delete this.freeQueue_;
        };

        return Pool;
    }
);