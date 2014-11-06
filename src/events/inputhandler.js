/**
 * @fileoverview 本模块提供一个类封装了textarea元素的text change事件处理器,
 * 同时也对type=text|password的input元素生效. 事件发生在文本变化之后. 如果
 * 通过程序改变了元素的文本值则不触发该事件.
 * <br>
 * <br>
 * 注意: 本模块不对事件对象的keyCode或charCode做正确性校验, 也不会跨浏览器统一它们的值.
 *     需要该功能使用KeyHandler模块.
 * <br>
 * <br>
 * 已知问题:
 * <ul>
 * <li>在Opera浏览器不触发drop events.(浏览器本身Bug)
 * <li>IE原生不支持input event. WebKit在v531之前的版本不支持textareas的相关事件.
 *     对于这些浏览器做一个基于key, clipboard, drop events事件的模拟. 因此事件在模拟
 *     环境中如果右键改变了文本的话(撤销|删除等操作)不会触发事件分发.
 * </ul>
 * @author Leo.Zhang
 * @email zmike86@gmail.com
 * @see ../../demos/inputhandler.html
 */

define('@events.inputhandler',
    [
        '@util',
        '@timer',
        '@dom.util',
        '@events.browserevent',
        '@events.handlermanager',
        '@events.eventtarget',
        '@events.keycodes',
        '@ua.util'
    ],
    function(util, Timer, dom, BrowserEvent, HandlerManager, EventTarget, KeyCodes, ua) {

        'use strict';

        /**
         * 本类封装了事件处理器. 会在文本输入框,密码输入框和文本输入区域文字输入时分发事件.
         * @param {Element} element 监听元素.
         * @constructor
         * @extends {EventTarget}
         */
        var InputHandler = function(element) {
            EventTarget.call(this);
            /**
             * @type {Element}
             * @private
             */
            this.element_ = element;

            // 确定是否使用模拟模式生成input事件.
            // IE8不支持input事件. 我们用属性变化事件代替之但有一些坑儿:
            // - 在程序改变值的情况下仍会触发(programmatically).
            // - 有些时候不触发. 例如,如果程序改变文字或者输入框的宽度,下次用户输入时value变了
            //   但不会触发事件.
            // IE9在字符插入时触发input事件, 删除时不触发.
            // WebKit在v531之前的版本对textareas不支持input事件.
            var emulateInputEvents = ua.isIE ||
                (ua.isWEBKIT && !ua.isVersionOrHigher('531') && element.tagName === 'TEXTAREA');

            /**
             * @type {HandlerManager}
             * @private
             */
            this.handlerManager_ = new HandlerManager(this);

            // 即便模拟模式开启, 我们也监听原生的input事件,因为有的浏览器部分支持(such as IE9).
            // 如果input事件触发, 就会同步分发该事件. (InputHandler events being asynchronous
            // for IE is a common issue for cases like auto-grow textareas where they
            // result in a quick flash of scrollbars between the textarea content growing
            // and it being resized to fit.)
            this.handlerManager_.listen(
                this.element_,
                emulateInputEvents ? ['keydown', 'paste', 'cut', 'drop', 'input'] : 'input',
                this);
        };

        util.inherits(InputHandler, EventTarget);


        /**
         * input handler触发的事件类型
         * @enum {string}
         */
        InputHandler.EventType = {
            INPUT: 'input'
        };


        /**
         * 模拟模式下需要一定延时触发input event事件.
         * @type {?number}
         * @private
         */
        InputHandler.prototype.timer_ = null;


        /**
         * 事件处理器分发一个新的事件.
         * @param {BrowserEvent} e The underlying browser event.
         */
        InputHandler.prototype.handleEvent = function(e) {
            // 标准input事件
            if (e.type === 'input') {
                // input事件会是所有事件中最后触发的(见构造函数),所以如果有异步触发的事件先取消否则会多触发一次.
                this.cancelTimerIfSet_();

                // Opera会在失去焦点后触发额外的一次input事件. Opera不会在drop时触发input事件,
                // 由这两个条件可以通过检查元素是否有焦点去阻止不必要的事件分发.
                if (!ua.isOPERA || this.element_ ===
                    dom.getOwnerDocument(this.element_).activeElement) {
                    this.dispatchEvent(this.createInputEvent_(e));
                }
            // 模拟事件
            } else {
                // 有些键盘事件不会输出字符,过滤掉它们.
                if (e.type === 'keydown' && !KeyCodes.isTextModifyingKeyEvent(e)) {
                    return;
                }

                // It is still possible that pressed key won't modify the value of an
                // element. Storing old value will help us to detect modification but is
                // also a little bit dangerous. If value is changed programmatically in
                // another key down handler, we will detect it as user-initiated change.
                var valueBeforeKey = (e.type === 'keydown' ? this.element_.value : null);

                // In IE on XP, IME the element's value has already changed when we get
                // keydown events when the user is using an IME. In this case, we can't
                // check the current value normally, so we assume that it's a modifying key
                // event. This means that ENTER when used to commit will fire a spurious
                // input event, but it's better to have a false positive than let some input
                // slip through the cracks.
                if (ua.isIE && e.keyCode === KeyCodes.WIN_IME) {
                    valueBeforeKey = null;
                }

                // Create an input event now, because when we fire it on timer, the
                // underlying event will already be disposed.
                var inputEvent = this.createInputEvent_(e);

                // Since key down, paste, cut and drop events are fired before actual value
                // of the element has changed, we need to postpone dispatching input event
                // until value is updated.
                this.cancelTimerIfSet_();
                this.timer_ = Timer.callOnce(function() {
                    this.timer_ = null;
                    if (this.element_.value !== valueBeforeKey) {
                        this.dispatchEvent(inputEvent);
                    }
                }, 0, this);
            }
        };


        /**
         * 取消定时器.
         * @private
         */
        InputHandler.prototype.cancelTimerIfSet_ = function() {
            if (this.timer_ !== null) {
                Timer.clear(this.timer_);
                this.timer_ = null;
            }
        };


        /**
         * 创建input event.
         * @param {BrowserEvent} be A browser event.
         * @return {BrowserEvent} An input event.
         * @private
         */
        InputHandler.prototype.createInputEvent_ = function(be) {
            var e = new BrowserEvent(be.getBrowserEvent());
            e.type = InputHandler.EventType.INPUT;
            return e;
        };


        /** @override */
        InputHandler.prototype.disposeInternal = function() {
            InputHandler.superClass_.disposeInternal.call(this);
            this.handlerManager_.dispose();
            this.cancelTimerIfSet_();
            delete this.element_;
        };


        return InputHandler;
    }
);
