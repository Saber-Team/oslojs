/**
 * @fileoverview 包含浏览器event的标准化实现
 * @modified Leo.Zhang
 * @email zmike86@gmail.com
 *
 * <pre>
 * 分发的事件对象包含如下成员属性:
 * - type           {string}    Event type, e.g. 'click'
 * - timestamp      {Date}      A date object for when the event was fired
 * - target         {Object}    The element that actually triggered the event
 * - currentTarget  {Object}    The element the listener is attached to
 * - relatedTarget  {Object}    For mouseover and mouseout, the previous object
 * - offsetX        {number}    X-coordinate relative to target
 * - offsetY        {number}    Y-coordinate relative to target
 * - clientX        {number}    X-coordinate relative to viewport
 * - clientY        {number}    Y-coordinate relative to viewport
 * - screenX        {number}    X-coordinate relative to the edge of the screen
 * - screenY        {number}    Y-coordinate relative to the edge of the screen
 * - button         {number}    Mouse button. Use isButton() to test.
 * - keyCode        {number}    Key-code
 * - ctrlKey        {boolean}   Was ctrl key depressed
 * - altKey         {boolean}   Was alt key depressed
 * - shiftKey       {boolean}   Was shift key depressed
 * - metaKey        {boolean}   Was meta key depressed
 * - defaultPrevented {boolean} Whether the default action has been prevented
 * - state          {Object}    History state object
 *
 * 注意: 事件对象的keyCode是浏览器原始的keyCode. 用events.KeyHandler模块进行标准化.
 * </pre>
 *
 */

