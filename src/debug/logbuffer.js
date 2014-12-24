/**
 * @fileoverview 模块提供log记录的缓冲buffer, 目的是提升log日志的性能并且在buffer满溢的时候
 * 能尽量使用以前创建的对象. 同时客户端程序中不再需要自己实现log buffer. The
 * disadvantage to doing this is that log handlers cannot maintain references to
 * log records and expect that they are not overwriten at a later point.
 * @author Leo.Zhang
 * @email zmike86@gmail.com
 */

define(['../debug/logrecord'], function(LogRecord) {

  'use strict';

  /**
   * 单例
   * @type {LogBuffer}
   * @private
   */
  var instance_ = null;


  /**
   * 创建log buffer.
   * @constructor
   */
  var LogBuffer = function() {
    this.clear();
  };


  /**
   * 单例模式返回LogBuffer.
   * @return {!LogBuffer} The LogBuffer singleton instance.
   */
  LogBuffer.getInstance = function() {
    if (!instance_) {
      instance_ = new LogBuffer();
    }
    return instance_;
  };


  /**
   * @define {number} 要缓冲的log records数目. 0表示禁止缓冲.
   */
  LogBuffer.CAPACITY = 0;


  /**
   * 一个数组缓存所有的Record对象.
   * @type {!Array.<!LogRecord|undefined>}
   * @private
   */
  LogBuffer.prototype.buffer_ = null;


  /**
   * 最新加入的record的索引或者-1(代表没有缓存的LogRecord).
   * @type {number}
   * @private
   */
  LogBuffer.prototype.curIndex_ = -1;


  /**
   * 缓冲区是否已满.
   * @type {boolean}
   * @private
   */
  LogBuffer.prototype.isFull_ = false;


  /**
   * 增加一条日志记录, 可能会覆盖缓存中老的记录.
   * @param {LogLevel} level One of the level identifiers.
   * @param {string} msg 日志消息.
   * @param {string} loggerName source logger的名称.
   * @return {!LogRecord} The log record.
   */
  LogBuffer.prototype.addRecord = function(level, msg, loggerName) {
    var curIndex = (this.curIndex_ + 1) % LogBuffer.CAPACITY;
    this.curIndex_ = curIndex;
    if (this.isFull_) {
      var ret = this.buffer_[curIndex];
      ret.reset(level, msg, loggerName);
      return ret;
    }
    this.isFull_ = (curIndex === LogBuffer.CAPACITY - 1);
    return this.buffer_[curIndex] = new LogRecord(level, msg, loggerName);
  };


  /**
   * @return {boolean} 是否开启了log buffer.
   */
  LogBuffer.isBufferingEnabled = function() {
    return LogBuffer.CAPACITY > 0;
  };


  /**
   * 移除所有缓存的log records.
   */
  LogBuffer.prototype.clear = function() {
    this.buffer_ = new Array(LogBuffer.CAPACITY);
    this.curIndex_ = -1;
    this.isFull_ = false;
  };


  /**
   * 在缓存的每个record上执行func. 从最久的record开始.
   * @param {function(!LogRecord)} func The function to call.
   */
  LogBuffer.prototype.forEachRecord = function(func) {
    var buffer = this.buffer_;
    // Corner case: no records.
    if (!buffer[0]) {
      return;
    }
    var curIndex = this.curIndex_;
    // 要从最老的开始就要判断isFull_和curIndex
    var i = this.isFull_ ? curIndex : -1;
    do {
      i = (i + 1) % LogBuffer.CAPACITY;
      func(/** @type {!LogRecord} */ (buffer[i]));
    } while (i !== curIndex);
  };


  return LogBuffer;

});