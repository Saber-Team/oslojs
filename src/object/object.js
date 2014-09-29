/**
 * @fileoverview 操作键-值对结构的方法.
 * @modified Leo.Zhang
 * @email zmike86@gmail.com
 */

define('Sogou.Object', [], function() {

    'use strict';

    /**
     * Object.prototype上定义的字段。
     * @type {Array.<string>}
     * @private
     */
    var PROTOTYPE_FIELDS_ = [
        'constructor',
        'hasOwnProperty',
        'isPrototypeOf',
        'propertyIsEnumerable',
        'toLocaleString',
        'toString',
        'valueOf'
    ];

    var OP = Object.prototype,
        hasOwn = OP.hasOwnProperty;

    /**
     * 对象是否包含指定属性.
     * @param {Object} obj 测试对象.
     * @param {*} key 属性名.
     * @return {boolean}
     */
    function containsKey(obj, key) {
        return key in obj;
    }

    /**
     * 对象是否包含指定的值. 复杂度O(n).
     * @param {Object.<K,V>} obj 测试对象.
     * @param {V} val 查询值.
     * @return {boolean}
     * @template K,V
     */
    function containsValue(obj, val) {
        for (var key in obj) {
            if (obj[key] === val) {
                return true;
            }
        }
        return false;
    }

    /**
     * 对哈希结构里的每个项调用函数.
     * @param {Object.<K,V>} obj 要遍历的对象.
     * @param {function(this:T,V,?,Object.<K,V>):?} f 调用的函数, 接收三个参数(当前项,
     *     当前索引,遍历对象)返回值会被忽略
     * @param {T=} opt_obj 调用函数的上下文
     * @template T,K,V
     */
    function forEach(obj, f, opt_obj) {
        for (var key in obj)
            f.call(opt_obj, obj[key], key, obj);
    }

    /**
     * 对哈希结构里的每个项调用函数. 如果函数返回true这项会被加到新对象里.
     * @param {Object.<K,V>} obj 要遍历的对象
     * @param {function(this:T,V,?,Object.<K,V>):boolean} f 调用的函数, 接收三个参数(当前项,
     *     当前索引,遍历对象)需要返回布尔值,true就加到结果对象里,false被忽略.
     * @param {T=} opt_obj 调用函数的上下文.
     * @return {!Object.<K,V>} 返回新对象.
     * @template T,K,V
     */
    function filter(obj, f, opt_obj) {
        var res = {};
        for (var key in obj)
            if (f.call(opt_obj, obj[key], key, obj))
                res[key] = obj[key];
        return res;
    }

    /**
     * 对哈希结构里的每个项调用函数,并且把函数返回的结果作为新对象的值, 而后返回新对象
     * @param {Object.<K,V>} obj 要遍历的对象
     * @param {function(this:T,V,?,Object.<K,V>):R} f 调用的函数,接收三个参数(当前项,
     *     当前索引,遍历对象).
     * @param {T=} opt_obj 调用函数的上下文
     * @return {!Object.<K,R>} 返回新对象.
     * @template T,K,V,R
     */
    function map(obj, f, opt_obj) {
        var res = {};
        for (var key in obj)
            res[key] = f.call(opt_obj, obj[key], key, obj);
        return res;
    }

    /**
     * 对哈希结构里的每个项调用函数. 如果任一个函数返回true整体返回true.
     * @param {Object.<K,V>} obj 测试对象.
     * @param {function(this:T,V,?,Object.<K,V>):boolean} f 调用的函数,接收三个参数(当前项,
     *     当前索引,遍历对象). 返回布尔值.
     * @param {T=} opt_obj 函数上下文.
     * @return {boolean}
     * @template T,K,V
     */
    function some(obj, f, opt_obj) {
        for (var key in obj)
            if (f.call(opt_obj, obj[key], key, obj))
                return true;
        return false;
    }

    /**
     * 在对象每个键值对上调用函数,如果全部返回true则整体返回true. 若单独返回false则返回fasle
     * 并且立即停止遍历.
     * @param {Object.<K,V>} obj 测试对象.
     * @param {?function(this:T,V,?,Object.<K,V>):boolean} f 调用的函数,接收三个参数(当前项,
     *     当前索引,遍历对象). 返回布尔值.
     * @param {T=} opt_obj 函数上下文.
     * @return {boolean}
     * @template T,K,V
     */
    function every(obj, f, opt_obj) {
        for (var key in obj)
            if (!f.call(opt_obj, obj[key], key, obj))
                return false;
        return true;
    }

    return {
        containsKey: containsKey,
        containsValue: containsValue,
        forEach: forEach,
        filter: filter,
        map: map,
        some: some,
        every: every,
        /**
         * 用一个对象扩展另一个对象. 这个操作是'in-place'原地操作,在原对象上进行并不创建新的对象.
         * 用法:
         * var o = {};
         * object.extend(o, {a: 0, b: 1});
         * o; // {a: 0, b: 1}
         * object.extend(o, {c: 2});
         * o; // {a: 0, b: 1, c: 2}
         *
         * @param {Object} target 要扩展的对象
         * @param {...Object} var_args 不定数量的对象,这些对象的属性会被复制
         */
        extend: function(target, var_args) {
            var key, source;
            for (var i = 1; i < arguments.length; i++) {
                source = arguments[i];
                for (key in source) {
                    target[key] = source[key];
                }

                // IE对于for-in循环不能遍历对象原型链上的不可枚举属性,比如Object.prototype.isPrototypeOf
                // 并且即使对象覆盖了这些属性也不能被遍历到,测试678都如此表现(9不会), Chrome和FireFox
                // 虽然也不能遍历这些方法但是如果是被直接自定义的属性覆盖则可以遍历到. 所以对IE做特殊处理.
                // 注: 采用类型封装生成对象new String()会有同样的问题在IE678下.
                for (var j = 0; j < PROTOTYPE_FIELDS_.length; j++) {
                    key = PROTOTYPE_FIELDS_[j];
                    if (hasOwn.call(source, key)) {
                        target[key] = source[key];
                    }
                }
            }
        },
        /**
         * 返回对象的值作为数组.
         * @param {Object.<K,V>} obj 对象.
         * @return {!Array.<V>}
         * @template K,V
         */
        getValues: function(obj) {
            var res = [];
            var i = 0;
            for (var key in obj)
                res[i++] = obj[key];
            return res;
        },
        /**
         * 返回对象的键作为数组.
         * @param {Object} obj 对象.
         * @return {!Array.<string>}
         */
        getKeys: function(obj) {
            var res = [];
            var i = 0;
            for (var key in obj)
                res[i++] = key;
            return res;
        },
        /**
         * 创建对象的不可变版本,前提是浏览器支持immutable objects.
         * 默认模式写入不可变对象静默失败. 严格模式下抛出异常.
         * 具体参见: ECMA262- [15.2.3.9]
         * @param {!Object.<K,V>} obj 对象.
         * @return {!Object.<K,V>} 对象的不可变版本, 或对象自身.
         * @template K,V
         */
        createImmutableView: function(obj) {
            var result = obj;
            if (Object.isFrozen && !Object.isFrozen(obj)) {
                result = Object.create(obj);
                Object.freeze(result);
            }
            return result;
        },
        /**
         * 判断对象是否被冻结. ES5特性
         * @param {!Object} obj 测试对象.
         * @return {boolean}
         */
        isImmutableView: function(obj) {
            return !!Object.isFrozen && Object.isFrozen(obj);
        },
        /**
         * 判断一个哈希结构是否为空.
         * @param {Object} obj 测试的对象.
         * @return {boolean}
         */
        isEmpty: function(obj) {
            var key;
            for (key in obj)
                return false;
            return true;
        }
    };

});
