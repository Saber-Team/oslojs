/**
 * @fileoverview 一条日志记录的类.这个类保持简单,尽量不做过多依赖.
 * @author Leo.Zhang
 * @email zmike86@gmail.com
 */

define(function() {

  'use strict';

  /**
   * 记录对象的唯一序列号
   * @type {number}
   * @private
   */
  var nextSequenceNumber_ = 0;


  /**
   * 一条日志记录的类.
   * @constructor
   * @param {LogLevel} level 日志级别的标识符.
   * @param {string} msg 打印的消息.
   * @param {string} loggerName logger自己的名称.
   * @param {number=} opt_time 日志被创建的时间.默认是now.
   * @param {number=} opt_sequenceNumber 当前记录的序列号.
   */
  var LogRecord = function(level, msg, loggerName, opt_time, opt_sequenceNumber) {
    this.reset(level, msg, loggerName, opt_time, opt_sequenceNumber);
  };


  /**
   * 创建日志的时间.
   * @type {number}
   * @private
   */
  LogRecord.prototype.time_ = 0;


  /**
   * 日志等级
   * @type {LogLevel}
   * @private
   */
  LogRecord.prototype.level_ = null;


  /**
   * 记录的消息.
   * @type {string}
   * @private
   */
  LogRecord.prototype.msg_ = '';


  /**
   * 创建当前记录的logger名字。
   * @type {string}
   * @private
   */
  LogRecord.prototype.loggerName_ = '';


  /**
   * LogRecord的一个序列号. 每个record对象都有唯一序列号.
   * @type {number}
   * @private
   */
  LogRecord.prototype.sequenceNumber_ = 0;


  /**
   * 当前记录关联的异常对象,如果有的话
   * @type {Object}
   * @private
   */
  LogRecord.prototype.exception_ = null;


  /**
   * 如果有异常对象则有异常消息
   * @type {?string}
   * @private
   */
  LogRecord.prototype.exceptionText_ = null;


  /**
   * @define {boolean} 是否开启记录的序列号.
   */
  LogRecord.ENABLE_SEQUENCE_NUMBERS = true;


  /**
   * 为日志记录这条对象设置所有字段.
   * @param {LogLevel} level 级别.
   * @param {string} msg 消息.
   * @param {string} loggerName logger名字.
   * @param {number=} opt_time 记录时间.
   * @param {number=} opt_sqNumber 序列号. This
   *     should only be passed in when restoring a log record from persistence.
   */
  LogRecord.prototype.reset = function(level, msg, loggerName, opt_time, opt_sqNumber) {
    if (LogRecord.ENABLE_SEQUENCE_NUMBERS) {
      this.sequenceNumber_ = (typeof opt_sqNumber === 'number' ?
        opt_sqNumber : nextSequenceNumber_++);
    }

    this.time_ = opt_time || (+new Date());
    this.level_ = level;
    this.msg_ = msg;
    this.loggerName_ = loggerName;
    // 因为是重置, 需要删除exception对象.
    delete this.exception_;
    delete this.exceptionText_;
  };


  /**
   * 获取Logger名字.
   * @return {string} source logger name (may be null).
   */
  LogRecord.prototype.getLoggerName = function() {
    return this.loggerName_;
  };


  /**
   * @return {Object} the exception.
   */
  LogRecord.prototype.getException = function() {
    return this.exception_;
  };


  /**
   * @param {Object} exception the exception.
   */
  LogRecord.prototype.setException = function(exception) {
    this.exception_ = exception;
  };


  /**
   * @return {?string} Exception text.
   */
  LogRecord.prototype.getExceptionText = function() {
    return this.exceptionText_;
  };


  /**
   * @param {string} text The exception text.
   */
  LogRecord.prototype.setExceptionText = function(text) {
    this.exceptionText_ = text;
  };


  /**
   * 设置日志对象名字.
   * @param {string} loggerName source logger name (may be null).
   */
  LogRecord.prototype.setLoggerName = function(loggerName) {
    this.loggerName_ = loggerName;
  };


  /**
   * 获取日志等级.
   * @return {LogLevel} the logging message level.
   */
  LogRecord.prototype.getLevel = function() {
    return this.level_;
  };


  /**
   * 设置日志等级, 如Level.SEVERE.
   * @param {LogLevel} level the logging message level.
   */
  LogRecord.prototype.setLevel = function(level) {
    this.level_ = level;
  };


  /**
   * 获取原始的日志消息, 这一步在本地化和格式化之前.
   * @return {string} the raw message string.
   */
  LogRecord.prototype.getMessage = function() {
    return this.msg_;
  };


  /**
   * 设置原始的日志消息, 这一步在本地化和格式化之前.
   * @param {string} msg the raw message string.
   */
  LogRecord.prototype.setMessage = function(msg) {
    this.msg_ = msg;
  };


  /**
   * 获取创建时间的毫秒 since 1970.
   * @return {number} event time in millis since 1970.
   */
  LogRecord.prototype.getMillis = function() {
    return this.time_;
  };


  /**
   * 设置创建时间.
   * @param {number} time event time in millis since 1970.
   */
  LogRecord.prototype.setMillis = function(time) {
    this.time_ = time;
  };


  /**
   * 返回序列号.
   * @return {number} the sequence number.
   */
  LogRecord.prototype.getSequenceNumber = function() {
    return this.sequenceNumber_;
  };


  return LogRecord;
});
