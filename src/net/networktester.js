/**
 * @fileoverview 这个模块命名为NetworkTester. 用于检测当前网络是否连通.
 * @author Leo.Zhang
 * @email zmike86@gmail.com
 */

define('@net.networkTester',
    [
        '@util',
        '@Timer',
        '@uri.Uri'
    ],
    function(util, Timer, Uri) {

        'use strict';

        /**
         * NetworkTester类. 传递的参数和写成类的形式是为了更灵活的配置.
         * @param {Function} callback 测试完成后的回调函数,接受一个布尔值指明是否资源可以下载.
         * @param {Object=} opt_context 回调函数上下文.
         * @param {Uri=} opt_uri 图片地址.
         * @constructor
         */
        var NetworkTester = function(callback, opt_context, opt_uri) {
            /**
             * @type {Function}
             * @private
             */
            this.callback_ = callback;

            /**
             * @type {Object|undefined}
             * @private
             */
            this.context_ = opt_context;

            if (!opt_uri) {
                // 默认地址是搜狗搜索的logo,因为不太可能变动. 变了就是他妈坑跌.
                // 地址要加随机数防止浏览器缓存.
                // 协议同当前页面一致防止IE中不安全内容提示.
                opt_uri = new Uri('//www.sogou.com/images/logo/new/sogou.png');
                opt_uri.makeUnique();
            }

            /**
             * 要测试的图片所在的Uri
             * @type {Uri}
             * @private
             */
            this.uri_ = opt_uri;
        };


        /**
         * 超时时间
         * @type {number}
         */
        NetworkTester.DEFAULT_TIMEOUT_MS = 10000;


        /**
         * Timeout for test
         * @type {number}
         * @private
         */
        NetworkTester.prototype.timeoutMs_ = NetworkTester.DEFAULT_TIMEOUT_MS;


        /**
         * 是否开始测试.
         * @type {boolean}
         * @private
         */
        NetworkTester.prototype.running_ = false;


        /**
         * 重试次数
         * @type {number}
         * @private
         */
        NetworkTester.prototype.retries_ = 0;


        /**
         * 尝试下载次数
         * @type {number}
         * @private
         */
        NetworkTester.prototype.attempt_ = 0;


        /**
         * 每次重试之间的间隔(ms).
         * @type {number}
         * @private
         */
        NetworkTester.prototype.pauseBetweenRetriesMs_ = 0;


        /**
         * Timer for timeouts.
         * @type {?number}
         * @private
         */
        NetworkTester.prototype.timeoutTimer_ = null;


        /**
         * Timer for pauses between retries.
         * @type {?number}
         * @private
         */
        NetworkTester.prototype.pauseTimer_ = null;


        /**
         * 获取超时时间.
         * @return {number} Timeout in milliseconds.
         */
        NetworkTester.prototype.getTimeout = function() {
            return this.timeoutMs_;
        };


        /**
         * 设置超时时间.
         * @param {number} timeoutMs Timeout in milliseconds.
         */
        NetworkTester.prototype.setTimeout = function(timeoutMs) {
            this.timeoutMs_ = timeoutMs;
        };


        /**
         * 返回尝试的次数.
         * @return {number} Number of retries to attempt.
         */
        NetworkTester.prototype.getNumRetries = function() {
            return this.retries_;
        };


        /**
         * 设置尝试次数.
         * @param {number} retries Number of retries to attempt.
         */
        NetworkTester.prototype.setNumRetries = function(retries) {
            this.retries_ = retries;
        };


        /**
         * 获取每次重试之间的间隔.
         * @return {number} Pause between retries in milliseconds.
         */
        NetworkTester.prototype.getPauseBetweenRetries = function() {
            return this.pauseBetweenRetriesMs_;
        };


        /**
         * 设置每次重试之间的间隔.
         * @param {number} pauseMs Pause between retries in milliseconds.
         */
        NetworkTester.prototype.setPauseBetweenRetries = function(pauseMs) {
            this.pauseBetweenRetriesMs_ = pauseMs;
        };


        /**
         * 获取测试地址.
         * @return {Uri} The uri for the test.
         */
        NetworkTester.prototype.getUri = function() {
            return this.uri_;
        };


        /**
         * 设置测试地址.
         * @param {Uri} uri The uri for the test.
         */
        NetworkTester.prototype.setUri = function(uri) {
            this.uri_ = uri;
        };


        /**
         * 判断是否正在测试.
         * @return {boolean} True if it's running, false if it's not running.
         */
        NetworkTester.prototype.isRunning = function() {
            return this.running_;
        };


        /**
         * 开始测试.
         */
        NetworkTester.prototype.start = function() {
            if (this.running_) {
                throw Error('NetworkTester.start called when already running');
            }
            this.running_ = true;

            this.attempt_ = 0;
            this.startNextAttempt_();
        };


        /**
         * 停止测试.
         */
        NetworkTester.prototype.stop = function() {
            this.cleanupCallbacks_();
            this.running_ = false;
        };


        /**
         * 开始加载图片一次.
         * @private
         */
        NetworkTester.prototype.startNextAttempt_ = function() {
            this.attempt_++;

            if (NetworkTester.getNavigatorOffline_()) {
                // Call in a timeout to make async like the rest.
                Timer.callOnce(util.bind(this.onResult, this, false), 0);
            } else {
                this.image_ = new Image();
                this.image_.onload = util.bind(this.onImageLoad_, this);
                this.image_.onerror = util.bind(this.onImageError_, this);
                this.image_.onabort = util.bind(this.onImageAbort_, this);

                this.timeoutTimer_ = Timer.callOnce(this.onImageTimeout_,
                    this.timeoutMs_, this);
                this.image_.src = String(this.uri_);
            }
        };


        /**
         * 试图通过原生支持得到是否联网.
         * @return {boolean} Whether navigator.onLine returns false.
         * @private
         */
        NetworkTester.getNavigatorOffline_ = function() {
            return 'onLine' in navigator && !navigator.onLine;
        };


        /**
         * 图片下载成功.
         * @private
         */
        NetworkTester.prototype.onImageLoad_ = function() {
            this.onResult(true);
        };


        /**
         * 图片下载失败.
         * @private
         */
        NetworkTester.prototype.onImageError_ = function() {
            this.onResult(false);
        };


        /**
         * 图片下载被终止.
         * @private
         */
        NetworkTester.prototype.onImageAbort_ = function() {
            this.onResult(false);
        };


        /**
         * 下载超时.
         * @private
         */
        NetworkTester.prototype.onImageTimeout_ = function() {
            this.onResult(false);
        };


        /**
         * 处理结果.
         * @param {boolean} succeeded Whether the image load succeeded.
         */
        NetworkTester.prototype.onResult = function(succeeded) {
            this.cleanupCallbacks_();

            if (succeeded) {
                this.running_ = false;
                this.callback_.call(this.context_, true);
            } else {
                if (this.attempt_ <= this.retries_) {
                    if (this.pauseBetweenRetriesMs_) {
                        this.pauseTimer_ = Timer.callOnce(this.onPauseFinished_,
                            this.pauseBetweenRetriesMs_, this);
                    } else {
                        this.startNextAttempt_();
                    }
                } else {
                    this.running_ = false;
                    this.callback_.call(this.context_, false);
                }
            }
        };


        /**
         * 每次重试间隔一定时间后执行.
         * @private
         */
        NetworkTester.prototype.onPauseFinished_ = function() {
            this.pauseTimer_ = null;
            this.startNextAttempt_();
        };


        /**
         * 解绑各种事件.
         * @private
         */
        NetworkTester.prototype.cleanupCallbacks_ = function() {
            if (this.image_) {
                this.image_.onload = null;
                this.image_.onerror = null;
                this.image_.onabort = null;
                this.image_ = null;
            }
            if (this.timeoutTimer_) {
                Timer.clear(this.timeoutTimer_);
                this.timeoutTimer_ = null;
            }
            if (this.pauseTimer_) {
                Timer.clear(this.pauseTimer_);
                this.pauseTimer_ = null;
            }
        };

        return NetworkTester;

    }
);