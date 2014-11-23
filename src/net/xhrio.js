/**
 * @fileoverview 处理XHR(XmlHttpRequests)的一个包装类.
 * 一次性的ajax请求可以调用XhrIo.send(), 也可以生成一个XhrIo的实例, 发送多次请求.
 * 每个实例有其自己的XmlHttpRequest对象并在请求完成后解绑事件保证没有内存泄露.
 *
 * XhrIo is event based, it dispatches events when a request finishes, fails or
 * succeeds or when the ready-state changes. The ready-state or timeout event
 * fires first, followed by a generic completed event. Then the abort, error,
 * or success event is fired as appropriate. Lastly, the ready event will fire
 * to indicate that the object may be used to make another request.
 *
 * The error event may also be called before completed and
 * ready-state-change if the XmlHttpRequest.open() or .send() methods throw.
 *
 * 这个类并不支持多次请求, 队列请求, or 优先级队列请求.
 * Tested = IE6, FF1.5, Safari, Opera 8.5
 *
 * TODO: Error cases aren't playing nicely in Safari.
 *
 */

define('@net.XhrIo',
    [
        '@util',
        '@Timer',
        '@array',
        '@events.eventTarget',
        '@json.util',
        '@log',
        '@net.errorCode',
        '@net.eventType',
        '@net.httpStatus',
        '@net.xmlHttp',
        '@object',
        '@string.util',
        '@ds.util',
        '@ds.Map',
        '@uri.util',
        '@ua.util'
    ],
    function(util, Timer, array, EventTarget, Json, log,
             ErrorCode, EventType, HttpStatus, XmlHttp,
             object, string, ds, Map, uriutil, ua) {

        'use strict';

        /**
         * XMLHttpRequests处理类.
         * @param {XmlHttpFactory=} opt_xmlHttpFactory 创建XMLHttpRequest的工厂.
         * @constructor
         * @extends {EventTarget}
         */
        var XhrIo = function(opt_xmlHttpFactory) {

            EventTarget.call(this);

            /**
             * Map of default headers to add to every request, use:
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
             * 从send()开始直到onReadyStateChange()完成, 或者触发error() or abort().
             * @private {boolean}
             */
            this.active_ = false;

            /**
             * 私有的XMLHttpRequest对象.
             * @private {XMLHttpRequest|GearsHttpRequest}
             */
            this.xhr_ = null;

            /**
             * The options to use with the current XMLHttpRequest object.
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
             * Last error message.
             * @private {Error|string}
             */
            this.lastError_ = '';

            /**
             * Used to ensure that we don't dispatch an multiple ERROR events. This can
             * happen in IE when it does a synchronous load and one error is handled in
             * the ready statte change and one is handled due to send() throwing an
             * exception.
             * @private {boolean}
             */
            this.errorDispatched_ = false;

            /**
             * Used to make sure we don't fire the complete event from inside a send call.
             * @private {boolean}
             */
            this.inSend_ = false;

            /**
             * Used in determining if a call to {@link #onReadyStateChange_} is from
             * within a call to this.xhr_.open.
             * @private {boolean}
             */
            this.inOpen_ = false;

            /**
             * Used in determining if a call to {@link #onReadyStateChange_} is from
             * within a call to this.xhr_.abort.
             * @private {boolean}
             */
            this.inAbort_ = false;
            /**
             * 超时的毫秒数.
             * Number of milliseconds after which an incomplete request will be aborted
             * and a {@link net.eventType.TIMEOUT} event raised; 0 means no timeout
             * is set.
             * @private {number}
             */
            this.timeoutInterval_ = 0;

            /**
             * Timer to track request timeout.
             * @private {?number}
             */
            this.timeoutId_ = null;

            /**
             * The requested type for the response. The empty string means use the default
             * XHR behavior.
             * @private {XhrIo.ResponseType}
             */
            this.responseType_ = XhrIo.ResponseType.DEFAULT;

            /**
             * Whether a "credentialed" request is to be sent (one that is aware of
             * cookies and authentication). This is applicable only for cross-domain
             * requests and more recent browsers that support this part of the HTTP Access
             * Control standard.
             *
             * @see http://www.w3.org/TR/XMLHttpRequest/#the-withcredentials-attribute
             *
             * @private {boolean}
             */
            this.withCredentials_ = false;

            /**
             * 是否可以配置XMLHttpRequest对象的 timeout属性.
             * @private {boolean}
             */
            this.useXhr2Timeout_ = false;
        };

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
         * A reference to the XhrIo logger
         * @private {Sogou.Debug.Logger}
         * @const
         */
        XhrIo.prototype.logger_ = log.getLogger('Sogou.Net.XhrIo');


        /**
         * The Content-Type HTTP header name
         * @type {string}
         */
        XhrIo.CONTENT_TYPE_HEADER = 'Content-Type';

        /**
         * The pattern matching the 'http' and 'https' URI schemes
         * @type {!RegExp}
         */
        XhrIo.HTTP_SCHEME_PATTERN = /^https?$/i;

        /**
         * The methods that typically come along with form data.  We set different
         * headers depending on whether the HTTP action is one of these.
         */
        XhrIo.METHODS_WITH_FORM_DATA = ['POST', 'PUT'];

        /**
         * url编码的表单的请求头.
         * The Content-Type HTTP header value for a url-encoded form
         * @type {string}
         */
        XhrIo.FORM_CONTENT_TYPE = 'application/x-www-form-urlencoded;charset=utf-8';

        /**
         * The XMLHttpRequest Level two timeout delay ms property name.
         * @see http://www.w3.org/TR/XMLHttpRequest/#the-timeout-attribute
         *
         * @private {string}
         * @const
         */
        XhrIo.XHR2_TIMEOUT_ = 'timeout';

        /**
         * The XMLHttpRequest Level two ontimeout handler property name.
         * @see http://www.w3.org/TR/XMLHttpRequest/#the-timeout-attribute
         *
         * @private {string}
         * @const
         */
        XhrIo.XHR2_ON_TIMEOUT_ = 'ontimeout';

        /**
         * XhrIo.send每次都会生成新的XhrIo对象. 没被释放的对象会保存在这个数组里.
         * All non-disposed instances of XhrIo created by {@link XhrIo.send} are in this Array.
         * @see XhrIo.cleanup
         * @private {!Array.<!XhrIo>}
         */
        XhrIo.sendInstances_ = [];

        /**
         * Static send that creates a short lived instance of XhrIo to send the
         * request.
         * @see XhrIo.cleanup
         * @param {string|Uri} url 请求地址.
         * @param {Function=} opt_callback 完成时的回调函数.
         * @param {string=} opt_method 请求方法, default: GET.
         * @param {ArrayBuffer|Blob|Document|FormData|GearsBlob|string=} opt_content
         *     Body data.
         * @param {Object|Map=} opt_headers Map of headers to add to the
         *     request.
         * @param {number=} opt_timeoutInterval 超时毫秒数. 过时将会aborted;
         *     0 means no timeout is set.
         * @param {boolean=} opt_withCredentials Whether to send credentials with the
         *     request. Default to false. See {@link XhrIo#setWithCredentials}.
         */
        XhrIo.send = function(url, opt_callback, opt_method, opt_content,
                              opt_headers, opt_timeoutInterval, opt_withCredentials) {
            var x = new XhrIo();
            XhrIo.sendInstances_.push(x);
            if (opt_callback) {
                x.listen(EventType.COMPLETE, opt_callback);
            }
            x.listenOnce(EventType.READY, x.cleanupSend_);
            if (opt_timeoutInterval) {
                x.setTimeoutInterval(opt_timeoutInterval);
            }
            if (opt_withCredentials) {
                x.setWithCredentials(opt_withCredentials);
            }
            x.send(url, opt_method, opt_content, opt_headers);
        };

        /**
         * 释放所有没被释放的net.XhrIo 实例. 这些实例都是goog.net.XhrIo.send创建的.
         * {@link XhrIo.send} cleans up the net.XhrIo instance
         * it creates when the request completes or fails.  However, if
         * the request never completes, then the net.XhrIo is not disposed.
         * This can occur if the window is unloaded before the request completes.
         * We could have {@link XhrIo.send} return the net.XhrIo
         * it creates and make the client of {@link XhrIo.send} be
         * responsible for disposing it in this case.  However, this makes things
         * significantly more complicated for the client, and the whole point
         * of {@link XhrIo.send} is that it's simple and easy to use.
         * Clients of {@link XhrIo.send} should call
         * {@link XhrIo.cleanup} when doing final
         * cleanup on window unload.
         */
        XhrIo.cleanup = function() {
            var instances = XhrIo.sendInstances_;
            while (instances.length) {
                instances.pop().dispose();
            }
        };

        /**
         * todo (by zmike86)
         * Installs exception protection for all entry point introduced by
         * net.XhrIo instances which are not protected by
         * {@link debug.ErrorHandler#protectWindowSetTimeout},
         * {@link debug.ErrorHandler#protectWindowSetInterval}, or
         * {@link events.protectBrowserEventEntryPoint}.
         *
         * @param {debug.ErrorHandler} errorHandler Error handler with which to
         *     protect the entry point(s).
         */
        /*
        XhrIo.protectEntryPoints = function(errorHandler) {
            XhrIo.prototype.onReadyStateChangeEntryPoint_ =
                errorHandler.protectEntryPoint(XhrIo.prototype.onReadyStateChangeEntryPoint_);
        };*/

        /**
         * 释放特定的XhrIo, 通常就是this所指.
         * Disposes of the specified XhrIo created by
         * {@link XhrIo.send} and removes it from
         * {@link XhrIo.pendingStaticSendInstances_}.
         * @private
         */
        XhrIo.prototype.cleanupSend_ = function() {
            this.dispose();
            array.remove(XhrIo.sendInstances_, this);
        };

        /**
         * Returns the number of milliseconds after which an incomplete request will be
         * aborted, or 0 if no timeout is set.
         * @return {number} Timeout interval in milliseconds.
         */
        XhrIo.prototype.getTimeoutInterval = function() {
            return this.timeoutInterval_;
        };

        /**
         * Sets the number of milliseconds after which an incomplete request will be
         * aborted and a {@link EventType.TIMEOUT} event raised; 0 means no
         * timeout is set.
         * @param {number} ms Timeout interval in milliseconds; 0 means none.
         */
        XhrIo.prototype.setTimeoutInterval = function(ms) {
            this.timeoutInterval_ = Math.max(0, ms);
        };

        /**
         * Sets the desired type for the response. At time of writing, this is only
         * supported in very recent versions of WebKit (10.0.612.1 dev and later).
         *
         * If this is used, the response may only be accessed via {@link #getResponse}.
         *
         * @param {XhrIo.ResponseType} type The desired type for the response.
         */
        XhrIo.prototype.setResponseType = function(type) {
            this.responseType_ = type;
        };

        /**
         * Gets the desired type for the response.
         * @return {XhrIo.ResponseType} The desired type for the response.
         */
        XhrIo.prototype.getResponseType = function() {
            return this.responseType_;
        };

        /**
         * Sets whether a "credentialed" request that is aware of cookie and
         * authentication information should be made. This option is only supported by
         * browsers that support HTTP Access Control. As of this writing, this option
         * is not supported in IE.
         *
         * @param {boolean} withCredentials Whether this should be a "credentialed"
         *     request.
         */
        XhrIo.prototype.setWithCredentials = function(withCredentials) {
            this.withCredentials_ = withCredentials;
        };

        /**
         * 是否当前请求带有凭据信息.
         * @return {boolean} The desired type for the response.
         */
        XhrIo.prototype.getWithCredentials = function() {
            return this.withCredentials_;
        };

        /**
         * 实例方法发送请求.
         * @param {string|Uri} url Uri to make request to.
         * @param {string=} opt_method Send method, default: GET.
         * @param {ArrayBuffer|Blob|Document|FormData|GearsBlob|string=} opt_content
         *     Body data.
         * @param {Object|Map=} opt_headers Map of headers to add to the
         *     request.
         */
        XhrIo.prototype.send = function(url, opt_method, opt_content, opt_headers) {
            if (this.xhr_) {
                throw Error('[Oslo.net.XhrIo] Object is active with another request=' +
                    this.lastUri_ + '; newUri=' + url);
            }

            var method = opt_method ? opt_method.toUpperCase() : 'GET';

            this.lastUri_ = url;
            this.lastError_ = '';
            this.lastErrorCode_ = ErrorCode.NO_ERROR;
            this.lastMethod_ = method;
            this.errorDispatched_ = false;
            // 这里初始化active_为true
            this.active_ = true;

            // Use the factory to create the XHR object and options
            this.xhr_ = this.createXhr();
            this.xhrOptions_ = this.xmlHttpFactory_ ?
                this.xmlHttpFactory_.getOptions() : XmlHttp.getOptions();

            // 监听onreadystatechange
            this.xhr_.onreadystatechange = util.bind(this.onReadyStateChange_, this);

            /**
             * Try to open the XMLHttpRequest (always async), if an error occurs here it
             * is generally permission denied
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

            // We can't use null since this won't allow requests with form data to have a
            // content length specified which will cause some proxies to return a 411
            // error.
            var content = opt_content || '';

            var headers = this.headers.clone();

            // 加上用户定义的头部
            if (opt_headers) {
                ds.forEach(opt_headers, function(value, key) {
                    headers.set(key, value);
                });
            }

            // Find whether a content type header is set, ignoring case.
            // HTTP header names are case-insensitive.  See:
            // http://www.w3.org/Protocols/rfc2616/rfc2616-sec4.html#sec4.2
            var contentTypeKey = array.find(headers.getKeys(), XhrIo.isContentTypeHeader_);

            var contentIsFormData = (util.global['FormData'] &&
                (content instanceof util.global['FormData']));

            // 是PUT或POST请求 且 Content-Type没有被设置 且 不是FormData数据(todo)
            if (array.contains(XhrIo.METHODS_WITH_FORM_DATA, method) &&
                !contentTypeKey && !contentIsFormData) {
                // 如果请求用的表单数据, 默认是 url-encoded form content type.
                // unless this is a FormData request.  For FormData,
                // the browser will automatically add a multipart/form-data content type
                // with an appropriate multipart boundary.
                headers.set(XhrIo.CONTENT_TYPE_HEADER, XhrIo.FORM_CONTENT_TYPE);
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
             * 发送请求, 否则报错 (404 not found).
             * @preserveTry
             */
            try {
                this.cleanUpTimeoutTimer_(); // Paranoid, should never be running.
                if (this.timeoutInterval_ > 0) {
                    this.useXhr2Timeout_ = XhrIo.shouldUseXhr2Timeout_(this.xhr_);
                    log.fine(this.logger_, this.formatMsg_('Will abort after ' +
                        this.timeoutInterval_ + 'ms if incomplete, xhr2 ' +
                        this.useXhr2Timeout_));
                    // 如果可用timeout属性
                    if (this.useXhr2Timeout_) {
                        this.xhr_[XhrIo.XHR2_TIMEOUT_] = this.timeoutInterval_;
                        this.xhr_[XhrIo.XHR2_ON_TIMEOUT_] = util.bind(this.timeout_, this);
                        // 不可用则规定时间执行this.timeout_
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
         * timeout属性对于早先版本的xhr不适用, 这个方法用于检测xhr是否支持2级的timeout
         * 属性和ontimeout回调函数.
         * 汗……搞来搞去只有IE9支持啊....代码虽然这么写但是chrome已经足够支持了……
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
                util.isNumber(xhr[XhrIo.XHR2_TIMEOUT_]) &&
                util.isDef(xhr[XhrIo.XHR2_ON_TIMEOUT_]);
        };


        /**
         * @param {string} header An HTTP header key.
         * @return {boolean} Whether the key is a content type header (ignoring
         *     case.
         * @private
         */
        XhrIo.isContentTypeHeader_ = function(header) {
            return string.caseInsensitiveEquals(XhrIo.CONTENT_TYPE_HEADER, header);
        };


        /**
         * Creates a new XHR object.
         * @return {XMLHttpRequest|GearsHttpRequest} The newly created XHR object.
         * @protected
         */
        XhrIo.prototype.createXhr = function() {
            return this.xmlHttpFactory_ ?
                this.xmlHttpFactory_.createInstance() : XmlHttp();
        };


        /**
         * 指定时间 {@link XhrIo#timeoutInterval_} 后请求还未完成;
         * raises a {@link EventType.TIMEOUT} event and aborts
         * the request.
         * @private
         */
        XhrIo.prototype.timeout_ = function() {
            if (typeof sogou == 'undefined') {
                // If sogou is undefined then the callback has occurred as the application
                // is unloading and will error.  Thus we let it silently fail.
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
         * @param {ErrorCode} errorCode The error code.
         * @param {Error} err The error object.
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
         * Abort the current XMLHttpRequest
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
         * Nullifies all callbacks to reduce risks of leaks.
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
         * 内部的函数会在xhr每次的readystatechange时触发.
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
                // Were not being called from within a call to this.xhr_.send
                // this.xhr_.abort, or this.xhr_.open, so this is an entry point
                this.onReadyStateChangeEntryPoint_();
            } else {
                this.onReadyStateChangeHelper_();
            }
        };


        /**
         * todo Entry Point具体的意义
         * Used to protect the onreadystatechange handler entry point.  Necessary
         * as {#onReadyStateChange_} maybe called from within send or abort, this
         * method is only called when {#onReadyStateChange_} is called as an
         * entry point.
         * {@see #protectEntryPoints}
         * @private
         */
        XhrIo.prototype.onReadyStateChangeEntryPoint_ = function() {
            this.onReadyStateChangeHelper_();
        };


        /**
         * Helper for {@link #onReadyStateChange_}.  This is used so that
         * entry point calls to {@link #onReadyStateChange_} can be routed through
         * {@link #onReadyStateChangeEntryPoint_}.
         * @private
         */
        XhrIo.prototype.onReadyStateChangeHelper_ = function() {
            if (!this.active_) {
                // can get called inside abort call
                return;
            }

            if (typeof sogou == 'undefined') {
                // NOTE(user): If sogou is undefined then the callback has occurred as the
                // application is unloading and will error.  Thus we let it silently fail.

            } else if (
                this.xhrOptions_[XmlHttp.OptionType.LOCAL_REQUEST_ERROR] &&
                    this.getReadyState() == XmlHttp.ReadyState.COMPLETE &&
                    this.getStatus() == 2) {
                // Sogou.Net.DefaultXmlHttpFactory的getOptions方法会把IE下
                // this.xhrOptions_[XmlHttp.OptionType.LOCAL_REQUEST_ERROR]设为1
                // 所以当前条件只会在IE下出现.
                // NOTE(user): In IE if send() errors on a *local* request the readystate
                // is still changed to COMPLETE.  We need to ignore it and allow the
                // try/catch around send() to pick up the error.
                log.fine(this.logger_, this.formatMsg_(
                    'Local request error detected and ignored'));

            } else {
                // 在IE如果response被缓存了, 我们有时会立即得到readystatechange(甚至在
                // send方法时), 这种情况其实不是异步回调了, 给了我们假象, 这时候我们需要通过
                // setTimeout(fn, 0)改成异步回调.
                // In IE when the response has been cached we sometimes get the callback
                // from inside the send call and this usually breaks code that assumes that
                // XhrIo is asynchronous.  If that is the case we delay the callback
                // using a timer.
                if (this.inSend_ &&
                    this.getReadyState() == XmlHttp.ReadyState.COMPLETE) {
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
                    this.xhrOptions_[XmlHttp.OptionType.USE_NULL_FUNCTION] ?
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
                    // todo 什么是Gears HTTP request
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
                this.xhr_[XhrIo.XHR2_ON_TIMEOUT_] = null;
            }
            if (util.isNumber(this.timeoutId_)) {
                Timer.clear(this.timeoutId_);
                this.timeoutId_ = null;
            }
        };


        /**
         * @return {boolean} Whether there is an active request.
         */
        XhrIo.prototype.isActive = function() {
            return !!this.xhr_;
        };


        /**
         * @return {boolean} Whether the request has completed.
         */
        XhrIo.prototype.isComplete = function() {
            return this.getReadyState() == XmlHttp.ReadyState.COMPLETE;
        };


        /**
         * @return {boolean} Whether the request completed with a success.
         */
        XhrIo.prototype.isSuccess = function() {
            var status = this.getStatus();
            // A zero status code is considered successful for local files.
            return HttpStatus.isSuccess(status) ||
                status === 0 && !this.isLastUriEffectiveSchemeHttp_();
        };


        /**
         * @return {boolean} whether the effective scheme of the last URI that was
         *     fetched was 'http' or 'https'.
         * @private
         */
        XhrIo.prototype.isLastUriEffectiveSchemeHttp_ = function() {
            var scheme = uriutil.getEffectiveScheme(String(this.lastUri_));
            return XhrIo.HTTP_SCHEME_PATTERN.test(scheme);
        };


        /**
         * Get the readystate from the Xhr object
         * Will only return correct result when called from the context of a callback
         * @return {XmlHttp.ReadyState} XmlHttp.ReadyState.*.
         */
        XhrIo.prototype.getReadyState = function() {
            return this.xhr_ ?
            /** @type {XmlHttp.ReadyState} */ (this.xhr_.readyState) :
                XmlHttp.ReadyState.UNINITIALIZED;
        };


        /**
         * Get the status from the Xhr object
         * todo: 这句没看懂
         * Will only return correct result when called from the context of a callback
         * @return {number} Http status.
         */
        XhrIo.prototype.getStatus = function() {
            /**
             * IE doesn't like you checking status until the readystate is greater than 2
             * (i.e. it is recieving or complete).  The try/catch is used for when the
             * page is unloading and an ERROR_NOT_AVAILABLE may occur when accessing xhr_.
             * @preserveTry
             */
            try {
                return this.getReadyState() > XmlHttp.ReadyState.LOADED ?
                    this.xhr_.status : -1;
            } catch (e) {
                log.warning(this.logger_, 'Can not get status: ' + e.message);
                return -1;
            }
        };

        /**
         * Get the status text from the Xhr object
         * Will only return correct result when called from the context of a callback
         * @return {string} Status text.
         */
        XhrIo.prototype.getStatusText = function() {
            /**
             * IE doesn't like you checking status until the readystate is greater than 2
             * (i.e. it is recieving or complete).  The try/catch is used for when the
             * page is unloading and an ERROR_NOT_AVAILABLE may occur when accessing xhr_.
             * @preserveTry
             */
            try {
                return this.getReadyState() > XmlHttp.ReadyState.LOADED ?
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
         * Get the response text from the Xhr object
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
         * 不太常用. 不推荐
         * Get the response body from the Xhr object. This property is only available
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
         * @return {Object} Binary result from the server or null if not available.
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
         * Get the response XML from the Xhr object
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
         * Get the response and evaluates it as JSON from the Xhr object
         * Will only return correct result when called from the context of a callback
         * @param {string=} opt_xssiPrefix Optional XSSI prefix string to use for
         *     stripping of the response before parsing. This needs to be set only if
         *     your backend server prepends the same prefix string to the JSON response.
         * @return {Object|undefined} JavaScript object.
         */
        XhrIo.prototype.getResponseJson = function(opt_xssiPrefix) {
            if (!this.xhr_) {
                return undefined;
            }

            var responseText = this.xhr_.responseText;
            if (opt_xssiPrefix && responseText.indexOf(opt_xssiPrefix) == 0) {
                responseText = responseText.substring(opt_xssiPrefix.length);
            }

            return Json.parse(responseText);
        };


        /**
         * Get the response as the type specificed by {@link #setResponseType}. At time
         * of writing, this is only directly supported in very recent versions of WebKit
         * (10.0.612.1 dev and later). 如果xhr不直接支持response, 我们尝试模拟它.
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
                    // DOCUMENT and BLOB don't need to be handled here because they are
                    // introduced in the same spec that adds the .response field, and would
                    // have been caught above.
                    // ARRAY_BUFFER needs an implementation for Firefox 4, where it was
                    // implemented using a draft spec rather than the final spec.
                    case XhrIo.ResponseType.ARRAY_BUFFER:
                        if ('mozResponseArrayBuffer' in this.xhr_) {
                            return this.xhr_.mozResponseArrayBuffer;
                        }
                }
                // Fell through to a response type that is not supported on this browser.
                log.error(this.logger_,
                    'Response type ' + this.responseType_ + ' is not ' +
                        'supported on this browser');
                return null;
            } catch (e) {
                log.fine(this.logger_, 'Can not get response: ' + e.message);
                return null;
            }
        };


        /**
         * Get the value of the response-header with the given name from the Xhr object
         * Will only return correct result when called from the context of a callback
         * and the request has completed
         * @param {string} key The name of the response-header to retrieve.
         * @return {string|undefined} The value of the response-header named key.
         */
        XhrIo.prototype.getResponseHeader = function(key) {
            return this.xhr_ && this.isComplete() ?
                this.xhr_.getResponseHeader(key) : undefined;
        };


        /**
         * 返回类型是字符串. 调用xhr自身的getAllResponseHeaders方法.
         * Gets the text of all the headers in the response.
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
         * Adds the last method, status and URI to the message.  This is used to add
         * this information to the logging calls.
         * @param {string} msg The message text that we want to add the extra text to.
         * @return {string} The message with the extra text appended.
         * @private
         */
        XhrIo.prototype.formatMsg_ = function(msg) {
            return msg + ' [' + this.lastMethod_ + ' ' + this.lastUri_ + ' ' +
                this.getStatus() + ']';
        };

        // Register the xhr handler as an entry point, so that
        // it can be monitored for exception handling, etc.
        // debug.entryPointRegistry.register(
            /**
             * @param {function(!Function): !Function} transformer The transforming
             *     function.
             */
        //    function(transformer) {
        //        XhrIo.prototype.onReadyStateChangeEntryPoint_ =
        //            transformer(XhrIo.prototype.onReadyStateChangeEntryPoint_);
        //    });


        return XhrIo;
    }
);