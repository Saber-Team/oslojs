/**
 * @fileoverview 处理xhr的包装类.
 * 一次性的ajax请求可以调用XhrIo.send(), 也可以生成一个XhrIo的实例, 发送多次请求.
 * 每个实例有其自己的XmlHttpRequest对象并在请求完成后解绑事件保证没有内存泄露.
 *
 * XhrIo对象完全基于事件, 会在请求完成、失败、成功、状态发生变化时分发事件. 首先会触发
 * ready-state或者timeout事件, 然后是completed. 还有abort, error, success事件会在
 * 特定的条件触发. 最后是ready事件, 表示xhrio对象已经可以准备发送另外一个请求.
 *
 * XmlHttpRequest.open() 和 send()方法可能抛出异常这时候error事件会在complete和
 * ready-state-change之前先触发.
 *
 * 这个类并不支持多次请求, 队列请求, 优先级队列请求.
 * Tested = IE6, FF1.5, Safari, Opera 8.5
 *
 * TODO: Error cases aren't playing nicely in Safari.
 * 本模块要在严格测试后去掉所有log和对log模块的引用
 */

define([
    '../util/util',
    '../timer/timer',
    '../array/array',
    '../events/target',
    '../json/json',
    '../log/log',
    './errorcode',
    './eventtype',
    './httpstatus',
    './xmlhttp',
    '../object/object',
    '../string/util',
    '../ds/util',
    '../ds/map',
    '../uri/util',
    '../ua/util',
    '../debug/entrypointregistry'
  ],
  function(util,
           Timer,
           array,
           EventTarget,
           JSON,
           log,
           ErrorCode,
           EventType,
           HttpStatus,
           xmlHttp,
           object,
           string,
           ds,
           Map,
           uri,
           ua,
           entryPointRegistry) {

    'use strict';

    /**
     * XhrIo.send每次都会生成新的XhrIo对象. 没析构的对象会保存在这个数组里.
     * @see XhrIo.cleanup
     * @private {!Array.<!XhrIo>}
     */
    var sendInstances_ = [];

    /**
     * HTTP Content-Type头名称
     * @type {string}
     */
    var CONTENT_TYPE_HEADER = 'Content-Type',
      /**
       * 正则匹配 'http' and 'https'
       * @type {!RegExp}
       */
      HTTP_SCHEME_PATTERN = /^https?$/i,
      /**
       * 表单数据提交的时候用到的方法. 据此设置header.
       */
      METHODS_WITH_FORM_DATA = ['POST', 'PUT'],
      /**
       * url编码的表单的Content-Type HTTP header.
       * @type {string}
       */
      FORM_CONTENT_TYPE = 'application/x-www-form-urlencoded;charset=utf-8',
      /**
       * xhr2支持timeout作为超时属性.
       * @see http://www.w3.org/TR/XMLHttpRequest/#the-timeout-attribute
       * @private {string}
       * @const
       */
      XHR2_TIMEOUT_ = 'timeout',
      /**
       * 设置xhr2对象的ontimeout事件处理器.
       * @see http://www.w3.org/TR/XMLHttpRequest/#the-timeout-attribute
       * @private {string}
       * @const
       */
      XHR2_ON_TIMEOUT_ = 'ontimeout';


    /**
     * XMLHttpRequests处理类.
     * @param {XmlHttpFactory=} opt_xmlHttpFactory 创建XMLHttpRequest的工厂.
     * @constructor
     * @extends {EventTarget}
     */
    var XhrIo = function(opt_xmlHttpFactory) {

      EventTarget.call(this);

      /**
       * 默认的每个请求的头部参数, use:
       * XhrIo.headers.set(name, value)
       * @type {!Map}
       */
      this.headers = new Map();

      /**
       * xhr工厂, 可选参数
       * @private {XmlHttpFactory}
       */
      this.xmlHttpFactory_ = opt_xmlHttpFactory || null;

      /**
       * XMLHttpRequest是否处于活动状态.
       * 从send()开始直到onReadyStateChange()完成, 或者触发error()和abort().
       * 这个值会被一直设置成true.
       * @private {boolean}
       */
      this.active_ = false;

      /**
       * 私有的XMLHttpRequest对象. GearsHttpRequest是Google开发的
       * 一个浏览器插件对象. 在前端框架中不常用.
       * @private {XMLHttpRequest|GearsHttpRequest}
       */
      this.xhr_ = null;

      /**
       * 当前XMLHttpRequest对象的一些可选参数.
       * @private {Object}
       */
      this.xhrOptions_ = null;

      /**
       * 上次请求地址.
       * @private {string|Uri}
       */
      this.lastUri_ = '';

      /**
       * 上次请求方法.
       * @private {string}
       */
      this.lastMethod_ = '';

      /**
       * 若上次请求发生错误保存其error code.
       * @private {!ErrorCode}
       */
      this.lastErrorCode_ = ErrorCode.NO_ERROR;

      /**
       * 上次的错误消息.
       * @private {Error|string}
       */
      this.lastError_ = '';

      /**
       * 一个布尔值开关, 用来确保不会多次触发error事件. This can
       * happen in IE when it does a synchronous load and one error is handled in
       * the ready state change and one is handled due to send() throwing an
       * exception.
       * @private {boolean}
       */
      this.errorDispatched_ = false;

      /**
       * 用于确保我们不会在调用send方法时触发complete事件.
       * @private {boolean}
       */
      this.inSend_ = false;

      /**
       * 标识调用onReadyStateChange_方法时是否来自调用this.xhr_.open.
       * @private {boolean}
       */
      this.inOpen_ = false;

      /**
       * 标识调用onReadyStateChange_方法时是否来自调用this.xhr_.abort.
       * @private {boolean}
       */
      this.inAbort_ = false;

      /**
       * 超时的毫秒数.
       * 到达这个时限会触发timeout事件; 0是不设置超时.
       * @private {number}
       */
      this.timeoutInterval_ = 0;

      /**
       * 记录请求超时的timer id.
       * @private {?number}
       */
      this.timeoutId_ = null;

      /**
       * 响应返回类型. 空字符串表示用默认xhr行为.
       * @private {XhrIo.ResponseType}
       */
      this.responseType_ = XhrIo.ResponseType.DEFAULT;

      /**
       * 在一些现代浏览器中原生支持了跨域ajax请求, 发送这种请求时可以使用withCredential
       * 属性. 详见: http://www.w3.org/TR/XMLHttpRequest/#the-withcredentials-
       * attribute. Whether a "credentialed" request is to be sent (one that
       * is aware of cookies and authentication).
       * @private {boolean}
       */
      this.withCredentials_ = false;

      /**
       * 是否可以配置xhr对象的timeout属性. 这个只在xhr 2.0中会有
       * @private {boolean}
       */
      this.useXhr2Timeout_ = false;
    };

    // 原型继承
    util.inherits(XhrIo, EventTarget);

    /**
     * XMLHttpRequests的返回值类型.
     * @enum {string}
     * @see http://www.w3.org/TR/XMLHttpRequest/#the-responsetype-attribute
     */
    XhrIo.ResponseType = {
      DEFAULT: '',
      TEXT: 'text',
      DOCUMENT: 'document',
      // Not supported as of Chrome 10.0.612.1 dev
      BLOB: 'blob',
      ARRAY_BUFFER: 'arraybuffer'
    };

    /**
     * XhrIo实例的logger
     * @private {debug.Logger}
     * @const
     */
    XhrIo.prototype.logger_ = log.getLogger('Oslo.net.XhrIo');

    /**
     * 这个静态方法创建一个短生命周期的XhrIo对象发送请求.
     * @see XhrIo.cleanup
     * @param {string|Uri} url 请求地址.
     * @param {Function=} opt_callback 完成时的回调函数.
     * @param {string=} opt_method 请求方法, 默认 GET.
     * @param {ArrayBuffer|Blob|Document|FormData|GearsBlob|string=} opt_content
     *     发送的数据体.
     * @param {Object|Map=} opt_headers 需要加到请求头参数的对象.
     * @param {number=} opt_timeoutInterval 超时毫秒数.过时将会aborted; 0表示不设置超时.
     * @param {boolean=} opt_withCredentials 是否请求需要发送认证. 默认false.
     *     见setWithCredentials方法.
     */
    XhrIo.send = function(url, opt_callback, opt_method, opt_content,
                          opt_headers, opt_timeoutInterval, opt_withCredentials) {
      var x = new XhrIo();
      // 保存对象
      sendInstances_.push(x);
      if (opt_callback) {
        x.listen(EventType.COMPLETE, opt_callback);
      }
      // 解绑析构
      x.listenOnce(EventType.READY, x.cleanupSend_);
      // 设置参数
      if (opt_timeoutInterval) {
        x.setTimeoutInterval(opt_timeoutInterval);
      }
      if (opt_withCredentials) {
        x.setWithCredentials(opt_withCredentials);
      }
      x.send(url, opt_method, opt_content, opt_headers);
    };

    /**
     * 释放所有没被释放的XhrIo实例. 这些实例都是XhrIo.send创建的.
     * XhrIo.send会在请求完成complete或者失败fail时析构使用的XhrIo实例.
     * 但如果请求没有结束, XhrIo实例就不会被析构.
     * 没有结束可能是因为window卸载但请求还未完成.
     * 我们在XhrIo.send方法返回创建的XhrIo对象, 并让客户端程序管理对象的析构. 但是这样做的话
     * 会让事情变得复杂, 我们只想让客户端程序简单的使用XhrIo.send接口, 然后客户端程序在window
     * 卸载时调用XhrIo.cleanup即可析构.
     */
    XhrIo.cleanup = function() {
      var instances = sendInstances_;
      while (instances.length) {
        instances.pop().dispose();
      }
    };

    /**
     * Installs exception protection for all entry point introduced by
     * XhrIo instances which are not protected by
     * {@link debug.ErrorHandler#protectWindowSetTimeout},
     * {@link debug.ErrorHandler#protectWindowSetInterval}, or
     * {@link events.protectBrowserEventEntryPoint}.
     *
     * @param {ErrorHandler} errorHandler 异常处理器保护entry point(s).
     */
    XhrIo.protectEntryPoints = function(errorHandler) {
      XhrIo.prototype.onReadyStateChangeEntryPoint_ =
        errorHandler.protectEntryPoint(XhrIo.prototype.onReadyStateChangeEntryPoint_);
    };

    /**
     * 释放特定的XhrIo, 通常就是this所指.
     * @private
     */
    XhrIo.prototype.cleanupSend_ = function() {
      this.dispose();
      array.remove(sendInstances_, this);
    };

    /**
     * 获取超时时限.
     * @return {number} Timeout interval in milliseconds.
     */
    XhrIo.prototype.getTimeoutInterval = function() {
      return this.timeoutInterval_;
    };

    /**
     * 设置超时时限.
     * @param {number} ms Timeout interval in milliseconds; 0 means none.
     */
    XhrIo.prototype.setTimeoutInterval = function(ms) {
      this.timeoutInterval_ = Math.max(0, ms);
    };

    /**
     * 设置响应类型. 目前只在较新版本的WebKit (10.0.612.1 dev and later)支持.
     * @param {XhrIo.ResponseType} type 返回类型.
     */
    XhrIo.prototype.setResponseType = function(type) {
      this.responseType_ = type;
    };

    /**
     * 返回响应类型.
     * @return {XhrIo.ResponseType} The desired type for the response.
     */
    XhrIo.prototype.getResponseType = function() {
      return this.responseType_;
    };

    /**
     * 设置是否需要通过凭据跨域访问服务.
     * Sets whether a "credentialed" request that is aware of cookie and
     * authentication information should be made.
     * @param {boolean} withCredentials 是否发送"credentialed"请求.
     */
    XhrIo.prototype.setWithCredentials = function(withCredentials) {
      this.withCredentials_ = withCredentials;
    };

    /**
     * 是否当前请求带有凭据信息.
     * @return {boolean} 返回凭据信息.
     */
    XhrIo.prototype.getWithCredentials = function() {
      return this.withCredentials_;
    };

    /**
     * 发送请求.
     * @param {string|Uri} url 请求地址.
     * @param {string=} opt_method 请求方法, 默认 GET.
     * @param {ArrayBuffer|Blob|Document|FormData|GearsBlob|string=} opt_content
     *     发送数据体Body data.
     * @param {Object|Map=} opt_headers 设置的请求头参数.
     */
    XhrIo.prototype.send = function(url, opt_method, opt_content, opt_headers) {
      if (this.xhr_) {
        throw Error('[Oslo.net.XhrIo] Object is active with another request=' +
          this.lastUri_ + '; newUri=' + url);
      }

      // 默认GET方法
      var method = opt_method ? opt_method.toUpperCase() : 'GET';

      this.lastUri_ = url;
      this.lastError_ = '';
      this.lastErrorCode_ = ErrorCode.NO_ERROR;
      this.lastMethod_ = method;
      this.errorDispatched_ = false;
      // 初始化active_为true
      this.active_ = true;

      // Use the factory to create the XHR object and options
      this.xhr_ = this.createXhr();
      this.xhrOptions_ = this.xmlHttpFactory_ ?
        this.xmlHttpFactory_.getOptions() : xmlHttp.getOptions();

      // 监听onreadystatechange
      this.xhr_.onreadystatechange = util.bind(this.onReadyStateChange_, this);

      /**
       * 异步设置调用open方法, 访问受限时会抛出异常.
       * @preserveTry
       */
      try {
        log.fine(this.logger_, this.formatMsg_('Opening Xhr'));

        this.inOpen_ = true;
        this.xhr_.open(method, url, true);  // Always async!
        this.inOpen_ = false;
      } catch (err) {
        log.fine(this.logger_,
          this.formatMsg_('Error opening Xhr: ' + err.message));

        this.error_(ErrorCode.EXCEPTION, err);
        return;
      }

      // 不能直接对发送内容设置成null, 因为这样就不能使带有表单数据的请求含有content length字段,
      // 从而导致某些代理返回411错误. 详见:
      // https://tools.ietf.org/html/rfc2616#section-10.4.12
      var content = opt_content || '';

      var headers = this.headers.clone();

      // 加上用户定义的头部
      if (opt_headers) {
        ds.forEach(opt_headers, function(value, key) {
          headers.set(key, value);
        });
      }

      // 是否设置了content type头, 忽略大小写. HTTP header names 对大小写不敏感.
      // 详见: http://www.w3.org/Protocols/rfc2616/rfc2616-sec4.html#sec4.2
      var contentTypeKey = array.find(headers.getKeys(), XhrIo.isContentTypeHeader_);

      // 是否发送FormData类型的数据
      var contentIsFormData = (util.global.FormData &&
        (content instanceof util.global.FormData));

      // 是 GET 或 POST 请求且 Content-Type 没有被设置且不是FormData数据
      if (array.contains(METHODS_WITH_FORM_DATA, method) &&
        !contentTypeKey && !contentIsFormData) {
        // 如果请求用的表单数据, 默认是url-encoded form content type.
        // 除非是FormData request. 对于FormData请求,
        // 浏览器自动加上multipart/form-data的content type,
        // with an appropriate multipart boundary.
        headers.set(CONTENT_TYPE_HEADER, FORM_CONTENT_TYPE);
      }

      // 增加请求头
      ds.forEach(headers, function(value, key) {
        this.xhr_.setRequestHeader(key, value);
      }, this);

      if (this.responseType_) {
        this.xhr_.responseType = this.responseType_;
      }

      if (object.containsKey(this.xhr_, 'withCredentials')) {
        this.xhr_.withCredentials = this.withCredentials_;
      }

      /**
       * 发送请求, 否则报错(404 not found).
       * @preserveTry
       */
      try {
        this.cleanUpTimeoutTimer_(); // Paranoid, should never be running.
        if (this.timeoutInterval_ > 0) {
          this.useXhr2Timeout_ = XhrIo.shouldUseXhr2Timeout_(this.xhr_);
          log.fine(this.logger_, this.formatMsg_('Will abort after ' +
            this.timeoutInterval_ + 'ms if incomplete, xhr2 ' +
            this.useXhr2Timeout_));
          // 可用timeout属性
          if (this.useXhr2Timeout_) {
            this.xhr_[XHR2_TIMEOUT_] = this.timeoutInterval_;
            this.xhr_[XHR2_ON_TIMEOUT_] = util.bind(this.timeout_, this);
            // 规定时间执行this.timeout_
          } else {
            this.timeoutId_ = Timer.callOnce(this.timeout_,
              this.timeoutInterval_, this);
          }
        }
        log.fine(this.logger_, this.formatMsg_('Sending request'));
        this.inSend_ = true;
        this.xhr_.send(content);
        this.inSend_ = false;

      } catch (err) {
        log.fine(this.logger_, this.formatMsg_('Send error: ' + err.message));
        this.error_(ErrorCode.EXCEPTION, err);
      }
    };

    /**
     * timeout属性对于早先版本的xhr不适用, 这个方法用于检测xhr是否支持2级原生的
     * timeout属性和ontimeout回调函数. todo 检测chrome和safari
     * 搞来搞去只有IE9以上支持啊....代码虽然这么写但是chrome已经足够支持了……
     *
     * Currently, FF 21.0 OS X has the fields but won't actually call the timeout
     * handler.  Perhaps the confusion in the bug referenced below hasn't
     * entirely been resolved.
     *
     * @see http://www.w3.org/TR/XMLHttpRequest/#the-timeout-attribute
     * @see https://bugzilla.mozilla.org/show_bug.cgi?id=525816
     *
     * @param {!XMLHttpRequest|!GearsHttpRequest} xhr The request.
     * @return {boolean} True if the request supports level 2 timeout.
     * @private
     */
    XhrIo.shouldUseXhr2Timeout_ = function(xhr) {
      return ua.isIE && ua.isVersionOrHigher(9) &&
        util.isNumber(xhr[XHR2_TIMEOUT_]) &&
        util.isDef(xhr[XHR2_ON_TIMEOUT_]);
    };

    /**
     * 判断是否设置了content-type头部
     * @param {string} header An HTTP header key.
     * @return {boolean} 忽略大小写判断是否content type header.
     * @private
     */
    XhrIo.isContentTypeHeader_ = function(header) {
      return string.caseInsensitiveEquals(CONTENT_TYPE_HEADER, header);
    };

    /**
     * 创建新的xhr对象.
     * @return {XMLHttpRequest|GearsHttpRequest} 返回新创建的XHR对象.
     * @protected
     */
    XhrIo.prototype.createXhr = function() {
      return this.xmlHttpFactory_ ?
        this.xmlHttpFactory_.createInstance() : xmlHttp();
    };

    /**
     * 指定时间XhrIo#timeoutInterval_后请求还未完成则中断请求并触发timeout事件.
     * @private
     */
    XhrIo.prototype.timeout_ = function() {
      if (typeof define === 'undefined') {
        // define对象为undefined则有可能是回调发生在页面卸载时并引发异常.
        // 静默失败.
      } else if (this.xhr_) {
        this.lastError_ = 'Timed out after ' + this.timeoutInterval_ +
          'ms, aborting';
        this.lastErrorCode_ = ErrorCode.TIMEOUT;
        log.fine(this.logger_, this.formatMsg_(this.lastError_));
        this.dispatchEvent(EventType.TIMEOUT);
        this.abort(ErrorCode.TIMEOUT);
      }
    };

    /**
     * error事件触发时默认的回调函数
     * Something errorred, so inactivate, fire error callback and clean up
     * @param {ErrorCode} errorCode 错误码.
     * @param {Error} err 异常对象.
     * @private
     */
    XhrIo.prototype.error_ = function(errorCode, err) {
      this.active_ = false;
      if (this.xhr_) {
        this.inAbort_ = true;
        this.xhr_.abort();  // Ensures XHR isn't hung (FF)
        this.inAbort_ = false;
      }
      this.lastError_ = err;
      this.lastErrorCode_ = errorCode;
      this.dispatchErrors_();
      this.cleanUpXhr_();
    };

    /**
     * 如果发生错误, 这个方法一次触发complete和error事件.
     * this.errorDispatched_属性作为开关保证我们不会多次报错.
     * @private
     */
    XhrIo.prototype.dispatchErrors_ = function() {
      if (!this.errorDispatched_) {
        this.errorDispatched_ = true;
        this.dispatchEvent(EventType.COMPLETE);
        this.dispatchEvent(EventType.ERROR);
      }
    };

    /**
     * 中断当前XMLHttpRequest
     * @param {ErrorCode=} opt_failureCode Optional error code to use -
     *     defaults to ABORT.
     */
    XhrIo.prototype.abort = function(opt_failureCode) {
      if (this.xhr_ && this.active_) {
        log.fine(this.logger_, this.formatMsg_('Aborting'));
        this.active_ = false;
        this.inAbort_ = true;
        this.xhr_.abort();
        this.inAbort_ = false;
        this.lastErrorCode_ = opt_failureCode || ErrorCode.ABORT;
        this.dispatchEvent(EventType.COMPLETE);
        this.dispatchEvent(EventType.ABORT);
        this.cleanUpXhr_();
      }
    };

    /**
     * Nullifies all callbacks.
     * @override
     * @protected
     */
    XhrIo.prototype.disposeInternal = function() {
      if (this.xhr_) {
        // We explicitly do not call xhr_.abort() unless active_ is still true.
        // This is to avoid unnecessarily aborting a successful request when
        // dispose() is called in a callback triggered by a complete response, but
        // in which browser cleanup has not yet finished.
        // (See http://b/issue?id=1684217.)
        if (this.active_) {
          this.active_ = false;
          this.inAbort_ = true;
          this.xhr_.abort();
          this.inAbort_ = false;
        }
        this.cleanUpXhr_(true);
      }

      XhrIo.superClass_.disposeInternal.call(this);
    };

    /**
     * 内部的函数会在xhr每次的readystatechange时触发. 现在浏览器支持如下常量
     * xhr.UNSENT === 0
     * xhr.OPENED === 1
     * xhr.HEADERS_RECEIVED === 2
     * xhr.LOADING === 3
     * xhr.DONE === 4
     * This method checks the status and the readystate and fires the correct callbacks.
     * If the request has ended, the handlers are cleaned up and the XHR object is
     * nullified.
     * @private
     */
    XhrIo.prototype.onReadyStateChange_ = function() {
      if (this.isDisposed()) {
        // This method is the target of an untracked Timer.callOnce().
        return;
      }
      if (!this.inOpen_ && !this.inSend_ && !this.inAbort_) {
        // 不是在this.xhr_.send, this.xhr_.abort, this.xhr_.open时触发的,
        // 则是一个保护的entry point.
        this.onReadyStateChangeEntryPoint_();
      } else {
        this.onReadyStateChangeHelper_();
      }
    };

    /**
     * 多了这个方法是为了保护onreadystatechange处理器作为entry point. 因为
     * onReadyStateChange_可能会在send或abort时触发调用, 所以很有必要. 这个
     * 方法只在onReadyStateChange_是一个entry point时才会调用.
     * {@see XhrIo.protectEntryPoints}
     * @private
     */
    XhrIo.prototype.onReadyStateChangeEntryPoint_ = function() {
      this.onReadyStateChangeHelper_();
    };

    /**
     * Helper for {@link #onReadyStateChange_}.
     * 之所以把这个函数单提出来是因为可以让调用onReadyStateChange_的entry point
     * 得以被分离出来,当然还通过本函数的调用者onReadyStateChangeEntryPoint_.
     * @private
     */
    XhrIo.prototype.onReadyStateChangeHelper_ = function() {
      if (!this.active_) {
        // can get called inside abort call
        return;
      }

      if (typeof define === 'undefined') {
        // NOTE: 如果全局没有Oslo对象则说明回调发生在页面卸载时.
        // 静默失败.

      } else if (
        this.xhrOptions_[xmlHttp.OptionType.LOCAL_REQUEST_ERROR] &&
        this.getReadyState() === xmlHttp.ReadyState.COMPLETE &&
        this.getStatus() === 2) {
        // net.defaultXmlHttpFactory的getOptions方法会把IE下
        // this.xhrOptions_[xmlHttp.OptionType.LOCAL_REQUEST_ERROR]设为true,
        // 所以当前条件只会在IE下出现.
        // NOTE: 在IE下如果send()方法在*local* request时发生错误readystate会
        // 变成COMPLETE. 我们要忽略它，用try-catch包括send()捕获异常. 见send();
        log.fine(this.logger_, this.formatMsg_(
          'Local request error detected and ignored'));

      } else {
        // 在IE如果response被缓存了, 我们有时会立即得到readystatechange(from inside
        // the send call), 这种情况其实不是异步回调了, 给了我们假象, 这时候需要通过
        // setTimeout(fn, 0)改成异步回调.
        if (this.inSend_ &&
          this.getReadyState() === xmlHttp.ReadyState.COMPLETE) {
          Timer.callOnce(this.onReadyStateChange_, 0, this);
          return;
        }

        this.dispatchEvent(EventType.READY_STATE_CHANGE);

        // readyState indicates the transfer has finished
        if (this.isComplete()) {
          log.fine(this.logger_, this.formatMsg_('Request complete'));

          this.active_ = false;

          try {
            // Call the specific callbacks for success or failure. Only call the
            // success if the status is 200 (HTTP_OK) or 304 (HTTP_CACHED)
            if (this.isSuccess()) {
              this.dispatchEvent(EventType.COMPLETE);
              this.dispatchEvent(EventType.SUCCESS);
            } else {
              this.lastErrorCode_ = ErrorCode.HTTP_ERROR;
              this.lastError_ =
                this.getStatusText() + ' [' + this.getStatus() + ']';
              this.dispatchErrors_();
            }
          } finally {
            this.cleanUpXhr_();
          }
        }
      }
    };

    /**
     * 移除所有事件监听器避免泄露, 将xhr置为空.
     * @param {boolean=} opt_fromDispose If this is from the dispose (don't want to
     *     fire any events).
     * @private
     */
    XhrIo.prototype.cleanUpXhr_ = function(opt_fromDispose) {
      if (this.xhr_) {
        // 尝试取消pending timeout回调函数.
        this.cleanUpTimeoutTimer_();

        // 用局部变量保存引用可以在READY事件后标记其为关闭状态.
        // READY事件可能会发出新的请求, 因此我们需要设置this.xhr_为空.
        // Save reference so we can mark it as closed after the READY event.  The
        // READY event may trigger another request, thus we must nullify this.xhr_
        var xhr = this.xhr_;
        var clearedOnReadyStateChange =
          this.xhrOptions_[xmlHttp.OptionType.USE_NULL_FUNCTION] ?
            util.nullFunction : null;
        this.xhr_ = null;
        this.xhrOptions_ = null;

        if (!opt_fromDispose) {
          this.dispatchEvent(EventType.READY);
        }

        try {
          // NOTE(user): Not nullifying in FireFox can still leak if the callbacks
          // are defined in the same scope as the instance of XhrIo. But, IE doesn't
          // allow you to set the onreadystatechange to NULL so nullFunction is
          // used.
          xhr.onreadystatechange = clearedOnReadyStateChange;
        } catch (e) {
          // This seems to occur with a Gears HTTP request. Delayed the setting of
          // this onreadystatechange until after READY is sent out and catching the
          // error to see if we can track down the problem.
          log.error(this.logger_,
              'Problem encountered resetting onreadystatechange: ' + e.message);
        }
      }
    };

    /**
     * 确保清除timeout的回调函数. 并且确保检测timeout的timer停止.
     * @private
     */
    XhrIo.prototype.cleanUpTimeoutTimer_ = function() {
      if (this.xhr_ && this.useXhr2Timeout_) {
        this.xhr_[XHR2_ON_TIMEOUT_] = null;
      }
      if (util.isNumber(this.timeoutId_)) {
        Timer.clear(this.timeoutId_);
        this.timeoutId_ = null;
      }
    };

    /**
     * 返回是否当前XhrIo实例处于激活状态.
     * @return {boolean} Whether there is an active request.
     */
    XhrIo.prototype.isActive = function() {
      return !!this.xhr_;
    };

    /**
     * 返回是否请求处于complete状态
     * @return {boolean} Whether the request has completed.
     */
    XhrIo.prototype.isComplete = function() {
      return this.getReadyState() === xmlHttp.ReadyState.COMPLETE;
    };

    /**
     * 请求是否成功返回.
     * @return {boolean}
     */
    XhrIo.prototype.isSuccess = function() {
      var status = this.getStatus();
      // status如果是0则认为成功请求了本地文件.
      return HttpStatus.isSuccess(status) ||
        status === 0 && !this.isLastUriEffectiveSchemeHttp_();
    };

    /**
     * 上一次的真实请求是否发生在http或https协议上.
     * @return {boolean} 返回布尔值.
     * @private
     */
    XhrIo.prototype.isLastUriEffectiveSchemeHttp_ = function() {
      var scheme = uri.getEffectiveScheme(String(this.lastUri_));
      return HTTP_SCHEME_PATTERN.test(scheme);
    };

    /**
     * 获取Xhr对象的readystate.
     * Will only return correct result when called from the context of a callback
     * @return {xmlHttp.ReadyState} xmlHttp.ReadyState.*.
     */
    XhrIo.prototype.getReadyState = function() {
      return this.xhr_ ?
      /** @type {xmlHttp.ReadyState} */ (this.xhr_.readyState) :
        xmlHttp.ReadyState.UNINITIALIZED;
    };

    /**
     * 获取Xhr对象的状态值.
     * Will only return correct result when called from the context of a callback
     * @return {number} Http status.
     */
    XhrIo.prototype.getStatus = function() {
      /**
       * IE在readystate大于2(LOADED)之前不允许访问xhr对象的status.
       * 用try/catch可以捕捉页面卸载过程中访问xhr_对象抛出的ERROR_NOT_AVAILABLE异常.
       * @preserveTry
       */
      try {
        return this.getReadyState() > xmlHttp.ReadyState.LOADED ?
          this.xhr_.status : -1;
      } catch (e) {
        log.warning(this.logger_, 'Can not get status: ' + e.message);
        return -1;
      }
    };

    /**
     * 返回xhr对象的statusText.
     * Will only return correct result when called from the context of a callback
     * @return {string} Status text.
     */
    XhrIo.prototype.getStatusText = function() {
      /**
       * IE在readystate大于2(LOADED)之前不允许访问xhr对象的status.
       * 用try/catch可以捕捉页面卸载过程中访问xhr_对象抛出的ERROR_NOT_AVAILABLE异常.
       * @preserveTry
       */
      try {
        return this.getReadyState() > xmlHttp.ReadyState.LOADED ?
          this.xhr_.statusText : '';
      } catch (e) {
        log.fine(this.logger_, 'Can not get status: ' + e.message);
        return '';
      }
    };

    /**
     * 取得最后一次请求地址.
     * @return {string} Last Uri.
     */
    XhrIo.prototype.getLastUri = function() {
      return String(this.lastUri_);
    };

    /**
     * Get the responseText from the Xhr object
     * Will only return correct result when called from the context of a callback.
     * @return {string} Result from the server, or '' if no result available.
     */
    XhrIo.prototype.getResponseText = function() {
      /** @preserveTry */
      try {
        return this.xhr_ ? this.xhr_.responseText : '';
      } catch (e) {
        // http://www.w3.org/TR/XMLHttpRequest/#the-responsetext-attribute
        // states that responseText should return '' (and responseXML null)
        // when the state is not LOADING or DONE. Instead, IE and Gears can
        // throw unexpected exceptions, for example when a request is aborted
        // or no data is available yet.
        log.fine(this.logger_, 'Can not get responseText: ' + e.message);
        return '';
      }
    };

    /**
     * 获取响应体(response body)数据. This property is only available
     * in IE since version 7 according to MSDN:
     * http://msdn.microsoft.com/en-us/library/ie/ms534368(v=vs.85).aspx
     * Will only return correct result when called from the context of a callback.
     *
     * One option is to construct a VBArray from the returned object and convert
     * it to a JavaScript array using the toArray method:
     * {@code (new window['VBArray'](xhrIo.getResponseBody())).toArray()}
     * This will result in an array of numbers in the range of [0..255]
     *
     * Another option is to use the VBScript CStr method to convert it into a
     * string as outlined in http://stackoverflow.com/questions/1919972
     *
     * @return {Object} 返回服务端返回的二进制数据, 如果不可用返回null.
     */
    XhrIo.prototype.getResponseBody = function() {
      /** @preserveTry */
      try {
        if (this.xhr_ && 'responseBody' in this.xhr_) {
          return this.xhr_['responseBody'];
        }
      } catch (e) {
        // IE can throw unexpected exceptions, for example when a request is aborted
        // or no data is yet available.
        log.fine(this.logger_, 'Can not get responseBody: ' + e.message);
      }
      return null;
    };

    /**
     * Get the responseXML from the Xhr object
     * Will only return correct result when called from the context of a callback.
     * @return {Document} The DOM Document representing the XML file, or null
     * if no result available.
     */
    XhrIo.prototype.getResponseXml = function() {
      /** @preserveTry */
      try {
        return this.xhr_ ? this.xhr_.responseXML : null;
      } catch (e) {
        log.fine(this.logger_, 'Can not get responseXML: ' + e.message);
        return null;
      }
    };

    /**
     * 获取响应文本且作为json反序列化.
     * Will only return correct result when called from the context of a callback
     * @param {string=} opt_xssiPrefix 可选的XSSI前缀字符串 to use for
     *     stripping of the response before parsing. 当服务端返回json时加了这个前缀时
     *     才有必要在此设置. 关于XSSI的说明见:
     *     http://stackoverflow.com/questions/8028511/what-is-cross-site-script-inclusion-xssi
     * @return {Object|undefined} JavaScript object.
     */
    XhrIo.prototype.getResponseJson = function(opt_xssiPrefix) {
      if (!this.xhr_) {
        return undefined;
      }

      var responseText = this.xhr_.responseText;
      if (opt_xssiPrefix && responseText.indexOf(opt_xssiPrefix) === 0) {
        responseText = responseText.substring(opt_xssiPrefix.length);
      }

      return JSON.parse(responseText);
    };

    /**
     * setResponseType后直接从响应中得到该类型的数据. 目前, 在较新的chrome中直接支持
     * WebKit(10.0.612.1 dev and later). 如果xhr不直接支持response, 尝试模拟它.
     *
     * Emulating the response means following the rules laid out at
     * http://www.w3.org/TR/XMLHttpRequest/#the-response-attribute
     *
     * On browsers with no support for this (Chrome < 10, Firefox < 4, etc), only
     * response types of DEFAULT or TEXT may be used, and the response returned will
     * be the text response.
     *
     * On browsers with Mozilla's draft support for array buffers (Firefox 4, 5),
     * only response types of DEFAULT, TEXT, and ARRAY_BUFFER may be used, and the
     * response returned will be either the text response or the Mozilla
     * implementation of the array buffer response.
     *
     * On browsers will full support, any valid response type supported by the
     * browser may be used, and the response provided by the browser will be
     * returned.
     *
     * @return {*} The response.
     */
    XhrIo.prototype.getResponse = function() {
      /** @preserveTry */
      try {
        if (!this.xhr_) {
          return null;
        }
        if ('response' in this.xhr_) {
          return this.xhr_.response;
        }
        switch (this.responseType_) {
          case XhrIo.ResponseType.DEFAULT:
          case XhrIo.ResponseType.TEXT:
            return this.xhr_.responseText;
          // 当xhr对象支持.response属性时就支持了DOCUMENT 和 BLOB 返回类型.
          // 所以这里不用处理, 会在上面的代码中返回结果.
          // ARRAY_BUFFER needs an implementation for Firefox 4, where it was
          // implemented using a draft spec rather than the final spec.
          case XhrIo.ResponseType.ARRAY_BUFFER:
            if ('mozResponseArrayBuffer' in this.xhr_) {
              return this.xhr_.mozResponseArrayBuffer;
            }
        }
        // Fell through to a response type that is not supported on this browser.
        log.error(this.logger_, 'Response type ' + this.responseType_ +
          ' is not supported on this browser');
        return null;
      } catch (e) {
        log.fine(this.logger_, 'Can not get response: ' + e.message);
        return null;
      }
    };

    /**
     * 获取指定名称的响应头.
     * Will only return correct result when called from the context of a callback
     * and the request has completed
     * @param {string} key 响应头的参数名称.
     * @return {string|undefined} 返回响应头的参数值.
     */
    XhrIo.prototype.getResponseHeader = function(key) {
      return this.xhr_ && this.isComplete() ?
        this.xhr_.getResponseHeader(key) : undefined;
    };

    /**
     * 返回类型是字符串. 调用xhr自身的getAllResponseHeaders方法.
     * Will only return correct result when called from the context of a callback
     * and the request has completed.
     * @return {string} The value of the response headers or empty string.
     */
    XhrIo.prototype.getAllResponseHeaders = function() {
      return this.xhr_ && this.isComplete() ?
        this.xhr_.getAllResponseHeaders() : '';
    };

    /**
     * Get the last error message
     * @return {ErrorCode} Last error code.
     */
    XhrIo.prototype.getLastErrorCode = function() {
      return this.lastErrorCode_;
    };

    /**
     * 返回最后的错误信息.
     * @return {string} Last error message.
     */
    XhrIo.prototype.getLastError = function() {
      return util.isString(this.lastError_) ? this.lastError_ :
        String(this.lastError_);
    };

    /**
     * 对日志消息进行一些特殊处理Adds the last method, status and URI to the message.
     * @param {string} msg The message text that we want to add the extra text to.
     * @return {string} 返回额外信息.
     * @private
     */
    XhrIo.prototype.formatMsg_ = function(msg) {
      return msg + ' [' + this.lastMethod_ + ' ' + this.lastUri_ + ' ' +
        this.getStatus() + ']';
    };

    // 注册xhr的回调处理器为一个entry point, 这样可以进行错误监控.
    // (transformer是一个ErrorHandler的实例的wrap方法.)
    entryPointRegistry.register(
      /**
       * @param {function(!Function): !Function} transformer transformer是一个
       *     ErrorHandler实例(monitor)的wrap方法.
       */
        function(transformer) {
        XhrIo.prototype.onReadyStateChangeEntryPoint_ =
          transformer(XhrIo.prototype.onReadyStateChangeEntryPoint_);
      });

    return XhrIo;
  }
);