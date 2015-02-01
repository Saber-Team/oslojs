/**
 * @fileoverview 提供异步处理类. Deferred对象的思想最早来源于python networking framework.
 * see: http://twistedmatrix.com/projects/core/documentation/howto/defer.html
 * 代码多来自Dojo和MochiKit框架.
 *
 * @author Leo.Zhang
 * @email zmike86@gmail.com
 */

define([
    '../util/util',
    '../array/array',
    '../debug/error',
    '../functions/functions'
  ],
  function(util, array, DebugError, functions) {

    'use strict';

    /**
     * 说明1#
     * Deferred表示了一个异步过程的结果. 一个Deferred对象当被创建的时候不会有任何的结果,(只能
     * 说明调用了一个异步的方法, 比如setTimeout或者xhr.send),当异步过程执行完毕会通过callback
     * 和errback触发成功或失败的回调. 还可以通过callback和errback两个方法为Deferred对象添加
     * 默认初始值.
     * 所以总结其他库的deferred.resolve相当于这里的callback或errback.
     *
     * 说明2#
     * 一旦被触发, 函数返回结果会顺序传递给addCallback(或者addErrback)添加的一系列函数.
     * 其中的函数可能会改变结果, 然后再往下传递.
     *
     * 说明3#
     * 回调和错误回调(errbacks)可以在任意时刻添加, 即便Deferred对象已经被触发(fired)过.
     * 如果没有等待的函数, 新加的callback会用最新的计算结果继续执行. 添加回调是唯一可以操作
     * Deferred对象返回结果的办法. (so addCallback和addErrback是何等重要哇！)
     *
     * 说明4#
     * 如果Deferred被取消了, 可用构造函数传递的第一个参数作一些额外的处理, 这是用户可定制的.
     * 此后会触发errback函数队列, 形参传入一个CanceledError对象.
     *
     * @param {Function=} opt_onCancelFunction Deferred被取消时调用的方法.
     * @param {Object=} opt_defaultScope 所有回调包括错误回调的上下文.
     * @constructor
     */
    var Deferred = function(opt_onCancelFunction, opt_defaultScope) {
      /**
       * 一个数组保存回调和errback, 每一项都是一个实体, 包含可选的上下文, 当然回调和errback可能是null.
       * @type {!Array.<!Array>}
       * @private
       */
      this.sequence_ = [];

      /**
       * 取消时的调用函数.
       * @type {Function|undefined}
       * @private
       */
      this.onCancelFunction_ = opt_onCancelFunction;

      /**
       * 默认的执行回调和errbacks的函数上下文.
       * @type {Object}
       * @private
       */
      this.defaultScope_ = opt_defaultScope || null;

      // 如果是调试模式且js引擎支持Error.captureStackTrace API
      if (Deferred.LONG_STACK_TRACES) {
        /**
         * 在deferred对象创建时增加对对象的stack trace.
         * @private {?string}
         */
        this.constructorStack_ = null;
        if (Error.captureStackTrace) {
          var target = {
            stack: ''
          };
          Error.captureStackTrace(target, Deferred);
          // 还要检查Error.captureStackTrace是否正常工作. gjstest中失效.
          if (typeof target.stack === 'string') {
            // Remove first line and force stringify to prevent memory leak due to
            // holding on to actual stack frames.
            this.constructorStack_ = target.stack.replace(/^[^\n]*\n/, '');
          }
        }
      }
    };

    /**
     * 标示是否被触发过.
     * @type {boolean}
     * @private
     */
    Deferred.prototype.fired_ = false;

    /**
     * 是否最近的返回结果是一个错误. 布尔值.
     * @type {boolean}
     * @private
     */
    Deferred.prototype.hadError_ = false;

    /**
     * 当前的执行结果, 方便另外再加的回调使用.
     * 也会随着addCallback和addErrback注册函数的执行而改变.
     * @type {*}
     * @private
     */
    Deferred.prototype.result_ = undefined;

    /**
     * 是否Deferred对象正在等待另一个Deferred的返回结果. 比如一个callback或者errback
     * 返回一个Deferred对象时, 执行队列就会被阻塞直到那个返回的Deferred可用. (这种情况很常发生)
     * @type {boolean}
     * @private
     */
    Deferred.prototype.blocked_ = false;

    /**
     * 是否当前的Deferred对象正在阻塞别的Deferred对象.
     * 也就是说如果当前Deferred对象是在另一个Deferred对象的执行队列函数返回的结果, 那么另一个
     * Deferred对象所在队列就会变成被阻塞的, 直到当前实例的执行队列执行完毕.
     *
     * 这时不会有额外的callback被添加到当前blocking Deferred对象.
     * @type {boolean}
     * @private
     */
    Deferred.prototype.blocking_ = false;

    /**
     * 是否Deferred对象在没有自定义取消回调的情况被取消. 记录这个做什么？
     * Whether the Deferred has been canceled without having a custom cancel
     * function.
     * @type {boolean}
     * @private
     */
    Deferred.prototype.silentlyCanceled_ = false;

    /**
     * 如果在一个Deferred对象执行的过程中发生了错误而没有errback捕获它, 这个错误对象会在
     * 一段timeout后重新抛出. 这样在一段时间内回调仍然会继续执行.
     * @type {number}
     * @private
     */
    Deferred.prototype.unhandledExceptionTimeoutId_;

    /**
     * 如果当前Deferred是通过branch()方法被创建的, 他就是parent Deferred.
     * @type {Deferred}
     * @private
     */
    Deferred.prototype.parent_ = null;

    /**
     * 一个数字记录当前Deferred衍生的分支. 当分支上的Deferred被触发或者取消这个数字会递减.
     * 俗点说可以认为当前Deferred生了多少孩子.
     * @type {number}
     * @private
     */
    Deferred.prototype.branches_ = 0;

    /**
     * @define {boolean} 未处理的异常是否会多次尝试抛出到全局环境. 默认等于util.DEBUG.
     */
    Deferred.STRICT_ERRORS = util.DEBUG;

    /**
     * @define {boolean} 是否对Deferred对象进行long stack traces. 默认等于util.DEBUG.
     */
    Deferred.LONG_STACK_TRACES = util.DEBUG;

    /**
     * Cancel这块有点乱, 因为结合了branch的方法....
     * 总觉得opt_deepCancel和opt_propagateCancel有所重复
     * (todo by zmike86)
     * 取消一个未被触发的Deferred对象, 或者这个Deferred对象正在等着另一个Deferred对象的返回结果,
     * 则被等待Deferred对象也会被cancel.
     *
     * #1 如果当前Deferred在父亲用branch()创建时设置opt_propagateCancel为true, 父Deferred
     * 也会被取消.
     *
     * #2 如果opt_deepCancel也设置了, cancel会在祖先链上执行(包括所有用父亲的父亲也会发生).
     *
     * #3 如果一个或多个branch创建的时候设置了opt_propagateCancel为true, 父亲会在其
     * 全部这些branch deferred对象都调用了cancel方法后被取消.
     *
     * @param {boolean=} opt_deepCancel 如果设置为true, cancels当前父节点parent而不必管是否其他branch
     *     也调用了cancel. 对于生成branch时没有设置opt_propagateCancel的deferred对象则不会有副作用.
     */
    Deferred.prototype.cancel = function(opt_deepCancel) {
      // 如果没有触发
      if (!this.hasFired()) {
        // 没触发却有parent_, 难道单独调了branch?
        // 不过我想大部分时间没有parent存在吧^
        if (this.parent_) {
          // Get rid of the parent reference before potentially running the parent's
          // canceler function to ensure that this cancellation isn't
          // double-counted.
          var parent = this.parent_;
          delete this.parent_;
          // 深度取消, 则父亲也受牵连
          if (opt_deepCancel) {
            parent.cancel(opt_deepCancel);
          }
          // 否则只有父亲branch_为0才会取消
          else {
            parent.branchCancel_();
          }
        }

        if (this.onCancelFunction_) {
          // Call in user-specified scope.
          this.onCancelFunction_.call(this.defaultScope_, this);
        } else {
          this.silentlyCanceled_ = true;
        }
        if (!this.hasFired()) {
          this.errback(new Deferred.CanceledError(this));
        }

        // 如果当前取消的对象是被阻塞的, 那对不起了, 让我阻塞的也一并取消吧~
      } else if (this.result_ instanceof Deferred) {
        this.result_.cancel();
      }
    };

    /**
     * 处理取消单个分支(只是减少标记分支的数目). 一旦所有分支都被取消了, 当前Deferred也会被取消了.
     * @private
     */
    Deferred.prototype.branchCancel_ = function() {
      this.branches_--;
      if (this.branches_ <= 0) {
        this.cancel();
      }
    };

    /**
     * 在一个blocking的Deferred对象触发后, 解锁当前的Deferred对象, 恢复执行队列.
     * @param {boolean} isSuccess 返回结果是正常成功还是错误对象.
     * @param {*} res blocking Deferred对象的返回结果.
     * @private
     */
    Deferred.prototype.continue_ = function(isSuccess, res) {
      this.blocked_ = false;
      this.updateResult_(isSuccess, res);
    };

    /**
     * 根据传入的第一个参数决定如何更新最后的状态.这个方法只能作为私有了看来.
     * @param {boolean} isSuccess 是否成功执行.
     * @param {*} res The result.
     * @private
     */
    Deferred.prototype.updateResult_ = function(isSuccess, res) {
      this.fired_ = true;
      this.result_ = res;
      // 只表明最近的执行结果
      this.hadError_ = !isSuccess;
      // 具体实现
      this.fire_();
    };

    /**
     * 私有方法: 检验Deferred对象是否未被触发过.
     * @private
     * @throws {Error} 如果被触发过则抛出异常. 这个为什么一定要抛出? (todo)
     */
    Deferred.prototype.check_ = function() {
      if (this.hasFired()) {
        // 调用了errback
        if (!this.silentlyCanceled_) {
          throw new Deferred.AlreadyCalledError(this);
        }
        // 这个代表没有传入errback， 但这里为什么置为false??
        this.silentlyCanceled_ = false;
      }
    };

    /**
     * 触发Deferred的执行队列并且传入默认的第一个执行结果.
     * @param {*=} opt_result The starting result.
     */
    Deferred.prototype.callback = function(opt_result) {
      this.check_();
      if (opt_result instanceof Deferred) {
        throw 'An execution sequence may not be initiated with a blocking Deferred.';
      }
      this.updateResult_(true /* isSuccess */, opt_result);
    };

    /**
     * 触发Deferred的执行队列并且传入默认的第一个错误结果.
     * @param {*=} opt_result The starting error.
     */
    Deferred.prototype.errback = function(opt_result) {
      this.check_();
      if (opt_result instanceof Deferred) {
        throw 'An execution sequence may not be initiated with a blocking Deferred.';
      }
      this.makeStackTraceLong_(opt_result);
      this.updateResult_(false /* isSuccess */, opt_result);
    };

    /**
     * 为Deferred对象建立错误堆栈. 堆栈信息包括从对象创建开始到当前错误发生的信息.
     * @param {*} error
     * @private
     */
    Deferred.prototype.makeStackTraceLong_ = function(error) {
      if (!Deferred.LONG_STACK_TRACES) {
        return;
      }
      if (this.constructorStack_ && util.isObject(error) && error.stack &&
        // Stack looks like it was system generated. See
        // https://code.google.com/p/v8/wiki/JavaScriptStackTraceApi
        (/^[^\n]+(\n   [^\n]+)+/).test(error.stack)) {
        error.stack = error.stack + '\nDEFERRED OPERATION:\n' +
          this.constructorStack_;
      }
    };

    /**
     * 注册一个回调函数返回成功时执行. 这个函数是重要API之一.
     * 如果这个函数没有返回值, Deferred的结果不会改变.
     * 如果有返回值, 那么在回调队列的下一个函数将接受此结果作为参数.
     *
     * 如果函数抛出Error, 这个error对象将会被作为结果传递给队列的下一个errback.
     *
     * 如果函数返回的是另一个Deferred, 执行队列将会被阻塞直到作为result的Deferred触发.
     *
     * @param {!function(this:T,?):?} cb 成功后的回调函数.
     * @param {T=} opt_scope 可选的回调函数上下文.
     * @return {!Deferred} 返回Deferred对象.
     * @template T
     */
    Deferred.prototype.addCallback = function(cb, opt_scope) {
      return this.addCallbacks(cb, null, opt_scope);
    };

    /**
     * 注册一个回调函数发生错误时执行.
     * 如果这个函数没有返回值, Deferred的错误结果不会改变.
     * 与上个函数类似.
     *
     * 如果回调处理了这个错误对象而返回一个正常值, 这个值会被传递到队列中下一个正常的回调函数中.
     *
     * 如果函数返回一个Deferred对象, 后续执行队列会被阻塞直到该对象触发. 而触发后的结果会被传递到当前
     * Deferred对象的执行队列的下一个成功回调或者错误回调中.
     *
     * @param {!function(this:T,?):?} eb 失败后的回调函数.
     * @param {T=} opt_scope 可选的函数上下文.
     * @return {!Deferred} 返回Deferred对象.
     * @template T
     */
    Deferred.prototype.addErrback = function(eb, opt_scope) {
      return this.addCallbacks(null, eb, opt_scope);
    };

    /**
     * 把一个函数当做成功和失败的回调.
     * @param {!function(this:T,?):?} f 任何结果都会进行的回调函数.
     * @param {T=} opt_scope 函数上下文.
     * @return {!Deferred} 返回Deferred对象.
     * @template T
     */
    Deferred.prototype.addBoth = function(f, opt_scope) {
      return this.addCallbacks(f, f, opt_scope);
    };

    /**
     * 在执行队列中顺序加入成功(或失败)的回调, 只有一种可能发生,这依赖于前一个函数的返回结果.
     * 这个方法链式操作地返回自己.
     * todo 不会是public的访问权限
     * NOTE: 这个方法并不等于def.addCallback().addErrback(). 如果成功了不会调用失败回调, 反之亦然.
     *
     * @param {(function(this:T,?):?)|null} cb 成功后的回调函数.
     * @param {(function(this:T,?):?)|null} eb 失败后的回调函数.
     * @param {T=} opt_scope 可选的函数上下文.
     * @return {!Deferred} 返回Deferred对象.
     * @template T
     */
    Deferred.prototype.addCallbacks = function(cb, eb, opt_scope) {
      // 当前阻塞别人的罪魁祸首不能新加回调~~
      if (this.blocking_) {
        return this;
      }
      // asserts.assert(!this.blocking_, 'Blocking Deferreds can not be re-used');
      this.sequence_.push([cb, eb, opt_scope]);
      // 如果resolve过则直接fire
      if (this.hasFired()) {
        this.fire_();
      }
      return this;
    };


    /**
     * 传入的Deferred对象的成功(失败)触发方法注册成当前Deferred对象的成功(失败)回调, 即可实现了
     * 传入的Deferred作为当前Deferred的执行队列的后继. 但这个方法返回当前的Deferred对象.
     *
     * Links another Deferred to the end of this Deferred's execution sequence. The
     * result of this execution sequence will be passed as the starting result for
     * the chained Deferred, invoking either its first callback or errback.
     *
     * @param {!Deferred} otherDeferred The Deferred to chain.
     * @return {!Deferred} This Deferred.
     */
    Deferred.prototype.chainDeferred = function(otherDeferred) {
      this.addCallbacks(
        otherDeferred.callback, otherDeferred.errback, otherDeferred);
      return this;
    };


    /**
     * todo by zmike86
     * 使一个Deferred变为blocked等待另一个Deferred的执行队列执行完毕.
     * Makes this Deferred wait for another Deferred's execution sequence to
     * complete before continuing.
     *
     * This is equivalent to adding a callback that returns {@code otherDeferred},
     * but doesn't prevent additional callbacks from being added to
     * {@code otherDeferred}.
     *
     * @param {!Deferred} otherDeferred The Deferred to wait for.
     * @return {!Deferred} This Deferred.
     */
    Deferred.prototype.awaitDeferred = function(otherDeferred) {
      // 加一个成功回调
      return this.addCallback(util.bind(otherDeferred.branch, otherDeferred));
    };


    /**
     * 在当前Deferred对象的执行队列上创建一个分支, 并返回新的Deferred对象.
     * Creates a branch off this Deferred's execution sequence, and returns it as a
     * new Deferred. The branched Deferred's starting result will be shared with the
     * parent at the point of the branch, even if further callbacks are added to the
     * parent.
     *
     * All branches at the same stage in the execution sequence will receive the
     * same starting value.
     *
     * @param {boolean=} opt_propagateCancel 决定是否冒泡'取消'行为. 若为true, 当创建的分支
     *     (every child branch)调用cancel()的时候, parent也会被'取消'.
     * @return {!Deferred} A Deferred that will be started with the
     *     computed result from this stage in the execution sequence.
     */
    Deferred.prototype.branch = function(opt_propagateCancel) {
      // 创建新的Deferred对象
      var d = new Deferred();
      // 做分支, 这步非常关键！
      this.chainDeferred(d);
      if (opt_propagateCancel) {
        // 又成了一次爸爸
        // 又多了一条后代~~
        d.parent_ = this;
        this.branches_++;
      }
      return d;
    };

    /**
     * 返回this.fired_, callback和errback会置this.fired_为true.
     * @return {boolean} Whether the execution sequence has been started on this
     *     Deferred by invoking callback or errback.
     */
    Deferred.prototype.hasFired = function() {
      return this.fired_;
    };

    /**
     * 判断一个返回结果是否一个Error.
     * @param {*} res 执行队列最后返回的结果.
     * @return {boolean} Whether the current result is an error that should cause
     *     the next errback to fire. May be overridden by subclasses to handle
     *     special error types.
     * @protected
     */
    Deferred.prototype.isError = function(res) {
      return res instanceof Error;
    };


    /**
     * @return {boolean} Whether an errback exists in the remaining sequence.
     * @private
     */
    Deferred.prototype.hasErrback_ = function() {
      return array.some(this.sequence_, function(sequenceRow) {
        // The errback is the second element in the array.
        return util.isFunction(sequenceRow[1]);
      });
    };


    /**
     * 执行队列中剩余的函数都要触发. 这个内部方法很重要!
     * The result may be modified by callbacks or errbacks, and execution will block
     * if the returned result is an incomplete Deferred.
     * @private
     */
    Deferred.prototype.fire_ = function() {
      // 在Deferred触发后添加失败回调, 添加的时机正好在有未处理异常并且
      // 异常被再次抛出前, 那么就取消重新抛出异常的动作.
      if (this.unhandledExceptionTimeoutId_ && this.hasFired() &&
        this.hasErrback_()) {
        // It is possible to add errbacks after the Deferred has fired. If a new
        // errback is added immediately after the Deferred encountered an unhandled
        // error, but before that error is rethrown, cancel the rethrow.
        util.global.clearTimeout(this.unhandledExceptionTimeoutId_);
        delete this.unhandledExceptionTimeoutId_;
      }

      // 断掉后代关系~
      // 为什么delete？todo
      if (this.parent_) {
        this.parent_.branches_--;
        delete this.parent_;
      }

      var res = this.result_;
      var unhandledException = false;
      var isNewlyBlocked = false;

      // 遍历执行队列
      // (两个条件:
      // 1. 队列里有函数
      // 2. 当前没被阻塞)
      while (this.sequence_.length && !this.blocked_) {
        var sequenceEntry = this.sequence_.shift();

        var callback = sequenceEntry[0];
        var errback = sequenceEntry[1];
        var scope = sequenceEntry[2];

        var f = this.hadError_ ? errback : callback;
        if (f) {
          /** @preserveTry */
          try {
            var ret = f.call(scope || this.defaultScope_, res);

            // 甄别函数执行结果, 如果没结果还用之前的this.result_不会改变, res也不会改变
            if (util.isDef(ret)) {
              // Bubble up the error as long as the return value hasn't changed.
              this.hadError_ = this.hadError_ && (ret === res || this.isError(ret));
              this.result_ = res = ret;
            }
            // 返回的是Deferred对象则当前变成blocked_;
            if (res instanceof Deferred) {
              isNewlyBlocked = true;
              this.blocked_ = true;
            }

          } catch (ex) {
            res = ex;
            this.hadError_ = true;
            this.makeStackTraceLong_(res);

            if (!this.hasErrback_()) {
              // 如果有异常抛出但执行队列中没有errback捕获它, 准备一段时间后再次抛出它.
              unhandledException = true;
            }
          }
        }
      }

      // 保存返回结果
      this.result_ = res;

      // 由于执行队列的函数有返回Deferred对象的情况, 导致当前对象被阻塞了
      // 为返回的Deferred对象res添加回调, 在回调中执行当前对象的continue_
      if (isNewlyBlocked) {
        res.addCallbacks(
          util.bind(this.continue_, this, true /* isSuccess */),
          util.bind(this.continue_, this, false /* isSuccess */));
        res.blocking_ = true;
      }
      // 出错了(但并非取消)
      else if (Deferred.STRICT_ERRORS && this.isError(res) &&
        !(res instanceof Deferred.CanceledError)) {
        this.hadError_ = true;
        unhandledException = true;
      }

      if (unhandledException) {
        // Rethrow the unhandled error after a timeout. Execution will continue, but
        // the error will be seen by global handlers and the user. The throw will
        // be canceled if another errback is appended before the timeout executes.
        // The error's original stack trace is preserved where available.
        this.unhandledExceptionTimeoutId_ = util.global.setTimeout(
          functions.fail(res), 0);
      }
    };


    /**
     * 静态方法: 创建一个Deferred对象并且给一个初始值.
     * 其实返回的d没有任何的执行队列.
     * @param {*=} opt_result The result.
     * @return {!Deferred} 返回新的Deferred对象.
     */
    Deferred.succeed = function(opt_result) {
      var d = new Deferred();
      d.callback(opt_result);
      return d;
    };


    /**
     * 静态方法: 创建一个Deferred对象并初始化一个错误结果.
     * @param {*} res The error result.
     * @return {!Deferred} 返回新的Deferred对象.
     */
    Deferred.fail = function(res) {
      var d = new Deferred();
      d.errback(res);
      return d;
    };


    /**
     * 静态方法: 创建一个Deferred对象后取消并返回它.
     * @return {!Deferred} The new Deferred.
     */
    Deferred.canceled = function() {
      var d = new Deferred();
      d.cancel();
      return d;
    };


    /**
     * 不管给的value是否是Deferred对象, 都会对他进行标准化. 并且返回这个标准化Deferred.
     *
     * If the input value is a Deferred, the Deferred is branched (so the original
     * execution sequence is not modified) and the input callback added to the new
     * branch. The branch is returned to the caller.
     *
     * 如果value不是一个Deferred对象, callback会立即执行 and an already firing Deferred
     * will be returned to the caller.
     *
     * In the following (contrived) example, if <code>isImmediate</code> is true
     * then 3 is alerted immediately, otherwise 6 is alerted after a 2-second delay.
     *
     * <pre>
     *   var value;
     *   if (isImmediate) {
         *     value = 3;
         *   } else {
         *     value = new Deferred();
         *     setTimeout(function() { value.callback(6); }, 2000);
         *   }
     *
     *   var d = Deferred.when(value, alert);
     * </pre>
     *
     * @param {*} value Deferred or normal value to pass to the callback.
     * @param {!function(this:T, ?):?} callback The callback to execute.
     * @param {T=} opt_scope An optional scope to call the callback in.
     * @return {!Deferred} A new Deferred that will call the input
     *     callback with the input value.
     * @template T
     */
    Deferred.when = function(value, callback, opt_scope) {
      if (value instanceof Deferred) {
        return value.branch(true).addCallback(callback, opt_scope);
      } else {
        // Deferred.succeed(value)是一个被触发过的Deferred对象,
        // 此时addCallback会直接执行add的回调
        return Deferred.succeed(value).addCallback(callback, opt_scope);
      }
    };


    /**
     * 一个自定义错误类用于当Deferred对象已经被触发called时抛出.
     * @param {!Deferred} deferred The Deferred.
     * @constructor
     * @extends {DebugError}
     */
    Deferred.AlreadyCalledError = function(deferred) {
      DebugError.call(this);

      /**
       * The Deferred that raised this error.
       * @type {Deferred}
       */
      this.deferred = deferred;
    };


    util.inherits(Deferred.AlreadyCalledError, DebugError);


    /** @override */
    Deferred.AlreadyCalledError.prototype.message = 'Deferred has already fired';


    /** @override */
    Deferred.AlreadyCalledError.prototype.name = 'AlreadyCalledError';


    /**
     * 一个自定义的错误类用于当Deferred对象取消时出错.
     * @param {!Deferred} deferred Deferred对象.
     * @constructor
     * @extends {DebugError}
     */
    Deferred.CanceledError = function(deferred) {
      DebugError.call(this);

      /**
       * The Deferred that raised this error.
       * @type {Deferred}
       */
      this.deferred = deferred;
    };


    util.inherits(Deferred.CanceledError, DebugError);


    /** @override */
    Deferred.CanceledError.prototype.message = 'Deferred was canceled';


    /** @override */
    Deferred.CanceledError.prototype.name = 'CanceledError';


    return Deferred;
  }
);