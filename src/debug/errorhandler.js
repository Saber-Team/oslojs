/**
 * @fileoverview 模块提供捕捉异常的类. ErrorHandler实现了相关的monitor接口,
 * 可在entrypointregistry模块中使用. 前端监控在前端架构中非常重要, 所以此类和
 * 此类的子类实例都可以完成这些工作. ErrorHandler应该实现wrap和unwrap两个基础方法,
 * 这两个方法也可以集中在一个EntryPointMonitor接口里.
 *
 * @author Leo.Zhang
 * @email zmike86@gmail.com
 */

define([
    '../util/util',
    '../disposable/disposable',
    '../asserts/asserts',
    '../debug/util',
    '../debug/error',
    '../debug/entrypointregistry',
    '../debug/tracer'
  ],
  function(util, Disposable, asserts, debug, DebugError, entryPointRegistry, Trace) {

    'use strict';


    /**
     * ErrorHandler会对入口点函数进行try-catch处理. 如果抛出异常, 构造函数的
     * 错误处理器会被自动触发. 如果当前对象已被析构, 则不会处理异常和增加调用堆栈信息.
     * 有的方法也会包裹window.setTimeout和window.setInterval.
     * 注意大部分情况, 技术上不能去掉wrapper函数, 因为函数本身不知道会被赋值到什么地方.
     * 所以剥离wrapper应该是客户端程序的责任.
     * @param {Function} handler 异常处理器.
     * @constructor
     * @extends {Disposable}
     */
    var ErrorHandler = function(handler) {

      Disposable.call(this);

      /**
       * 异常处理器, 需要做记录日志和上报等工作.
       * @type {Function}
       * @private
       */
      this.errorHandlerFn_ = handler;

      /**
       * 是否异常对象再重新抛出前要封装成ErrorHandler.ProtectedFunctionError.
       * @type {boolean}
       * @private
       */
      this.wrapErrors_ = true;

      /**
       * 所有错误消息是否要加前缀ErrorHandler.ProtectedFunctionError.MESSAGE_PREFIX.
       * 这个配置属性只this.wrapErrors_设置为false时起作用.
       * @type {boolean}
       * @private
       */
      this.prefixErrorMessages_ = false;
    };


    util.inherits(ErrorHandler, Disposable);


    /**
     * 当植入entry point以保护方法的时候是否要添加调用堆栈方面的信息.
     * @type {boolean}
     * @private
     */
    ErrorHandler.prototype.addTracersToProtectedFunctions_ = false;


    /**
     * 包裹entry points时是否启用tracers.
     * @param {boolean} newVal 见上.
     */
    ErrorHandler.prototype.setAddTracersToProtectedFunctions = function(newVal) {
      this.addTracersToProtectedFunctions_ = newVal;
    };


    /** @override */
    ErrorHandler.prototype.wrap = function(fn) {
      // 断言返回函数本身
      return this.protectEntryPoint(asserts.assertFunction(fn));
    };


    /** @override */
    ErrorHandler.prototype.unwrap = function(fn) {
      asserts.assertFunction(fn);
      return fn[this.getFunctionIndex_(false)] || fn;
    };


    /**
     * 私有方法保存调用堆栈, 换行会被替换这样避免html转义html-escaped.
     * @param {string} stackTrace 调用堆栈字符串, 通过debug.util获得.
     * @return {string} A span which can be clicked on to show the stack trace.
     * @private
     */
    ErrorHandler.prototype.getStackTraceHolder_ = function(stackTrace) {
      var buffer = [];
      buffer.push('##PE_STACK_START##');
      buffer.push(stackTrace.replace(/(\r\n|\r|\n)/g, '##STACK_BR##'));
      buffer.push('##PE_STACK_END##');
      return buffer.join('');
    };


    /**
     * 获取函数的uid. 内部用的索引.
     * @param {boolean} wrapper True 内向引用; false 外向引用.
     * @return {string} 返回的字符串作为属性名保持对原始函数的引用 in its
     *     wrapper/wrapped function.
     * @private
     */
    ErrorHandler.prototype.getFunctionIndex_ = function(wrapper) {
      return (wrapper ? '__wrapper_' : '__protected_') + util.getUid(this) + '__';
    };


    /**
     * 对entry point函数植入异常处理保护措施. 当保护的函数抛出异常, 会有特定的
     * 异常处理器处理错误.
     * @param {Function} fn 要被保护的entry point函数.
     * @return {!Function} 返回一个包装函数, 内部其实还是调用entry point函数.
     */
    ErrorHandler.prototype.protectEntryPoint = function(fn) {
      var protectedFnName = this.getFunctionIndex_(true);
      if (!fn[protectedFnName]) {
        // 获得wrapper, 但是循环引用
        var wrapper = fn[protectedFnName] = this.getProtectedFunction(fn);
        wrapper[this.getFunctionIndex_(false)] = fn;
      }
      return fn[protectedFnName];
    };


    /**
     * 创建保护函数. 子类可以复写这个方法提供另外的错误处理实现, 或添加额外的
     * entry point hooks.
     * @param {!Function} fn 要被保护的entry point函数.
     * @return {!Function} 返回包裹函数.
     * @protected
     */
    ErrorHandler.prototype.getProtectedFunction = function(fn) {
      var that = this;
      var tracers = this.addTracersToProtectedFunctions_;
      var tracer, stackTrace;

      // 获取调用堆栈信息
      if (tracers) {
        stackTrace = debug.getStacktraceSimple(15);
      }

      // 保护函数
      var protectedFunction = function() {
        if (that.isDisposed()) {
          return fn.apply(this, arguments);
        }

        if (tracers) {
          tracer = Trace.startTracer('protectedEntryPoint: ' +
            that.getStackTraceHolder_(stackTrace));
        }

        // 执行原函数
        try {
          return fn.apply(this, arguments);
        } catch (e) {
          // 上报错误消息
          that.errorHandlerFn_(e);
          // 不需要包装错误对象
          if (!that.wrapErrors_) {
            // 对错误消息加前缀.
            if (that.prefixErrorMessages_) {
              if (typeof e === 'object') {
                e.message =
                  ErrorHandler.ProtectedFunctionError.MESSAGE_PREFIX +
                  e.message;
              } else {
                e = ErrorHandler.ProtectedFunctionError.MESSAGE_PREFIX +
                  e;
              }
            }
            if (util.DEBUG) {
              // 为了解决 https://code.google.com/p/v8/issues/detail?id=2625
              // 和 https://code.google.com/p/chromium/issues/detail?id=237059
              // 自定义错误对象的调用堆栈不正确.
              // V8环境支持Error.captureStackTrace, 在命令行打印堆栈.
              if (e && e.stack && Error.captureStackTrace &&
                util.global.console) {
                util.global.console.error(e.message, e.stack);
              }
            }
            // 重新抛出原始error. 调试时很方便console会显示错误和调用堆栈.
            throw e;
          }
          // 包装后重新抛出.
          throw new ErrorHandler.ProtectedFunctionError(e);

        } finally {
          if (tracers) {
            Trace.stopTracer(tracer);
          }
        }
      };
      protectedFunction[this.getFunctionIndex_(false)] = fn;
      return protectedFunction;
    };


    /**
     * 包装window.setTimeout.
     */
    ErrorHandler.prototype.protectWindowSetTimeout = function() {
      this.protectWindowFunctionsHelper_('setTimeout');
    };


    /**
     * 包装window.setInterval.
     */
    ErrorHandler.prototype.protectWindowSetInterval = function() {
      this.protectWindowFunctionsHelper_('setInterval');
    };


    /**
     * 包装window.requestAnimationFrame.
     */
    ErrorHandler.prototype.protectWindowRequestAnimationFrame = function() {
      var win = window;
      var fnNames = [
        'requestAnimationFrame',
        'mozRequestAnimationFrame',
        'webkitAnimationFrame',
        'msRequestAnimationFrame'
      ];
      for (var i = 0; i < fnNames.length; i++) {
        var fnName = fnNames[i];
        if (fnNames[i] in win) {
          win[fnName] = this.protectEntryPoint(win[fnName]);
        }
      }
    };


    /**
     * 保护原生的setTimeout/setInterval.
     * @param {string} fnName 要保护的全局方法名. 就是内建的setTimeout和setInterval.
     * @private
     */
    ErrorHandler.prototype.protectWindowFunctionsHelper_ = function(fnName) {
      var win = window;
      var originalFn = win[fnName];
      var that = this;
      win[fnName] = function(fn, time) {
        // Don't try to protect strings. In theory, we could try to globalEval
        // the string, but this seems to lead to permission errors on IE6.
        if (util.isString(fn)) {
          fn = util.partial(util.globalEval, fn);
        }
        fn = that.protectEntryPoint(fn);

        // IE doesn't support .call for setInterval/setTimeout, but it
        // also doesn't care what "this" is, so we can just call the
        // original function directly
        if (originalFn.call) {
          return originalFn.call(this, fn, time);
        } else {
          return originalFn(fn, time);
        }
      };
      win[fnName][this.getFunctionIndex_(false)] = originalFn;
    };


    /**
     * 设置是否要用ProtectedFunctionError对原生异常对象进行封装.
     * @param {boolean} wrapErrors 是否封装.
     */
    ErrorHandler.prototype.setWrapErrors = function(wrapErrors) {
      this.wrapErrors_ = wrapErrors;
    };


    /**
     * 设置收保护方法中抛出异常的错误消息的前缀.
     * @param {boolean} prefixErrorMessages 是否设置.
     */
    ErrorHandler.prototype.setPrefixErrorMessages = function(prefixErrorMessages) {
      this.prefixErrorMessages_ = prefixErrorMessages;
    };


    /** @override */
    ErrorHandler.prototype.disposeInternal = function() {
      // Try to unwrap window.setTimeout and window.setInterval.
      var win = window;
      win.setTimeout = this.unwrap(win.setTimeout);
      win.setInterval = this.unwrap(win.setInterval);

      ErrorHandler.superClass_.disposeInternal.call(this);
    };


    /**
     * 受保护的entry point函数的调用者会接收到此异常对象.
     * @param {*} cause entry point函数抛出的异常对象.
     * @constructor
     * @extends {DebugError}
     */
    ErrorHandler.ProtectedFunctionError = function(cause) {
      var message = ErrorHandler.ProtectedFunctionError.MESSAGE_PREFIX +
        (cause && cause.message ? String(cause.message) : String(cause));

      DebugError.call(this, message);

      /**
       * entry point抛出的原始异常对象.
       * @type {*}
       */
      this.cause = cause;

      var stack = cause && cause.stack;
      if (stack && util.isString(stack)) {
        this.stack = /** @type {string} */ (stack);
      }
    };


    util.inherits(ErrorHandler.ProtectedFunctionError, DebugError);


    /**
     * 错误消息前缀.
     * @type {string}
     */
    ErrorHandler.ProtectedFunctionError.MESSAGE_PREFIX =
      'Error in protected function: ';


    return ErrorHandler;

  }
);