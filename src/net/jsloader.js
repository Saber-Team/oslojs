/**
 * @fileoverview 通过创建script元素加载js文件.代码从net.Jsonp模块中重构分离出来.用于跨域.
 * @author Leo.Zhang
 * @email zmike86@gmail.com
 */

define('@net.JSloader',
    [
        '@util',
        '@array',
        '@async.Deferred',
        '@debug.Error',
        '@dom.util',
        '@dom.tagName'
    ],
    function(util, array, Deferred, DebugError, dom, Tag) {

        'use strict';

        /**
         * util.global的属性名称保存验证对象(下载的script存的)
         * The name of the property of util.global under which the JavaScript
         * verification object is stored by the loaded script.
         * @type {string}
         * @private
         */
        var GLOBAL_VERIFY_OBJS_ = 'oslo_verification';


        /**
         * 默认的超时时间.
         * @type {number}
         */
        var DEFAULT_TIMEOUT = 5000;


        /**
         * 创建jsloader的选项. 用于JSloader.send.
         * timeout: 超时时间 5000ms.
         * document: 用哪个document下载JavaScript. 默认是当前document.
         * cleanupWhenDone: 脚本加载完后是否删除脚本节点. 如果只想从js文件读取数据然后不再使用可以设置为true. 默认false.
         * @typedef {{
         *   timeout: (number|undefined),
         *   document: (HTMLDocument|undefined),
         *   cleanupWhenDone: (boolean|undefined)
         * }}
         */
        var Options = null;


        /**
         * 存放等待下载的script urls
         * @type {Array.<string>}
         * @private
         */
        var scriptsToLoad_ = [];


        /**
         * 下载并执行多个script文件, 保证他们的顺序.
         * 我们必须串行下载script(load script 1, exec script 1, load script 2,
         * exec script 2, and so on), 这会比网络的并行下载要慢.
         * 如果要下载很多script但没有依赖关系, 应该调用net.JSloader.load多次即可.
         * 如果要下载的很多文件在同一个域, 可能需要module.ModuleLoader.
         * @param {Array.<string>} uris 文件地址数组.
         * @param {JSloader.Options=} opt_options Optional parameters.
         */
        function loadMany(uris, opt_options) {
            // Loading the scripts in serial introduces asynchronosity into the flow.
            // Therefore, there are race conditions where client A can kick off the load
            // sequence for client B, even though client A's scripts haven't all been
            // loaded yet.
            //
            // To work around this issue, all module loads share a queue.
            if (!uris.length) {
                return;
            }

            var isAnotherModuleLoading = scriptsToLoad_.length;
            array.extend(scriptsToLoad_, uris);
            if (isAnotherModuleLoading) {
                // loader正在下载其他脚本.
                // 为了防止多个script并行下载带来的紊乱, 我们只在下载队列后附加URLs
                return;
            }

            uris = scriptsToLoad_;
            var popAndLoadNextScript = function() {
                var uri = uris.shift();
                var deferred = load(uri, opt_options);
                // 如果队列中仍有等待的script, 通过deferred对象的回调继续下载下一个.
                if (uris.length) {
                    deferred.addBoth(popAndLoadNextScript);
                }
            };
            // 开始下载第一个
            popAndLoadNextScript();
        }


        /**
         * 下载并执行JavaScript. 当js文件下载完毕, 会执行回调.
         * 客户端的职责之一就是验证js是否正确执行.
         * @param {string} uri JavaScript文件地址.
         * @param {Options=} opt_options 可选的参数.
         * @return {!Deferred} The deferred result, that may be used to add
         *     callbacks and/or cancel the transmission.
         *     The error callback will be called with a single JSloader.Error
         *     parameter.
         */
        function load(uri, opt_options) {
            var options = opt_options || {};
            var doc = options.document || document;

            var script = dom.createDom(Tag.SCRIPT);
            // async.Deferred的构造函数传一个回调和此回调的执行上下文
            var request = {
                script_: script,
                timeout_: undefined
            };
            var deferred = new Deferred(cancel_, request);

            // 计算超时timeout, 如果不想有超时, 可以设置timeout = 0.
            var timeout = null;
            var timeoutDuration = !util.isNull(options.timeout) ? options.timeout : DEFAULT_TIMEOUT;
            if (timeoutDuration > 0) {
                timeout = window.setTimeout(function() {
                    cleanup_(script, true);
                    // 超时调用deferred的errback
                    deferred.errback(new JsloaderError(
                        ErrorCode.TIMEOUT, 'Timeout reached for loading script ' + uri));
                }, timeoutDuration);
                request.timeout_ = timeout;
            }

            // Hang the user callback to be called when the script completes to load.
            // NOTE(user): 这个回调在IE下即便发生错误也依然会发生. 但业务代码应该有责任对script
            // 是否正确运行做校验.
            script.onload = script.onreadystatechange = function() {
                if (!script.readyState ||
                    script.readyState === 'loaded' ||
                    script.readyState === 'complete') {
                    var removeScriptNode = options.cleanupWhenDone || false;
                    cleanup_(script, removeScriptNode, timeout);
                    deferred.callback(null);
                }
            };

            // NOTE(user): 不支持IE.
            script.onerror = function() {
                cleanup_(script, true, timeout);
                deferred.errback(new JsloaderError(
                    ErrorCode.LOAD_ERROR, 'Error while loading script ' + uri));
            };

            // Add the script element to the document.
            dom.setProperties(script, {
                'type': 'text/javascript',
                'charset': 'UTF-8',
                // NOTE(user): Safari never loads the script if we don't set
                // the src attribute before appending.
                'src': uri
            });
            var scriptParent = getScriptParentElement_(doc);
            scriptParent.appendChild(script);

            return deferred;
        }


        /**
         * todo
         * 下载一个JavaScript文件并验证是否执行成功, 利用一个验证对象.
         * 这个模式好比AMD加载模块后在全局注册模块唯一id, 检验模块是否注册成功(加载成功)
         * 这样的话前端就可以知道该模块的状态(包括404和timeout).
         *
         * 验证对象会在下载的script文件里最后设置.
         *
         * 我们在send成功后的回调里检验对象, 如果未定义就触发error callback.
         * We verify this object was set and return its value in the success callback.
         * If the object is not defined we trigger an error callback.
         *
         * @param {string} uri The URI of the JavaScript.
         * @param {string} verificationObjName The name of the verification object that
         *     the loaded script should set.
         * @param {Options} options Optional parameters. See jsloader.Options documentation for details.
         * @return {!Deferred} The deferred result, that may be used to add
         *     callbacks and/or cancel the transmission.
         *     The success callback will be called with a single parameter containing
         *     the value of the verification object.
         *     The error callback will be called with a single JSloader.Error
         *     parameter.
         */
        function loadAndVerify(uri, verificationObjName, options) {
            // Define the global objects variable.
            if (!util.global[GLOBAL_VERIFY_OBJS_]) {
                util.global[GLOBAL_VERIFY_OBJS_] = {};
            }
            var verifyObjs = util.global[GLOBAL_VERIFY_OBJS_];

            // Verify that the expected object does not exist yet.
            if (util.isDef(verifyObjs[verificationObjName])) {
                // TODO(user): Error or reset variable?
                return Deferred.fail(new JsloaderError(
                    ErrorCode.VERIFY_OBJECT_ALREADY_EXISTS,
                    'Verification object ' + verificationObjName + ' already defined.'));
            }

            // Send request to load the JavaScript.
            var sendDeferred = load(uri, options);

            // Create a deferred object wrapping the send result.
            var deferred = new Deferred(util.bind(sendDeferred.cancel, sendDeferred));

            // Call user back with object that was set by the script.
            sendDeferred.addCallback(function() {
                var result = verifyObjs[verificationObjName];
                if (util.isDef(result)) {
                    deferred.callback(result);
                    // 记载成功也要删除文件标示?
                    // todo
                    delete verifyObjs[verificationObjName];
                } else {
                    // Error: script was not loaded properly.
                    deferred.errback(new JsloaderError(
                        ErrorCode.VERIFY_ERROR,
                        'Script ' + uri + ' loaded, but verification object ' +
                            verificationObjName + ' was not defined.'));
                }
            });

            // Pass error to new deferred object.
            sendDeferred.addErrback(function(error) {
                if (util.isDef(verifyObjs[verificationObjName])) {
                    delete verifyObjs[verificationObjName];
                }
                deferred.errback(error);
            });

            return deferred;
        }


        /**
         * Gets the DOM element under which we should add new script elements.
         * How? Take the first head element, and if not found take doc.documentElement,
         * which always exists.
         * todo 忽略了Head里有BaseElement那个经典bug
         *
         * @param {!HTMLDocument} doc The relevant document.
         * @return {!Element} The script parent element.
         * @private
         */
        function getScriptParentElement_(doc) {
            var headElements = doc.getElementsByTagName(Tag.HEAD);
            if (!headElements || headElements.length === 0) {
                return doc.documentElement;
            } else {
                return headElements[0];
            }
        }


        /**
         * 这是一个私有方法, 用到的地方就是Deferred对象的回调, 而函数上下文是一个特殊指定对象:
         * {script_: Element, timeout_: number}. 目的是取消这个请求.
         * @this {{script_: Element, timeout_: number}} The request context.
         * @private
         */
        function cancel_() {
            var request = this;
            if (request && request.script_) {
                if (request.script_ && request.script_.tagName == 'SCRIPT') {
                    cleanup_(request.script_, true, request.timeout_);
                }
            }
        }


        /**
         * 移除script节点和timerId.
         * @param {Node} scriptNode The node to be cleaned up.
         * @param {boolean} removeScriptNode 是否移除script节点.
         * @param {?number=} opt_timeout The timeout handler to cleanup.
         * @private
         */
        function cleanup_(scriptNode, removeScriptNode, opt_timeout) {
            if (!util.isNull(opt_timeout)) {
                util.global.clearTimeout(opt_timeout);
            }

            scriptNode.onload = util.nullFunction;
            scriptNode.onerror = util.nullFunction;
            scriptNode.onreadystatechange = util.nullFunction;

            // Do this after a delay (removing the script node of a running script can
            // confuse older IEs).
            if (removeScriptNode) {
                window.setTimeout(function() {
                    dom.removeNode(scriptNode);
                }, 0);
            }
        }


        /**
         * Possible error codes for jsloader.
         * @enum {number}
         */
        var ErrorCode = {
            LOAD_ERROR: 0,
            TIMEOUT: 1,
            VERIFY_ERROR: 2,
            VERIFY_OBJECT_ALREADY_EXISTS: 3
        };


        /**
         * A jsloader error.
         * @param {ErrorCode} code The error code.
         * @param {string=} opt_message Additional message.
         * @constructor
         * @extends {DebugError}
         */
        var JsloaderError = function(code, opt_message) {
            var msg = 'Jsloader error (code #' + code + ')';
            if (opt_message) {
                msg += ': ' + opt_message;
            }
            DebugError.call(this, msg);
            /**
             * The code for this error.
             * @type {ErrorCode}
             */
            this.code = code;
        };


        util.inherits(JsloaderError, DebugError);


        // export jsloader object
        return {
            GLOBAL_VERIFY_OBJS_: GLOBAL_VERIFY_OBJS_,
            DEFAULT_TIMEOUT: DEFAULT_TIMEOUT,
            Options: Options,
            loadMany: loadMany,
            load: load,
            loadAndVerify: loadAndVerify,
            cancel_: cancel_,
            cleanup_: cleanup_,
            ErrorCode: ErrorCode,
            JsloaderError: JsloaderError
        };

    }
);