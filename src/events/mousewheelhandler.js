/**
 * @fileoverview 专门为mousewheel事件提供了处理器类。这个处理器会在元素上滚轮的时候分发标准事件。
 * 开发人员可以通过滚轮事件的deltaX and deltaY 属性获取滚动方向。
 *
 * 多平台多浏览器下的mousewheel事件存在很大分歧，具体可以看看冰山一角：
 *   http://www.javascriptkit.com/javatutors/onmousewheel.shtml
 * 这个类主要为了消除这些异同，但很难面对所有情况，有时候deltas会给出非常大的值。
 * 如果避免这些，应该用setMaxDeltaX and setMaxDeltaY APIs防止值过大。
 *
 * @modified Leo.Zhang
 * @email zmike86@gmail.com
 * @see ../demos/mousewheelhandler.html
 */

;sogou('Sogou.Events.MouseWheelHandler',
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
         * 事件处理器包装类，监听mousewheel事件
         * @param {Element|Document} element 监听的元素
         * @param {boolean=} opt_capture 捕获阶段是否触发
         * @constructor
         * @extends {EventTarget}
         */
        var MouseWheelHandler = function(element, opt_capture) {
            EventTarget.call(this);

            /**
             * This is the element that we will listen to the real mouse wheel events on.
             * @type {Element|Document}
             * @private
             */
            this.element_ = element;

            var rtlElement = dom.isElement(this.element_) ?
            /** @type {Element} */ (this.element_) :
                (this.element_ ? /** @type {Document} */ (this.element_).body : null);

            /**
             * True if the element exists and is RTL, false otherwise.
             * @type {boolean}
             * @private
             */
            this.isRtl_ = !!rtlElement && style.isRightToLeft(rtlElement);

            var type = ua.isGECKO ? 'DOMMouseScroll' : 'mousewheel';

            /**
             * The key returned from the events.listen.
             * @type {events.Key}
             * @private
             */
            this.listenKey_ = EventUtil.listen(this.element_, type, this, opt_capture);
        };
        util.inherits(MouseWheelHandler, EventTarget);

        /**
         * Optional maximum magnitude for x delta on each mousewheel event.
         * @type {number|undefined}
         * @private
         */
        MouseWheelHandler.prototype.maxDeltaX_;

        /**
         * Optional maximum magnitude for y delta on each mousewheel event.
         * @type {number|undefined}
         * @private
         */
        MouseWheelHandler.prototype.maxDeltaY_;

        /**
         * @param {number} maxDeltaX Maximum magnitude for x delta on each mousewheel
         *     event. 非负数
         */
        MouseWheelHandler.prototype.setMaxDeltaX = function(maxDeltaX) {
            this.maxDeltaX_ = maxDeltaX;
        };

        /**
         * @param {number} maxDeltaY Maximum magnitude for y delta on each mousewheel
         *     event. Should be non-negative.
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
            if (be.type == 'mousewheel') {
                var wheelDeltaScaleFactor = 1;
                if (ua.isIE || ua.isWEBKIT && (ua.isWINDOWS || ua.isVersionOrHigher('532.0'))) {
                    // In IE we get a multiple of 120; we adjust to a multiple of 3 to
                    // represent number of lines scrolled (like Gecko).
                    // Newer versions of Webkit match IE behavior, and WebKit on
                    // Windows also matches IE behavior.
                    // See bug https://bugs.webkit.org/show_bug.cgi?id=24368
                    wheelDeltaScaleFactor = 40;
                }

                detail = MouseWheelHandler.smartScale_(-be.wheelDelta, wheelDeltaScaleFactor);
                if (!util.isNull(be.wheelDeltaX)) {
                    // Webkit has two properties to indicate directional scroll, and
                    // can scroll both directions at once.
                    deltaX = MouseWheelHandler.smartScale_(-be.wheelDeltaX, wheelDeltaScaleFactor);
                    deltaY = MouseWheelHandler.smartScale_(-be.wheelDeltaY, wheelDeltaScaleFactor);
                } else {
                    deltaY = detail;
                }

            // Historical note: Opera (pre 9.5) used to negate the detail value.
            } else { // Gecko
                // Gecko returns multiple of 3 (representing the number of lines scrolled)
                detail = be.detail;

                // Gecko sometimes returns really big values if the user changes settings to
                // scroll a whole page per scroll
                if (detail > 100) {
                    detail = 3;
                } else if (detail < -100) {
                    detail = -3;
                }

                // Firefox 3.1 adds an axis field to the event to indicate direction of
                // scroll.  See https://developer.mozilla.org/en/Gecko-Specific_DOM_Events
                if (!util.isNull(be.axis) && be.axis === be.HORIZONTAL_AXIS) {
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
            // Don't clamp 'detail', since it could be ambiguous which axis it refers to
            // and because it's informally deprecated anyways.

            // For horizontal scrolling we need to flip the value for RTL grids.
            if (this.isRtl_) {
                deltaX = -deltaX;
            }
            var newEvent = new MouseWheelEvent(detail, be, deltaX, deltaY);
            this.dispatchEvent(newEvent);
        };

        /**
         * 把原生事件提供的转动角度mousewheel delta根据一定的因子缩小
         * @param {number} mouseWheelDelta Delta from a mouse wheel event. Expected to
         *     be an integer.
         * @param {number} scaleFactor 缩放因子，是一个整数
         * @return {number} Scaled-down delta value, or the original delta if the
         *     scaleFactor does not appear to be applicable.
         * @private
         */
        MouseWheelHandler.smartScale_ = function(mouseWheelDelta, scaleFactor) {
            // The basic problem here is that in Webkit on Mac and Linux, we can get two
            // very different types of mousewheel events: from continuous devices
            // (touchpads, Mighty Mouse) or non-continuous devices (normal wheel mice).
            //
            // Non-continuous devices in Webkit get their wheel deltas scaled up to
            // behave like IE. Continuous devices return much smaller unscaled values
            // (which most of the time will not be cleanly divisible by the IE scale
            // factor), so we should not try to normalize them down.
            //
            // Detailed discussion:
            //   https://bugs.webkit.org/show_bug.cgi?id=29601
            //   http://trac.webkit.org/browser/trunk/WebKit/chromium/src/mac/WebInputEventFactory.mm#L1063
            if (ua.isWEBKIT && (ua.isMAC || ua.isLINUX) && (mouseWheelDelta % scaleFactor) != 0) {
                return mouseWheelDelta;
            } else {
                return mouseWheelDelta / scaleFactor;
            }
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