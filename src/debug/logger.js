/**
 * @fileoverview 定义了日志类
 * Please minimize dependencies this file has on other closure classes
 * as any dependency it takes won't be able to use the logging infrastructure.
 *
 * @see ../../demos/debug.html
 */

define('Sogou.Debug.Logger',
    [
        'Sogou.Util',
        'Sogou.Array',
        'Sogou.Debug.Util',
        'Sogou.Debug.LogBuffer',
        'Sogou.Debug.LogRecord',
        'Sogou.Debug.LogLevel'
    ],
    function(util, array, debug, LogBuffer, LogRecord, LogLevel) {

        //'use strict';

        /**
         * Logger是一个用于记录调试信息的对象. Loggers的命名是用'.'分割的空间式命名.
         * 命名应该基于包名.类名的方式, 比如: Sogou.Net.BrowserChannel.
         * Logger和java中的java.util.logging.Logger没太大关系,
         * 它支持不同的级别和过滤不同的logger.
         * Logger不应该在业务代码里被实例化. 应该通过Logger.getLogger获得.
         * @constructor
         * @param {string} name The name of the Logger.
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
         * Parent Logger.
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
         * Map of children loggers. The keys are the leaf names of the children and
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
         *     这个参数设成false会直接使用rootHandlers_和rootLevel_, 不必沿着原型链查找,代码
         *     执行速度会快点.
         */
        Logger.ENABLE_HIERARCHY = true;

        if (!Logger.ENABLE_HIERARCHY) {
            /**
             * @type {!Array.<Function>}
             * @private
             */
            Logger.rootHandlers_ = [];
            /**
             * @type {LogLevel}
             * @private
             */
            Logger.rootLevel_;
        }

        /**
         * 重要方法.
         * 找寻或创建一个logger符合给定的名字. 如果已创建则返回它.
         * Finds or creates a logger for a named subsystem. If a logger has already been
         * created with the given name it is returned. Otherwise a new logger is
         * created. If a new logger is created its log level will be configured based
         * on the LogManager configuration and it will configured to also send logging
         * output to its parent's handlers. It will be registered in the LogManager
         * global namespace.
         *
         * @param {string} name A name for the logger. This should be a dot-separated
         * name and should normally be based on the package name or class name of the
         * subsystem, such as goog.net.BrowserChannel.
         * @return {!Logger} The named logger.
         */
        Logger.getLogger = function(name) {
            return LogManager.getLogger(name);
        };

        /**
         * Logs a message to profiling tools, if available.
         * {@see http://code.google.com/webtoolkit/speedtracer/logging-api.html}
         * {@see http://msdn.microsoft.com/en-us/library/dd433074(VS.85).aspx}
         * @param {string} msg The message to log.
         */
        Logger.logToProfilers = function(msg) {
            // Using util.global, as loggers might be used in window-less contexts.
            if (util.global['console']) {
                if (util.global['console']['timeStamp']) {
                    // Logs a message to Firebug, Web Inspector, SpeedTracer, etc.
                    util.global['console']['timeStamp'](msg);
                } else if (util.global['console']['markTimeline']) {
                    // TODO(user): markTimeline is deprecated. Drop this else clause entirely
                    // after Chrome M14 hits stable.
                    util.global['console']['markTimeline'](msg);
                }
            }

            if (util.global['msWriteProfilerMark']) {
                // Logs a message to the Microsoft profiler
                util.global['msWriteProfilerMark'](msg);
            }
        };

        /**
         * Gets the name of this logger.
         * @return {string} The name of this logger.
         */
        Logger.prototype.getName = function() {
            return this.name_;
        };

        /**
         * Adds a handler to the logger. This doesn't use the event system because
         * we want to be able to add logging to the event system.
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
         * Removes a handler from the logger. This doesn't use the event system because
         * we want to be able to add logging to the event system.
         * @param {Function} handler Handler function to remove.
         * @return {boolean} Whether the handler was removed.
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
         * Returns the children of this logger as a map of the child name to the logger.
         * @return {!Object} The map where the keys are the child leaf names and the
         *     values are the Logger objects.
         */
        Logger.prototype.getChildren = function() {
            if (!this.children_) this.children_ = {};
            return this.children_;
        };

        /**
         * Set the log level specifying which message levels will be logged by this
         * logger. Message levels lower than this value will be discarded.
         * The level value Level.OFF can be used to turn off logging. If the new level
         * is null, it means that this node should inherit its level from its nearest
         * ancestor with a specific (non-null) level value.
         *
         * @param {Logger.Level} level The new level.
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
         * Gets the log level specifying which message levels will be logged by this
         * logger. Message levels lower than this value will be discarded.
         * The level value Level.OFF can be used to turn off logging. If the level
         * is null, it means that this node should inherit its level from its nearest
         * ancestor with a specific (non-null) level value.
         *
         * @return {Logger.Level} The level.
         */
        Logger.prototype.getLevel = function() {
            return debug.LOGGING_ENABLED ? this.level_ : LogLevel.OFF;
        };

        /**
         * Returns the effective level of the logger based on its ancestors' levels.
         * @return {Logger.Level} The level.
         */
        Logger.prototype.getEffectiveLevel = function() {
            if (!debug.LOGGING_ENABLED) return LogLevel.OFF;
            if (!Logger.ENABLE_HIERARCHY) return Logger.rootLevel_;
            if (this.level_) return this.level_;
            if (this.parent_) return this.parent_.getEffectiveLevel();

            return null;
        };

        /**
         * 是否可生成记录的判定条件是level.value的数字足够大, 大过此logger的level.
         * Checks if a message of the given level would actually be logged by this
         * logger. This check is based on the Loggers effective level, which may be
         * inherited from its parent.
         * @param {Logger.Level} level The level to check.
         * @return {boolean} Whether the message would be logged.
         */
        Logger.prototype.isLoggable = function(level) {
            return debug.LOGGING_ENABLED && level.value >= this.getEffectiveLevel().value;
        };

        /**
         * Logs a message. If the logger is currently enabled for the
         * given message level then the given message is forwarded to all the
         * registered output Handler objects.
         * @param {Logger.Level} level 一个Level对象.
         * @param {string} msg 打印的消息.
         * @param {Error|Object=} opt_exception An exception associated with the
         *     message.
         */
        Logger.prototype.log = function(level, msg, opt_exception) {
            // java caches the effective level, not sure it's necessary here
            if (debug.LOGGING_ENABLED && this.isLoggable(level)) {
                this.doLogRecord_(this.getLogRecord(level, msg, opt_exception));
            }
        };

        /**
         * 根据给定的level, message和Error对象得到一个logRecord.
         * Creates a new log record and adds the exception (if present) to it.
         * @param {Logger.Level} level One of the level identifiers.
         * @param {string} msg The string message.
         * @param {Error|Object=} opt_exception An exception associated with the
         *     message.
         * @return {!LogRecord} A log record.
         */
        Logger.prototype.getLogRecord = function(level, msg, opt_exception) {
            if (LogBuffer.isBufferingEnabled()) {
                var logRecord =
                    LogBuffer.getInstance().addRecord(level, msg, this.name_);
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
         * If the logger is currently enabled for the given message level then the
         * given message is forwarded to all the registered output Handler objects.
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
         * If the logger is currently enabled for the given message level then the
         * given message is forwarded to all the registered output Handler objects.
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
         * If the logger is currently enabled for the given message level then the
         * given message is forwarded to all the registered output Handler objects.
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
         * If the logger is currently enabled for the given message level then the
         * given message is forwarded to all the registered output Handler objects.
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
         * If the logger is currently enabled for the given message level then the
         * given message is forwarded to all the registered output Handler objects.
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
         * If the logger is currently enabled for the given message level then the
         * given message is forwarded to all the registered output Handler objects.
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
         * If the logger is currently enabled for the given message level then the
         * given message is forwarded to all the registered output Handler objects.
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
         * If the logger is currently enabled for the given message level then the
         * given message is forwarded to all the registered output Handler objects.
         * @param {string} msg The string message.
         * @param {Error=} opt_exception An exception associated with the message.
         */
        Logger.prototype.finest = function(msg, opt_exception) {
            if (debug.LOGGING_ENABLED) {
                this.log(LogLevel.FINEST, msg, opt_exception);
            }
        };

        /**
         * Logs a LogRecord. If the logger is currently enabled for the
         * given message level then the given message is forwarded to all the
         * registered output Handler objects.
         * @param {LogRecord} logRecord A log record to log.
         */
        Logger.prototype.logRecord = function(logRecord) {
            if (debug.LOGGING_ENABLED && this.isLoggable(logRecord.getLevel())) {
                this.doLogRecord_(logRecord);
            }
        };

        /**
         * 私有方法记录日志.
         * 实际上就是触发handlers里面的函数,传入logRecord.
         * 但是是沿着tree逐步向上调用, 类似DOM的bubble式
         * Logs a LogRecord.
         * @param {LogRecord} logRecord A log record to log.
         * @private
         */
        Logger.prototype.doLogRecord_ = function(logRecord) {
            Logger.logToProfilers('log:' + logRecord.getMessage());
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
         * 在logger实例上调用句柄
         * Calls the handlers for publish.
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
         * Sets the parent of this logger. This is used for setting up the logger tree.
         * @param {Logger} parent The parent logger.
         * @private
         */
        Logger.prototype.setParent_ = function(parent) {
            this.parent_ = parent;
        };

        /**
         * Adds a child to this logger. This is used for setting up the logger tree.
         * @param {string} name The leaf name of the child.
         * @param {Logger} logger The child logger.
         * @private
         */
        Logger.prototype.addChild_ = function(name, logger) {
            this.getChildren()[name] = logger;
        };

        /**
         * There is a single global LogManager object that is used to maintain a set of
         * shared state about Loggers and log services. This is loosely based on the
         * java class java.util.logging.LogManager.
         */
        var LogManager = {};

        /**
         * Map of logger names to logger objects.
         * @type {!Object}
         * @private
         */
        LogManager.loggers_ = {};

        /**
         * The root logger which is the root of the logger tree.
         * @type {Logger}
         * @private
         */
        LogManager.rootLogger_ = null;

        /**
         * 创建一个空名字的logger level设成config作为默认的根
         * Initializes the LogManager if not already initialized.
         */
        LogManager.initialize = function() {
            if (!LogManager.rootLogger_) {
                LogManager.rootLogger_ = new Logger('');
                LogManager.loggers_[''] = LogManager.rootLogger_;
                LogManager.rootLogger_.setLevel(LogLevel.CONFIG);
            }
        };

        /**
         * Returns all the loggers.
         * @return {!Object} Map of logger names to logger objects.
         */
        LogManager.getLoggers = function() {
            return LogManager.loggers_;
        };

        /**
         * Returns the root of the logger tree namespace, the logger with the empty
         * string as its name.
         *
         * @return {!Logger} The root logger.
         */
        LogManager.getRoot = function() {
            LogManager.initialize();
            return /** @type {!Logger} */ (LogManager.rootLogger_);
        };

        /**
         * 这个方法经常被Logger.getLogger调用来获取给定名字的日志记录器..
         *
         * @param {string} name A name for the logger. This should be a dot-separated
         * name and should normally be based on the package name or class name of the
         * subsystem, such as goog.net.BrowserChannel.
         * @return {!Logger} The named logger.
         */
        LogManager.getLogger = function(name) {
            LogManager.initialize();
            var ret = LogManager.loggers_[name];
            return ret || LogManager.createLogger_(name);
        };

        /**
         * Creates a function that can be passed to debug.catchErrors.
         * ?? 这是不是耦合太紧了, 连参数字段都必须一致 (by zmike86)
         * The function will log all reported errors using the given logger.
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
                // 叶子name表示最有一个点的右边啊....
                parentLogger.addChild_(leafName, logger);
                logger.setParent_(parentLogger);
            }

            LogManager.loggers_[name] = logger;
            return logger;
        };

        return Logger;
    }
);
