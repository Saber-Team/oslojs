/**
 * @fileoverview 文件提供了全局基础函数define作为一个包裹器. 可以封装任何模块代码,
 * 同时检测全局环境中是否存在AMD加载器. Oslo前端框架主要运行在浏览器端, 但对于
 * 一些通用代码也可以运行在CMD环境中, 因此对CMD环境也做了检测.
 * @author Leo.Zhang
 * @email zmike86@gmail.com
 */

;(function(global, undefined) {

    'use strict';

    var toString = Object.prototype.toString;


    /**
     * 判断给定的命名空间在全局中是否存在. 若存在则返回, 否则抛出异常.
     * "a.b.c" -> global.a.b.c
     * 但是
     * "@a.b.c" -> global.Oslo.a.b.c
     * @param {string} name eg: a.b.c.
     * @private
     * @return {*}
     */
    function checkExist_(name) {
        var parts = name.split('.');
        var cur = global;
        if (parts[0].charAt(0) === '@') {
            cur = global.Oslo;
            parts[0] = parts[0].substr(1);
        }
        // Parentheses added to eliminate strict JS warning in FireFox.
        for (var part; parts.length && (part = parts.shift());) {
            if (!cur[part]) {
                throw name +'\'s ' + part + ' do not exist';
            }
            cur = cur[part];
        }
        return cur;
    }


    /**
	 * 轮训检查依赖项是否都存在, 只在不存在模块加载器的环境中执行. 返回依赖
	 * 模块的数组.
     * @param {Array|String} deps
     * @return {Array}
     */
    function checkDependency(deps) {
        var ret = [];
        if (toString.call(deps) === '[object String]') {
            ret.push(checkExist_(deps));
        }
        else if (toString.call(deps) === '[object Array]') {
            for (var i = 0; i < deps.length; ++i) {
                ret.push(checkExist_(deps[i]));
            }
        }

        return ret;
    }


    /**
     * 向全局对象导出命名空间.
     * "a.b.c" -> a = {};a.b={};a.b.c={};
     * @param {string} name eg: a.b.c.
     * @param {*=} opt_object (optional) exporting object.
     * @private
     */
    function exportPath(name, opt_object) {
        var parts = name.split('.');
        var cur = global;

        if (parts[0].charAt(0) === '@') {
            cur = global.Oslo;
            parts[0] = parts[0].substr(1);
        }

        if ((cur === global) && !(parts[0] in cur) && global.execScript) {
            global.execScript('var ' + parts[0]);
        }

        // Parentheses added to eliminate strict JS warning in FireFox.
        for (var part; parts.length && (part = parts.shift());) {
            if (!parts.length && opt_object !== undefined) {
                cur[part] = opt_object;
            }
            else if (cur[part]) {
                cur = cur[part];
            }
            else {
                cur = cur[part] = {};
            }
        }
    }


    /**
     * 包裹器函数在没有AMD loader(KernelJS)的情况下降级地去向全局对象导出命名空间规则的对象.
     * @param {string} name
     * @param {array} deps
     * @param {function} factory
     */
    if (typeof module !== 'undefined' && module.exports) {
        global.define = function(name, deps, factory) {
            module.exports = factory();
        };
    }
    else if (typeof global.define === 'function' && global.define.amd) {
        // 全局中有AMD加载器,不要覆盖require和define函数
    }
    else {
        global.define = function(name, deps, factory) {
            var dList = checkDependency(deps);

            // 对象字面量
            if (toString.call(factory) === '[object Object]') {
                exportPath(name, factory);
            }
            // 回调函数
            else if (toString.call(factory) === '[object Function]') {
                exportPath(name, factory.apply(global, dList));
            }
            else {
                throw 'When define a module, the export should be an object' +
                    ' or a factory function. It is illegal for module ' + name;
            }
        };
        global.require = function(deps, factory) {
            var dList = checkDependency(deps);
            factory.apply(global, dList);
            // 不做全局导出
        };
    }


    // 全局对象导出所有模块
    global.Oslo = {
        authors: [{
            name: 'saber-team',
            email: 'zmike86@gmail.com'
        }],
        version: '0.2'
    };


})(this);