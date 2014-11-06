/**
 * @fileoverview 浏览器历史管理类.
 *
 * 这个模块可以创建历史状态及切换历史记录而不离开当前页面. 用户无论点击浏览器的前进后退都会在
 * 当前页面完成操作.
 *
 * 类的实例有两种初始化模式. 对于可见模式(visible mode), 当前页面的路径和状态会呈现在地址栏中
 * url的hash片段部分(after the '#'). 这些地址可以被加入书签,复制粘贴到另外一个浏览器地址栏,
 * 表现的和一般地址一样.
 *
 * 如果初始化为不可见模式(invisible mode), 用户点击前进后退仍然会影响页面状态, 但当前状态在
 * 地址栏看不到. 这些状态对应的地址不能加入书签(因为会是最初的地址),也不能编辑(因为编辑的是原始url).
 *
 * 在同一页面使用两种模式有可能?, 但浏览器有缺陷不推荐这么做.
 *
 * 测试下列浏览器:
 * <ul>
 *   <li>Firefox 1.0-4.0
 *   <li>Internet Explorer 5.5-9.0
 *   <li>Opera 9+
 *   <li>Safari 4+
 * </ul>
 *
 * @modified Leo.Zhang
 * @email zmike86@gmail.com
 * @see ../../demos/history/history1.html
 * @see ../../demos/history/history2.html
 */

// 一些浏览器实现记录:

/**
 * Firefox (through version 2.0.0.1):
 *
 * 理想状态下,在隐藏的iframe中导航可以用about:blank#state完成而不用在服务器上真的有一个页面.
 * 设置iframe的about:blank的hash会创建历史记录实体, 但这里的hash不会被记录并且会在用户点击
 * 后退按钮后丢失. Opera也有类似情况.
 * 在不可见模式下必须提供一个空白的HTML页面用于将不可见的状态记录到iframe的hash部分.
 *
 * 离开有history对象的页面再通过后退按钮返从别的网站回时, iframe的上一个状态被覆盖.
 * 最近的状态保存在隐藏的input控件中可以避免丢失状态,得以保留.
 *
 * Firefox 不会存储动态创建的input元素的previous value. 为了能保存状态, 隐藏的input元素必须
 * 已经在文档中存在, 可以是写在html模版里或者通过document.write写入.
 * History构造函数如果没有传入input元素的引用, 则history实例会用document.write创建一个, 这种
 * 情况history object必须是在script执行时初始化的否则文档加载完毕document.write会冲刷掉内容.
 *
 * 手动编辑地址栏改变hash的话会使地址栏的更新显示失效.
 * 页面照常工作,但地址栏的地址就不正确了除非页面reloaded.
 *
 * 注意: Firefox会对url中的hash片段中non-regular ascii字符进行编码, 还包括 |space|, ", <, 和 >.
 * 如果想要这些字符出现在token中就不行了,比如 setToken('<b>') 会导致hash片段变成 "%3Cb%3E",
 * "esp&eacute;re" 将会显示 "esp%E8re". (IE允许unicode characters出现在hash片段)
 *
 * todo: Should we encapsulate this escaping into the API for visible
 * history and encode all characters that aren't supported by Firefox?  It also
 * needs to be optional so apps can elect to handle the escaping themselves.
 */


