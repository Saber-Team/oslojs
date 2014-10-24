/**
 * @fileoverview 表示logger等级,控制日志输出. 线上代码应该去掉所有log
 * @modified Leo.Zhang
 * @email zmike86@gmail.com
 */

define('Sogou.Debug.LogLevel', [], function() {

    'use strict';

    /**
     * 表示logger等级的类,控制日志输出.
     * 对某个级别的日志进行输出则对高于此级别的日志也进行输出.
     * <p>使用时尽量用预制的级别如: Level.SEVERE.
     * <p>级别从高到低:
     * <ul>
     * <li>SEVERE (highest value)
     * <li>WARNING
     * <li>INFO
     * <li>CONFIG
     * <li>FINE
     * <li>FINER
     * <li>FINEST  (lowest value)
     * </ul>
     * 还有一个级别是 OFF 可以关闭日志, 级别 ALL 可以开启所有日志.
     * @param {string} name 级别名.
     * @param {number} value 级别值.
     * @constructor
     */
    var Level = function(name, value) {
        /**
         * 级别的名称
         * @type {string}
         */
        this.name = name;
        /**
         * 级别的值
         * @type {number}
         */
        this.value = value;
    };


    /**
     * @return {string} String representation of the logger level.
     * @override
     */
    Level.prototype.toString = function() {
        return this.name;
    };


    /**
     * OFF is a special level that can be used to turn off logging.
     * This level is initialized to <CODE>Infinity</CODE>.
     * @type {!Level}
     */
    Level.OFF = new Level('OFF', Infinity);


    /**
     * SHOUT is a message level for extra debugging loudness.
     * This level is initialized to <CODE>1200</CODE>.
     * @type {!Level}
     */
    Level.SHOUT = new Level('SHOUT', 1200);


    /**
     * 客户端程序默认的级别是Level.SEVERE
     * SEVERE is a message level indicating a serious failure.
     * This level is initialized to <CODE>1000</CODE>.
     * @type {!Level}
     */
    Level.SEVERE = new Level('SEVERE', 1000);


    /**
     * WARNING is a message level indicating a potential problem.
     * This level is initialized to <CODE>900</CODE>.
     * @type {!Level}
     */
    Level.WARNING = new Level('WARNING', 900);


    /**
     * INFO is a message level for informational messages.
     * This level is initialized to <CODE>800</CODE>.
     * @type {!Level}
     */
    Level.INFO = new Level('INFO', 800);


    /**
     * CONFIG is a message level for static configuration messages.
     * This level is initialized to <CODE>700</CODE>.
     * @type {!Level}
     */
    Level.CONFIG = new Level('CONFIG', 700);


    /**
     * FINE is a message level providing tracing information.
     * This level is initialized to <CODE>500</CODE>.
     * @type {!Level}
     */
    Level.FINE = new Level('FINE', 500);


    /**
     * FINER indicates a fairly detailed tracing message.
     * This level is initialized to <CODE>400</CODE>.
     * @type {!Level}
     */
    Level.FINER = new Level('FINER', 400);


    /**
     * FINEST indicates a highly detailed tracing message.
     * This level is initialized to <CODE>300</CODE>.
     * @type {!Level}
     */
    Level.FINEST = new Level('FINEST', 300);


    /**
     * ALL indicates that all messages should be logged.
     * This level is initialized to <CODE>0</CODE>.
     * @type {!Level}
     */
    Level.ALL = new Level('ALL', 0);

    /**
     * 预定义的一些等级.
     * @type {!Array.<!Logger.Level>}
     * @final
     */
    Level.PREDEFINED_LEVELS = [
        Level.OFF,
        Level.SHOUT,
        Level.SEVERE,
        Level.WARNING,
        Level.INFO,
        Level.CONFIG,
        Level.FINE,
        Level.FINER,
        Level.FINEST,
        Level.ALL
    ];


    /**
     * A lookup map used to find the level object based on the name or value of
     * the level object.
     * @type {Object}
     * @private
     */
    Level.predefinedLevelsCache_ = null;


    /**
     * Creates the predefined levels cache and populates it.
     * @private
     */
    Level.createPredefinedLevelsCache_ = function() {
        Level.predefinedLevelsCache_ = {};
        for (var i = 0, level; level = Level.PREDEFINED_LEVELS[i]; i++) {
            Level.predefinedLevelsCache_[level.value] = level;
            Level.predefinedLevelsCache_[level.name] = level;
        }
    };


    /**
     * Gets the predefined level with the given name.
     * @param {string} name The name of the level.
     * @return {Level} The level, or null if none found.
     */
    Level.getPredefinedLevel = function(name) {
        if (!Level.predefinedLevelsCache_) {
            Level.createPredefinedLevelsCache_();
        }

        return Level.predefinedLevelsCache_[name] || null;
    };


    /**
     * 返回低于给定级别最近的Logger.Level对象.
     * Gets the highest predefined level <= #value.
     * @param {number} value Level value.
     * @return {Level} The level, or null if none found.
     */
    Level.getPredefinedLevelByValue = function(value) {
        if (!Level.predefinedLevelsCache_) {
            Level.createPredefinedLevelsCache_();
        }

        if (value in Level.predefinedLevelsCache_) {
            return Level.predefinedLevelsCache_[value];
        }

        for (var i = 0; i < Level.PREDEFINED_LEVELS.length; ++i) {
            var level = Level.PREDEFINED_LEVELS[i];
            if (level.value <= value) {
                return level;
            }
        }
        return null;
    };

    return Level;
});