/**
 * @fileoverview 拖拽动画. 提供一些拖拽,释放可扩展的功能.
 * @see ../../demos/drag.html
 * @see ../../demos/dragger.html
 * @author Leo.Zhang
 * @email zmike86@gmail.com
 */

define('@fx.dragger',
    [
        '@util',
        '@dom.util',
        '@events.util',
        '@events.eventBase',
        '@events.handlerManager',
        '@events.eventTarget',
        '@events.eventType',
        '@math.coordinate',
        '@math.rect',
        '@style.util',
        '@style.bidi',
        '@ua.util',
        '@fx.draggerEventType',
        '@fx.dragEvent'
    ],
    function(util, dom, EventsUtil, EventBase, HandlerManager, EventTarget, EventType,
             Coordinate, Rect, style, bidi, ua, DraggerEventType, DragEvent) {

        'use strict';

        /**
         * 拖拽类.适用于鼠标拖拽或者触控设备移动元素.
         * @param {Element} target 要移动的元素.
         * @param {Element=} opt_handle 拖拽的部分,若没提供则默认目标元素.
         * @param {Rect=} opt_limits 限制拖拽范围的矩形,含有left,top,width,height属性.
         * @extends {EventTarget}
         * @constructor
         */
        var Dragger = function(target, opt_handle, opt_limits) {
            EventTarget.call(this);
            this.target = target;
            this.handle = opt_handle || target;
            this.limits = opt_limits || new Rect(NaN, NaN, NaN, NaN);

            this.document_ = dom.getOwnerDocument(target);
            this.handlerManager_ = new HandlerManager(this);
            this.registerDisposable(this.handlerManager_);

            // 绑定事件. 这里没用handlermanager因为它被用作拖拽过程中的事件绑定与解绑.
            EventsUtil.listen(this.handle,
                [EventType.TOUCHSTART, EventType.MOUSEDOWN],
                this.startDrag, false, this);
        };

        util.inherits(Dragger, EventTarget);


        /**
         * setCapture特性是否被浏览器支持.
         * @type {boolean}
         * @private
         */
        Dragger.HAS_SET_CAPTURE_ =
            // IE 和 Gecko after 1.9.3 支持setCapture
            // WebKit暂不支持: https://bugs.webkit.org/show_bug.cgi?id=27330
            ua.isIE || ua.isGECKO && ua.isVersionOrHigher('1.9.3');


        /**
         * 拖拽的目标元素.
         * @type {Element}
         */
        Dragger.prototype.target = null;


        /**
         * 拖拽的部分.
         * @type {Element}
         */
        Dragger.prototype.handle = null;


        /**
         * 拖拽的限制范围.
         * @type {Rect}
         */
        Dragger.prototype.limits = null;


        /**
         * 元素的渲染方向是否rtl. 这个属性惰性设置.
         * @type {boolean|undefined}
         * @private
         */
        Dragger.prototype.rightToLeft_ = null;


        /**
         * todo
         * 当前鼠标相对于视口的x坐标. 之前用的screenX, 但米考虑到zoom和像素密度?
         * @type {number}
         */
        Dragger.prototype.clientX = 0;


        /**
         * 当前鼠标相对于视口的y坐标.
         * @type {number}
         */
        Dragger.prototype.clientY = 0;


        /**
         * 初次按下鼠标或触碰屏幕的x坐标.
         * @type {number}
         */
        Dragger.prototype.startX = 0;


        /**
         * 初次按下鼠标或触碰屏幕的y坐标.
         * @type {number}
         */
        Dragger.prototype.startY = 0;


        /**
         * 当时距离元素父元素的x距离.
         * @type {number}
         */
        Dragger.prototype.deltaX = 0;


        /**
         * 当时距离元素父元素的y距离.
         * @type {number}
         */
        Dragger.prototype.deltaY = 0;


        /**
         * 当前页面的滚动距离.
         * @type {Coordinate}
         */
        Dragger.prototype.pageScroll = null;


        /**
         * 拖拽是否启用.
         * @type {boolean}
         * @private
         */
        Dragger.prototype.enabled_ = true;


        /**
         * 是否正在拖拽中.
         * @type {boolean}
         * @private
         */
        Dragger.prototype.dragging_ = false;


        /**
         * 像素单位的距离,大于这个距离后mousedown 或 touchstart会被认为是退拽.
         * @type {number}
         * @private
         */
        Dragger.prototype.hysteresisDistanceSquared_ = 0;


        /**
         * mousedown 或 touchstart 开始的时间戳.
         * @type {number}
         * @private
         */
        Dragger.prototype.mouseDownTime_ = 0;


        /**
         * 当前文档对象.
         * @type {Document}
         * @private
         */
        Dragger.prototype.document_ = null;


        /**
         * 若拖拽元素所在的容器有滚动事件发生,返回滚动的元素.
         * The SCROLL event target used to make drag element follow scrolling.
         * @type {EventTarget}
         * @private
         */
        Dragger.prototype.scrollTarget_ = null;


        /**
         * Whether IE drag events cancelling is on.
         * @type {boolean}
         * @private
         */
        Dragger.prototype.ieDragStartCancellingOn_ = false;


        /**
         * dragger是否实现了如下描述的变化 http://b/6324964, 让它是真正的RTL.
         * 这是一个开关变量允许客户端程序依据需求动态改变这个值. 其他情况会使用默认的false值.
         * @type {boolean}
         * @private
         */
        Dragger.prototype.useRightPositioningForRtl_ = false;


        /**
         * RTL behavior的开关. 这个方法应在构造器之后立即调用. 这是一个开关变量允许客户端程序
         * 依据需求动态改变这个值. 一些情况下默认是true.
         * @param {boolean} useRightPositioningForRtl true定位从右开始"right", 否则从左开始.
         */
        Dragger.prototype.enableRightPositioningForRtl =
            function(useRightPositioningForRtl) {
                this.useRightPositioningForRtl_ = useRightPositioningForRtl;
            };


        /**
         * 返回实例的事件管理器.
         * @return {HandlerManager} The event handler.
         */
        Dragger.prototype.getHandler = function() {
            return this.handlerManager_;
        };


        /**
         * Dragger实例化后仍然可以设置限制范围.
         * @param {Rect?} limits 范围矩形. 若目标元素是right-to-left渲染模式并且调用了
         *     enableRightPositioningForRtl(true), rect对象会被解释成right, top, width, and height.
         */
        Dragger.prototype.setLimits = function(limits) {
            this.limits = limits || new Rect(NaN, NaN, NaN, NaN);
        };


        /**
         * 设置拖拽识别距离的阈值.
         * @param {number} distance 以像素为单位.
         */
        Dragger.prototype.setHysteresis = function(distance) {
            this.hysteresisDistanceSquared_ = Math.pow(distance, 2);
        };


        /**
         * 获取拖拽识别距离的阈值.
         * @return {number} distance 以像素为单位.
         */
        Dragger.prototype.getHysteresis = function() {
            return Math.sqrt(this.hysteresisDistanceSquared_);
        };


        /**
         * Sets the SCROLL event target to make drag element follow scrolling.
         * @param {EventTarget} scrollTarget The event target that dispatches SCROLL
         *     events.
         */
        Dragger.prototype.setScrollTarget = function(scrollTarget) {
            this.scrollTarget_ = scrollTarget;
        };


        /**
         * Enables cancelling of built-in IE drag events.
         * @param {boolean} cancelIeDragStart Whether to enable cancelling of IE
         *     dragstart event.
         */
        Dragger.prototype.setCancelIeDragStart = function(cancelIeDragStart) {
            this.ieDragStartCancellingOn_ = cancelIeDragStart;
        };


        /**
         * @return {boolean} 是否启动拖拽.
         */
        Dragger.prototype.getEnabled = function() {
            return this.enabled_;
        };


        /**
         * @param {boolean} enabled Whether dragger is enabled.
         */
        Dragger.prototype.setEnabled = function(enabled) {
            this.enabled_ = enabled;
        };


        /** @override */
        Dragger.prototype.disposeInternal = function() {
            Dragger.superClass_.disposeInternal.call(this);
            // 解绑事件
            EventsUtil.unlisten(this.handle,
                [EventType.TOUCHSTART, EventType.MOUSEDOWN],
                this.startDrag, false, this);

            this.cleanUpAfterDragging_();
            // 释放dom引用
            this.target = null;
            this.handle = null;
        };


        /**
         * 判断目标元素渲染模式是否right-to-left.
         * @return {boolean} 是的话返回true否则返回false.
         * @private
         */
        Dragger.prototype.isRightToLeft_ = function() {
            if (!util.isDef(this.rightToLeft_)) {
                this.rightToLeft_ = style.isRightToLeft(this.target);
            }
            return this.rightToLeft_;
        };


        /**
         * 开始拖拽
         * @param {BrowserEvent} e Event object.
         */
        Dragger.prototype.startDrag = function(e) {
            var isMouseDown = (e.type === EventType.MOUSEDOWN);

            // Dragger.startDrag() can be called by AbstractDragDrop with a mousemove
            // event and IE does not report pressed mouse buttons on mousemove. Also,
            // it does not make sense to check for the button if the user is already
            // dragging.

            // 启用拖拽 且 不在拖拽中 且 (是触控触发 或 是有效的鼠标左键单击)
            if (this.enabled_ && !this.dragging_ && (!isMouseDown || e.isMouseActionButton())) {

                this.maybeReinitTouchEvent_(e);
                // 无距离误差
                if (this.hysteresisDistanceSquared_ === 0) {
                    // 分发事件
                    if (this.fireDragStart_(e)) {
                        this.dragging_ = true;
                        e.preventDefault();
                    } else {
                        // 如果start drag事件被处理器阻止了默认行为则不绑定任何后续事件.
                        return;
                    }
                }
                // 若有距离差额则阻止默认行为
                else {
                    e.preventDefault();
                }
                // 绑定必要后续事件
                this.setupDragHandlers();

                this.clientX = this.startX = e.clientX;
                this.clientY = this.startY = e.clientY;
                this.deltaX = this.useRightPositioningForRtl_ ?
                    bidi.getOffsetStart(this.target) : this.target.offsetLeft;
                this.deltaY = this.target.offsetTop;
                this.pageScroll = dom.getDomHelper(this.document_).getDocumentScroll();

                this.mouseDownTime_ = util.now();
            } else {
                this.dispatchEvent(DraggerEventType.EARLY_CANCEL);
            }
        };


        /**
         * 开始拖拽时绑定的事件.
         * @protected
         */
        Dragger.prototype.setupDragHandlers = function() {
            var doc = this.document_;
            var docEl = doc.documentElement;

            // 若是支持setCapture的浏览器则事件监听一律用冒泡模式而弃用捕获模式. 原因是IE下
            // 设置了setCapture后事件对象的capturing会出现不预期行为.
            var useCapture = !Dragger.HAS_SET_CAPTURE_;

            // 移动 释放
            this.handlerManager_.listen(doc, [EventType.TOUCHMOVE, EventType.MOUSEMOVE],
                this.handleMove_, useCapture);
            this.handlerManager_.listen(doc, [EventType.TOUCHEND, EventType.MOUSEUP],
                this.endDrag, useCapture);

            if (Dragger.HAS_SET_CAPTURE_) {
                docEl.setCapture(false);
                this.handlerManager_.listen(docEl, EventType.LOSECAPTURE, this.endDrag);
            } else {
                // 当window失去焦点就要结束拖拽. 不用捕获或者冒泡因为必须是window自己失去焦点
                // 我们才结束拖拽,因此使用不冒泡的blur事件.
                this.handlerManager_.listen(dom.getWindow(doc), EventType.BLUR, this.endDrag);
            }

            if (ua.isIE && this.ieDragStartCancellingOn_) {
                // Cancel IE's 'ondragstart' event.
                this.handlerManager_.listen(doc, EventType.DRAGSTART,
                    EventBase.preventDefault);
            }

            if (this.scrollTarget_) {
                this.handlerManager_.listen(this.scrollTarget_, EventType.SCROLL,
                    this.onScroll_, useCapture);
            }
        };


        /**
         * 分发DraggerEventType.START事件.
         * @param {BrowserEvent} e 标准化后的浏览器事件 that triggered the drag.
         * @return {boolean} 返回是否有处理器阻止了DragEvent的默认行为.
         * @private
         */
        Dragger.prototype.fireDragStart_ = function(e) {
            return this.dispatchEvent(new DragEvent(DraggerEventType.START,
                this, e.clientX, e.clientY, e));
        };


        /**
         * 解绑所有拖拽过程中绑定的事件,释放鼠标捕获.
         * @private
         */
        Dragger.prototype.cleanUpAfterDragging_ = function() {
            this.handlerManager_.removeAll();
            if (Dragger.HAS_SET_CAPTURE_) {
                this.document_.releaseCapture();
            }
        };


        /**
         * 结束拖拽.
         * @param {BrowserEvent} e Event object.
         * @param {boolean=} opt_dragCanceled 是否已经取消了拖拽.
         */
        Dragger.prototype.endDrag = function(e, opt_dragCanceled) {
            this.cleanUpAfterDragging_();

            if (this.dragging_) {
                this.maybeReinitTouchEvent_(e);
                this.dragging_ = false;

                var x = this.limitX(this.deltaX);
                var y = this.limitY(this.deltaY);
                var dragCanceled = opt_dragCanceled || e.type === EventType.TOUCHCANCEL;
                this.dispatchEvent(new DragEvent(
                    DraggerEventType.END, this, e.clientX, e.clientY, e, x, y,
                    dragCanceled));
            } else {
                this.dispatchEvent(DraggerEventType.EARLY_CANCEL);
            }
        };


        /**
         * 手动取消拖拽.
         * @param {BrowserEvent} e Event object.
         */
        Dragger.prototype.endDragCancel = function(e) {
            this.endDrag(e, true);
        };


        /**
         * 重新初始化触控事件对象.
         * 若是开始拖拽则用 first target touch event;
         * 若是结束拖拽则用 the last changed touch.
         * @param {BrowserEvent} e A TOUCH event.
         * @private
         */
        Dragger.prototype.maybeReinitTouchEvent_ = function(e) {
            var type = e.type;
            if (type === EventType.TOUCHSTART || type === EventType.TOUCHMOVE) {
                e.init(e.getBrowserEvent().targetTouches[0], e.currentTarget);
            }
            else if (type === EventType.TOUCHEND || type === EventType.TOUCHCANCEL) {
                e.init(e.getBrowserEvent().changedTouches[0], e.currentTarget);
            }
        };


        /**
         * Event handler that is used on mouse / touch move to update the drag
         * @param {BrowserEvent} e Event object.
         * @private
         */
        Dragger.prototype.handleMove_ = function(e) {
            if (this.enabled_) {
                this.maybeReinitTouchEvent_(e);
                // dx in right-to-left cases is relative to the right.
                var sign = this.useRightPositioningForRtl_ &&
                    this.isRightToLeft_() ? -1 : 1;
                var dx = sign * (e.clientX - this.clientX);
                var dy = e.clientY - this.clientY;
                this.clientX = e.clientX;
                this.clientY = e.clientY;

                if (!this.dragging_) {
                    var diffX = this.startX - this.clientX;
                    var diffY = this.startY - this.clientY;
                    var distance = diffX * diffX + diffY * diffY;
                    if (distance > this.hysteresisDistanceSquared_) {
                        if (this.fireDragStart_(e)) {
                            this.dragging_ = true;
                        } else {
                            // DragListGroup disposes of the dragger if BEFOREDRAGSTART is
                            // canceled.
                            if (!this.isDisposed()) {
                                this.endDrag(e);
                            }
                            return;
                        }
                    }
                }

                var pos = this.calculatePosition_(dx, dy);
                var x = pos.x;
                var y = pos.y;

                if (this.dragging_) {

                    var rv = this.dispatchEvent(new DragEvent(
                        DraggerEventType.BEFOREDRAG, this, e.clientX, e.clientY,
                        e, x, y));

                    // Only do the defaultAction and dispatch drag event if predrag didn't
                    // prevent default
                    if (rv) {
                        this.doDrag(e, x, y, false);
                        e.preventDefault();
                    }
                }
            }
        };


        /**
         * Calculates the drag position.
         *
         * @param {number} dx The horizontal movement delta.
         * @param {number} dy The vertical movement delta.
         * @return {Coordinate} The newly calculated drag element position.
         * @private
         */
        Dragger.prototype.calculatePosition_ = function(dx, dy) {
            // Update the position for any change in body scrolling
            var pageScroll = dom.getDomHelper(this.document_).getDocumentScroll();
            dx += pageScroll.x - this.pageScroll.x;
            dy += pageScroll.y - this.pageScroll.y;
            this.pageScroll = pageScroll;

            this.deltaX += dx;
            this.deltaY += dy;

            var x = this.limitX(this.deltaX);
            var y = this.limitY(this.deltaY);
            return new Coordinate(x, y);
        };


        /**
         * Event handler for scroll target scrolling.
         * @param {BrowserEvent} e The event.
         * @private
         */
        Dragger.prototype.onScroll_ = function(e) {
            var pos = this.calculatePosition_(0, 0);
            e.clientX = this.clientX;
            e.clientY = this.clientY;
            this.doDrag(e, pos.x, pos.y, true);
        };


        /**
         * @param {BrowserEvent} e The closure object
         *     representing the browser event that caused a drag event.
         * @param {number} x The new horizontal position for the drag element.
         * @param {number} y The new vertical position for the drag element.
         * @param {boolean} dragFromScroll Whether dragging was caused by scrolling
         *     the associated scroll target.
         * @protected
         */
        Dragger.prototype.doDrag = function(e, x, y, dragFromScroll) {
            this.defaultAction(x, y);
            this.dispatchEvent(new DragEvent(
                DraggerEventType.DRAG, this, e.clientX, e.clientY, e, x, y));
        };


        /**
         * Returns the 'real' x after limits are applied (allows for some
         * limits to be undefined).
         * @param {number} x X-coordinate to limit.
         * @return {number} The 'real' X-coordinate after limits are applied.
         */
        Dragger.prototype.limitX = function(x) {
            var rect = this.limits;
            var left = !isNaN(rect.left) ? rect.left : null;
            var width = !isNaN(rect.width) ? rect.width : 0;
            var maxX = (left !== null ? left + width : Infinity);
            var minX = (left !== null ? left : -Infinity);
            return Math.min(maxX, Math.max(minX, x));
        };


        /**
         * Returns the 'real' y after limits are applied (allows for some
         * limits to be undefined).
         * @param {number} y Y-coordinate to limit.
         * @return {number} The 'real' Y-coordinate after limits are applied.
         */
        Dragger.prototype.limitY = function(y) {
            var rect = this.limits;
            var top = !isNaN(rect.top) ? rect.top : null;
            var height = !isNaN(rect.height) ? rect.height : 0;
            var maxY = (top !== null ? top + height : Infinity);
            var minY = (top !== null ? top : -Infinity);
            return Math.min(maxY, Math.max(minY, y));
        };


        /**
         * Overridable function for handling the default action of the drag behaviour.
         * Normally this is simply moving the element to x,y though in some cases it
         * might be used to resize the layer.  This is basically a shortcut to
         * implementing a default ondrag event handler.
         * @param {number} x X-coordinate for target element. In right-to-left, x this
         *     is the number of pixels the target should be moved to from the right.
         * @param {number} y Y-coordinate for target element.
         */
        Dragger.prototype.defaultAction = function(x, y) {
            if (this.useRightPositioningForRtl_ && this.isRightToLeft_()) {
                this.target.style.right = x + 'px';
            } else {
                this.target.style.left = x + 'px';
            }
            this.target.style.top = y + 'px';
        };


        /**
         * @return {boolean} 返回是否正在拖拽.
         */
        Dragger.prototype.isDragging = function() {
            return this.dragging_;
        };

        return Dragger;
    }
);
