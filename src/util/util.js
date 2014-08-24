/**
 * @fileoverview 搜狗JavaScript框架基础函数
 * @modified Leo.Zhang
 * @email zmike86@gmail.com
 */

;sogou('Sogou.Util', [], function() {

    'use strict';

    /**
     * 管理对象, 对每个对象增加全局唯一ID, 自定义属性但也修改了对象
     * @type {string}
     * @private
     */
    var UID_PROP = 'sogou_uid_' + ((Math.random() * 1e9) >>> 0);

    /**
     * UID计数，简单的整形递增
     * @type {number}
     * @private
     */
    var uidCounter_ = 0;

    var AP = Array.prototype,
        OP = Object.prototype;

    /**
     * 原生的bind实现. fn.bind(self_obj, var_args)
     * @param {Function} fn 要执行的函数
     * @param {Object|undefined} selfObj 函数上下文
     * @param {...*} var_args 预先提供的一些参数, 可以把函数作为partial使用
     * @return {!Function} 被部分参数填充过的函数, 并且绑定了执行上下文. 原生bind也可以这么使用
     * @private
     */
    function bindNative_(fn, selfObj, var_args) {
        // fn.bind.call(fn,selfObj,var_args)的一个变体就是
        // fn.call(fn.bind, arguments)
        return /** @type {!Function} */ (fn.call.apply(fn.bind, arguments));
    }

    /**
     * 纯原生JavaScript实现的bind
     * @param {Function} fn 要执行的函数
     * @param {Object|undefined} selfObj 函数上下文
     * @param {...*} var_args 预先提供的一些参数，可以把函数作为partial使用
     * @return {!Function} 被部分参数填充过的函数, 并且绑定了执行上下文. 原生bind也可以这么使用
     * @private
     */
    function bindJs_(fn, selfObj, var_args) {
        if (!fn) throw new Error();
        if (arguments.length > 2) {
            var boundArgs = AP.slice.call(arguments, 2);
            return function() {
                // Prepend the bound arguments to the current arguments.
                var newArgs = AP.slice.call(arguments);
                AP.unshift.apply(newArgs, boundArgs);
                return fn.apply(selfObj, newArgs);
            };
        } else {
            return function() {
                return fn.apply(selfObj, arguments);
            };
        }
    }

    /**
     * 判断对象是否一个真数组.
     * @param {*} val 测试的对象.
     * @return {boolean}
     */
    function isArray(val) {
        return OP.toString.call(val) === '[object Array]';
    }

    /**
     * Returns true if the object looks like an array. To qualify as array like
     * the value needs to be either a NodeList or an object with a Number length
     * property.
     * @param {*} val Variable to test.
     * @return {boolean} Whether variable is an array.
     */
    function isArrayLike(val) {
        var type = typeof val;
        return isArray(val) || type == 'object' && typeof val.length == 'number';
    }

    /**
     * Like bind(), except that a 'this object' is not required. Useful when the
     * target function is already bound.
     *
     * Usage:
     * var g = partial(f, arg1, arg2);
     * g(arg3, arg4);
     *
     * @param {Function} fn A function to partially apply.
     * @param {...*} var_args Additional arguments that are partially applied to fn.
     * @return {!Function} A partially-applied form of the function bind() was
     *     invoked as a method of.
     */
    function partial(fn, var_args) {
        var args = AP.slice.call(arguments, 1);
        return function() {
            // Prepend the bound arguments to the current arguments.
            var newArgs = AP.slice.call(arguments);
            newArgs.unshift.apply(newArgs, args);
            return fn.apply(this, newArgs);
        };
    }

    /**
     * 在脚本加载的时候判断应该使用的bind版本
     * @return {Function}
     */
    var bind = (function() {
        var fn;
        // TODO: narrow the type signature.
        // NOTE: Somebody pulled base.js into the default Chrome
        // extension environment. This means that for Chrome extensions, they get
        // the implementation of Function.prototype.bind that calls bind
        // instead of the native one. Even worse, we don't want to introduce a
        // circular dependency between bind and Function.prototype.bind, so
        // we have to hack this to make sure it works correctly.
        if (Function.prototype.bind &&
            Function.prototype.bind.toString().indexOf('native code') != -1)
            fn = bindNative_;
        else
            fn = bindJs_;

        return fn;
    })();

    // export
    return {
        /**
         * Partially applies this function to a particular 'this object' and zero or
         * more arguments. The result is a new function with some arguments of the first
         * function pre-filled and the value of this 'pre-specified'.
         * Remaining arguments specified at call-time are appended to the pre-specified
         * ones.
         *
         * Usage:
         * <pre>var barMethBound = bind(myFunction, myObj, 'arg1', 'arg2');
         * barMethBound('arg3', 'arg4');</pre>
         *
         * @param {?function(this:T, ...)} fn 要执行的函数
         * @param {T} selfObj 函数上下文
         * @param {...*} var_args 预先提供的一些参数，可以把函数作为partial使用
         * @return {!Function} A partially-applied form of the function bind() was
         *     invoked as a method of.
         * @template T
         */
        bind: function(fn, selfObj, var_args) {
            return bind.apply(null, arguments);
        },
        partial: partial,
        /**
         * Copies all the members of a source object to a target object. This method
         * does not work on all browsers for all objects that contain keys such as
         * toString or hasOwnProperty. Use Object.extend for this purpose.
         * @param {Object} target Target.
         * @param {Object} source Source.
         * @return {Object}
         */
        mixin: function(target, source) {
            for (var x in source) {
                target[x] = source[x];
            }
            return target;
        },
        isArray: isArray,
        isArrayLike: isArrayLike,
        /**
         * 判断是否一个函数
         * @param {*} val
         * @return {boolean}
         */
        isFunction: function(val) { return typeof val === 'function'; },
        /**
         * 判断是否一个数字
         * @param {*} val
         * @return {boolean}
         */
        isNumber: function(val) { return typeof val === 'number'; },
        /**
         * Returns true if the specified value is a string.
         * @param {*} val Variable to test.
         * @return {boolean} Whether variable is a string.
         */
        isString: function(val) {
            // give up using toString solution here because I think it's
            // not necessary.
            return typeof val === 'string';
        },
        /**
         * 判断给定值是否一个对象。typeof对于null也会返回'object'所以要剔除。
         * 同理Object.prototype.toString.call对于undefined和null在IE678中也返回'[object Object]'。
         * 最终我选择function也算作对象，因为它本身可以存储属性。
         * 对于特殊对象arguments，同null的情况一样。
         * @param {*} val Variable to test.
         * @return {boolean} Whether variable is an object.
         */
        isObject: function(val) {
            var type = typeof val;
            return type == 'object' && val != null || type == 'function';
            // return Object(val) === val also works, but is slower, especially if val is
            // not an object.
        },
        /**
         * If obj is undefined or null
         * @param val
         * @return {Boolean}
         */
        isNull: function(val) {
            return val === (void 0) || val === null;
        },
        /**
         * Returns true if the specified value is not undefined.
         * WARNING: Do not use this to test if an object has a property. Use the in
         * operator instead.  Additionally, this function assumes that the global
         * undefined variable has not been redefined.
         * @param {*} val Variable to test.
         * @return {boolean} Whether variable is defined.
         */
        isDef: function(val) {
            return val !== (void 0);
        },
        /**
         * 取得对象上的UID。不同sessions间对象的UID会改变，因为是每次随机生成，不在当前JS
         * 生命周期了。It is unsafe to generate unique ID for function prototypes.
         * @param {Object} obj The object to get the unique ID for.
         * @return {number} The unique ID for the object.
         */
        getUid: function(obj) {
            if (obj === null) throw new Error('Can not get uid from null');

            // In Opera window.hasOwnProperty exists but always returns false so we avoid
            // using it. As a consequence the unique ID generated for BaseClass.prototype
            // and SubClass.prototype will be the same.
            return obj[UID_PROP] || (obj[UID_PROP] = ++uidCounter_);
        },
        /**
         * Removes the unique ID from an object. This is useful if the object was
         * previously mutated using {@code getUid} in which case the mutation is
         * undone.
         * @param {Object} obj The object to remove the unique ID field from.
         */
        removeUid: function(obj) {
            if (obj === null) throw new Error('Can not remove a uid from null');

            // IE中，DOM节点并非是Object的实例并且delete dom节点的属性会抛出异常。
            // 所以要用removeAttribute。
            if ('removeAttribute' in obj)
                obj.removeAttribute(UID_PROP);
            /** @preserveTry */
            try {
                delete obj[UID_PROP];
            } catch (ex) {}
        },
        /**
         * 原型继承
         * @param {Function} sub 子类
         * @param {Function} sup 父类
         */
        inherits: function(sub, sup) {
            /** @constructor */
            function tempCtor() {}
            tempCtor.prototype = sup.prototype;
            sub.superClass_ = sup.prototype;
            sub.prototype = new tempCtor();
            /** @override */
            sub.prototype.constructor = sub;
        },
        /**
         * Calls {@code dispose} on the argument if it supports it. If obj is not an
         *     object with a dispose() method, this is a no-op.
         * @param {*} obj The object to dispose of.
         */
        dispose: function(obj) {
            if (obj && typeof obj.dispose == 'function') {
                obj.dispose();
            }
        },
        /**
         * 默认的空函数
         * @return {void} Nothing.
         */
        nullFunction: function() {},
        /**
         * 用于在抽象类中定义抽象方法，需要子类覆盖
         * @type {!Function}
         * @throws {Error} when invoked to indicate the method should be overridden.
         */
        abstractMethod: function() {
            throw Error('unimplemented abstract method');
        },
        /**
         * 全局上下文, 通常是 'window'.
         */
        global: this,
        /**
         * @return {number} An integer value representing the number of milliseconds
         *     between midnight, January 1, 1970 and the current time.
         */
        now: (Date.now) || (function() {
            // Unary plus operator converts its operand to a number which in the case of
            // a date is done by calling getTime().
            return +new Date();
        })
    };
});