/**
 * @fileoverview 专门为mousewheel事件提供了处理器类.这个处理器会在元素上滚轮的时候分发标准事件.
 *    开发人员可以通过滚轮事件的deltaX和deltaY属性获取滚动方向.
 *    多平台多浏览器下的mousewheel事件存在很大分歧,具体可以看看冰山一角:
 *        http://www.javascriptkit.com/javatutors/onmousewheel.shtml
 *    这个类主要为了消除这些异同,但很难面对所有情况,有时候deltas会给出非常大的值.
 *    如果避免这些应该用setMaxDeltaX和setMaxDeltaY APIs防止值过大.
 *
 * @modified Leo.Zhang
 * @email zmike86@gmail.com
 * @see ../demos/mousewheelhandler.html
 */

define('Sogou.Events.MouseWheelHandler',
    [
        'Sogou.Util',
        'Sogou.Dom.Util',
        'Sogou.Events.Util',
        'Sogou.Events.BrowserEvent',
        'Sogou.Events.EventTarget',
        'Sogou.Math.Util',
        'Sogou.Style.Util',
        'Sogou.UA.Util',
        'Sogou.Events.MouseWheelEvent'
    ],
    function(util, dom, EventUtil, BrowserEvent, EventTarget, math, style, ua, MouseWheelEvent) {

        'use strict';

        /**
         * 把原生事件提供的转动角度mousewheel delta根据一定的因子缩小
         * @param {number} mouseWheelDelta mouse wheel事件中带有的delta值.整形.
         * @param {number} scaleFactor 缩放因子,是一个整数
         * @return {number} 处理后的delta值.
         * @private
         */
        var smartScale_ = function(mouseWheelDelta, scaleFactor) {
            // 还有个本质问题是: Webkit在Mac和Linux上, 有两种截然不同的滚动事件:
            // 持续性的触控设备(touchpads, Mighty Mouse)或非持续性的(normal wheel mice).
            //
            // 非持续性的触控设备在Webkit中使得wheel事件的delta偏大,类似IE. 持续型设备返回的值非常小
            // (大多数时候不能被IE 120的倍数这个40的因子整除), 这情况无解.
            // Detailed discussion:
            //   https://bugs.webkit.org/show_bug.cgi?id=29601
            //   http://trac.webkit.org/browser/trunk/WebKit/chromium/src/mac/WebInputEventFactory.mm#L1063
            if (ua.isWEBKIT && (ua.isMAC || ua.isLINUX) &&
                (mouseWheelDelta % scaleFactor) !== 0) {
                return mouseWheelDelta;
            } else {
                return mouseWheelDelta / scaleFactor;
            }
        };

        /**
         * 事件处理器包装类,监听mousewheel事件
         * @param {Element|Document} element 监听的元素
         * @param {boolean=} opt_capture 捕获阶段是否触发
         * @constructor
         * @extends {EventTarget}
         */
        var MouseWheelHandler = function(element, opt_capture) {
            EventTarget.call(this);

            /**
             * 需要监听mouse wheel事件的元素.
             * @type {Element|Document}
             * @private
             */
            this.element_ = element;

            var rtlElement = dom.isElement(this.element_) ? /** @type {Element} */ (this.element_) :
                (this.element_ ? /** @type {Document} */ (this.element_).body : null);

            /**
             * 判断元素的dir是否设置成rtl或者style.direction设置成了rtl.
             * @type {boolean}
             * @private
             */
            this.isRtl_ = !!rtlElement && style.isRightToLeft(rtlElement);

            var type = ua.isGECKO ? 'DOMMouseScroll' : 'mousewheel';

            /**
             * events.listen返回的Listener对象.
             * @type {Listener}
             * @private
             */
            this.listenKey_ = EventUtil.listen(this.element_, type, this, opt_capture);
        };
        util.inherits(MouseWheelHandler, EventTarget);

        /**
         * Optional maximum magnitude for x delta on each mousewheel event.
         * @type {?number}
         * @private
         */
        MouseWheelHandler.prototype.maxDeltaX_ = null;

        /**
         * Optional maximum magnitude for y delta on each mousewheel event.
         * @type {?number}
         * @private
         */
        MouseWheelHandler.prototype.maxDeltaY_ = null;

        /**
         * @param {number} maxDeltaX 设置每次滚动时delta x的最大量级. 非负数
         */
        MouseWheelHandler.prototype.setMaxDeltaX = function(maxDeltaX) {
            this.maxDeltaX_ = maxDeltaX;
        };

        /**
         * @param {number} maxDeltaY 设置每次滚动时delta y的最大量级. 非负数.
         */
        MouseWheelHandler.prototype.setMaxDeltaY = function(maxDeltaY) {
            this.maxDeltaY_ = maxDeltaY;
        };

        /**
         * 处理函数
         * @param {BrowserEvent} e The underlying browser event.
         */
        MouseWheelHandler.prototype.handleEvent = function(e) {
            var deltaX = 0;
            var deltaY = 0;
            var detail = 0;
            // 得到原生事件对象
            var be = e.getBrowserEvent();
            if (be.type === 'mousewheel') {
                var wheelDeltaScaleFactor = 1;
                if (ua.isIE || ua.isWEBKIT && (ua.isWINDOWS || ua.isVersionOrHigher('532.0'))) {
                    // IE下得到的是120的倍数,我们调整成3的倍数(同Gecko一样)以便于可以说明滚动的行数.
                    // 较新版本的Webkit和IE的行为类似, 在windows系统的WebKit也都和IE一样.
                    // 详见: https://bugs.webkit.org/show_bug.cgi?id=24368
                    wheelDeltaScaleFactor = 40;
                }

                detail = smartScale_(-be.wheelDelta, wheelDeltaScaleFactor);
                if (!util.isNull(be.wheelDeltaX)) {
                    // Webkit有wheelDeltaX|wheelDeltaY两个属性指明滚动方向,且可以一次滚动两个方向.
                    deltaX = smartScale_(-be.wheelDeltaX, wheelDeltaScaleFactor);
                    deltaY = smartScale_(-be.wheelDeltaY, wheelDeltaScaleFactor);
                } else {
                    deltaY = detail;
                }

            // Historical note: Opera (pre 9.5) used to negate the detail value.
            } else {
                // Gecko
                // Gecko返回3的倍数指明滚动的行数
                detail = be.detail;

                // 用户在浏览器做了设置每次滚动就滚动一页的情况下,Gecko会返回很大的值
                if (detail > 100) {
                    detail = 3;
                } else if (detail < -100) {
                    detail = -3;
                }

                // Firefox 3.1为事件加了一个axis字段指明滚动的方向.
                // 详见: https://developer.mozilla.org/en/Gecko-Specific_DOM_Events
                if (!util.isNull(be.axis) && (be.axis === be.HORIZONTAL_AXIS)) {
                    deltaX = detail;
                } else {
                    deltaY = detail;
                }
            }

            // 限定deltaX deltaY的范围
            if (util.isNumber(this.maxDeltaX_)) {
                deltaX = math.clamp(deltaX, -this.maxDeltaX_, this.maxDeltaX_);
            }
            if (util.isNumber(this.maxDeltaY_)) {
                deltaY = math.clamp(deltaY, -this.maxDeltaY_, this.maxDeltaY_);
            }
            // 这里不对detail数值做限制的原因是detail字段没有指示滚动的是什么方向另外这个属性
            // 通常也不建议使用.

            // 横向滚动需要对rtl的元素对deltaX求反.
            if (this.isRtl_) {
                deltaX = -deltaX;
            }
            var newEvent = new MouseWheelEvent(detail, be, deltaX, deltaY);
            this.dispatchEvent(newEvent);
        };

        /** @override */
        MouseWheelHandler.prototype.disposeInternal = function() {
            MouseWheelHandler.superClass_.disposeInternal.call(this);
            EventUtil.unlistenByKey(this.listenKey_);
            this.listenKey_ = null;
        };

        return MouseWheelHandler;
    }
);