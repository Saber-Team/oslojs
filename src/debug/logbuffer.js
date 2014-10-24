/**
 * @fileoverview A buffer for log records. The purpose of this is to improve
 * logging performance by re-using old objects when the buffer becomes full and
 * to eliminate the need for each app to implement their own log buffer. The
 * disadvantage to doing this is that log handlers cannot maintain references to
 * log records and expect that they are not overwriten at a later point.
 */

define('Sogou.Debug.LogBuffer', ['Sogou.Debug.LogRecord'], function(LogRecord) {

    'use strict';

    /**
     * Creates the log buffer.
     * @constructor
     */
    var LogBuffer = function() {
        this.clear();
    };

    /**
     * 单例模式
     * A static method that always returns the same instance of LogBuffer.
     * @return {!LogBuffer} The LogBuffer singleton instance.
     */
    LogBuffer.getInstance = function() {
        if (!LogBuffer.instance_) {
            // This function is written with the return statement after the assignment
            // to avoid the jscompiler StripCode bug described in http://b/2608064.
            // After that bug is fixed this can be refactored.
            LogBuffer.instance_ = new LogBuffer();
        }
        return LogBuffer.instance_;
    };

    /**
     * @define {number} The number of log records to buffer. 0 means disable
     * buffering.
     */
    LogBuffer.CAPACITY = 0;

    /**
     * 一个数组缓存所有的Record对象.
     * @type {!Array.<!LogRecord|undefined>}
     * @private
     */
    LogBuffer.prototype.buffer_;

    /**
     * 最新加入的record的索引或者-1(代表没有缓存的LogRecord).
     * @type {number}
     * @private
     */
    LogBuffer.prototype.curIndex_;

    /**
     * Whether the buffer is at capacity.
     * @type {boolean}
     * @private
     */
    LogBuffer.prototype.isFull_;

    /**
     * 可能会覆盖缓存中老的记录.
     * Adds a log record to the buffer, possibly overwriting the oldest record.
     * @param {LogLevel} level One of the level identifiers.
     * @param {string} msg The string message.
     * @param {string} loggerName The name of the source logger.
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
        this.isFull_ = (curIndex == LogBuffer.CAPACITY - 1);
        return this.buffer_[curIndex] = new LogRecord(level, msg, loggerName);
    };

    /**
     * @return {boolean} Whether the log buffer is enabled.
     */
    LogBuffer.isBufferingEnabled = function() {
        return LogBuffer.CAPACITY > 0;
    };

    /**
     * Removes all buffered log records.
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
        // 要从最老的开始就要判断isFull_
        var i = this.isFull_ ? curIndex : -1;
        do {
            i = (i + 1) % LogBuffer.CAPACITY;
            func(/** @type {!LogRecord} */ (buffer[i]));
        } while (i != curIndex);
    };

    return LogBuffer;
});