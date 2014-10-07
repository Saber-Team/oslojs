/**
 * @fileoverview 本框架中实现了Python style的迭代类.见Sogou.Iter.Iteration.
 *     本模块主要提供了一个停止迭代时需要抛出的异常对象.
 * @modified Leo.Zhang
 * @email zmike86@gmail.com
 */

define('Sogou.Iter.StopIteration',
    ['Sogou.Util'],
    function(util) {

        'use strict';

        var StopIteration;

        // 有的脚本引擎已经支持全局StopIteration对象.
        if ('StopIteration' in util.global) {
            /**
             * 单例的异常对象, 表示终止迭代发生.
             * @type {Error}
             */
            StopIteration = util.global['StopIteration'];
        } else {
            /**
             * 单例的异常对象, 表示终止迭代发生.
             * @type {Error}
             * @suppress {duplicate}
             */
            StopIteration = Error('StopIteration');
        }

        return StopIteration;
    }
);