sogou('Sogou.Events.BrowserEvent',
    [
        'Sogou.Util',
        'Sogou.Events.BrowserFeature',
        'Sogou.Events.EventBase',
        'Sogou.Events.EventType',
        'Sogou.UA.Util'
    ],
    function(util, BrowserFeature, EventBase, EventType, UA) {

        'use strict';

        /**
         * 接收一个浏览器事件然后对其进行包装, 返回跨浏览器的标准对象.
         * 如果没有事件传入, 标准事件对象的各个属性不会被初始化, 这样的时候init()需要被另外调用.
         * @param {Event=} opt_e 浏览器事件对象.
         * @param {EventTarget=} opt_currentTarget 可选的currentTarget.
         * @constructor
         * @extends {EventBase}
         */
        function BrowserEvent(opt_e, opt_currentTarget) {
            if (opt_e) {
                this.init(opt_e, opt_currentTarget);
            }
        }
        util.inherits(BrowserEvent, EventBase);

        /**
         * 鼠标按键标准化后的常量值.
         * @enum {number}
         */
        BrowserEvent.MouseButton = {
            LEFT: 0,
            MIDDLE: 1,
            RIGHT: 2
        };

        /**
         * IE下左中右的键值有所不同,传递标准值映射出IE下的值.
         * @type {Array.<number>}
         */
        BrowserEvent.IEButtonMap = [
            1, // LEFT
            4, // MIDDLE
            2  // RIGHT
        ];

        // 混入原型对象
        util.mixin(BrowserEvent.prototype, {
            /**
             * 触发事件的目标对象.
             * @override
             * @type {Node}
             */
            target: null,
            /**
             * @override
             * @type {Node|undefined}
             */
            currentTarget: null,
            /**
             * mouseover,mouseout事件用到的相关元素.
             * @type {Node}
             */
            relatedTarget: null,
            /**
             * X-coordinate relative to target.
             * @type {number}
             */
            offsetX: 0,
            /**
             * Y-coordinate relative to target.
             * @type {number}
             */
            offsetY: 0,
            /**
             * X-coordinate relative to the window.
             * @type {number}
             */
            clientX: 0,
            /**
             * Y-coordinate relative to the window.
             * @type {number}
             */
            clientY: 0,
            /**
             * X-coordinate relative to the monitor.
             * @type {number}
             */
            screenX: 0,
            /**
             * Y-coordinate relative to the monitor.
             * @type {number}
             */
            screenY: 0,
            /**
             * 鼠标按下的键.
             * @type {number}
             */
            button: 0,
            /**
             * IE只有keyCode属性,表示按键的ascii码.onkeydown会在任何情况下触发,但是keypress对于
             * 功能键,后退键和方向键失效. keypress中的keyCode对应ascii码正常,keydown中的对应了大写
             * 字母表或者一个虚拟键码.一般来讲keypress得到的keycode符合预期.
             * @type {number}
             */
            keyCode: 0,
            /**
             * 非IE用charCode表示按键的ascii码,在keypress时可用.keydown时此值为0
             * @type {number}
             */
            charCode: 0,
            /**
             * Whether control was pressed at time of event.
             * @type {boolean}
             */
            ctrlKey: false,
            /**
             * Whether alt was pressed at time of event.
             * @type {boolean}
             */
            altKey: false,
            /**
             * Whether shift was pressed at time of event.
             * @type {boolean}
             */
            shiftKey: false,
            /**
             * Whether the meta key was pressed at time of event.
             * Windows上Meta键就是windows键, MAC上就是command键..
             * @type {boolean}
             */
            metaKey: false,
            /**
             * https://developer.mozilla.org/en-US/docs/Web/Guide/API/DOM/Manipulating_the_browser_history
             * History事件对象, 只在PopState事件出现, 是pushState或者replaceState时提供的状态对象的一个copy.
             * @type {Object}
             */
            state: null,
            /**
             * Whether the default platform modifier key was pressed at time of event.
             * (除了MAC系统,其他系统上这个键都是ctrl, MAC上是Meta键.
             * @type {boolean}
             */
            platformModifierKey: false,
            /**
             * 一个私有属性保存原生事件的引用.
             * @type {Event}
             * @private
             */
            event_ : null,
            /**
             * 接收浏览器原生事件对象，转化成跨浏览器统一对象。
             * @param {Event} e 浏览器事件对象.
             * @param {EventTarget=} opt_currentTarget 可选的currentEvent.
             */
            init: function(e, opt_currentTarget) {
                var type = this.type = e.type;
                EventBase.call(this, type);
                this.target = /** @type {Node} */ (e.target) || e.srcElement;
                this.currentTarget = /** @type {Node} */ (opt_currentTarget);
                var relatedTarget = /** @type {Node} */ (e.relatedTarget);
                if (relatedTarget) {
                    // There's a bug in FireFox where sometimes, relatedTarget will be a
                    // chrome element, and accessing any property of it will get a permission
                    // denied exception. See:
                    // https://bugzilla.mozilla.org/show_bug.cgi?id=497780
                    /** @preserveTry */
                    var ret = false;
                    try {
                        util.nullFunction(relatedTarget['nodeName']);
                        ret = true;
                    } catch (e) {}
                    if (UA.isGECKO && !ret) {
                        relatedTarget = null;
                    }
                } else if (type === EventType.MOUSEOVER) {
                    relatedTarget = e.fromElement;
                } else if (type === EventType.MOUSEOUT) {
                    relatedTarget = e.toElement;
                }

                this.relatedTarget = relatedTarget;

                // Webkit emits a lame warning whenever layerX/layerY is accessed.
                // http://code.google.com/p/chromium/issues/detail?id=101733
                this.offsetX = (UA.isWEBKIT || e.offsetX !== undefined) ? e.offsetX : e.layerX;
                this.offsetY = (UA.isWEBKIT || e.offsetY !== undefined) ? e.offsetY : e.layerY;

                this.clientX = e.clientX !== undefined ? e.clientX : e.pageX;
                this.clientY = e.clientY !== undefined ? e.clientY : e.pageY;
                this.screenX = e.screenX || 0;
                this.screenY = e.screenY || 0;

                this.button = e.button;

                this.keyCode = e.keyCode || 0;
                this.charCode = e.charCode || (type === 'keypress' ? e.keyCode : 0);
                this.ctrlKey = e.ctrlKey;
                this.altKey = e.altKey;
                this.shiftKey = e.shiftKey;
                this.metaKey = e.metaKey;
                this.platformModifierKey = UA.isMAC ? e.metaKey : e.ctrlKey;
                this.state = e.state;
                this.event_ = e;
                if (e.defaultPrevented) {
                    this.preventDefault();
                }
                delete this.propagationStopped_;
            },
            /**
             * 测试事件发生时按下的是哪个鼠标键. 只在IE和Gecko核的浏览器有用.
             * IE里只对mousedown/mouseup事件有用, 因为click只会由左边的按键触发.
             *
             * Safari 2 only reports the left button being clicked, and uses the value '1'
             * instead of 0. Opera only reports a mousedown event for the middle button, and
             * no mouse events for the right button. Opera has default behavior for left and
             * middle click that can only be overridden via a configuration setting.
             *
             * There's a nice table of this mess at http://www.unixpapa.com/js/mouse.html.
             *
             * @param {BrowserEvent.MouseButton} button 测试提供的按键.
             * @return {boolean} True if button was pressed.
             */
            isButton: function(button) {
                if (!BrowserFeature.HAS_W3C_BUTTON) {
                    if (this.type === 'click') {
                        return button === BrowserEvent.MouseButton.LEFT;
                    } else {
                        return !!(this.event_.button & BrowserEvent.IEButtonMap[button]);
                    }
                } else {
                    return this.event_.button === button;
                }
            },
            /**
             * Whether this has an "action"-producing mouse button.
             *
             * By definition, this includes left-click on windows/linux, and left-click
             * without the ctrl key on Macs.
             *
             * @return {boolean} The result.
             */
            isMouseActionButton: function() {
                // Webkit does not ctrl+click to be a right-click, so we
                // normalize it to behave like Gecko and Opera.
                return this.isButton(BrowserEvent.MouseButton.LEFT) &&
                    !(UA.isWEBKIT && UA.isMAC && this.ctrlKey);
            },
            /**
             * @override
             */
            stopPropagation: function() {
                BrowserEvent.superClass_.stopPropagation.call(this);
                if (this.event_.stopPropagation) {
                    this.event_.stopPropagation();
                } else {
                    this.event_.cancelBubble = true;
                }
            },
            /**
             * @override
             */
            preventDefault: function() {
                BrowserEvent.superClass_.preventDefault.call(this);
                var be = this.event_;
                if (!be.preventDefault) {
                    be.returnValue = false;
                    // IE7-8中通过某些按键阻止默认行为
                    if (BrowserFeature.SET_KEY_CODE_TO_PREVENT_DEFAULT) {
                        /** @preserveTry */
                        try {
                            // 大多数按键可以通过returnValue设置成false阻止. 
                            // 少数需要同事设置keyCode = -1:
                            //
                            // In IE7:
                            // F3, F5, F10, F11, Ctrl+P, Crtl+O, Ctrl+F (these are taken from IE6)
                            //
                            // In IE8:
                            // Ctrl+P, Crtl+O, Ctrl+F (F1-F12 cannot be stopped through the event)
                            //
                            // We therefore do this for all function keys as well as when Ctrl key
                            // is pressed.
                            var VK_F1 = 112;
                            var VK_F12 = 123;
                            if (be.ctrlKey || be.keyCode >= VK_F1 && be.keyCode <= VK_F12) {
                                be.keyCode = -1;
                            }
                        } catch (ex) {
                            // IE throws an 'access denied' exception when trying to change
                            // keyCode in some situations (e.g. srcElement is input[type=file],
                            // or srcElement is an anchor tag rewritten by parent's innerHTML).
                            // Do nothing in this case.
                        }
                    }
                } else {
                    be.preventDefault();
                }
            },
            /**
             * @return {Event} 返回原始浏览器事件.
             */
            getBrowserEvent: function() {
                return this.event_;
            },
            /** @override */
            disposeInternal: function() {}
        });

        return BrowserEvent;
    }
);