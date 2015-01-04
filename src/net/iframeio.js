/**
 * @fileoverview 这个类管理通过iFrame发送请求. 支持若干个传送方法.
 * 可支持get和post方法, 目标页面会被当作文本、JSON或者HTML DOM读入.
 * 使用iframe(某些浏览器下)会出现窗口的状态栏显示忙碌的情况(throbber to spin),
 * 这种提示对于用户是可见的, 意味有动作正在执行, 是有一个正向的预期.
 * 请求不会影响历史记录, 具体见History模块.
 * responseText和responseJson方法假定返回的是普通文本. 可以通过responseXml
 * 方法Iframe的DOM.
 *
 * 测试:
 *    + FF2.0 (Win Linux)
 *    + IE6, IE7
 *    + Opera 9.1,
 *    + Chrome
 *    - Opera 8.5 fails because of no textContent and buggy innerText support
 *
 * NOTE: Safari加载普通文本的时候不会触发onload事件处理器.
 *
 * 在IE下使用Drip测试以保证内存的使用处于平稳状态 (as constant as possible).
 * 当发送了大量数以千计的请求, 内存使用开始较为平稳但是很快还是上升(2000个请求时<500k)
 * -- 这个问题还没解决, 刷新页面后内存恢复正常.
 *
 *
 * #适用场景1: 文件上传(background file upload):
 * 通过IframeIo实例对象提交表单可以实现文件上传功能.
 * 用法:
 * - 构建表单:
 *   <pre>
 *   <form id="form" enctype="multipart/form-data" method="POST">
 *      <input name="userfile" type="file" />
 *   </form>
 *   </pre>
 *
 * - Have the user click the file input
 * - 创建IframeIo实例
 *   <pre>
 *   var io = new IframeIo();
 *   events.listen(io, EventType.COMPLETE, function() {
 *     alert('Sent');
 *   });
 *   io.sendFromForm(document.getElementById('form'));
 *   </pre>
 *
 *
 * #适用场景2: 增量下载(incremental loading):
 * Gmail使用这种方法, 多次发送script标签包含着js代码块, 下载完后会执行js代码.
 * 这样可以持续增量渲染子页面iframe的内容得以让父页面的函数多次执行达到两个人会话的效果.
 * 这种方案需要服务器的支持. 另外你的代码还应该:
 * A) 客户端程序应该暴露一个全局函数handleIncrementalData().
 * 例如: window.GG_iframeFn = IframeIo.handleIncrementalData;
 *
 * B) 响应页面直接调用这个方法, 例如 response would look something like this:
 * <pre>
 *   <html>
 *   <head>
 *     <meta content="text/html;charset=UTF-8" http-equiv="content-type">
 *   </head>
 *   <body>
 *     <script>
 *       D = top.P ? function(d) {
 *         top.GG_iframeFn(window, d)
 *       } : function() {};
 *     </script>
 *
 *     <script>D([1, 2, 3, 4, 5]);</script>
 *     <script>D([6, 7, 8, 9, 10]);</script>
 *     <script>D([11, 12, 13, 14, 15]);</script>
 *   </body>
 *   </html>
 * </pre>
 *
 * 你的客户端程序接着要监听IframeIo实例的net.EventType.INCREMENTAL_DATA事件.
 * 事件对象含有一个data属性包含了调用D()时传递的参数.
 * 注意内存问题: 如果在IE中引用了data对象而恰巧data是一个引用对象. 比如一个数组然后
 * iframe析构了, 这个数组就找不到他的原型对象了prototype, 所以再次使用类似.join()方法会
 * 找不到. 解决办法是利用父窗口的Array构造函数创建另一个数组, 或者做一个数组的克隆.
 *
 *
 * 事件模型:
 * 多次调用send方法则会异步通信返回结果, 可以通过对IframeIo实例对象的事件进行监听获得当前
 * 状态(completed, success, error). 会有以下事件分发:
 * - net.EventType.COMPLETE: 请求完成而不管是否成功. 可以通过isSuccess()和getLastError
 *   两个方法得到结果.
 * - net.EventType.SUCCESS: 请求成功完成
 * - net.EventType.ERROR: 请求失败
 * - net.EventType.ABORT: 请求中断
 *
 * 例如:
 * <pre>
 *   var io = new IframeIo();
 *   events.listen(io, EventType.COMPLETE, function() {
 *     alert('request complete');
 *   });
 *   io.sendFromForm(...);
 * </pre>
 *
 * @author Leo.Zhang
 * @email zmike86@gmail.com
 */

