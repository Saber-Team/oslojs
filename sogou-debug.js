/**
 * @fileoverview 文件提供了全局基础函数sogou作为一个包裹器. 可以封装任何模块代码,
 *     同时检测全局环境中是否存在AMD加载器. Sogou前端框架主要运行在浏览器端, 但对于
 *     一些通用代码也可以运行在CMD环境中, 因此对CMD环境也做了检测.
 * @modified Leo.Zhang
 * @email zmike86@gmail.com
 */

;(function(global, undefined) {

    'use strict';

    var toString = Object.prototype.toString;

    /**
     * 判断给定的命名空间在全局中是否存在. 若存在则返回, 否则抛出异常.
     * "a.b.c" -> !!global.a.b.c;
     * @param {string} name eg: a.b.c.
     * @private
     * @return {*}
     */
    function check_(name) {
        var parts = name.split('.');
        var cur = global;
        // Parentheses added to eliminate strict JS warning in FireFox.
        for (var part; parts.length && (part = parts.shift());) {
            if (!cur[part]) {
                throw cur +'\'s ' + part + ' do not exist';
            }
            cur = cur[part];
        }
        return cur;
    }

    /**
     * Check for whether objects needed exist, this only done in
     * non-loader environment.
     * @param {array|string} deps
     * @return {Array}
     */
    function checkDependency(deps) {
        var ret = [];
        if (toString.call(deps) === '[object String]')
            ret.push(check_(deps));
        else if (toString.call(deps) === '[object Array]')
            for (var i = 0; i < deps.length; ++i)
                ret.push(check_(deps[i]));

        return ret;
    }

    /**
     * export namespace to global object.
     * "a.b.c" -> a = {};a.b={};a.b.c={};
     * @param {string} name eg: a.b.c.
     * @param {*=} opt_object (optional) exporting object.
     * @private
     */
    function exportPath(name, opt_object) {
        var parts = name.split('.');
        var cur = global;

        // Internet Explorer exhibits strange behavior when throwing errors from
        // methods externed in this manner.
        if (!(parts[0] in cur) && cur.execScript) {
            cur.execScript('var ' + parts[0]);
        }

        // Some Browsers can not parse the code: for((a in b); c;);
        // This pattern of code is produced by the JavaScript Compiler when
        // it collapses the statement above into the conditional loop below.
        // To prevent this from happening, use a for-loop and reserve the init
        // logic as below.

        // Parentheses added to eliminate strict JS warning in FireFox.
        for (var part; parts.length && (part = parts.shift());) {
            if (!parts.length && opt_object !== undefined) {
                cur[part] = opt_object;
            } else if (cur[part]) {
                cur = cur[part];
            } else {
                cur = cur[part] = {};
            }
        }
    }

    /**
     * Wrapper function fallback to do a global export if users do not import
     * KernelJS as their module loader. We can provide single logic module for
     * any page, any user. But generally, we expect use KernelJS to load js file.
     * I hate use a CMD way to load module in browser side, such as sync xhr solution
     * or write script tag into document.
     *
     * @param {string} name
     * @param {array} deps
     * @param {function} factory
     */
    if (typeof module != 'undefined' && module.exports) {
        global.sogou = function(name, deps, factory) {
            module.exports = factory();
        };
    } else if (typeof global['define'] === 'function' && global['define'].amd) {
        global.sogou = function(name, deps, factory) {
            define(name, deps, factory);
        };
    } else {
        global.sogou = function(name, deps, factory) {
            var dList = checkDependency(deps);
            exportPath(name, factory.apply(global, dList));
        };
    }

})(this);