/**
 * Internet Explorer (through version 7.0):
 *
 * IE(6&7)下改变url的hash部分不会改变历史堆栈. 有个比较具有欺骗性的办法: 用一个隐藏的iframe
 * 中的document.open和document.write两个方法往iframe中写入内容会迫使当前window对象生成新的
 * 历史浏览记录.
 *
 * IE下如果从 /foo.html#someFragment 导航到 /foo.html 会丢失所有历史堆栈.
 * 解决办法是在每个URL后附加#. 但如果加载某些没有 # 的网页时就悲剧了, 会出现url加载后变化成带有＃
 * 的url地址. 如果hash一直存在就没这个问题.
 *
 * 手动在地址栏编辑hash在IE6的情况下, 点击返回按钮时会呈现空白页(replace the page). 这种用户体验
 * 非常差但是目前不可避免,没有解决方案.
 *
 * IE还有一个bug:当页面通过服务端重定向加载时, 设置一个新的location.hash值会导致页面重新加载.
 * 这种情况发生在调用setToken()设置一个新值的时候. 解决方案是强迫客户端早些时候reload, 比如
 * 设置window.location.hash = window.location.hash, 这行代码在没有bug的浏览器也是无害的,
 * 因为不执行任何操作.
 *
 * Internet Explorer 8.0, Webkit 532.1 and Gecko 1.9.2:
 *
 * IE8开始就支持了HTML5 onhashchange事件, 这意味着我们不用polling检测hash片段是否变化.
 * Chrome 和 Firefox 在更早的build版本就支持了hashchange, 从wekbit 532.1 和 gecko 1.9.2开始.
 * http://www.w3.org/TR/html5/history.html
 * 注意: 必须要知道文档必须具有<!DOCTYPE html>才能开启IE8的HTML5 mode. 若没有,IE8会进入IE7兼容模式
 * (也可以手动设置浏览器渲染模式).
 *
 */


/**
 * Opera (through version 9.02):
 *
 * 页面上如果导航的过快大于某个阈值会引起Opera取消所有timeouts 和 intervals, 包括对hash片段
 * 变化监测的轮询函数. 这种情况js无法检测到, 利用js监测一些input events然后重启轮询函数.
 *
 * location.replace is adding a history entry inside setHash_, despite
 * documentation that suggests it should not.
 */


/**
 * Safari (through version 2.0.4):
 *
 * 在点击后退按钮后, JavaScript将不再能够读取location.hash属性的值. 在稍晚的WebKit发布版本中
 * 已经修复,但某些版本仍然存在. 现在来看,唯一的手段是在Safari中不用history states. 页面仍然可以
 * 通过历史对象导航, 但后退按钮不能够存储前一个状态.
 *
 * Safari中使用超链接进行页面导航时或设置上history states, 但不允许轮询hash?(polling of the hash),
 * 所以跟随实际的超链接锚点会创建没用的历史记录实体. location.replace对于这种情况也无效?. 用户体验
 * 不是很好, 但接下来的Webkit发布版本修复了这个问题.
 *
 *
 * WebKit (nightly version 420+):
 *
 * 大部分是正常工作. 返回到一个不可见模式记录历史状态的页面,不会存储之前的状态(state),
 * 而且pageshow事件也不会触发. 解决方案还在寻找中.
 */


/**
 * 兼容HTML5的浏览器(Firefox 4, Chrome, Safari 5)
 *
 * 都没什么问题. History包下的Html5History模块提供了更简单的实现,更适用于现代浏览器.
 * 两种实现应该合并, 提供统一的门面类自动调用正确的实现方法.
 */