define([
    '../util/util',
    '../timer/timer',
    '../uri/util',
    '../dom/util',
    '../events/util',
    '../events/event',
    '../events/target',
    '../events/eventtype',
    '../json/json',
    './errorcode',
    './eventtype',
    '../string/util',
    '../ua/util',
    '../log/log',
    '../ds/util',
    '../uri/uri',
    '../debug/util'
  ],
  function(util,
           Timer,
           uri,
           dom,
           EventsUtil,
           EventBase,
           EventTarget,
           EventType,
           JSON,
           ErrorCode,
           NetEventType,
           string,
           ua,
           log,
           ds,
           Uri,
           debug
    ) {

    'use strict';

    /**
     * 创建了多少个iframes
     * @type {number}
     * @private
     */
    var counter_ = 0;

    /**
     * 通过名字查找IframeIo实例.
     * @type {Object}
     * @private
     */
    var instances_ = {};

    /**
     * 返回一个iframe新的名字
     * @return {string} 下一个iframe名字.
     * @private
     */
    function getNextName_() {
      return FRAME_NAME_PREFIX + counter_++;
    }

    /**
     * 每个frame的名称前缀
     * @type {string}
     */
    var FRAME_NAME_PREFIX = 'oslo_frame';

    /**
     * 非IE环境要在用于发请求的inner frames加后缀
     * @type {string}
     */
    var INNER_FRAME_SUFFIX = '_inner';

    /**
     * 通过iFrames管理请求的类.
     * @constructor
     * @extends {EventTarget}
     */
    var IframeIo = function() {

      EventTarget.call(this);

      /**
       * 当前IframeIo实例和frame的名字
       * @type {string}
       * @private
       */
      this.name_ = getNextName_();

      /**
       * 保存一些已经完成请求的iframe元素. 惰性异步析构这个元素,
       * so we don't confuse the browser (see below).
       * @type {Array.<Element>}
       * @private
       */
      this.iframesForDisposal_ = [];

      // 创建一个哈希便于查找IframeIo实例. 用于getInstanceByName找到特定iframe
      // 相关的IframeIo实例.  递增的脚本里用到.
      instances_[this.name_] = this;

    };

    util.inherits(IframeIo, EventTarget);

    /**
     * 请求完毕后距离析构iframe还需要一段时间. 析构可以惰性异步完成, 我们等待
     * 足够的时间防止response被处理返回的时间不够.
     * @type {number}
     */
    IframeIo.IFRAME_DISPOSE_DELAY_MS = 2000;

    /**
     * 一个form的引用, 记住要发送哪个表单数据.
     * @type {HTMLFormElement}
     * @private
     */
    IframeIo.form_;

    /**
     * 一个静态方法创建一个短期活跃的IframeIo发送请求.
     * @param {Uri|string} uri 发送请求的地址, 调用者应该把查询字符串拼接好.
     * @param {Function=} opt_callback complete事件处理器.
     * @param {string=} opt_method 默认GET, POST会用表单提交请求.
     * @param {boolean=} opt_noCache 是否加时间戳避免缓存.
     * @param {Object|Map=} opt_data 键值对儿会通过iframe的表单post到服务端.
     */
    IframeIo.send = function(uri, opt_callback, opt_method, opt_noCache, opt_data) {
      var io = new IframeIo();
      // 第四个参数不需要捕获阶段, 第五个参数指定上下文
      EventsUtil.listen(io, NetEventType.READY, io.dispose, false, io);
      if (opt_callback) {
        EventsUtil.listen(io, NetEventType.COMPLETE, opt_callback);
      }
      io.send(uri, opt_method, opt_noCache, opt_data);
    };

    /**
     * 通过iframe的名字找到此表单元素(全局对象是util.global因为这个window对象含有
     * IframeIo的iframes元素.
     * @param {string} fname 名称.
     * @return {HTMLIFrameElement} iframe元素.
     */
    IframeIo.getIframeByName = function(fname) {
      return window.frames[fname];
    };

    /**
     * 根据名字获取IframeIo实例对象.
     * @param {string} fname The name to find.
     * @return {IframeIo} 返回IframeIo实例.
     */
    IframeIo.getInstanceByName = function(fname) {
      return instances_[fname];
    };

    /**
     * todo 这个方法需要定义为全局方法暴露在window上,
     * 接受服务端连续的数据灌入(需要服务端配合), 负责接收数据并且把数据导流到正确的IframeIo实例上.
     * 而IframeIo实例中包含的html页面中的script要调用被导出到全局的此方法.
     * @param {Window} win window对象.
     * @param {Object} data 数据.
     */
    IframeIo.handleIncrementalData = function(win, data) {
      // 如果是inner-frame, 需要用父窗口.
      var iframeName = string.endsWith(win.name,
        INNER_FRAME_SUFFIX) ? win.parent.name : win.name;

      var iframeIoName = iframeName.substring(0, iframeName.lastIndexOf('_'));
      var iframeIo = IframeIo.getInstanceByName(iframeIoName);
      if (iframeIo && iframeName === iframeIo.iframeName_) {
        // todo
        iframeIo.handleIncrementalData_(data);
      } else {
        log.getLogger('Oslo.net.IframeIo').info(
          'Incremental iframe data routed for unknown iframe');
      }
    };

    /**
     * 保存了一个静态引用(想提供给所有IframeIo实例), 因为IE6在创建删除form后会造成内存泄露.
     * @return {HTMLFormElement} The static form.
     * @private
     */
    IframeIo.getForm_ = function() {
      if (!IframeIo.form_) {
        IframeIo.form_ = /** @type {HTMLFormElement} */(dom.createDom('form'));
        IframeIo.form_.acceptCharset = 'utf-8';

        // 隐藏form并将它移出屏幕
        var s = IframeIo.form_.style;
        s.position = 'absolute';
        s.visibility = 'hidden';
        s.top = s.left = '-10px';
        s.width = s.height = '10px';
        s.overflow = 'hidden';

        dom.getDocument().body.appendChild(IframeIo.form_);
      }
      return IframeIo.form_;
    };

    /**
     * 把需要传输的数据(不论GET还是POST)写入到表单的隐藏input中一并带到服务器端.
     * @param {HTMLFormElement} form 要附加数据的表单.
     * @param {Object|Map|Uri.QueryData} data 要传的数据.
     * @private
     */
    IframeIo.addFormInputs_ = function(form, data) {
      var helper = dom.getDomHelper(form);
      ds.forEach(data, function(value, key) {
        var inp = helper.createDom('input',
          {'type': 'hidden', 'name': key, 'value': value});
        form.appendChild(inp);
      });
    };

    /**
     * 为IframeIo实例服务的logger
     * @type {Logger}
     * @private
     */
    IframeIo.prototype.logger_ = log.getLogger('Oslo.net.IframeIo');

    /**
     * 保留一个表单元素的引用可以在每次请求到iframe的时候复用.
     * @type {HTMLFormElement}
     * @private
     */
    IframeIo.prototype.form_ = null;

    /**
     * 当前请求用到的iframe对象, 如果当前没有active的请求则为null.
     * @type {HTMLIFrameElement}
     * @private
     */
    IframeIo.prototype.iframe_ = null;

    /**
     * 当前请求用到的iframe的名字, 若没活动请求则为null.
     * @type {?string}
     * @private
     */
    IframeIo.prototype.iframeName_ = null;

    /**
     * 保存每次iframe的名字以保证唯一.
     * @type {number}
     * @private
     */
    IframeIo.prototype.nextIframeId_ = 0;

    /**
     * 是否当前请求处于激活状态.
     * @type {boolean}
     * @private
     */
    IframeIo.prototype.active_ = false;

    /**
     * 上次请求是否完成.
     * @type {boolean}
     * @private
     */
    IframeIo.prototype.complete_ = false;

    /**
     * 请求是否成功.
     * @type {boolean}
     * @private
     */
    IframeIo.prototype.success_ = false;

    /**
     * 上次请求的url.
     * @type {Uri}
     * @private
     */
    IframeIo.prototype.lastUri_ = null;

    /**
     * 上次请求的文本内容.
     * @type {?string}
     * @private
     */
    IframeIo.prototype.lastContent_ = null;

    /**
     * 上次错误码.
     * @type {ErrorCode}
     * @private
     */
    IframeIo.prototype.lastErrorCode_ = ErrorCode.NO_ERROR;

    /**
     * 定义超时的时间, 若请求还未完成会被中断且会分发一个EventType.TIMEOUT事件;
     * 0意味着不需要超时处理.
     * @type {number}
     * @private
     */
    IframeIo.prototype.timeoutInterval_ = 0;

    /**
     * Window timeout ID用于取消超时的处理器.
     * @type {?number}
     * @private
     */
    IframeIo.prototype.timeoutId_ = null;

    /**
     * Window timeout ID用于检查firefox的静默失败.
     * @type {?number}
     * @private
     */
    IframeIo.prototype.firefoxSilentErrorTimeout_ = null;

    /**
     * Window timeout ID用于析构iframes对象.
     * @type {?number}
     * @private
     */
    IframeIo.prototype.iframeDisposalTimer_ = null;

    /**
     * 对同一个错误不要多次处理. 在IE下, 断网且URL不可用的情况下提交表单
     * 会两次进到handleError_方法.
     * @type {boolean}
     * @private
     */
    IframeIo.prototype.errorHandled_ = false;

    /**
     * Whether to suppress the listeners that determine when the iframe loads.
     * @type {boolean}
     * @private
     */
    IframeIo.prototype.ignoreResponse_ = false;

    /**
     * 通过iframe发送请求. 这个方法被IframeIo当作静态方法调用.
     * 一个HTML form用于提交到iframe. 简化了GET和POST的区别. iframe每次都要被创建并且
     * 销毁, 否则request会造成历史实体记录的麻烦.
     * sendFromForm方法里面做了一些技巧, 在非IE的环境下POST请求不会对历史实体产生添加.
     * @param {Uri|string} uri 请求地址.
     * @param {string=} opt_method 默认GET, POST用表单提交请求.
     * @param {boolean=} opt_noCache 是否在请求后加时间戳避免缓存.
     * @param {Object|Map=} opt_data 数据键值对.
     */
    IframeIo.prototype.send = function(uri, opt_method, opt_noCache, opt_data) {
      if (this.active_) {
        throw Error('[Oslo.net.IframeIo] Unable to send, already active.');
      }

      var uriObj = new Uri(uri);
      this.lastUri_ = uriObj;
      var method = opt_method ? opt_method.toUpperCase() : 'GET';

      if (opt_noCache) {
        uriObj.makeUnique();
      }

      log.info(this.logger_,
          'Sending iframe request: ' + uriObj + ' [' + method + ']');

      // 创建表单
      this.form_ = IframeIo.getForm_();

      if (method == 'GET') {
        // For GET requests, we assume that the caller didn't want the queryparams
        // already specified in the URI to be clobbered by the form, so we add the
        // params here.
        IframeIo.addFormInputs_(this.form_, uriObj.getQueryData());
      }

      if (opt_data) {
        // 为每一个数据项创建表单域.
        IframeIo.addFormInputs_(this.form_, opt_data);
      }

      // Set the URI that the form will be posted
      this.form_.action = uriObj.toString();
      this.form_.method = method;

      this.sendFormInternal_();
    };

    /**
     * 这个方法是客户端javascript上传文件的核心方法.
     * 将表单的数据发往服务端. 表单需指明HTTP method, action如果没有指定
     * 也通过form获取. 使用这个方法可以用file-upload input做文件上传但不会影响浏览历史记录.
     * Example form:
     * <pre>
     *   <form action="/server/" enctype="multipart/form-data" method="POST">
     *     <input name="userfile" type="file">
     *   </form>
     * </pre>
     * @param {HTMLFormElement} form 向服务器发送请求的表单元素.
     * @param {string=} opt_uri 默认用表单的action设置发送地址.
     * @param {boolean=} opt_noCache 是否加时间戳避免缓存.
     */
    IframeIo.prototype.sendFromForm = function(form, opt_uri, opt_noCache) {
      if (this.active_) {
        throw Error('[Oslo.net.IframeIo] Unable to send, already active.');
      }

      var uri = new Uri(opt_uri || form.action);
      if (opt_noCache) {
        uri.makeUnique();
      }

      log.info(this.logger_, 'Sending iframe request from form: ' + uri);

      this.lastUri_ = uri;
      this.form_ = form;
      this.form_.action = uri.toString();
      this.sendFormInternal_();
    };

    /**
     * 终止当前iframe请求.
     * @param {ErrorCode=} opt_failureCode 自定义错误码默认是 ABORT.
     */
    IframeIo.prototype.abort = function(opt_failureCode) {
      if (this.active_) {
        log.info(this.logger_, 'Request aborted');
        EventsUtil.removeAll(this.getRequestIframe());
        this.complete_ = false;
        this.active_ = false;
        this.success_ = false;
        this.lastErrorCode_ = opt_failureCode || ErrorCode.ABORT;

        this.dispatchEvent(EventType.ABORT);

        this.makeReady_();
      }
    };

    /** @override */
    IframeIo.prototype.disposeInternal = function() {
      log.fine(this.logger_, 'Disposing iframeIo instance');

      // If there is an active request, abort it
      if (this.active_) {
        log.fine(this.logger_, 'Aborting active request');
        this.abort();
      }

      // Call super-classes implementation (remove listeners)
      IframeIo.superClass_.disposeInternal.call(this);

      // Add the current iframe to the list of iframes for disposal.
      if (this.iframe_) {
        this.scheduleIframeDisposal_();
      }

      // Disposes of the form
      this.disposeForm_();

      // Nullify anything that might cause problems and clear state
      delete this.errorChecker_;
      this.form_ = null;
      this.lastCustomError_ = this.lastContent_ = this.lastContentHtml_ = null;
      this.lastUri_ = null;
      this.lastErrorCode_ = ErrorCode.NO_ERROR;

      delete instances_[this.name_];
    };

    /**
     * @return {boolean} 传输是否完成.
     */
    IframeIo.prototype.isComplete = function() {
      return this.complete_;
    };

    /**
     * @return {boolean} 是否传输成功.
     */
    IframeIo.prototype.isSuccess = function() {
      return this.success_;
    };

    /**
     * @return {boolean} 是否正在传输.
     */
    IframeIo.prototype.isActive = function() {
      return this.active_;
    };

    /**
     * 上次返回的文本信息(如 iframe的text content).
     * 这里只假定是文本
     * @return {?string} Result from the server.
     */
    IframeIo.prototype.getResponseText = function() {
      return this.lastContent_;
    };

    /**
     * 上次返回的html文本 (如 iframe的innerHtml).
     * @return {?string} Result from the server.
     */
    IframeIo.prototype.getResponseHtml = function() {
      return this.lastContentHtml_;
    };

    /**
     * 序列化JSON对象. 是安全序列化, 如果确认信息来源正确可以用
     * json.unsafeparse(this.getResponseText()) 代替.
     * @return {Object} 返回序列化对象.
     */
    IframeIo.prototype.getResponseJson = function() {
      return json.parse(this.lastContent_);
    };

    /**
     * 上次请求地址.
     * @return {Uri} Uri of last request.
     */
    IframeIo.prototype.getLastUri = function() {
      return this.lastUri_;
    };

    /**
     * 获取上次的错误码.
     * @return {ErrorCode} Last error code.
     */
    IframeIo.prototype.getLastErrorCode = function() {
      return this.lastErrorCode_;
    };

    /**
     * 上次错误消息.
     * @return {string}
     */
    IframeIo.prototype.getLastError = function() {
      return ErrorCode.getDebugMessage(this.lastErrorCode_);
    };

    /**
     * Gets the last custom error.
     * @return {Object} Last custom error.
     */
    IframeIo.prototype.getLastCustomError = function() {
      return this.lastCustomError_;
    };

    /**
     * Sets the callback function used to check if a loaded IFrame is in an error
     * state.
     * @param {Function} fn Callback that expects a document object as it's single
     *     argument.
     */
    IframeIo.prototype.setErrorChecker = function(fn) {
      this.errorChecker_ = fn;
    };

    /**
     * Gets the callback function used to check if a loaded IFrame is in an error
     * state.
     * @return {Function} A callback that expects a document object as it's single
     *     argument.
     */
    IframeIo.prototype.getErrorChecker = function() {
      return this.errorChecker_;
    };

    /**
     * Returns the number of milliseconds after which an incomplete request will be
     * aborted, or 0 if no timeout is set.
     * @return {number} Timeout interval in milliseconds.
     */
    IframeIo.prototype.getTimeoutInterval = function() {
      return this.timeoutInterval_;
    };

    /**
     * Sets the number of milliseconds after which an incomplete request will be
     * aborted and a {@link EventType.TIMEOUT} event raised; 0 means no
     * timeout is set.
     * @param {number} ms Timeout interval in milliseconds; 0 means none.
     */
    IframeIo.prototype.setTimeoutInterval = function(ms) {
      // TODO (pupius) - never used - doesn't look like timeouts were implemented
      this.timeoutInterval_ = Math.max(0, ms);
    };

    /**
     * @return {boolean} Whether the server response is being ignored.
     */
    IframeIo.prototype.isIgnoringResponse = function() {
      return this.ignoreResponse_;
    };

    /**
     * Sets whether to ignore the response from the server by not adding any event
     * handlers to fire when the iframe loads. This is necessary when using IframeIo
     * to submit to a server on another domain, to avoid same-origin violations when
     * trying to access the response. If this is set to true, the IframeIo instance
     * will be a single-use instance that is only usable for one request.  It will
     * only clean up its resources (iframes and forms) when it is disposed.
     * @param {boolean} ignore Whether to ignore the server response.
     */
    IframeIo.prototype.setIgnoreResponse = function(ignore) {
      this.ignoreResponse_ = ignore;
    };

    /**
     * 将表单提交到iframe上面.
     * @private
     */
    IframeIo.prototype.sendFormInternal_ = function() {
      this.active_ = true;
      this.complete_ = false;
      this.lastErrorCode_ = ErrorCode.NO_ERROR;
      // 创建iframe
      this.createIframe_();

      if (ua.isIE) {
        // IE下创建iframe, 然后将表单post到iframe等待iframe触发readystate事件
        // 并最终变成 'complete'.
        // 表单的target设成iframe的name
        this.form_.target = this.iframeName_ || '';
        // 页面上加上iframe
        this.appendIframe_();
        if (!this.ignoreResponse_) {
          EventsUtil.listen(
            this.iframe_,
            EventType.READYSTATECHANGE,
            this.onIeReadyStateChange_, false, this);
        }

        /** @preserveTry */
        try {
          this.errorHandled_ = false;
          this.form_.submit();
        } catch (e) {
          // 如果提交时抛出异常则说明页面代码运行在本地文件系统上并且form的action属性指向了
          // 不存在的地址. 另外在断网且URL不可用的情况下IE也会抛出异常.
          if (!this.ignoreResponse_) {
            EventsUtil.unlisten(this.iframe_,
              EventType.READYSTATECHANGE,
              this.onIeReadyStateChange_,
              false, this);
          }

          this.handleError_(ErrorCode.ACCESS_DENIED);
        }

      } else {
        // 非IE浏览器我们用一些技巧防止影响到history记录.
        // Thanks go to jlim for the prototype for this

        log.fine(this.logger_, 'Setting up iframes and cloning form');
        // 页面加上iframe
        this.appendIframe_();

        var innerFrameName = this.iframeName_ + INNER_FRAME_SUFFIX;

        // 在iframe中动态写入另一个iframe可以避免历史记录的影响问题...
        var doc = dom.getFrameContentDocument(this.iframe_);
        var html = '<body><iframe id=' + innerFrameName + ' name=' +
          innerFrameName + '></iframe>';

        if (document.baseURI) {
          // Safari 4 和 5中新加的iframe不会继承当前文档的baseURI.
          html = '<head><base href="' + string.htmlEscape(document.baseURI) +
            '"></head>' + html;
        }

        if (ua.isOPERA) {
          // Opera如果用write方法写入内容则会增加history entry.
          // 所以用innerHTML代替.
          doc.documentElement.innerHTML = html;
        } else {
          doc.write(html);
        }

        // 监听内部iframe的load事件
        if (!this.ignoreResponse_) {
          EventsUtil.listen(
            doc.getElementById(innerFrameName),
            EventType.LOAD,
            this.onIframeLoaded_, false, this);
        }

        // 下面的做法需要将form元素跨文档复制, 用到了importNode方法, 见：
        // https://developer.mozilla.org/en-US/docs/Web/API/document.importNode
        // 至于此方法和cloneNode的不同, 见：
        // https://developer.mozilla.org/en-US/docs/Web/API/Node.cloneNode

        // text areas元素的问题, importNode won't clone changes to the value
        var textareas = this.form_.getElementsByTagName('textarea');
        var i, n;
        for (i = 0, n = textareas.length; i < n; i++) {
          // The childnodes represent the initial child nodes for the text area
          // appending a text node essentially resets the initial value ready for
          // it to be clones - while maintaining HTML escaping.
          var value = textareas[i].value;
          if (dom.getRawTextContent(textareas[i]) !== value) {
            dom.setTextContent(textareas[i], value);
            textareas[i].value = value;
          }
        }

        // Append a cloned form to the iframe
        var clone = doc.importNode(this.form_, true);
        clone.target = innerFrameName;
        // Work around crbug.com/66987
        clone.action = this.form_.action;
        doc.body.appendChild(clone);

        // Fix select boxes, importNode won't override the default value
        var selects = this.form_.getElementsByTagName('select');
        var clones = clone.getElementsByTagName('select');
        for (i = 0, n = selects.length; i < n; i++) {
          var selectsOptions = selects[i].getElementsByTagName('option');
          var clonesOptions = clones[i].getElementsByTagName('option');
          for (var j = 0, m = selectsOptions.length; j < m; j++) {
            clonesOptions[j].selected = selectsOptions[j].selected;
          }
        }

        // Some versions of Firefox (1.5 - 1.5.07?) fail to clone the value
        // attribute for <input type="file"> nodes, which results in an empty
        // upload if the clone is submitted.  Check, and if the clone failed, submit
        // using the original form instead.
        var inputs = this.form_.getElementsByTagName('input');
        var inputClones = clone.getElementsByTagName('input');
        for (i = 0, n = inputs.length; i < n; i++) {
          if (inputs[i].type === 'file') {
            if (inputs[i].value !== inputClones[i].value) {
              log.fine(this.logger_,
                  'File input value not cloned properly.  Will ' +
                  'submit using original form.');
              this.form_.target = innerFrameName;
              clone = this.form_;
              break;
            }
          }
        }

        log.fine(this.logger_, 'Submitting form');

        /** @preserveTry */
        try {
          this.errorHandled_ = false;
          clone.submit();
          doc.close();

          if (ua.isGECKO) {
            // This tests if firefox silently fails, this can happen, for example,
            // when the server resets the connection because of a large file upload
            this.firefoxSilentErrorTimeout_ =
              Timer.callOnce(this.testForFirefoxSilentError_, 250, this);
          }

        } catch (e) {
          // If submit threw an exception then it probably means the page that the
          // code is running on the local file system and the form's action was
          // pointing to a file that doesn't exist, causing the browser to fire an
          // exception.

          log.error(this.logger_,
              'Error when submitting form: ' + debug.exposeException(e));

          if (!this.ignoreResponse_) {
            EventsUtil.unlisten(
              doc.getElementById(innerFrameName),
              EventType.LOAD,
              this.onIframeLoaded_, false, this);
          }

          doc.close();

          this.handleError_(ErrorCode.FILE_NOT_FOUND);
        }
      }
    };

    /**
     * IE环境下此函数用于监听iframe的readystatechange事件
     * Handles the load event of the iframe for IE, determines if the request was
     * successful or not, handles clean up and dispatching of appropriate events.
     * @param {BrowserEvent} e The browser event.
     * @private
     */
    IframeIo.prototype.onIeReadyStateChange_ = function(e) {
      if (this.iframe_.readyState === 'complete') {
        EventsUtil.unlisten(this.iframe_, EventType.READYSTATECHANGE,
          this.onIeReadyStateChange_, false, this);
        var doc;
        /** @preserveTry */
        try {
          doc = dom.getFrameContentDocument(this.iframe_);

          // IE serves about:blank when it cannot load the resource while offline.
          if (ua.isIE && doc.location === 'about:blank' &&
            !navigator.onLine) {
            this.handleError_(ErrorCode.OFFLINE);
            return;
          }
        } catch (ex) {
          this.handleError_(ErrorCode.ACCESS_DENIED);
          return;
        }
        // 这步是真正处理IE下onload事件
        this.handleLoad_(/** @type {HTMLDocument} */(doc));
      }
    };

    /**
     * 非IE下监听iframe的load事件.
     * Handles the load event of the iframe for non-IE browsers.
     * @param {BrowserEvent} e The browser event.
     * @private
     */
    IframeIo.prototype.onIframeLoaded_ = function(e) {
      // Opera下又搞特殊, the default "about:blank" page of iframes fires an onload
      // event that we'd like to ignore.
      if (ua.isOPERA &&
        this.getContentDocument_().location === 'about:blank') {
        return;
      }
      EventsUtil.unlisten(
        this.getRequestIframe(),
        EventType.LOAD,
        this.onIframeLoaded_, false, this);

      this.handleLoad_(this.getContentDocument_());
    };

    /**
     * 不管是否IE环境,iframe的load最终都会走进这个函数.
     * Handles generic post-load
     * @param {HTMLDocument} contentDocument The frame's document.
     * @private
     */
    IframeIo.prototype.handleLoad_ = function(contentDocument) {
      log.fine(this.logger_, 'Iframe loaded');

      this.complete_ = true;
      this.active_ = false;

      var errorCode;

      // 试图得到innerHTML.  If this fails then it can be an access denied
      // error or the document may just not have a body, typical case is if there
      // is an IE's default 404.
      /** @preserveTry */
      try {
        var body = contentDocument.body;
        this.lastContent_ = body.textContent || body.innerText;
        this.lastContentHtml_ = body.innerHTML;
      } catch (ex) {
        errorCode = ErrorCode.ACCESS_DENIED;
      }

      // Use a callback function, defined by the application, to analyse the
      // contentDocument and determine if it is an error page.  Applications
      // may send down markers in the document, define JS vars, or some other test.
      var customError;
      if (!errorCode && typeof this.errorChecker_ == 'function') {
        customError = this.errorChecker_(contentDocument);
        if (customError) {
          errorCode = goog.net.ErrorCode.CUSTOM_ERROR;
        }
      }

      log.log(this.logger_, log.Level.FINER,
          'Last content: ' + this.lastContent_);
      log.log(this.logger_, log.Level.FINER,
          'Last uri: ' + this.lastUri_);

      if (errorCode) {
        log.fine(this.logger_, 'Load event occurred but failed');
        this.handleError_(errorCode, customError);

      } else {
        log.fine(this.logger_, 'Load succeeded');
        this.success_ = true;
        this.lastErrorCode_ = ErrorCode.NO_ERROR;
        // 先complete后success
        this.dispatchEvent(goog.net.EventType.COMPLETE);
        this.dispatchEvent(goog.net.EventType.SUCCESS);
        // 方法如其名, make iframe ready...
        this.makeReady_();
      }
    };

    /**
     * Handles errors.
     * @param {ErrorCode} errorCode Error code.
     * @param {Object=} opt_customError If error is CUSTOM_ERROR, this is the
     *     client-provided custom error.
     * @private
     */
    IframeIo.prototype.handleError_ = function(errorCode,
                                               opt_customError) {
      if (!this.errorHandled_) {
        this.success_ = false;
        this.active_ = false;
        this.complete_ = true;
        this.lastErrorCode_ = errorCode;
        if (errorCode === ErrorCode.CUSTOM_ERROR) {
          this.lastCustomError_ = opt_customError;
        }
        this.dispatchEvent(NetEventType.COMPLETE);
        this.dispatchEvent(NetEventType.ERROR);

        this.makeReady_();

        this.errorHandled_ = true;
      }
    };

    /**
     * Dispatches an event indicating that the IframeIo instance has received a data
     * packet via incremental loading.  The event object has a 'data' member.
     * @param {Object} data Data.
     * @private
     */
    IframeIo.prototype.handleIncrementalData_ = function(data) {
      this.dispatchEvent(new IframeIo.IncrementalDataEvent(data));
    };

    /**
     * Finalizes the request, schedules the iframe for disposal, and maybe disposes
     * the form.
     * @private
     */
    IframeIo.prototype.makeReady_ = function() {
      log.info(this.logger_, 'Ready for new requests');
      var iframe = this.iframe_;
      this.scheduleIframeDisposal_();
      this.disposeForm_();
      this.dispatchEvent(NetEventType.READY);
    };

    /**
     * 创建iframe元素发送请求时使用. 每次发请求都创建一个iframe否则会影响到history实体.
     * 具体的做法可以参见History模块, 这个用法在SPA场景中经常使用.
     * @private
     */
    IframeIo.prototype.createIframe_ = function() {
      log.fine(this.logger_, 'Creating iframe');

      this.iframeName_ = this.name_ + '_' + (this.nextIframeId_++).toString(36);

      var iframeAttributes = {'name': this.iframeName_, 'id': this.iframeName_};
      // Setting the source to javascript:"" is a fix to remove IE6 mixed content
      // warnings when being used in an https page.
      if (ua.isIE && ua.VERSION < 7) {
        iframeAttributes.src = 'javascript:""';
      }

      this.iframe_ = /** @type {HTMLIFrameElement} */(
        dom.getDomHelper(this.form_).createDom('iframe', iframeAttributes));

      var s = this.iframe_.style;
      s.visibility = 'hidden';
      s.width = s.height = '10px';
      // Chrome sometimes shows scrollbars when visibility is hidden, but not when
      // display is none.
      s.display = 'none';

      // There are reports that safari 2.0.3 has a bug where absolutely positioned
      // iframes can't have their src set.
      if (!ua.isWEBKIT) {
        s.position = 'absolute';
        s.top = s.left = '-10px';
      } else {
        s.marginTop = s.marginLeft = '-10px';
      }
    };

    /**
     * Appends the Iframe to the document body.
     * @private
     */
    IframeIo.prototype.appendIframe_ = function() {
      dom.getDomHelper(this.form_).getDocument().body.appendChild(
        this.iframe_);
    };

    /**
     * 延时执行iframe的析构. 针对FF的状态栏异常做一个特殊处理
     * Schedules an iframe for disposal, async.  We can't remove the iframes in the
     * same execution context as the response, otherwise some versions of Firefox
     * will not detect that the response has correctly finished and the loading bar
     * will stay active forever.
     * @private
     */
    IframeIo.prototype.scheduleIframeDisposal_ = function() {
      var iframe = this.iframe_;

      // There shouldn't be a case where the iframe is null and we get to this
      // stage, but the error reports in http://b/909448 indicate it is possible.
      if (iframe) {
        // NOTE(user): Stops Internet Explorer leaking the iframe object. This
        // shouldn't be needed, since the events have all been removed, which
        // should in theory clean up references.  Oh well...
        iframe.onreadystatechange = null;
        iframe.onload = null;
        iframe.onerror = null;

        this.iframesForDisposal_.push(iframe);
      }

      if (this.iframeDisposalTimer_) {
        Timer.clear(this.iframeDisposalTimer_);
        this.iframeDisposalTimer_ = null;
      }

      if (goog.userAgent.GECKO || goog.userAgent.OPERA) {
        // For FF and Opera, we must dispose the iframe async,
        // but it doesn't need to be done as soon as possible.
        // We therefore schedule it for 2s out, so as not to
        // affect any other actions that may have been triggered by the request.
        this.iframeDisposalTimer_ = Timer.callOnce(
          this.disposeIframes_, IframeIo.IFRAME_DISPOSE_DELAY_MS, this);

      } else {
        // For non-Gecko browsers we dispose straight away.
        this.disposeIframes_();
      }

      // Nullify reference
      this.iframe_ = null;
      this.iframeName_ = null;
    };

    /**
     * Disposes any iframes.
     * @private
     */
    IframeIo.prototype.disposeIframes_ = function() {
      if (this.iframeDisposalTimer_) {
        // Clear the timer
        Timer.clear(this.iframeDisposalTimer_);
        this.iframeDisposalTimer_ = null;
      }

      while (this.iframesForDisposal_.length !== 0) {
        var iframe = this.iframesForDisposal_.pop();
        log.info(this.logger_, 'Disposing iframe');
        dom.removeNode(iframe);
      }
    };

    /**
     * Disposes of the Form.  Since IE6 leaks form nodes, this just cleans up the
     * DOM and nullifies the instances reference so the form can be used for another
     * request.
     * @private
     */
    IframeIo.prototype.disposeForm_ = function() {
      if (this.form_ && this.form_ === IframeIo.form_) {
        dom.removeChildren(this.form_);
      }
      this.form_ = null;
    };

    /**
     * 私有方法返回iframe的document元素.
     * @return {HTMLDocument} The appropriate content document.
     * @private
     */
    IframeIo.prototype.getContentDocument_ = function() {
      if (this.iframe_) {
        return /** @type {HTMLDocument} */(dom.getFrameContentDocument(
          this.getRequestIframe()));
      }
      return null;
    };

    /**
     * 因为IE与非IE的iframe生成方式不同, IE下直接在当前页面包含了一个iframe而非IE下会在iframe
     * 中再生成一个iframe....(这方法竟然是公有的...)
     * @return {HTMLIFrameElement} The appropriate iframe to use for requests
     *     (created in sendForm_).
     */
    IframeIo.prototype.getRequestIframe = function() {
      if (this.iframe_) {
        return /** @type {HTMLIFrameElement} */(ua.isIE ? this.iframe_ :
          dom.getFrameContentDocument(this.iframe_).getElementById(
              this.iframeName_ + INNER_FRAME_SUFFIX));
      }
      return null;
    };

    /**
     * Tests for a silent failure by firefox that can occur when the connection is
     * reset by the server or is made to an illegal URL.
     * @private
     */
    IframeIo.prototype.testForFirefoxSilentError_ = function() {
      if (this.active_) {
        var doc = this.getContentDocument_();

        // This is a hack to test of the document has loaded with a page that
        // we can't access, such as a network error, that won't report onload
        // or onerror events.
        if (doc && !goog.reflect.canAccessProperty(doc, 'documentUri')) {
          if (!this.ignoreResponse_) {
            goog.events.unlisten(this.getRequestIframe(),
              EventType.LOAD, this.onIframeLoaded_, false, this);
          }

          if (navigator.onLine) {
            log.warning(this.logger_, 'Silent Firefox error detected');
            this.handleError_(ErrorCode.FF_SILENT_ERROR);
          } else {
            log.warning(this.logger_,
                'Firefox is offline so report offline error ' +
                'instead of silent error');
            this.handleError_(ErrorCode.OFFLINE);
          }
          return;
        }
        this.firefoxSilentErrorTimeout_ =
          Timer.callOnce(this.testForFirefoxSilentError_, 250, this);
      }
    };

    return IframeIo;
  }
);