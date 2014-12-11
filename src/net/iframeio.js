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

define('@net.IframeIo',
    [
        '@util',
        '@Timer',
        '@uri.util',
        '@dom.util',
        '@events.util',
        '@events.eventBase',
        '@events.eventTarget',
        '@events.eventType',
        '@json.util',
        '@net.errorCode',
        '@net.eventType',
        '@string.util',
        '@ua.util',
        '@log',
        '@ds.util',
        '@uri.Uri'
    ],
    function(util, Timer, uri, dom, EventsUtil, EventBase, EventTarget, EventType,
             JSON, ErrorCode, NetEventType, string, ua, log, ds, Uri) {

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
            return IframeIo.FRAME_NAME_PREFIX + counter_++;
        }


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
         * 每个frame的名称前缀
         * @type {string}
         */
        IframeIo.FRAME_NAME_PREFIX = 'oslo_frame';


        /**
         * 非IE环境要在用于发请求的inner frames加后缀
         * @type {string}
         */
        IframeIo.INNER_FRAME_SUFFIX = '_inner';


        /**
         * 请求完毕后距离析构iframe还需要一段时间. 析构可以惰性异步完成, 我们等待
         * 足够的时间防止response被处理返回的时间不够.
         * @type {number}
         */
        IframeIo.IFRAME_DISPOSE_DELAY_MS = 2000;


        /**
         * 一个表单元素的引用, 记住要发送哪个表单数据.
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
                IframeIo.INNER_FRAME_SUFFIX) ? win.parent.name : win.name;

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
         * **通过iframe发送请求. 这个方法被IframeIo当作静态方法调用.
         * 一个HTML表单元素用于提交到iframe. 简化了GET和POST的区别. iframe每次都要被创建并且销毁
         * 否则request会造成历史实体记录的麻烦.
         * A HTML form is used and submitted to the iframe, this simplifies the
         * difference between GET and POST requests. The iframe needs to be created and
         * destroyed for each request otherwise the request will contribute to the
         * history stack.
         *
         * sendFromForm方法里面做了一些技巧, 在非IE的环境下POST请求不会对历史实体产生添加.
         * sendFromForm does some clever trickery (thanks jlim) in non-IE browsers to
         * stop a history entry being added for POST requests.
         *
         * @param {Uri|string} uri Uri of the request.
         * @param {string=} opt_method Default is GET, POST uses a form to submit the
         *     request.
         * @param {boolean=} opt_noCache Append a timestamp to the request to avoid
         *     caching.
         * @param {Object|Map=} opt_data Map of key-value pairs.
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


        return IframeIo;
    }
);