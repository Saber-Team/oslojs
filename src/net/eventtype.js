/**
 * @fileoverview network类通用的一些事件.
 * @author Leo.Zhang
 * @email zmike86@gmail.com
 */

/**
 * network事件. 里面也包含一些语义化的自定义事件, 作为整个事件系统的通用机制.
 * @enum {string}
 */
define({
  COMPLETE: 'complete',
  SUCCESS: 'success',
  ERROR: 'error',
  ABORT: 'abort',
  READY: 'ready', // 这个表示前一个动作已完成可投入使用
  READY_STATE_CHANGE: 'readystatechange',
  TIMEOUT: 'timeout', //xhr2支持
  INCREMENTAL_DATA: 'incrementaldata', // 这个应该是在web－stream技术中得到的事件
  PROGRESS: 'progress' // 详见https://developer.mozilla.org/en-US/docs/Web/API/ProgressEvent
});