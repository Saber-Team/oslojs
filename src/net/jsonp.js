/**
 * @fileoverview 跨域GET请求的解决方案.XMLHttpRequest有这方面的限制,使用动态script插入技术
 * 用法:
 *   var jsonp = new Sogou.Net.Jsonp(new Sogou.Uri('http://my.host.com/servlet'));
 *   var payload = { 'foo': 1, 'bar': true };
 *   jsonp.send(payload, function(reply) { alert(reply) });
 *
 * 这种方案支持所有主流浏览器
 *   IE 6.0+, Firefox 0.8+, Safari 1.2.4+,
 *   Netscape 7.1+, Mozilla 1.4+, Opera 8.02+.
 *
 * @author Leo.Zhang
 * @email zmike86@gmail.com
 */

define('@net.Jsonp',
    [
        '@util',
        '@uri.Uri',
        '@net.JSloader'
    ],
    function(util, Uri, jsloader) {

        'use strict';

        /**
         * 创建跨域数据传输的方案。默认5秒没有响应通道定义传输失败并触发complete。
         * @param {Uri|string} uri 服务端数据交互的Uri (e.g., "http://maps.google.com/maps/geo").
         * @param {string=} opt_callbackParamName 回调函数名称. 默认是"callback".
         * @constructor
         */
        var Jsonp = function(uri, opt_callbackParamName) {

            /**
             * Uri的一个实例发送的服务端地址
             * @type {Uri}
             * @private
             */
            this.uri_ = new Uri(uri);

            /**
             * 附属在uri后面的回调参数名
             * @type {string}
             * @private
             */
            this.callbackParamName_ = opt_callbackParamName ? opt_callbackParamName : 'callback';

            /**
             * 定个超时5秒否则自动结束
             * @type {number}
             * @private
             */
            this.timeout_ = 5000;
        };


        /**
         * 保存回调的全局对象的属性名.
         */
        Jsonp.CALLBACKS = '_callbacks_';


        /**
         * 计数器用于生成回调的唯一ID. 这个计数器必须是全局的因为所有的回调函数名生成规则要避免重复.
         * @private
         */
        Jsonp.scriptCounter_ = 0;


        /**
         * 设置默认超时. 超过5秒认为失败,若要无限制等下去设置一个负数
         * @param {number} timeout 毫秒数
         */
        Jsonp.prototype.setRequestTimeout = function(timeout) {
            this.timeout_ = timeout;
        };


        /**
         * 获取超时时间
         * @return {number} The timeout value.
         */
        Jsonp.prototype.getRequestTimeout = function() {
            return this.timeout_;
        };


        /**
         * 向服务端发送数据(只能GET), 回调会分发到第二个参数replyCallback.
         * 如果默认时间内没有回调发生会触发error callback，传递原始的payload参数作为形参.
         * 如果没有回调成功函数, 则服务端应该和前端提前商定好全局回调的名称. 没有&callback=
         * URL参数发送的话, script element会在超时后被清除.
         *
         * @param {Object=} opt_payload 键值对.会附加到URI后面.
         * @param {Function=} opt_replyCallback 回调函数接收返回数据作为参数.
         * @param {Function=} opt_errorCallback 超时回调,若有payload (if given), 或者null.
         * @param {string=} opt_callbackParamValue 名字作为callbackParamName的值传给服务端.
         *     如果请求确定可以自己提供一个函数名,这样也方便缓存请求结果.
         *     NOTE: 如果有多个相同opt_callbackParamValue的请求, 只有最后一个可以被触发. 因为
         *         global[Jsonp.CALLBACKS][id]只能存一个函数.
         *
         * @return {Object} 返回一个 request对象的描述符,可被用于取消这次任务, or null, if the message may not be cancelled.
         */
        Jsonp.prototype.send = function(opt_payload,
                                        opt_replyCallback,
                                        opt_errorCallback,
                                        opt_callbackParamValue) {

            var payload = opt_payload || null;

            // 同dojo一样生成一个全局唯一的ID作为回调的函数名并且
            // 注册到window[Jsonp.CALLBACKS]
            var id = opt_callbackParamValue ||
                '_' + (Jsonp.scriptCounter_++).toString(36) + util.now().toString(36);

            if (!util.global[Jsonp.CALLBACKS]) {
                util.global[Jsonp.CALLBACKS] = {};
            }

            // Create a new Uri object onto which this payload will be added
            var uri = this.uri_.clone();
            // 将要发送的数据挂在QS里
            if (payload) {
                Jsonp.addPayloadToUri_(payload, uri);
            }

            // 设置回调
            if (opt_replyCallback) {
                var reply = Jsonp.newReplyHandler_(id, opt_replyCallback);
                util.global[Jsonp.CALLBACKS][id] = reply;
                uri.setParameterValues(this.callbackParamName_, Jsonp.CALLBACKS + '.' + id);
            }

            // load方法返回一个defer对象
            var deferred = jsloader.load(uri.toString(),
                {
                    timeout: this.timeout_,
                    cleanupWhenDone: true
                });
            var error = Jsonp.newErrorHandler_(id, payload, opt_errorCallback);
            deferred.addErrback(error);

            return {
                id_: id,
                deferred_: deferred
            };
        };


        /**
         * 这里的参数是个强制约定, 必须是send返回的对象.
         * @param {Object} request send方法返回的request对象的描述符.
         */
        Jsonp.prototype.cancel = function(request) {
            if (request) {
                if (request.deferred_) {
                    request.deferred_.cancel();
                }
                if (request.id_) {
                    Jsonp.cleanup_(request.id_, false);
                }
            }
        };


        /**
         * 超时后调用.
         * @param {string} id 全局回调id.
         * @param {Object} payload 发送给服务端的数据.
         * @param {Function=} opt_errorCallback 超时回调函数.
         * @return {!Function} 返回一个闭包.
         * @private
         */
        Jsonp.newErrorHandler_ = function(id, payload, opt_errorCallback) {
            return function() {
                Jsonp.cleanup_(id, false);
                if (opt_errorCallback) {
                    opt_errorCallback(payload);
                }
            };
        };


        /**
         * 当服务器代码执行时, 实际上调用replyCallback.
         * @param {string} id window[Jsonp.CALLBACKS]的id.
         * @param {Function} replyCallback 成功回调函数.
         * @return {Function} 包裹的回调函数.
         * @private
         */
        Jsonp.newReplyHandler_ = function(id, replyCallback) {
            /**
             * 成功后的回调.将error timeout handler设置为空,并且调用user's handler.
             * 随后移除script node and itself.
             * @param {...Object} var_args 服务端返回数据.
             */
            return function(var_args) {
                Jsonp.cleanup_(id, true);
                replyCallback.apply(undefined, arguments);
            };
        };


        /**
         * 在全局对象window[Jsonp.CALLBACKS]里移除指定id的replyFunction.
         * @param {string} id 要移除的window[Jsonp.CALLBACKS]的id.
         * @param {boolean} deleteReplyHandler true则直接移除script节点,否则设置成一个空函数
         *     (if we know the callback could never be called again).
         * @private
         */
        Jsonp.cleanup_ = function(id, deleteReplyHandler) {
            if (util.global[Jsonp.CALLBACKS][id]) {
                if (deleteReplyHandler) {
                    delete util.global[Jsonp.CALLBACKS][id];
                } else {
                    // 简单删除script标签不能阻止脚本下载执行,所以将回调设置成什么都不执行的空函数.
                    util.global[Jsonp.CALLBACKS][id] = util.nullFunction;
                }
            }
        };


        /**
         * 返回一个附带了query string的URI实例对象.
         * <p>方法中用到 hasOwnProperty() 对象的原型属性.</p>
         * @param {!Object} payload 附带的数据对象, e.g.:
         *     {"foo": [1,2]} will encode to "foo=1&foo=2".
         * @param {!Uri} uri 附带了encoded query string的URI实例对象.
         * @return {!Uri} Uri实例.
         * @private
         */
        Jsonp.addPayloadToUri_ = function(payload, uri) {
            for (var name in payload) {
                // NOTE(user): Safari/1.3 doesn't have hasOwnProperty(). In that
                // case, we iterate over all properties as a very lame workaround.
                if (!payload.hasOwnProperty || payload.hasOwnProperty(name)) {
                    uri.setParameterValues(name, payload[name]);
                }
            }
            return uri;
        };


        return Jsonp;

    }
);

// WARNING WARNING WARNING WARNING WARNING WARNING WARNING WARNING WARNING
//
// 因为允域发请求,带来一些安全隐患,确保服务端是可信任的 并且也要防止这个接口被其他恶意代码利用.
// 服务端接口不要返回敏感数据, 比如和会话或者cookie相关的敏感数据.
//
// WARNING WARNING WARNING WARNING WARNING WARNING WARNING WARNING WARNING