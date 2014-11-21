/**
 * @fileoverview 定义了日志类. 保持最小化依赖因为其他模块不一定有用.
 * @email zmike86@gmail.com
 * @see ../../demos/debug.html
 */

define('@debug.Logger',
    [
        '@util',
        '@array',
        '@debug.util',
        '@debug.logBuffer',
        '@debug.logRecord',
        '@debug.logLevel'
    ],
    function(util, array, debug, LogBuffer, LogRecord, LogLevel) {

        // 'use strict';

        /**
         * Logger是一个用于记录调试信息的对象. Loggers的命名是用'.'分割的空间式命名.
         * 命名应该基于包名.类名的方式, 比如: @net.browserChannel.
         * Logger和java中的java.util.logging.Logger没太大关系,
         * 它支持不同的级别和过滤不同的logger.
         * Logger不应该在业务代码里被实例化. 应该通过Logger.getLogger获得.
         * @constructor
         * @param {string} name 日志记录器的名字.
         */
        var Logger = function(name) {
            /**
             * Logger名字，以点分割的命名空间式
             * @type {string}
             * @private
             */
            this.name_ = name;
        };


        /**
         * 父Logger.
         * @type {Logger}
         * @private
         */
        Logger.prototype.parent_ = null;


        /**
         * logger会根据设置的level过滤掉在此level之下的日志.
         * Null的话则继承parent的level
         * @type {LogLevel}
         * @private
         */
        Logger.prototype.level_ = null;


        /**
         * 子日志记录的Map对象.
         * The keys are the leaf names of the children and
         * the values are the child loggers.
         * @type {Object}
         * @private
         */
        Logger.prototype.children_ = null;


        /**
         * 函数数组保存监听当前logger事件的fn.
         * @type {Array.<Function>}
         * @private
         */
        Logger.prototype.handlers_ = null;


        /**
         * @define {boolean} 是否loggers(非根logger)能有自己的监听函数和自己的level设置.
         *     这个参数设成false会直接使用rootHandlers_和rootLevel_, 不必沿着原型链查找,
         *     代码执行速度会快点.
         */
        Logger.ENABLE_HIERARCHY = true;


        if (!Logger.ENABLE_HIERARCHY) {
            /**
             * @type {!Array.<Function>}
             * @private
             */
            Logger.rootHandlers_ = [];
            /**
             * @type {?LogLevel}
             * @private
             */
            Logger.rootLevel_ = null;
        }


        /**
         * 找寻或创建一个logger符合给定的名字. 如果已创建则返回它.
         * If a new logger is created its log level will be configured based
         * on the LogManager configuration and it will configured to also send logging
         * output to its parent's handlers. It will be registered in the LogManager
         * global namespace.
         *
         * @param {string} name logger的名字, such as Oslo.net.browserChannel.
         * @return {!Logger} The named logger.
         */
        Logger.getLogger = function(name) {
            return LogManager.getLogger(name);
        };


        /**
         * 对性能分析器(profiling tools)写入日志.
         * 见 http://code.google.com/webtoolkit/speedtracer/logging-api.html
         *    http://msdn.microsoft.com/en-us/library/dd433074(VS.85).aspx
         * @param {string} msg 记录消息.
         */
        Logger.logToProfilers = function(msg) {
            // Using util.global, as loggers might be used in window-less contexts.
            if (util.global.console) {
                if (util.global.console.timeStamp) {
                    // Logs a message to Firebug, Web Inspector, SpeedTracer, etc.
                    util.global.console.timeStamp(msg);
                } else if (util.global.console.markTimeline) {
                    // TODO: markTimeline is deprecated. Drop this else clause entirely
                    // after Chrome M14 hits stable.
                    util.global.console.markTimeline(msg);
                }
            }

            if (util.global.msWriteProfilerMark) {
                // Logs a message to the Microsoft profiler
                util.global.msWriteProfilerMark(msg);
            }
        };


        /**
         * 返回名字.
         * @return {string} The name of this logger.
         */
        Logger.prototype.getName = function() {
            return this.name_;
        };


        /**
         * 对logger添加处理器. 没用框架中的事件系统因为事件系统本身也可能会
         * 用到日志记录.
         * @param {Function} handler Handler function to add.
         */
        Logger.prototype.addHandler = function(handler) {
            if (debug.LOGGING_ENABLED) {
                if (Logger.ENABLE_HIERARCHY) {
                    if (!this.handlers_) {
                        this.handlers_ = [];
                    }
                    this.handlers_.push(handler);
                } else {
                    Logger.rootHandlers_.push(handler);
                }
            }
        };


        /**
         * 对logger移除处理器.
         * @param {Function} handler 处理器函数.
         * @return {boolean} 返回是否移除成功.
         */
        Logger.prototype.removeHandler = function(handler) {
            if (debug.LOGGING_ENABLED) {
                var handlers = Logger.ENABLE_HIERARCHY ? this.handlers_ : Logger.rootHandlers_;
                return !!handlers && array.remove(handlers, handler);
            } else {
                return false;
            }
        };


        /**
         * Returns the parent of this logger.
         * @return {Logger} The parent logger or null if this is the root.
         */
        Logger.prototype.getParent = function() {
            return this.parent_;
        };


        /**
         * 返回当前日志器的孩子日志map.
         * @return {!Object} The map where the keys are the child leaf names and the
         *     values are the Logger objects.
         */
        Logger.prototype.getChildren = function() {
            if (!this.children_) {
                this.children_ = {};
            }
            return this.children_;
        };


        /**
         * 设置logger级别. 低于此级别的日志会被舍弃.
         * The level value Level.OFF can be used to turn off logging. If the new level
         * is null, it means that this node should inherit its level from its nearest
         * ancestor with a specific (non-null) level value.
         * @param {LogLevel} level The new level.
         */
        Logger.prototype.setLevel = function(level) {
            if (debug.LOGGING_ENABLED) {
                if (Logger.ENABLE_HIERARCHY) {
                    this.level_ = level;
                } else {
                    Logger.rootLevel_ = level;
                }
            }
        };


        /**
         * 获取logger级别.
         * @return {LogLevel} The level.
         */
        Logger.prototype.getLevel = function() {
            return debug.LOGGING_ENABLED ? this.level_ : LogLevel.OFF;
        };


        /**
         * 获取日志真实的level, 会分多种情况考虑.
         * @return {LogLevel} The level.
         */
        Logger.prototype.getEffectiveLevel = function() {
            if (!debug.LOGGING_ENABLED) {
                return LogLevel.OFF;
            }
            if (!Logger.ENABLE_HIERARCHY) {
                return Logger.rootLevel_;
            }
            if (this.level_) {
                return this.level_;
            }
            if (this.parent_) {
                return this.parent_.getEffectiveLevel();
            }
            return null;
        };


        /**
         * 是否可生成记录的判定条件是level.value的数字足够大, 大过此logger的level.
         * @param {Logger.Level} level The level to check.
         * @return {boolean} Whether the message would be logged.
         */
        Logger.prototype.isLoggable = function(level) {
            return debug.LOGGING_ENABLED && level.value >= this.getEffectiveLevel().value;
        };


        /**
         * 记录日志. 当前日志开启时消息会被传递到所有注册的处理器中.
         * @param {LogLevel} level 一个Level对象.
         * @param {string} msg 打印的消息.
         * @param {Error|Object=} opt_exception 当前日志关联的异常对象.
         */
        Logger.prototype.log = function(level, msg, opt_exception) {
            // java caches the effective level, not sure it's necessary here
            if (debug.LOGGING_ENABLED && this.isLoggable(level)) {
                this.doLogRecord_(this.getLogRecord(level, msg, opt_exception));
            }
        };


        /**
         * 根据给定的level, message和Error对象创建一个logRecord..
         * @param {LogLevel} level One of the level identifiers.
         * @param {string} msg The string message.
         * @param {Error|Object=} opt_exception An exception associated with the
         *     message.
         * @return {!LogRecord} A log record.
         */
        Logger.prototype.getLogRecord = function(level, msg, opt_exception) {
            if (LogBuffer.isBufferingEnabled()) {
                var logRecord = LogBuffer.getInstance()
                    .addRecord(level, msg, this.name_);
            } else {
                logRecord = new LogRecord(level, msg, this.name_);
            }
            if (opt_exception) {
                logRecord.setException(opt_exception);
                // todo Need other way to trace the error exception
                // then we can use ES5 strict mode consistently
                logRecord.setExceptionText(
                    debug.exposeException(opt_exception, arguments.callee.caller));
            }
            return logRecord;
        };


        /**
         * Logs a message at the Logger.Level.SHOUT level.
         * @param {string} msg The string message.
         * @param {Error=} opt_exception An exception associated with the message.
         */
        Logger.prototype.shout = function(msg, opt_exception) {
            if (debug.LOGGING_ENABLED) {
                this.log(LogLevel.SHOUT, msg, opt_exception);
            }
        };


        /**
         * Logs a message at the Logger.Level.SEVERE level.
         * @param {string} msg The string message.
         * @param {Error=} opt_exception An exception associated with the message.
         */
        Logger.prototype.severe = function(msg, opt_exception) {
            if (debug.LOGGING_ENABLED) {
                this.log(LogLevel.SEVERE, msg, opt_exception);
            }
        };


        /**
         * Logs a message at the Logger.Level.WARNING level.
         * @param {string} msg The string message.
         * @param {Error=} opt_exception An exception associated with the message.
         */
        Logger.prototype.warning = function(msg, opt_exception) {
            if (debug.LOGGING_ENABLED) {
                this.log(LogLevel.WARNING, msg, opt_exception);
            }
        };


        /**
         * Logs a message at the Logger.Level.INFO level.
         * @param {string} msg The string message.
         * @param {Error=} opt_exception An exception associated with the message.
         */
        Logger.prototype.info = function(msg, opt_exception) {
            if (debug.LOGGING_ENABLED) {
                this.log(LogLevel.INFO, msg, opt_exception);
            }
        };


        /**
         * Logs a message at the Logger.Level.CONFIG level.
         * @param {string} msg The string message.
         * @param {Error=} opt_exception An exception associated with the message.
         */
        Logger.prototype.config = function(msg, opt_exception) {
            if (debug.LOGGING_ENABLED) {
                this.log(LogLevel.CONFIG, msg, opt_exception);
            }
        };


        /**
         * Logs a message at the Logger.Level.FINE level.
         * @param {string} msg The string message.
         * @param {Error=} opt_exception An exception associated with the message.
         */
        Logger.prototype.fine = function(msg, opt_exception) {
            if (debug.LOGGING_ENABLED) {
                this.log(LogLevel.FINE, msg, opt_exception);
            }
        };


        /**
         * Logs a message at the Logger.Level.FINER level.
         * @param {string} msg The string message.
         * @param {Error=} opt_exception An exception associated with the message.
         */
        Logger.prototype.finer = function(msg, opt_exception) {
            if (debug.LOGGING_ENABLED) {
                this.log(LogLevel.FINER, msg, opt_exception);
            }
        };


        /**
         * Logs a message at the Logger.Level.FINEST level.
         * @param {string} msg The string message.
         * @param {Error=} opt_exception An exception associated with the message.
         */
        Logger.prototype.finest = function(msg, opt_exception) {
            if (debug.LOGGING_ENABLED) {
                this.log(LogLevel.FINEST, msg, opt_exception);
            }
        };


        /**
         * 对LogRecord对象记录, 是log方法的另一个版本.
         * @param {LogRecord} logRecord A log record to log.
         */
        Logger.prototype.logRecord = function(logRecord) {
            if (debug.LOGGING_ENABLED && this.isLoggable(logRecord.getLevel())) {
                this.doLogRecord_(logRecord);
            }
        };


        /**
         * 私有方法记录日志. 触发handlers里面的函数,传入logRecord.
         * 但是是沿着tree逐步向上调用, 类似DOM的bubble式
         * Logs a LogRecord.
         * @param {LogRecord} logRecord A log record to log.
         * @private
         */
        Logger.prototype.doLogRecord_ = function(logRecord) {
            Logger.logToProfilers('log:' + logRecord.getMessage());
            // 有继承树
            if (Logger.ENABLE_HIERARCHY) {
                var target = this;
                while (target) {
                    target.callPublish_(logRecord);
                    target = target.getParent();
                }
            } else {
                for (var i = 0, handler; handler = Logger.rootHandlers_[i++]; ) {
                    handler(logRecord);
                }
            }
        };


        /**
         * 在logger实例上调用句柄.
         * @param {LogRecord} logRecord The log record to publish.
         * @private
         */
        Logger.prototype.callPublish_ = function(logRecord) {
            if (this.handlers_) {
                for (var i = 0, handler; handler = this.handlers_[i]; i++) {
                    handler(logRecord);
                }
            }
        };


        /**
         * 设置logger的父对象. This is used for setting up the logger tree.
         * @param {Logger} parent The parent logger.
         * @private
         */
        Logger.prototype.setParent_ = function(parent) {
            this.parent_ = parent;
        };


        /**
         * 添加子logger. This is used for setting up the logger tree.
         * @param {string} name The leaf name of the child.
         * @param {Logger} logger The child logger.
         * @private
         */
        Logger.prototype.addChild_ = function(name, logger) {
            this.getChildren()[name] = logger;
        };


        /**
         * Map of logger names to logger objects.
         * @type {!Object}
         * @private
         */
        var loggers_ = {};


        /**
         * The root logger which is the root of the logger tree.
         * @type {Logger}
         * @private
         */
        var rootLogger_ = null;


        /**
         * 共享的LogManager对象 that is used to maintain a set of
         * shared state about Loggers and log services.
         */
        var LogManager = {};


        /**
         * 创建一个空名字的logger level设成config作为默认的根
         * Initializes the LogManager if not already initialized.
         */
        LogManager.initialize = function() {
            if (!rootLogger_) {
                rootLogger_ = new Logger('');
                loggers_[''] = rootLogger_;
                rootLogger_.setLevel(LogLevel.CONFIG);
            }
        };


        /**
         * Returns all the loggers.
         * @return {!Object} Map of logger names to logger objects.
         */
        LogManager.getLoggers = function() {
            return loggers_;
        };


        /**
         * 返回根日志对象, the logger with the empty
         * string as its name.
         * @return {!Logger} The root logger.
         */
        LogManager.getRoot = function() {
            LogManager.initialize();
            return /** @type {!Logger} */ (rootLogger_);
        };


        /**
         * 这个方法经常被Logger.getLogger调用来获取给定名字的日志记录器.
         * @param {string} name A name for the logger. This should be a dot-separated
         * name and should normally be based on the package name or class name of the
         * subsystem, such as Oslo.net.browserChannel.
         * @return {!Logger} The named logger.
         */
        LogManager.getLogger = function(name) {
            LogManager.initialize();
            var ret = loggers_[name];
            return ret || LogManager.createLogger_(name);
        };


        /**
         * 创建一个函数可被传参到debug.util.catchErrors. 但是实现上耦合太紧了
         * 强制info参数具有相应的属性. 返回的函数会用给定的logger log所有的报错.
         * @param {Logger=} opt_logger The logger to log the errors to.
         *     Defaults to the root logger.
         * @return {function(Object)} The created function.
         */
        LogManager.createFunctionForCatchErrors = function(opt_logger) {
            return function(info) {
                var logger = opt_logger || LogManager.getRoot();
                logger.severe('Error: ' + info.message + ' (' + info.fileName +
                    ' @ Line: ' + info.line + ')');
            };
        };


        /**
         * 创建给定名字的logger. 这个函数会在允许父子关系的情况下生成一个父logger.
         * 不存在就创建一个.
         * @param {string} name The name of the logger.
         * @return {!Logger} The named logger.
         * @private
         */
        LogManager.createLogger_ = function(name) {
            // find parent logger
            var logger = new Logger(name);
            if (Logger.ENABLE_HIERARCHY) {
                var lastDotIndex = name.lastIndexOf('.');
                var parentName = name.substr(0, lastDotIndex);
                var leafName = name.substr(lastDotIndex + 1);
                var parentLogger = LogManager.getLogger(parentName);

                // tell the parent about the child and the child about the parent
                // addChild_只需要logger名字最右边的部分
                parentLogger.addChild_(leafName, logger);
                logger.setParent_(parentLogger);
            }

            loggers_[name] = logger;
            return logger;
        };


        return Logger;
    }
);