define('@history.history',
    [
        '@util',
        '@timer',
        '@dom.util',
        '@events.handlermanager',
        '@events.eventtarget',
        '@events.eventtype',
        '@history.eventtype',
        '@history.event',
        '@memo',
        '@string.util',
        '@ua.util'
    ],
    function(util, Timer, dom, HandlerManager, EvtTarget, EventType,
             HistoryEventType, HistoryEvent, memo, string, UA) {

        'use strict';

        /**
         * Opera中用到的一系列input events, 用于重启监听history的timer.
         * (@see History#operaDefibrillator_).
         * @type {Array.<string>}
         * @private
         */
        var INPUT_EVENTS_ = [
            EventType.MOUSEDOWN,
            EventType.KEYDOWN,
            EventType.MOUSEMOVE
        ];


        /**
         * iframe中文档的内容,用于IE. title在历史记录下拉列表可见。
         * iframe的状态保存在body的innerHTML里.
         * @type {string}
         * @private
         */
        var IFRAME_SOURCE_TEMPLATE_ = '<title>%s</title><body>%s</body>';


        /**
         * 隐藏iframe的HTML模板
         * @type {string}
         * @private
         */
        var IFRAME_TEMPLATE_ = '<iframe id="%s" style="display:none" %s></iframe>';


        /**
         * 隐藏input的HTML模板
         * @type {string}
         * @private
         */
        var INPUT_TEMPLATE_ = '<input type="text" name="%s" id="%s" style="display:none">';


        /**
         * History实例的计数器，方便生成UIDs
         * @type {number}
         * @private
         */
        var historyCount_ = 0;


        /**
         * 轮训iframe状态的时间间隔 ms.
         * @enum {number}
         */
        var PollingType = {
            NORMAL: 150,
            LONG: 10000
        };


        /**
         * 标识是否支持历史管理的onhashchange事件.
         * {@link http://www.w3.org/TR/html5/history.html}. IE9在兼容模式表明window
         * 中有onhashchange属性, 但测试表明这个事件并不会被触发.
         * @return {boolean}
         */
        var isOnHashChangeSupported = memo.memoize(function() {
            return UA.isIE ? document.documentMode >= 8 : 'onhashchange' in window;
        });


        /**
         * 当前是否低于IE8的IE版本.
         * IE8作为分水岭对于hash和history部分的实现方式会有很大不同.
         * 之前的很多工作在IE8已经没有必要了.
         * @type {boolean}
         */
        var LEGACY_IE = UA.isIE && !UA.isDocumentModeOrHigher(8);


        /**
         * 浏览器是否需要hash一直都可见? IE8之前的如果没有hash则会重新加载页面
         * @type {boolean}
         */
        var HASH_ALWAYS_REQUIRED = LEGACY_IE;


        /**
         * 一个历史管理器. 可以被初始化成用户可见模式(用url的某片段管理状态) 或隐身模式.
         * 这个对象应该在document下载完成之前由js创建.
         * 想在浏览器中存储隐藏的状态(除了IE), 需要创建一个隐藏的iframe.
         * 此iframe必须指向一个可用的同域下的html页面(也可以是空页面blank);
         *
         * 使用范例
         * <pre>
         *   // 利用地址栏存储页面状态 初始化history对象.
         *   var h = new History();
         *   EventsUtil.listen(h, HistoryEventType.NAVIGATE, navCallback);
         *   h.setEnabled(true);
         *
         *   // hash change会触发函数监听器.
         *   function navCallback(e) {
         *     alert('Navigated to state "' + e.token + '"');
         *   }
         *
         *   // 程序手动设置页面状态.
         *   h.setToken('foo');
         * </pre>
         *
         * @param {boolean=} opt_invisible True采用隐藏的历史状态代替用户可见的location.hash
         * @param {string=} opt_blankPageUrl 同个服务器上的空白页URL.如果是隐身模式这个参数就是必须的,
         *     因为要用到隐藏iframe. 这个url也被用作iframe来迫使浏览器生成历史记录(如果没指定iframe则无src属性).
         *     如果协议是https在IE7下且这个url没指定的话会导致Access Denied error.
         * @param {HTMLInputElement=} opt_input 隐藏的input元素会被用来存储历史元数据.
         *     如果没提供, 会用document.write创建一个.
         * @param {HTMLIFrameElement=} opt_iframe 隐藏的iframe用来迫使IE记住历史状态, 当hash变化的时候会
         *     生成一个新的历史记录. 其他浏览器如果opt_invisible是true也可以用这种方法. 如果没有提供, 会用
         *     document.write创建新的隐藏iframe.
         *
         * @constructor
         * @extends {EventTarget}
         */
        var History = function(opt_invisible, opt_blankPageUrl, opt_input, opt_iframe) {

            EvtTarget.call(this);

            // 如果不可见则必须传递url
            if (opt_invisible && !opt_blankPageUrl) {
                throw Error('Can\'t use invisible history without providing a blank page.');
            }

            // 取得隐藏的input
            var input;
            if (opt_input) {
                input = opt_input;
            } else {
                var inputId = 'history_state' + historyCount_;
                document.write(string.subs(INPUT_TEMPLATE_, inputId, inputId));
                input = dom.getElement(inputId);
            }

            /**
             * 一个input元素存储当前的iframe状态.
             * 用于在非IE浏览器下从其他页面导航到此页可以继续读取页面上一状态.
             * @type {HTMLInputElement}
             * @private
             */
            this.hiddenInput_ = /** @type {HTMLInputElement} */ (input);

            /**
             * 地址栏中加载文档的的window对象,这个window中含有隐藏的input元素,肯定是top window,
             * 但不必是当前js执行的window.
             * @type {Window}
             * @private
             */
            this.window_ = opt_input ? dom.getWindow(dom.getOwnerDocument(opt_input)) : window;

            /**
             * 隐藏的iframe的URL. 必须和父层页面属于同一域.
             * @type {string|undefined}
             * @private
             */
            this.iframeSrc_ = opt_blankPageUrl;

            if (UA.isIE && !opt_blankPageUrl) {
                this.iframeSrc_ = (window.location.protocol === 'https' ? 'https:///' : 'javascript:""');
            }

            /**
             * 用于轮训当前历史状态的timer对象.
             * @type {Timer}
             * @private
             */
            this.timer_ = new Timer(PollingType.NORMAL);

            // 这个方法来自Disposable
            // 传递this.timer_是把dispose的上下文切换成this.timer_
            this.registerDisposable(this.timer_);

            /**
             * True当地址栏显示状态, false隐藏历史状态.
             * @type {boolean}
             * @private
             */
            this.userVisible_ = !opt_invisible;

            /**
             * @type {HandlerManager}
             * @private
             */
            this.handlerManager_ = new HandlerManager(this);

            if (opt_invisible || LEGACY_IE) {
                // 取得隐藏的iframe
                var iframe;
                if (opt_iframe) {
                    iframe = opt_iframe;
                } else {
                    var iframeId = 'history_iframe' + historyCount_;
                    var srcAttribute = this.iframeSrc_ ?
                        'src="' + string.htmlEscape(this.iframeSrc_) + '"' : '';
                    document.write(string.subs(IFRAME_TEMPLATE_, iframeId, srcAttribute));
                    iframe = dom.getElement(iframeId);
                }

                /**
                 * Internet Explorer使用隐藏的iframe记录所有的历史变化. 其他浏览器用iframe记录不可见
                 * 模式下的状态.
                 * @type {HTMLIFrameElement}
                 * @private
                 */
                this.iframe_ = /** @type {HTMLIFrameElement} */ (iframe);

                /**
                 * 标识当前会话中的iframe有没有write过文档内容.
                 * @type {boolean}
                 * @private
                 */
                this.unsetIframe_ = true;
            }

            if (LEGACY_IE) {
                // IE依靠隐藏的input存储上个回话历史状态, 但input的值只在window.onload后才会被存储.
                // onload event触发回调获取状态值.
                this.handlerManager_.listen(this.window_, EventType.LOAD, this.onDocumentLoaded);

                /**
                 * IE下用于标识是否document loaded.
                 * @type {boolean}
                 * @protected
                 */
                this.documentLoaded = false;

                /**
                 * IE下用于标识是否文档加载完毕开启history对象.
                 * @type {boolean}
                 * @private
                 */
                this.shouldEnable_ = false;
            }

            // 设置最初的历史状态.
            // 用户可见则设置hash, 并且是replace不是追加
            if (this.userVisible_) {
                this.setHash_(this.getToken(), true);
            }
            // 否则设置iframe的内容保存状态
            else {
                this.setIframeToken_(this.hiddenInput_.value);
            }

            historyCount_++;
        };


        util.inherits(History, EvtTarget);


        // 混入原型对象
        util.mixin(History.prototype, {

            /**
             * history对象是否处在激活状态或分发事件中.
             * @type {boolean}
             * @private
             */
            enabled_: false,

            /**
             * 是否采用长轮询. 发生时机是: 在不可见模式设置iframe的location时服务器的空白页面挂了.
             * FireFox中会导致iframe的location不能再被访问, 试图访问的话会抛出permision denied的异常.
             * 发生这种情况的时候轮训的时间间隔被拉长, 为的是较低频率产生异常, 等待服务器上页面可访问时
             * history对象恢复.
             * @type {boolean}
             * @private
             */
            longerPolling_: false,

            /**
             * 实例的上一次状态token, 用作轮询比较. 可为null
             * @type {?string}
             * @private
             */
            lastToken_: null,

            /**
             * 如果不为null, 用户不可见模式的轮询会被禁用直到token可见.
             * 这个变量用作阻止竞态：location变化时iframe瞬时挂死
             * If not null, polling in the user invisible mode will be disabled until this
             * token is seen. This is used to prevent a race condition where the iframe
             * hangs temporarily while the location is changed.
             * @type {?string}
             * @private
             */
            lockedToken_: null,

            /** @override */
            disposeInternal: function() {
                History.superClass_.disposeInternal.call(this);
                this.handlerManager_.dispose();
                this.setEnabled(false);
            },

            /**
             * 开始或停止history的轮询,enabled时,history对象会马上触发事件(对于当前的location).
             * 调用可以在new History实例和setEnabled之间listen事件.
             * IE里开始的时刻可能会延迟到iframe和hidden input都加载完毕才行. 这个行为对于调用者是透明的.
             * @param {boolean} enable 是否轮询检测history
             */
            setEnabled: function(enable) {
                // 如果值没有变化就不作任何处理
                if (enable === this.enabled_)
                    return;

                // 老版本IE且文档没load时就标记一下然后等着load
                if (LEGACY_IE && !this.documentLoaded) {
                    // Wait until the document has actually loaded before enabling the
                    // object or any saved state from a previous session will be lost.
                    this.shouldEnable_ = enable;
                    return;
                }

                if (enable) {
                    if (UA.isOPERA) {
                        // Capture events for common user input so we can restart the timer in
                        // Opera if it fails. Yes, this is distasteful. See operaDefibrillator_.
                        this.handlerManager_.listen(this.window_.document,
                            INPUT_EVENTS_,
                            this.operaDefibrillator_);
                    } else if (UA.isGECKO) {
                        // Firefox will not restore the correct state after navigating away from
                        // and then back to the page with the history object. This can be fixed
                        // by restarting the history object on the pageshow event.
                        this.handlerManager_.listen(this.window_, 'pageshow', this.onShow_);
                    }

                    // todo: make HTML5 and invisible history work by listening to the
                    // iframe # changes instead of the window.
                    // 如果浏览器支持hashchange并且是用户可见模式
                    if (isOnHashChangeSupported() && this.userVisible_) {
                        this.handlerManager_.listen(this.window_, EventType.HASHCHANGE, this.onHashChange_);
                        this.enabled_ = true;
                        // setEnabled同时就分发事件
                        this.dispatchEvent(new HistoryEvent(this.getToken(), false));
                    }
                    // 非IE或文档load完毕
                    else if (!UA.isIE || this.documentLoaded) {
                        // 当加载完成后就分发history events
                        this.handlerManager_.listen(this.timer_,
                            Timer.TICK,
                            util.bind(this.check_, this, true));

                        this.enabled_ = true;
                        // Initialize last token at startup except on IE < 8, where the last token
                        // must only be set in conjunction with IFRAME updates, or the IFRAME will
                        // start out of sync and remove any pre-existing URI fragment.
                        if (!LEGACY_IE) {
                            this.lastToken_ = this.getToken();
                            this.dispatchEvent(new HistoryEvent(this.getToken(), false));
                        }

                        this.timer_.start();
                    }
                } else {
                    this.enabled_ = false;
                    this.handlerManager_.removeAll();
                    this.timer_.stop();
                }
            },

            /**
             * 只在IE下才会执行.
             * IE下window.onload的回调函数. 恢复历史会话后(after restoring a history session)
             * 有必要从隐藏的input元素中读取信息. 这个input元素只有window.onload后才能被'找到'.
             * (iframe的状态同样也会有相似的情况, loading过程中不可用)
             *
             * 在iframe完全加载完之前如果调用setEnabled，当前history对象就是可用的。
             * @protected
             */
            onDocumentLoaded: function() {
                this.documentLoaded = true;
                if (this.hiddenInput_.value) {
                    // Any saved value in the hidden input can only be read after the document
                    // has been loaded due to an IE limitation. Restore the previous state if
                    // it has been set.
                    this.setIframeToken_(this.hiddenInput_.value, true);
                }
                // this.shouldEnable_只是一个标记位, 防止load之前调用setEnabled=true
                // 后状态丢失, 此时用这个记忆值设置this.enabled.
                this.setEnabled(this.shouldEnable_);
            },

            /**
             * 支持onhashchange的浏览器需要处理的句柄.
             * 与{@link #check_}非常相似, 但是这个方法不是持续执行
             * It is only used when isOnHashChangeSupported() is true.
             * @param {BrowserEvent} e The browser event.
             * @private
             */
            onHashChange_: function(e) {
                var hash = this.getLocationFragment_(this.window_);
                if (hash !== this.lastToken_) {
                    this.update_(hash, true);
                }
            },

            /**
             * @return {string} 返回当前token.
             */
            getToken: function() {
                if (this.lockedToken_ !== null)
                    return this.lockedToken_;
                else if (this.userVisible_)
                    return this.getLocationFragment_(this.window_);
                else
                    return this.getIframeToken_() || '';
            },

            /**
             * 设置history状态. 可见模式下, hash会被token代替.
             * 有些时候有必要在文档title变化前设置token, 这种情况下IE的历史记录下拉列表
             * 和历史记录不同步. 为了解决这个问题, 可以传入一个title字符串设到隐藏的iframe上.
             * @param {string} token 历史状态.
             * @param {string=} opt_title Optional title used when setting the hidden iframe
             *     title in IE.
             */
            setToken: function(token, opt_title) {
                this.setHistoryState_(token, false, opt_title);
            },

            /**
             * 替换当前历史记录, 不影响其他记录
             * @param {string} token 历史状态.
             * @param {string=} opt_title Optional title used when setting the hidden iframe
             *     title in IE.
             */
            replaceToken: function(token, opt_title) {
                this.setHistoryState_(token, true, opt_title);
            },

            /**
             * 从当前URL中获取hash片段. 不直接使用location.hash是因为有的浏览器会urlDecodes,
             * 这会导致tokens不是预期的. 比如, 我们想存储: label/%2Froot 但location.hash会
             * 返回label//root.
             * @param {Window} win window对象.
             * @return {string} The fragment.
             * @private
             */
            getLocationFragment_: function(win) {
                var href = win.location.href;
                var index = href.indexOf('#');
                return index < 0 ? '' : href.substring(index + 1);
            },

            /**
             * 设置历史状态. 可见模式hash会变成给的token. 设了opt_replace真时会触发navigation,
             * 但会替换现有历史记录, 列表长度无变化.
             * 注意: 函数里会手动触发check_方法
             *
             * @param {string} token The history state identifier.
             * @param {boolean} replace Set to replace the current history entry instead of
             *    appending a new history state.
             * @param {string=} opt_title Optional title used when setting the hidden iframe
             *     title in IE.
             * @private
             */
            setHistoryState_: function(token, replace, opt_title) {
                if (this.getToken() !== token) {
                    if (this.userVisible_) {
                        // 这一步只是设置hash
                        this.setHash_(token, replace);
                        // 这一步针对老IE生成历史记录
                        if (!isOnHashChangeSupported()) {
                            // IE通过iframe生成历史记录.
                            if (UA.isIE) {
                                this.setIframeToken_(token, replace, opt_title);
                            }
                        }
                        // 即便支持hashchange事件也要触发这步, 为了NAVIGATE event代码的同步执行.
                        if (this.enabled_)
                            this.check_(false);
                    } else {
                        // 这一步设置iframe的token
                        this.setIframeToken_(token, replace);
                        // set a suspendToken so that polling doesn't trigger a 'back'.
                        this.lockedToken_ = this.lastToken_ = this.hiddenInput_.value = token;
                        // 同步触发
                        this.dispatchEvent(new HistoryEvent(token, false));
                    }
                }
            },

            /**
             * 设置或者取代URL中的hash片段. 根据URL规范token不需要encode,即便是特殊字符(换行)
             * 会被自动摒弃.
             * 如果opt_replace设置为false, 非IE浏览器会追加历史记录.
             * IE中设置hash不会影响历史栈(除非存在同名的锚点元素)
             *
             * 某些老版Webkit不能查询location hash,但可以设置. 如果确实是这些浏览器,则采用replace
             * 策略而不是创建新的history entries.
             *
             * window.location.replace 会取代当前历史堆栈中的url. 见:
             * http://www.whatwg.org/specs/web-apps/current-work/#dom-location-replace
             * http://www.whatwg.org/specs/web-apps/current-work/#replacement-enabled
             *
             * @param {string} token 新的字符串.
             * @param {boolean=} opt_replace 代替当前历史实体或者追加.
             * @private
             */
            setHash_: function(token, opt_replace) {
                // If the page uses a BASE element, setting location.hash directly will
                // navigate away from the current document. Also, the original URL path may
                // possibly change from HTML5 history pushState. To account for these, the
                // full path is always specified.
                var loc = this.window_.location;
                var url = loc.href.split('#')[0];

                // If a hash has already been set, then removing it programmatically will
                // reload the page. Once there is a hash, we won't remove it.
                var hasHash = string.contains(loc.href, '#');

                if (HASH_ALWAYS_REQUIRED || hasHash || token) {
                    url += '#' + token;
                }

                if (url !== loc.href) {
                    if (opt_replace)
                        loc.replace(url);
                    else
                        loc.href = url;
                }
            },

            /**
             * 这个函数是轮询比较hash的真正函数,监听了timer的TICK事件.
             * 检查hash片段和iframe的title看看navigation是否变化. 每秒运行20次左右.
             * @param {boolean} isNavigation True事件由浏览器行为触发, false调用的setToken方法.
             *     See {@link HistoryEvent}。
             * @private
             */
            check_: function(isNavigation) {
                // 可见模式
                if (this.userVisible_) {
                    var hash = this.getLocationFragment_(this.window_);
                    if (hash !== this.lastToken_) {
                        this.update_(hash, isNavigation);
                    }
                }
                // 老版本IE用iframe应对可见和不可见模式.
                if (!this.userVisible_ || LEGACY_IE) {
                    var token = this.getIframeToken_() || '';
                    if (this.lockedToken_ === null || token === this.lockedToken_) {
                        this.lockedToken_ = null;
                        if (token !== this.lastToken_) {
                            this.update_(token, isNavigation);
                        }
                    }
                }
            },

            /**
             * 用给定字符串更新历史状态.这个函数会在监听到hashchange时或者轮询检测到不同hash时触发.
             * @param {string} token 新的历史状态.
             * @param {boolean} isNavigation 若由用户点击前进后退触发则是True,否则比如setToken
             *     触发则是false. See {@link HistoryEvent}.
             * @private
             */
            update_: function(token, isNavigation) {
                this.lastToken_ = this.hiddenInput_.value = token;
                if (this.userVisible_) {
                    if (LEGACY_IE)
                        this.setIframeToken_(token);
                    this.setHash_(token);
                } else {
                    this.setIframeToken_(token);
                }
                // 触发监听函数
                this.dispatchEvent(new HistoryEvent(this.getToken(), isNavigation));
            },

            /**
             * 利用隐藏iframe设置状态. IE通过重写iframe的文档可以完成. FF里,iframe的url中
             * 会有hash片段保存着状态. 老版本的webkit不能设置iframe, 忽略这些浏览器.
             * @param {string} token 要设置的字符串.
             * @param {boolean=} opt_replace 可选的. true就代表代替当前的iframe状态而不会新生成历史记录实体.
             * @param {string=} opt_title 可选的. 在IE下可选是否设置iframe的title.
             * @private
             */
            setIframeToken_: function(token, opt_replace, opt_title) {
                // 当token发生变化或者没有设置过iframe的时候才执行
                if (this.unsetIframe_ || token !== this.getIframeToken_()) {
                    this.unsetIframe_ = false;
                    token = string.urlEncode(token);

                    if (UA.isIE) {
                        // Caching the iframe document results in document permission errors after
                        // leaving the page and returning. Access it anew each time instead.
                        var doc = dom.getFrameContentDocument(this.iframe_);
                        // 注意这里第二个参数的用法,新学到一点
                        doc.open('text/html', opt_replace ? 'replace' : undefined);
                        doc.write(string.subs(
                            IFRAME_SOURCE_TEMPLATE_,
                            string.htmlEscape(opt_title || this.window_.document.title),
                            token));
                        doc.close();
                    } else {
                        var url = this.iframeSrc_ + '#' + token;
                        // In Safari, it is possible for the contentWindow of the iframe to not
                        // be present when the page is loading after a reload.
                        var contentWindow = this.iframe_.contentWindow;
                        if (contentWindow) {
                            if (opt_replace) contentWindow.location.replace(url);
                            else contentWindow.location.href = url;
                        }
                    }
                }
            },

            /**
             * 同上一个方法相对. 返回从隐藏iframe中取得的当前状态. IE中会在body中存放这个字符串,
             * 其他浏览器会在hash中存着.
             * 老版本的webkit不能获取iframe location, 如果这样就直接返回null.
             * @return {?string} The state token saved in the iframe (possibly null if the
             *     iframe has never loaded.).
             * @private
             */
            getIframeToken_: function() {
                if (UA.isIE) {
                    var doc = dom.getFrameContentDocument(this.iframe_);
                    return doc.body ? string.urlDecode(doc.body.innerHTML) : null;
                } else {
                    // In Safari, it is possible for the contentWindow of the iframe to not
                    // be present when the page is loading after a reload.
                    var contentWindow = this.iframe_.contentWindow;
                    if (contentWindow) {
                        var hash;
                        /** @preserveTry */
                        try {
                            // Iframe tokens are urlEncoded
                            hash = string.urlDecode(this.getLocationFragment_(contentWindow));
                        } catch (e) {
                            // An exception will be thrown if the location of the iframe can not be
                            // accessed (permission denied). This can occur in FF if the the server
                            // that is hosting the blank html page goes down and then a new history
                            // token is set. The iframe will navigate to an error page, and the
                            // location of the iframe can no longer be accessed. Due to the polling,
                            // this will cause constant exceptions to be thrown. In this case,
                            // we enable longer polling. We do not have to attempt to reset the
                            // iframe token because (a) we already fired the NAVIGATE event when
                            // setting the token, (b) we can rely on the locked token for current
                            // state, and (c) the token is still in the history and
                            // accesible on forward/back.
                            if (!this.longerPolling_) {
                                this.setLongerPolling_(true);
                            }

                            return null;
                        }

                        // There was no exception when getting the hash so turn off longer polling
                        // if it is on.
                        if (this.longerPolling_) {
                            this.setLongerPolling_(false);
                        }

                        return hash || null;

                    } else {
                        return null;
                    }
                }
            },

            /**
             * 设置轮询间隔.
             * @param {boolean} longerPolling Whether to enable longer polling.
             * @private
             */
            setLongerPolling_: function(longerPolling) {
                if (this.longerPolling_ !== longerPolling) {
                    this.timer_.setInterval(longerPolling ? PollingType.LONG : PollingType.NORMAL);
                }
                this.longerPolling_ = longerPolling;
            },

            /**
             * Handler for the Gecko pageshow event. Restarts the history object so that the
             * correct state can be restored in the hash or iframe.
             * @param {BrowserEvent} e The browser event.
             * @private
             */
            onShow_: function(e) {
                // NOTE: persisted is a property passed in the pageshow event that
                // indicates whether the page is being persisted from the cache or is being
                // loaded for the first time.
                if (e.getBrowserEvent().persisted) {
                    this.setEnabled(false);
                    this.setEnabled(true);
                }
            },

            /**
             * Opera cancels all outstanding timeouts and intervals after any rapid
             * succession of navigation events, including the interval used to detect
             * navigation events. This function restarts the interval so that navigation can
             * continue. Ideally, only events which would be likely to cause a navigation
             * change (mousedown and keydown) would be bound to this function. Since Opera
             * seems to ignore keydown events while the alt key is pressed (such as
             * alt-left or right arrow), this function is also bound to the much more
             * frequent mousemove event. This way, when the update loop freezes, it will
             * unstick itself as the user wiggles the mouse in frustration.
             * @private
             */
            operaDefibrillator_: function() {
                this.timer_.stop();
                this.timer_.start();
            }
        });


        return History;
    }
);