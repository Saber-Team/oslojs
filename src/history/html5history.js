/**
 * @fileoverview 基于HTML5的历史状态管理器, 和History兼容
 * @modified Leo.Zhang
 * @email zmike86@gmail.com
 */

define('Sogou.History.Html5History',
    [
        'Sogou.Util',
        'Sogou.Events.Util',
        'Sogou.Events.EventTarget',
        'Sogou.Events.EventType',
        'Sogou.History.Event'
    ],
    function(util, EventUtil, EventTarget, EventType, HistoryEvent) {

        'use strict';

        /**
         * 用HTML5的APIs实现兼容Sogou.History.History的历史管理器.
         * @param {Window=} opt_win 监听和分发历史事件的window对象.
         * @param {Html5History.TokenTransformer=} opt_transformer
         *     可选的. 由token生成url的转换器, 可以不借助hash片段存储token.
         * @constructor
         * @extends {EventTarget}
         */
        function Html5History(opt_win, opt_transformer) {
            EventTarget.call(this);
            if (Html5History.isSupported(opt_win))
                throw 'HTML5 history is not supported.';

            /**
             * 一般都是当前窗口.
             * @type {Window}
             * @private
             */
            this.window_ = opt_win || window;

            /**
             * 由token生成url的转换器, 可以不借助hash片段存储token.
             * @type {Html5History.TokenTransformer}
             * @private
             */
            this.transformer_ = opt_transformer || null;

            // hashchange和popstate事件都会执行this.onHistoryEvent_
            EventUtil.listen(this.window_, EventType.POPSTATE, this.onHistoryEvent_, false, this);
            EventUtil.listen(this.window_, EventType.HASHCHANGE, this.onHistoryEvent_, false, this);
        }
        util.inherits(Html5History, EventTarget);


        /**
         * 标识是否Html5History是被支持的. 其实就是看window.history.pushState
         * @param {Window=} opt_win Optional window to check.
         * @return {boolean} Whether html5 history is supported.
         */
        Html5History.isSupported = function(opt_win) {
            var win = opt_win || window;
            return !!(win.history && win.history.pushState);
        };


        /**
         * 当前历史对象是否激活状态.
         * @type {boolean}
         * @private
         */
        Html5History.prototype.enabled_ = false;


        /**
         * 是否使用hash片段存储token, defaults to true.
         * @type {boolean}
         * @private
         */
        Html5History.prototype.useFragment_ = true;


        /**
         * 若不用hash片段则用path, path前缀会在所有tokens之前默认是'/'.
         * @type {string}
         * @private
         */
        Html5History.prototype.pathPrefix_ = '/';


        /**
         * 开始或停止History. When enabled, History会立刻分发事件for the current location.
         * 调用程序可以在构造函数执行和setEnabled执行之间建立事件监听器.
         * @param {boolean} enable 是否开启history.
         */
        Html5History.prototype.setEnabled = function(enable) {
            if (enable === this.enabled_)
                return;

            this.enabled_ = enable;
            if (enable) {
                this.dispatchEvent(new HistoryEvent(this.getToken(), false));
            }
        };


        /**
         * 返回token.(不包括#)
         * @return {string} The current token.
         */
        Html5History.prototype.getToken = function() {
            if (this.useFragment_) {
                var loc = this.window_.location.href;
                var index = loc.indexOf('#');
                return index < 0 ? '' : loc.substring(index + 1);
            } else {
                return this.transformer_ ?
                    this.transformer_.retrieveToken(this.pathPrefix_, this.window_.location) :
                    this.window_.location.pathname.substr(this.pathPrefix_.length);
            }
        };


        /**
         * 设置历史state.
         * @param {string} token The history state identifier.
         * @param {string=} opt_title 可选的对应此历史实体的title.
         */
        Html5History.prototype.setToken = function(token, opt_title) {
            if (token === this.getToken())
                return;

            // Per externs/gecko_dom.js document.title can be null.
            this.window_.history.pushState(null,
                opt_title || this.window_.document.title || '', this.getUrl_(token));
            this.dispatchEvent(new HistoryEvent(token, false));
        };


        /**
         * 只替换当前的历史记录而不影响其他的历史记录.
         * @param {string} token The history state identifier.
         * @param {string=} opt_title 可选的title同历史实体关联起来.
         */
        Html5History.prototype.replaceToken = function(token, opt_title) {
            // Per externs/gecko_dom.js document.title can be null.
            this.window_.history.replaceState(null,
                opt_title || this.window_.document.title || '', this.getUrl_(token));
            this.dispatchEvent(new HistoryEvent(token, false));
        };


        /** @override */
        Html5History.prototype.disposeInternal = function() {
            EventUtil.unlisten(this.window_, EventType.POPSTATE, this.onHistoryEvent_, false, this);
            // 构造函数里这个绑定是无条件的,但是useFragment_默认是true
            // 如果调用setUseFragment(false)的话就已经解绑此事件了
            // 所以这块分条件解绑
            if (this.useFragment_) {
                EventUtil.unlisten(this.window_, EventType.HASHCHANGE, this.onHistoryEvent_, false, this);
            }
        };


        /**
         * 这是一个新的API设置是否使用hash片段存储tokens.
         * @param {boolean} useFragment
         */
        Html5History.prototype.setUseFragment = function(useFragment) {
            if (this.useFragment_ !== useFragment) {
                if (useFragment) {
                    EventUtil.listen(this.window_, EventType.HASHCHANGE,
                        this.onHistoryEvent_, false, this);
                } else {
                    EventUtil.unlisten(this.window_, EventType.HASHCHANGE,
                        this.onHistoryEvent_, false, this);
                }
                this.useFragment_ = useFragment;
            }
        };


        /**
         * 设置路径前缀在存储tokens时有用. 路径前缀应该以'/'开始和结束.
         * @param {string} pathPrefix Sets the path prefix.
         */
        Html5History.prototype.setPathPrefix = function(pathPrefix) {
            this.pathPrefix_ = pathPrefix;
        };


        /**
         * @return {string} The path prefix.
         */
        Html5History.prototype.getPathPrefix = function() {
            return this.pathPrefix_;
        };


        /**
         * history.pushState时调用的获取URL的方法.
         * @param {string} token The history token.
         * @return {string} The URL.
         * @private
         */
        Html5History.prototype.getUrl_ = function(token) {
            if (this.useFragment_) {
                return '#' + token;
            } else {
                // search部分包括问号
                return this.transformer_ ?
                    this.transformer_.createUrl(token, this.pathPrefix_, this.window_.location) :
                    this.pathPrefix_ + token + this.window_.location.search;
            }
        };


        /**
         * hashchange或者popstate时手动分发Sogou.History.Event事件.
         * @param {BrowserEvent} e The browser event object.
         * @private
         */
        Html5History.prototype.onHistoryEvent_ = function(e) {
            if (this.enabled_) {
                this.dispatchEvent(new HistoryEvent(this.getToken(), true));
            }
        };


        /**
         * token转换器可以从一个token创建一个URL.
         * 这个接口的实现类会被Html5History使用.
         * 前提是: Html5History没有使用hash存储状态.
         * @interface
         */
        Html5History.TokenTransformer = function() {};


        /**
         * 根据路径前缀设定和window.location得到历史记录的token.
         * @param {string} pathPrefix 路径前缀; always begin with a slash.
         * @param {Location} location window.location object.
         * @return {string} token The history token.
         */
        Html5History.TokenTransformer.prototype.retrieveToken = function(
            pathPrefix, location) {};


        /**
         * 不用hash的时候用此方法创建新的URL推入HTML5历史记录堆栈.
         * @param {string} token The history token.
         * @param {string} pathPrefix 使用的路径前缀; always begin with a slash.
         * @param {Location} location window.location object.
         * @return {string} url 返回创建的URL,(去掉{@code protocol://host:port}部分); 必须以'/'开头.
         */
        Html5History.TokenTransformer.prototype.createUrl = function(
            token, pathPrefix, location) {};


        // export
        return Html5History;
    }
);