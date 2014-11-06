/**
 * @fileoverview 所有可以析构对象的基类.这个是整个库的一个基础组件,大型复杂APP
 * 不论在老IE还是Chrome都有可能造成内存泄露,当组件销毁或者页面卸载需要析构所有对象.
 * @author Leo.Zhang
 * @email zmike86@gmail.com
 */

define('@Disposable', ['@util'], function(util) {

    'use strict';

    /**
     * @constructor
     */
    function Disposable() {}


    /**
     * 对象是否被析构. 若对象没有此方法直接返回false.
     * @param {*} obj 要测试的对象.
     * @return {boolean}
     */
    Disposable.isDisposed = function(obj) {
        if (obj && typeof obj.isDisposed === 'function') {
            return obj.isDisposed();
        }
        return false;
    };


    // 原型字段
    util.mixin(Disposable.prototype, {

        /**
         * 是否已被析构
         * @type {boolean}
         * @private
         */
        disposed_: false,

        /**
         * 用个数组保存析构时的回调函数。
         * @type {Array.<!Function>}
         * @private
         */
        onDisposeCallbacks_: null,

        /**
         * @return {boolean}
         * @override
         */
        isDisposed: function() {
            return this.disposed_;
        },

        /**
         * 析构对象. 如果对象不曾析构, 调用{@link #disposeInternal}.
         * Disposable的子类应该重写disposeInternal.
         * 删除对于COM, DOM和其他可析构对象的引用.
         * @return {void} Nothing.
         * @override
         */
        dispose: function() {
            if (!this.disposed_) {
                this.disposed_ = true;
                this.disposeInternal();
            }
        },

        /**
         * 关联两个对象,当this析构时,被关联对象也会被析构.
         * @param {Disposable} disposable 被关联对象.
         */
        registerDisposable: function(disposable) {
            this.addOnDisposeCallback(util.partial(util.dispose, disposable));
        },

        /**
         * 当析构对象时需要有回调函数。回调触发有顺序
         * @param {function(this:T):?} callback 回调函数.
         * @param {T=} opt_scope 函数执行上下文.
         * @template T
         */
        addOnDisposeCallback: function(callback, opt_scope) {
            if (!this.onDisposeCallbacks_) {
                this.onDisposeCallbacks_ = [];
            }
            this.onDisposeCallbacks_.push(util.bind(callback, opt_scope));
        },

        /**
         * 解除对COM对象, DOM结点或其他可析构对象的引用. Disposable的子类应该重写这个方法.
         * 这个方法通常只被调用一次(Not reentrant). 为了避免被调用两次,该方法声明成protected,
         * 并且只能由子类的disposeInternal方法调用{@code disposeInternal}.
         * 其他任何地方只能调用公有的dispose{@code dispose}.
         * 用法:
         * <pre>
         *   mypackage.MyClass = function() {
         *       // Constructor logic specific to MyClass.
         *       ...
         *   };
         *   util.inherits(mypackage.MyClass, Disposable);
         *
         *   mypackage.MyClass.prototype.disposeInternal = function() {
         *       // Dispose logic specific to MyClass.
         *       ...
         *       // Call superclass's disposeInternal at the end of the subclass's, like
         *       // in C++, to avoid hard-to-catch issues.
         *       ChildClass.superClass_.disposeInternal.call(this);
         *   };
         * </pre>
         * @protected
         */
        disposeInternal: function() {
            if (this.onDisposeCallbacks_) {
                while (this.onDisposeCallbacks_.length) {
                    this.onDisposeCallbacks_.shift()();
                }
            }
        }

    });

    return Disposable;

});