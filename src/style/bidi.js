/**
 * @fileoverview Bidi模块. 这个模块是style模块的补充,主要考虑了rtl渲染模式下元素的
 *     诸多定位和滚动的问题.
 * @modified Leo.Zhang
 * @email zmike86@gmail.com
 */

define('Sogou.Style.Bidi',
    [
        'Sogou.Util',
        'Sogou.Dom.Util',
        'Sogou.Style.Util',
        'Sogou.UA.Util'
    ],
    function(util, dom, style, ua) {

        'use strict';

        return {
            /**
             * 如果元素滚动了, 返回它的scrollLeft, 以像素为单位
             * @param {Element} element 元素
             * @return {number} 横向滚动距离. 0代表没有滚动. ltr文本方向则返回scrollLeft, 否则返回scrollRight.
             */
            getScrollLeft: function(element) {
                var isRtl = style.isRightToLeft(element);
                // FireFox下并且是rtl模式,scrollleft从0开始向左(towards the left)滚动时会变成负数,且越来越大
                if (isRtl && ua.isGECKO) {
                    return -element.scrollLeft;
                } else if (isRtl && !(ua.isIE && ua.isVersionOrHigher('8'))) {
                    // ScrollLeft在向左滚动时从一个无穷大的正数开始逐步递减为0. 但是当overflow设置成visible,
                    // 会没有scrollLeft, 它的值保持在正确的0. todo
                    var overflowX = style.getComputedOverflowX(element);
                    if (overflowX === 'visible')
                        return element.scrollLeft;
                    else
                        return element.scrollWidth - element.clientWidth - element.scrollLeft;
                }
                // ScrollLeft在rtl和ltr两种模式中应该是统一的, 从0开始随着滚动距离越来越大正向增长
                return element.scrollLeft;
            },

            /**
             * 返回元素的 "offsetStart", 类似于offsetLeft但针对rtl模式和各个浏览器的不一致结果做了兼容.
             * 返回值可直接传入setScrollOffset方法, 该方法相对offsetParent进行位移.
             * 比如下图所示offsetStart在ltr模式下是10px, 而在rtl模式下是5px:
             *
             * <pre>
             * |          xxxxxxxxxx     |
             *  ^^^^^^^^^^   ^^^^   ^^^^^
             *     10px      elem    5px
             * </pre>
             *
             * If an element is positioned before the start of its offsetParent, the
             * startOffset may be negative.  This can be used with setScrollOffset to
             * reliably scroll to an element:
             *
             * <pre>
             *   var scrollOffset = bidi.getOffsetStart(element);
             *   bidi.setScrollOffset(element.offsetParent, scrollOffset);
             * </pre>
             *
             * @see setScrollOffset
             * @param {Element} element 需要确定offsetStart position的元素.
             * @return {number} 元素的offsetStart.
             */
            getOffsetStart: function(element) {
                var offsetLeftForReal = element.offsetLeft;

                // 元素可能没有offsetParent.
                // 比如, 元素没在DOM树中, 另外position:fixed的子元素没有offset parent.
                var bestParent = element.offsetParent;

                if (!bestParent && style.getComputedPosition(element) === 'fixed') {
                    bestParent = dom.getOwnerDocument(element).documentElement;
                }

                // Just give up in this case.
                if (!bestParent) {
                    return offsetLeftForReal;
                }

                var borderWidths;
                if (ua.isGECKO) {
                    // When calculating an element's offsetLeft, Firefox erroneously subtracts
                    // the border width from the actual distance.  So we need to add it back.
                    borderWidths = style.getBorderBox(bestParent);
                    offsetLeftForReal += borderWidths.left;
                } else if (ua.isDocumentModeOrHigher(8)) {
                    // When calculating an element's offsetLeft, IE8-Standards Mode erroneously
                    // adds the border width to the actual distance.  So we need to subtract it.
                    borderWidths = style.getBorderBox(bestParent);
                    offsetLeftForReal -= borderWidths.left;
                }

                if (style.isRightToLeft(bestParent)) {
                    // Right edge of the element relative to the left edge of its parent.
                    var elementRightOffset = offsetLeftForReal + element.offsetWidth;

                    // Distance from the parent's right edge to the element's right edge.
                    return bestParent.clientWidth - elementRightOffset;
                }

                return offsetLeftForReal;
            },

            /**
             * 设置元素的scrollLeft属性保证能够根据offsetStart pixels正确滚动.
             * 方法兼容了浏览器的细微差别并且考虑了元素的RTL渲染模式.
             * 为了能使元素设置正确的起始滚动位置, 使用getOffsetStart获取元素的offsetStart
             * 并传入setScrollOffset.
             * @see getOffsetStart
             * @param {Element} element 要设置scrollLeft的元素.
             * @param {number} offsetStart 要设置的滚动距离(pixel).If this value is < 0, 0 is used.
             */
            setScrollOffset: function(element, offsetStart) {
                offsetStart = Math.max(offsetStart, 0);
                // In LTR and in "mirrored" browser RTL (such as IE), we set scrollLeft to
                // the number of pixels to scroll.
                // Otherwise, in RTL, we need to account for different browser behavior.
                if (!style.isRightToLeft(element)) {
                    element.scrollLeft = offsetStart;
                } else if (ua.isGECKO) {
                    // Negative scroll-left positions in RTL.
                    element.scrollLeft = -offsetStart;
                } else if (!(ua.isIE && ua.isVersionOrHigher('8'))) {
                    // Take the current scrollLeft value and move to the right by the
                    // offsetStart to get to the left edge of the element, and then by
                    // the clientWidth of the element to get to the right edge.
                    element.scrollLeft =
                        element.scrollWidth - offsetStart - element.clientWidth;
                } else {
                    element.scrollLeft = offsetStart;
                }
            },

            /**
             * LTR则设置left属性,清除right属性,反之亦然.
             * @param {Element} elem 元素.
             * @param {number} left The left position in LTR; will be set as right in RTL.
             * @param {?number} top The top position.
             * @param {boolean} isRtl 是否RTL模式.
             */
            setPosition: function(elem, left, top, isRtl) {
                if (!util.isNull(top)) {
                    elem.style.top = top + 'px';
                }
                if (isRtl) {
                    elem.style.right = left + 'px';
                    elem.style.left = '';
                } else {
                    elem.style.left = left + 'px';
                    elem.style.right = '';
                }
            }
        };
    }
);