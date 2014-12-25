/**
 * @fileoverview 一个句柄的映射关系, 提供了eventtarget的一些实用方法
 * 这个类的实例被EventTarget类的实例组合使用
 * @author Leo.Zhang
 * @email zmike86@gmail.com
 */

define([
    '../util/util',
    '../array/array',
    './listener',
    '../object/object'
  ],
  function(util, array, Listener, object) {

    'use strict';

    /**
     * 创建事件句柄结构.
     * @param {EventTarget} src 事件源对象.
     * @constructor
     */
    function ListenerMap(src) {
      /** @type {EventTarget} */
      this.src = src;
      /**
       * 事件类型-->事件处理器数组的MAP.
       * @type {Object.<string, !Array.<!Listener>>}
       */
      this.listeners = {};
      /**
       * 注册的事件分属于哪几种类型, 类型的数目.
       * @private {number}
       */
      this.typeCount_ = 0;
    }

    util.mixin(ListenerMap.prototype, {
      /**
       * @return {number} 注册的事件分属于哪几种类型, 类型的数目.
       */
      getTypeCount: function() {
        return this.typeCount_;
      },
      /**
       * @return {number} 获取总的注册事件数.
       */
      getListenerCount: function() {
        var count = 0;
        for (var type in this.listeners) {
          count += this.listeners[type].length;
        }
        return count;
      },
      /**
       * 绑定一个事件. 函数只能被绑定一次.
       * 注意: 一次性函数不会改变已存在的函数性质, 但再次添加会使得一次性函数变成
       * 非一次性的.
       * @param {string} type 事件类型.
       * @param {!Function} listener 事件处理器.
       * @param {boolean} callOnce 是否一次性处理器.
       * @param {boolean=} opt_useCapture 是否开启捕获模式.
       * @param {Object=} opt_context 函数执行上下文.
       * @return {Listener} Unique key for the listener.
       */
      add: function(type, listener, callOnce, opt_useCapture, opt_context) {
        var listenerArray = this.listeners[type];
        if (!listenerArray) {
          listenerArray = this.listeners[type] = [];
          this.typeCount_++;
        }

        var listenerObj;
        var index = ListenerMap.findListenerIndex_(listenerArray, listener, opt_useCapture, opt_context);
        if (index > -1) {
          listenerObj = listenerArray[index];
          if (!callOnce) {
            // Ensure that, if there is an existing callOnce listener, it is no
            // longer a callOnce listener.
            listenerObj.callOnce = false;
          }
        } else {
          listenerObj = new Listener(listener, null, this.src, type, !!opt_useCapture, opt_context);
          listenerObj.callOnce = callOnce;
          listenerArray.push(listenerObj);
        }
        return listenerObj;
      },
      /**
       * 移除一个事件绑定函数. 必须要传入这个函数引用.
       * @param {string} type 事件类型.
       * @param {!Function} listener 事件处理器.
       * @param {boolean=} opt_useCapture 是否开启捕获模式.
       * @param {Object=} opt_context 函数执行上下文.
       * @return {boolean} 是否处理器被移除.
       */
      remove: function(type, listener, opt_useCapture, opt_context) {
        if (!(type in this.listeners)) {
          return false;
        }

        var listenerArray = this.listeners[type];
        var index = ListenerMap.findListenerIndex_(
          listenerArray, listener, opt_useCapture, opt_context);
        if (index > -1) {
          var listenerObj = listenerArray[index];
          listenerObj.markAsRemoved();
          array.removeAt(listenerArray, index);
          if (listenerArray.length === 0) {
            delete this.listeners[type];
            this.typeCount_--;
          }
          return true;
        }
        return false;
      },
      /**
       * 获取所有符合类型和模式的处理器,作为数组返回,浅复制所有数组项.
       * @param {string} type 事件类型.
       * @param {boolean} capture 是否捕获模式的处理器.
       * @return {!Array.<Listener>} 处理器数组.
       */
      getListeners: function(type, capture) {
        var listenerArray = this.listeners[type];
        var rv = [];
        if (listenerArray) {
          for (var i = 0; i < listenerArray.length; ++i) {
            var listenerObj = listenerArray[i];
            if (listenerObj.capture === capture) {
              rv.push(listenerObj);
            }
          }
        }
        return rv;
      },
      /**
       * 获取符合条件的处理器或者null
       * @param {string} type 事件类型.
       * @param {!Function} listener The listener function to get.
       * @param {boolean} capture 是否开启捕获模式.
       * @param {Object=} opt_context 函数执行上下文.
       * @return {Listener} 返回处理器.
       */
      getListener: function(type, listener, capture, opt_context) {
        var listenerArray = this.listeners[type];
        var i = -1;
        if (listenerArray) {
          i = ListenerMap.findListenerIndex_(listenerArray, listener, capture, opt_context);
        }
        return i > -1 ? listenerArray[i] : null;
      },
      /**
       * 获取处理器,条件可空. 空条件情况下都会匹配.
       * @param {string=} opt_type 事件类型.
       * @param {boolean=} opt_capture 是否开启捕获模式.
       * @return {boolean} 是否存有可用的符合条件的处理器.
       */
      hasListener: function(opt_type, opt_capture) {
        var hasType = !util.isNull(opt_type);
        var hasCapture = !util.isNull(opt_capture);

        return object.some(
          this.listeners, function(listenerArray, type) {
            for (var i = 0; i < listenerArray.length; ++i) {
              if ((!hasType || listenerArray[i].type === opt_type) &&
                (!hasCapture || listenerArray[i].capture === opt_capture)) {
                return true;
              }
            }

            return false;
          });
      },
      /**
       * 移除指定的处理器.
       * @param {Listener} listener 要移除的处理器.
       * @return {boolean} 返回是否成功移除.
       */
      removeByKey: function(listener) {
        var type = listener.type;
        if (!(type in this.listeners)) {
          return false;
        }

        var removed = array.remove(this.listeners[type], listener);
        if (removed) {
          listener.markAsRemoved();
          if (this.listeners[type].length === 0) {
            delete this.listeners[type];
            this.typeCount_--;
          }
        }
        return removed;
      },
      /**
       * 从map中移除所有函数. 若提供了事件类型只移除该类型的.
       * @param {string=} opt_type 事件类型.
       * @return {number} 返回移除的处理器数目.
       */
      removeAll: function(opt_type) {
        var count = 0;
        for (var type in this.listeners) {
          if (!opt_type || type === opt_type) {
            var listenerArray = this.listeners[type];
            for (var i = 0; i < listenerArray.length; i++) {
              ++count;
              listenerArray[i].removed = true;
            }
            delete this.listeners[type];
            this.typeCount_--;
          }
        }
        return count;
      }
    });

    /**
     * 在数组中找到指定的处理器函数.
     * @param {!Array.<!Listener>} listenerArray Array of listener.
     * @param {!Function} listener 处理器函数.
     * @param {boolean=} opt_useCapture 是否捕获模式.
     * @param {Object=} opt_context 函数上下文.
     * @return {number} 返回所在处索引.
     * @private
     */
    ListenerMap.findListenerIndex_ = function(
      listenerArray, listener, opt_useCapture, opt_context) {
      for (var i = 0; i < listenerArray.length; ++i) {
        var listenerObj = listenerArray[i];
        if (!listenerObj.removed &&
          listenerObj.listener === listener &&
          listenerObj.capture === opt_useCapture &&
          listenerObj.context === opt_context) {
          return i;
        }
      }
      return -1;
    };

    return ListenerMap;
  }
);
