/**
 * @fileoverview 关于dom元素样式的操作,这个模块太多兼容性的处理,了解就好
 * @author Leo.Zhang
 * @email zmike86@gmail.com
 * @see ../../demos/style/inline_block_quirks.html
 * @see ../../demos/style/inline_block_standards.html
 * @see ../../demos/style/style_viewport.html
 */

define('@style.util',
    [
        '@util',
        '@array',
        '@dom.util',
        '@dom.nodeType',
        '@dom.vender',
        '@math.Coordinate',
        '@math.Size',
        '@object',
        '@string.util',
        '@ua.util'
    ],
    function(util, array, dom, NodeType, vender, Coordinate, Size, object, string, ua) {

        'use strict';

        /**
         * 正则获取设置transform:matrix样式的x和y的translation部分.
         * 见: http://www.w3school.com.cn/css3/css3_2dtransform.asp
         * @type {!RegExp}
         * @const
         * @private
         */
        var MATRIX_TRANSLATION_REGEX_ =
            new RegExp('matrix\\([0-9\\.\\-]+, [0-9\\.\\-]+, ' +
                '[0-9\\.\\-]+, [0-9\\.\\-]+, ' + '([0-9\\.\\-]+)p?x?, ([0-9\\.\\-]+)p?x?\\)');


        /**
         * 返回一个驼峰式css属性名称可以直接用js操作.
         * @param {Element} element 元素.
         * @param {string} style 样式名称.
         * @return {string} Vendor-specific style.
         * @private
         */
        function getVendorJsStyleName_(element, style) {
            var camelStyle = string.toCamelCase(style);
            if (element.style[camelStyle] === undefined) {
                var prefixedStyle = vender.getVendorJsPrefix() + string.toTitleCase(style);
                if (element.style[prefixedStyle] !== undefined)
                    return prefixedStyle;
            }
            return camelStyle;
        }


        /**
         * css格式下返回属性名称, 如果不存在且恰巧厂商前缀存在就返回带前缀的名称
         * @param {Element} element 元素.
         * @param {string} style Style name.
         * @return {string} Vendor-specific style.
         * @private
         */
        function getVendorStyleName_(element, style) {
            var camelStyle = string.toCamelCase(style);
            if (element.style[camelStyle] === undefined) {
                var prefixedStyle = vender.getVendorJsPrefix() + string.toTitleCase(style);
                if (element.style[prefixedStyle] !== undefined)
                    return vender.getVendorPrefix() + '-' + style;
            }
            return style;
        }


        /**
         * 设置元素样式
         * @param {Element} element The element to change.
         * @param {string|number|boolean|undefined} value Style value.
         * @param {string} style Style name.
         * @private
         */
        function setStyle_(element, value, style) {
            // 取得js前缀
            var propertyName = getVendorJsStyleName_(element, style);
            if (propertyName) {
                element.style[propertyName] = value;
            }
        }


        /**
         * 获取实时计算样式，跨浏览器不该被直接调用,
         * 见: http://wiki/Main/ComputedStyleVsCascadedStyle for discussion.
         * @param {Element} element 元素.
         * @param {string} style 属性 (must be camelCase, not css-style.).
         * @return {string} Style value.
         * @private
         */
        function getStyle_(element, style) {
            return getComputedStyle(element, style) ||
                getCascadedStyle(element, style) ||
                (element.style && element.style[style]);
        }


        /**
         * Helper function 返回要设置px为单位的样式值.
         * @param {string|number} value 样式值. 如果是数字附带上px作为单位,否则保持不变.
         * @param {boolean} round 是否四舍五入 (if property is a number).
         * @return {string} 返回能直接设置的带单位的样式值.
         * @private
         */
        function getPixelStyleValue_(value, round) {
            if (typeof value === 'number') {
                value = (round ? Math.round(value) : value) + 'px';
            }
            return value;
        }


        /**
         * 返回元素border距视口左上角的距离
         * @param {!Element} el 元素.
         * @return {!Coordinate} The position.
         * @private
         */
        function getClientPositionForElement_(el) {
            var pos;
            if (el.getBoundingClientRect) {
                // IE, Gecko 1.9+, and most modern WebKit
                var box = getBoundingClientRect_(el);
                pos = new Coordinate(box.left, box.top);
            } else {
                var scrollCoord = dom.getDomHelper(el).getDocumentScroll();
                var pageCoord = getPageOffset(el);
                pos = new Coordinate(pageCoord.x - scrollCoord.x, pageCoord.y - scrollCoord.y);
            }

            // Gecko below version 12 doesn't add CSS translation to the client position
            // (using either getBoundingClientRect or getBoxOffsetFor) so we need to do
            // so manually.
            if (ua.isGECKO && !ua.isVersionOrHigher(12)) {
                return Coordinate.sum(pos, getCssTranslation(el));
            } else {
                return pos;
            }
        }


        /**
         * 某些情况css变形不会被纳入计算,这个方法就是提取变化后的长宽值(px)
         * @param {!Element} element 获取translation的元素.
         * @return {!Coordinate} The CSS translation of the element in px.
         */
        function getCssTranslation(element) {
            var property;
            if (ua.isIE)
                property = '-ms-transform';
            else if (ua.isWEBKIT)
                property = '-webkit-transform';
            else if (ua.isOPERA)
                property = '-o-transform';
            else if (ua.isGECKO)
                property = '-moz-transform';

            var transform;
            if (property)
                transform = getStyle_(element, property);
            if (!transform)
                transform = getStyle_(element, 'transform');
            if (!transform)
                return new Coordinate(0, 0);

            var matches = transform.match(MATRIX_TRANSLATION_REGEX_);
            if (!matches) {
                return new Coordinate(0, 0);
            }

            return new Coordinate(parseFloat(matches[1]), parseFloat(matches[2]));
        }


        /**
         * 设置样式.
         * 此方法不会处理浏览器中对样式设置的各种不一致,但允许通过对象简单的一次性设置多个属性.
         * 也可以这样:
         * elem.style.cssText = 'property1: value1; property2: value2'.
         * @param {Element} element 元素.
         * @param {string|Object} style 如果是字符串就当作样式名. 如果是对象,就当做名值对.
         * @param {string|number|boolean=} opt_value 样式值.
         */
        function setStyle(element, style, opt_value) {
            if (util.isString(style)) {
                setStyle_(element, opt_value, style);
            } else {
                object.forEach(style, util.partial(setStyle_, element));
            }
        }


        /**
         * 取得显式设置的节点样式. 若不是style属性或者没被显式设置则返回'';
         * @param {Element} element 元素.
         * @param {string} property css-style的属性名 (if you have a camel-case
         * property, use element.style[style]).
         * @return {string} Style value.
         */
        function getStyle(element, property) {
            // element.style is '' for well-known properties which are unset.
            // For for browser specific styles as 'filter' is undefined
            // so we need to return '' explicitly to make it consistent across
            // browsers.
            var styleValue = element.style[string.toCamelCase(property)];

            // Using typeof here because of a bug in Safari 5.1, where this value
            // was undefined, but === undefined returned false.
            if (typeof(styleValue) !== 'undefined')
                return styleValue;

            return element.style[getVendorJsStyleName_(element, property)] || '';
        }


        /**
         * 获取元素实时计算样式. 这个方法适用于非IE,在SVG元素里假如没有显示设置样式则返回'none'.
         * (firefox and webkit).
         * @param {Element} element 要获取样式的元素.
         * @param {string} property 样式属性名(camel-case).
         * @return {string}
         */
        function getComputedStyle(element, property) {
            var doc = dom.getOwnerDocument(element);
            if (doc.defaultView && doc.defaultView.getComputedStyle) {
                var styles = doc.defaultView.getComputedStyle(element, null);
                if (styles) {
                    // element.style[..] is undefined for browser specific styles
                    // as 'filter'.
                    return styles[property] || styles.getPropertyValue(property) || '';
                }
            }
            return '';
        }


        /**
         * IE专有属性currentStyle
         * @param {Element} element 元素.
         * @param {string} style 属性 (camel-case).
         * @return {?string} Style value.
         */
        function getCascadedStyle(element, style) {
            return element.currentStyle ? element.currentStyle[style] : null;
        }


        /**
         * 获取 position CSS attribute.
         * @param {Element} element The element to get the position of.
         * @return {string} Position value.
         */
        function getComputedPosition(element) {
            return getStyle_(element, 'position');
        }


        /**
         * 不保证返回字符串的格式.
         * 如果背景色设置的是十六进制值 hexadecimal value, 返回的字符串可以用color模块的
         * parse方法处理.
         *
         * Whether named colors like "red" or "lightblue" get translated into a
         * format which can be parsed is browser dependent. Calling this function on
         * transparent elements will return "transparent" in most browsers or
         * "rgba(0, 0, 0, 0)" in WebKit.
         *
         * @param {Element} element 元素.
         * @return {string} 实时计算的背景色样式.
         */
        function getBackgroundColor(element) {
            return getStyle_(element, 'backgroundColor');
        }


        /**
         * Computed overflow-x CSS attribute.
         * @param {Element} element 元素.
         * @return {string} The computed string value of the overflow-x attribute.
         */
        function getComputedOverflowX(element) {
            return getStyle_(element, 'overflowX');
        }


        /**
         * Computed overflow-y CSS attribute.
         * @param {Element} element 元素.
         * @return {string} The computed string value of the overflow-y attribute.
         */
        function getComputedOverflowY(element) {
            return getStyle_(element, 'overflowY');
        }


        /**
         * Retrieves the computed value of the z-index CSS attribute.
         * @param {Element} element The element to get the z-index of.
         * @return {string|number} The computed value of the z-index attribute.
         */
        function getComputedZIndex(element) {
            return getStyle_(element, 'zIndex');
        }


        /**
         * 获取元素显式设置的透明度属性,不会计算实时透明度
         * @param {Element} el Element whose opacity has to be found.
         * @return {number|string} Opacity between 0 and 1 or an empty string {@code ''}
         *     if the opacity is not set.
         */
        function getOpacity(el) {
            var style = el.style;
            var result = '';
            if ('opacity' in style) {
                result = style.opacity;
            } else if ('MozOpacity' in style) {
                result = style.MozOpacity;
            } else if ('filter' in style) {
                var match = style.filter.match(/alpha\(opacity=([\d.]+)\)/);
                if (match)
                    result = String(match[1] / 100);
            }
            return result === '' ? result : Number(result);
        }


        /**
         * 跨浏览器设置元素透明度
         * @param {Element} el 元素.
         * @param {number|string} alpha [0,1]之间的值或者设成empty string清除样式.
         */
        function setOpacity(el, alpha) {
            var style = el.style;
            if ('opacity' in style) {
                style.opacity = alpha;
            } else if ('MozOpacity' in style) {
                style.MozOpacity = alpha;
            } else if ('filter' in style) {
                // todo: Overwriting the filter might have undesired side effects.
                if (alpha === '')
                    style.filter = '';
                else
                    style.filter = 'alpha(opacity=' + alpha * 100 + ')';
            }
        }


        /**
         * 设置元素的浮动
         * @param {Element} el The element to set float property on.
         * @param {string} value The value of float CSS property to set on this element.
         */
        function setFloat(el, value) {
            el.style[ua.isIE ? 'styleFloat' : 'cssFloat'] = value;
        }


        /**
         * 获取显式设置的元素浮动属性
         * @param {Element} el The element to get float property of.
         * @return {string} The value of explicitly-set float CSS property on this
         *     element.
         */
        function getFloat(el) {
            return el.style[ua.isIE ? 'styleFloat' : 'cssFloat'] || '';
        }


        /**
         * 返回元素的style.direction指定的渲染方向.
         * @param {Element} el 测试的元素.
         * @return {boolean} True for right to left, false for left to right.
         */
        function isRightToLeft(el) {
            return 'rtl' === getStyle_(el, 'direction');
        }


        /**
         * 获得DOM元素的矩形距客户端左上角的距离,分为上下左右四个方向.
         * getBoundingClientRect方法在IE存在很久,最近才成为CSS Object的一部分, 避免使用
         * 易出错的parent offset computation 和已经被废弃的Gecko getBoxObjectFor方法.
         *
         * 方法做了兼容处理,但不支持getBoundingClientRect的环境下会失败.
         * 如果dom元素不在文档树中,结果会是undefined,有的浏览器会产生错误.
         *
         * @param {!Element} el 要计算外廓矩形的元素.
         * @return {Object} 返回原生对象外廓矩形包含四个数字属性 left, top, right, bottom.
         *     Firefox返回对象类型是ClientRect.
         * @private
         */
        function getBoundingClientRect_(el) {
            var rect;
            try {
                rect = el.getBoundingClientRect();
            } catch (e) {
                // IE < 9的浏览器中, 调用orphan element元素的getBoundingClientRect方法会有
                // "Unspecified Error". 其他浏览器返回0. (orphan element自行google)
                return {'left': 0, 'top': 0, 'right': 0, 'bottom': 0};
            }

            // 处理IE下的兼容性
            if (ua.isIE) {
                // IE下大多数时候, 会在左上边额外多出2px(due to the implicit 2-pixel inset border).
                // IE6/7 下的诡异模式和 IE6下的标准模式, 这种默认样式可以被reset css的文档元素(document element)
                // 的border ＝ 0覆盖, 但也因为这个原因我们不能依赖于offset一定会是2px.

                // 诡异模式下, 偏移的距离可以通过body元素的clientLeft/clientTop得到, 但标准模式下, 需要计算
                // 文档元素(document element)的clientLeft/clientTop. 此前我们调用getBoundingClientRect
                // 方法已经触发了reflow, 所以这里的计算可以忍受.
                // 见: http://msdn.microsoft.com/en-us/library/ms536433(VS.85).aspx
                var doc = el.ownerDocument;
                rect.left -= doc.documentElement.clientLeft + doc.body.clientLeft;
                rect.top -= doc.documentElement.clientTop + doc.body.clientTop;
            }
            return /** @type {Object} */ (rect);
        }


        /**
         * 得到影响元素位置属性position的父级元素
         * @param {Element} element 元素.
         * @return {Element} offset parent or null.
         */
        function getOffsetParent(element) {
            // IE7及以下element.offsetParent会返回正确的元素. 其他浏览器只返回position设置成
            // absolute, relative, fixed的元素, 如果元素overflow设成auto或者scroll则不被包含.
            if (ua.isIE && !ua.isDocumentModeOrHigher(8)) {
                return element.offsetParent;
            }

            var doc = dom.getOwnerDocument(element);
            var positionStyle = getStyle_(element, 'position');
            // 判断元素是否具有定位
            var skipStatic = (positionStyle === 'fixed' || positionStyle === 'absolute');

            for (var parent = element.parentNode; parent && parent !== doc;
                 parent = parent.parentNode) {

                positionStyle = getStyle_(parent, 'position');
                skipStatic = (skipStatic && positionStyle === 'static' &&
                    parent !== doc.documentElement && parent !== doc.body);

                // 寻找第一个符合条件的父节点
                if (!skipStatic && (parent.scrollWidth > parent.clientWidth ||
                    parent.scrollHeight > parent.clientHeight ||
                    positionStyle === 'fixed' ||
                    positionStyle === 'absolute' ||
                    positionStyle === 'relative')) {
                    return /** @type {!Element} */ (parent);
                }
            }
            return null;
        }


        /**
         * 设置元素的左/上位置. 若没有单位则默认px.
         * The second argument is required if the first
         * argument is a string or number and is ignored if the first argument
         * is a coordinate.
         * @param {Element} el Element to move.
         * @param {string|number|Coordinate} arg1 Left position or coordinate.
         * @param {string|number=} opt_arg2 Top position.
         */
        function setPosition(el, arg1, opt_arg2) {
            var x, y;
            // 以下特殊情况会有bug
            var buggyGeckoSubPixelPos = ua.isGECKO && (ua.isMAC || ua.isX11) &&
                ua.isVersionOrHigher('1.9');

            if (arg1 instanceof Coordinate) {
                x = arg1.x;
                y = arg1.y;
            } else {
                x = arg1;
                y = opt_arg2;
            }

            // Round to the nearest pixel for buggy sub-pixel support.
            el.style.left = getPixelStyleValue_(/** @type {number|string} */ (x), buggyGeckoSubPixelPos);
            el.style.top = getPixelStyleValue_(/** @type {number|string} */ (y), buggyGeckoSubPixelPos);
        }


        /**
         * 获得相对于offsetParent的位置, 返回一个坐标对象.
         * @param {Element} element Element.
         * @return {!Coordinate} The position.
         */
        function getPosition(element) {
            return new Coordinate(element.offsetLeft, element.offsetTop);
        }


        /**
         * 返回文档的视口元素，只有IE9以下版本的混杂模式是doc.body
         * @param {Node=} opt_node DOM node (Document is OK) to get the viewport element of.
         * @return {Element} document.documentElement or document.body.
         */
        function getClientViewportElement(opt_node) {
            var doc;
            if (opt_node) {
                doc = dom.getOwnerDocument(opt_node);
            } else {
                doc = dom.getDocument();
            }
            // 老版IE是document.body
            if (ua.isIE && !ua.isDocumentModeOrHigher(9) && !dom.getDomHelper(doc).isCss1CompatMode()) {
                return doc.body;
            }
            return doc.documentElement;
        }


        /**
         * 相对于页面左上角坐标移动元素
         * @param {Element} el 元素必须是绝对定位且必须在文档内
         * @param {number|Coordinate} x 元素margin box的left坐标或是一个coordinate对象.
         * @param {number=} opt_y 元素margin box的top坐标.
         */
        function setPageOffset(el, x, opt_y) {
            var cur = getPageOffset(el);
            if (x instanceof Coordinate) {
                opt_y = x.y;
                x = x.x;
            }
            // x和y必须是数字.
            // Work out deltas
            var dx = x - cur.x;
            var dy = opt_y - cur.y;

            // Set position to current left/top + delta
            setPosition(el, el.offsetLeft + dx, el.offsetTop + dy);
        }


        /**
         * 返回元素对于文档左上角的偏移量.
         * Implemented as a single function to save having to do two recursive loops in
         * opera and safari just to get both coordinates.
         *
         * @param {Element} el 要计算的元素
         * @return {!Coordinate} 页面偏移量.
         */
        function getPageOffset(el) {
            var box, doc = dom.getOwnerDocument(el);
            var positionStyle = getStyle_(el, 'position');

            // Gecko 1.9之前可以用自有的方法getBoxObjectFor计算位置position.
            // 当元素是绝对定位且位置为负值时 though it can be off by one.
            // Therefor the recursive implementation
            // is used in those (relatively rare) cases.
            var BUGGY_GECKO_BOX_OBJECT = ua.isGECKO && doc.getBoxObjectFor &&
                    !el.getBoundingClientRect && positionStyle === 'absolute' &&
                    (box = doc.getBoxObjectFor(el)) && (box.screenX < 0 || box.screenY < 0);

            // NOTE: If element is hidden (display none or disconnected or any the
            // ancestors are hidden) we get (0,0) by default but we still do the
            // accumulation of scroll position.

            // TODO(arv): Should we check if the node is disconnected and in that case
            //            return (0,0)?

            var pos = new Coordinate(0, 0);
            var viewportElement = getClientViewportElement(doc);

            // 如果检查的是视口元素，返回0,0
            if (el === viewportElement) {
                return pos;
            }

            // IE, Gecko 1.9+, and most modern WebKit.
            if (el.getBoundingClientRect) {
                box = getBoundingClientRect_(el);
                // 必须加上页面滚动距离因为getBoundingClientRect返回的是相对视口的坐标.
                var scrollCoord = dom.getDomHelper(doc).getDocumentScroll();
                pos.x = box.left + scrollCoord.x;
                pos.y = box.top + scrollCoord.y;
            }
            // Gecko prior to 1.9.
            else if (doc.getBoxObjectFor && !BUGGY_GECKO_BOX_OBJECT) {
                // Gecko ignores the scroll values for ancestors, up to 1.9. 详见:
                // https://bugzilla.mozilla.org/show_bug.cgi?id=328881 and
                // https://bugzilla.mozilla.org/show_bug.cgi?id=330619

                box = doc.getBoxObjectFor(el);
                // TODO: Fix the off-by-one error when window is scrolled down
                // or right more than 1 pixel. The viewport offset does not move in lock
                // step with the window scroll; it moves in increments of 2px and at
                // somewhat random intervals.
                var vpBox = doc.getBoxObjectFor(viewportElement);
                pos.x = box.screenX - vpBox.screenX;
                pos.y = box.screenY - vpBox.screenY;
            }
            // Safari, Opera and Camino up to 1.0.4.
            else {
                var parent = el;
                do {
                    pos.x += parent.offsetLeft;
                    pos.y += parent.offsetTop;
                    // For safari/chrome, we need to add parent's clientLeft/Top as well.
                    if (parent !== el) {
                        pos.x += parent.clientLeft || 0;
                        pos.y += parent.clientTop || 0;
                    }
                    // In Safari when hit a position fixed element the rest of the offsets
                    // are not correct.
                    if (ua.isWEBKIT && getComputedPosition(parent) === 'fixed') {
                        pos.x += doc.body.scrollLeft;
                        pos.y += doc.body.scrollTop;
                        break;
                    }
                    parent = parent.offsetParent;
                } while (parent && parent !== el);

                // Opera & (safari absolute) incorrectly account for body offsetTop.
                if (ua.isOPERA || (ua.isWEBKIT && positionStyle === 'absolute')) {
                    pos.y -= doc.body.offsetTop;
                }

                for (parent = el; (parent = getOffsetParent(parent)) &&
                    parent !== doc.body && parent !== viewportElement; ) {
                    pos.x -= parent.scrollLeft;
                    // Workaround for a bug in Opera 9.2 (and earlier) where table rows may
                    // report an invalid scroll top value. The bug was fixed in Opera 9.5
                    // however as that version supports getBoundingClientRect it won't
                    // trigger this code path. https://bugs.opera.com/show_bug.cgi?id=249965
                    if (!ua.isOPERA || parent.tagName !== 'TR') {
                        pos.y -= parent.scrollTop;
                    }
                }
            }

            return pos;
        }


        /**
         * 对元素设置 'display: inline-block' (cross-browser).
         * @param {Element} el 元素
         * @see ../../demos/style/inline_block_quirks.html
         * @see ../../demos/style/inline_block_standards.html
         */
        function setInlineBlock(el) {
            var style = el.style;
            // Without position:relative, weirdness ensues.  Just accept it and move on.
            style.position = 'relative';

            if (ua.isIE && !ua.isVersionOrHigher('8')) {
                // IE8 supports inline-block so fall through to the else
                // Zoom:1 forces hasLayout, display:inline gives inline behavior.
                style.zoom = '1';
                style.display = 'inline';
            } else if (ua.isGECKO) {
                // Pre-Firefox 3, Gecko doesn't support inline-block, but -moz-inline-box
                // is close enough.
                style.display = ua.isVersionOrHigher('1.9a') ? 'inline-block' :
                    '-moz-inline-box';
            } else {
                // Opera, Webkit, and Safari seem to do OK with the standard inline-block
                // style.
                style.display = 'inline-block';
            }
        }


        /**
         * 正常情况求得边框宽度. 如果设置了direction = rtl;右侧的滚动条的宽度也会加进来.
         * @param {Element} el Element to get clientLeft for.
         * @return {!Coordinate} Client left and top.
         */
        function getClientLeftTop(el) {
            // NOTE: Gecko prior to 1.9 doesn't support clientTop/Left, see
            // https://bugzilla.mozilla.org/show_bug.cgi?id=111207
            if (ua.isGECKO && !ua.isVersionOrHigher('1.9')) {
                var left = parseFloat(getComputedStyle(el, 'borderLeftWidth'));
                if (isRightToLeft(el)) {
                    var scrollbarWidth = el.offsetWidth - el.clientWidth - left -
                        parseFloat(getComputedStyle(el, 'borderRightWidth'));
                    left += scrollbarWidth;
                }
                return new Coordinate(left, parseFloat(getComputedStyle(el, 'borderTopWidth')));
            }

            return new Coordinate(el.clientLeft, el.clientTop);
        }


        /**
         * 返回元素或者时间对象相对于视口的位置(border-box).
         * @param {Element|Event} el Element or a mouse / touch event.
         * @return {!Coordinate} The position.
         */
        function getClientPosition(el) {
            if (el.nodeType === NodeType.ELEMENT) {
                return getClientPositionForElement_(/** @type {!Element} */ (el));
            }
            // 触屏设备
            else {
                var isAbstractedEvent = util.isFunction(el.getBrowserEvent);
                var targetEvent = el;

                if (el.targetTouches) {
                    targetEvent = el.targetTouches[0];
                } else if (isAbstractedEvent && el.getBrowserEvent().targetTouches) {
                    targetEvent = el.getBrowserEvent().targetTouches[0];
                }

                return new Coordinate(targetEvent.clientX, targetEvent.clientY);
            }
        }


        /**
         * 计算视口元素距离页面左上角的距离. 视口可以是document文档或者iframe容器对于
         * iframe文档的偏移距离.
         * @param {!Document} doc 文档对象.
         * @return {!Coordinate} The page offset of the viewport.
         */
        function getViewportPageOffset(doc) {
            var body = doc.body,
                documentElement = doc.documentElement;
            var scrollLeft = body.scrollLeft || documentElement.scrollLeft;
            var scrollTop = body.scrollTop || documentElement.scrollTop;
            return new Coordinate(scrollLeft, scrollTop);
        }


        /**
         * 将一副带有透明的图片设置成背景.
         * 这个方法不支持repeating backgrounds 或 background positions 是为了保持和
         * Internet Explorer的行为一致. 同理IE专有的诸如sizingMethods(非crop)也不被支持.
         *
         * @param {Element} el 元素.
         * @param {string} src The image source URL.
         */
        function setTransparentBackgroundImage(el, src) {
            var style = el.style;
            // It is safe to use the style.filter in IE only. In Safari 'filter' is in
            // style object but access to style.filter causes it to throw an exception.
            // Note: IE8 supports images with an alpha channel.
            if (ua.isIE && !ua.isVersionOrHigher('8')) {
                // See TODO in setOpacity.
                style.filter = 'progid:DXImageTransform.Microsoft.AlphaImageLoader(' +
                    'src="' + src + '", sizingMethod="crop")';
            } else {
                // 单独设置背景属性避免覆盖background color.
                style.backgroundImage = 'url(' + src + ')';
                style.backgroundPosition = 'top left';
                style.backgroundRepeat = 'no-repeat';
            }
        }


        /**
         * 清除带有透明的背景图
         * @param {Element} el 元素.
         */
        function clearTransparentBackgroundImage(el) {
            var style = el.style;
            if ('filter' in style) {
                // See TODO in setOpacity.
                style.filter = '';
            } else {
                // 单独设置背景属性避免覆盖background color.
                style.backgroundImage = 'none';
            }
        }


        /**
         * 获取元素的高宽, 即便是不显示的元素也可以得到.
         * 获得的尺寸是元素的border-box, 不论是何种盒模型渲染的. 返回元素确切的长宽而不是通过getComputedStyle
         * 得到的诸如'auto'之类的值.
         * 注意的是此方法不会考虑 CSS transforms 带来的效果. 详见: style.getTransformedSize.
         * @param {Element} element 要获取尺寸的元素.
         * @return {!Size} Object with width/height properties.
         */
        function getSize(element) {
            return evaluateWithTemporaryDisplay_(getSizeWithDisplay_, element);
        }


        /**
         * 即便元素transform也仍然获取元素的长宽.类似getSize, 但有以下不同:
         * <ol>
         * <li>考虑了webkitTransforms 比如 rotate 和 scale 设置.
         * <li>如果不支持getBoundingClientRect则返回null.
         * <li>目前对于 non-WebKit 浏览器没什么意义因为它们不支持webkitTransforms.
         * </ol>
         * @param {!Element} element 元素.
         * @return {Size} Object with width/height properties.
         */
        function getTransformedSize(element) {
            if (!element.getBoundingClientRect) {
                return null;
            }

            var clientRect = evaluateWithTemporaryDisplay_(
                getBoundingClientRect_, element);

            return new Size(clientRect.right - clientRect.left,
                    clientRect.bottom - clientRect.top);
        }


        /**
         * 对元素调用fn函数以得到想要的结果. 传递到fn的时候为保证元素的尺寸精确我们临时将它显示出来.
         * @param {function(!Element): T} fn 调用函数.
         * @param {!Element} element 元素.
         * @return {T} 调用函数的返回结果.
         * @template T
         * @private
         */
        function evaluateWithTemporaryDisplay_(fn, element) {
            if (getStyle_(element, 'display') !== 'none')
                return fn(element);

            var style = element.style;
            var originalDisplay = style.display;
            var originalVisibility = style.visibility;
            var originalPosition = style.position;

            style.visibility = 'hidden';
            style.position = 'absolute';
            style.display = 'inline';

            var retVal = fn(element);

            style.display = originalDisplay;
            style.position = originalPosition;
            style.visibility = originalVisibility;

            return retVal;
        }


        /**
         * Gets the height and width of an element when the display is not none.
         * @param {Element} element 元素.
         * @return {!Size} Object with width/height properties.
         * @private
         */
        function getSizeWithDisplay_(element) {
            var offsetWidth = element.offsetWidth;
            var offsetHeight = element.offsetHeight;
            var webkitOffsetsZero = ua.isWEBKIT && !offsetWidth && !offsetHeight;
            if ((util.isNull(offsetWidth) || webkitOffsetsZero) &&
                element.getBoundingClientRect) {
                // Fall back to calling getBoundingClientRect when offsetWidth or
                // offsetHeight are not defined, or when they are zero in WebKit browsers.
                // This makes sure that we return for the correct size for SVG elements, but
                // will still return 0 on Webkit prior to 534.8, see
                // http://trac.webkit.org/changeset/67252.
                var clientRect = getBoundingClientRect_(element);
                return new Size(clientRect.right - clientRect.left, clientRect.bottom - clientRect.top);
            }
            return new Size(offsetWidth, offsetHeight);
        }


        // exports
        return {
            setStyle: setStyle,
            getStyle: getStyle,
            getComputedStyle: getComputedStyle,
            getCascadedStyle: getCascadedStyle,
            getComputedPosition: getComputedPosition,
            getOpacity: getOpacity,
            setOpacity: setOpacity,
            setFloat: setFloat,
            getFloat: getFloat,
            isRightToLeft: isRightToLeft,
            getOffsetParent: getOffsetParent,
            setPosition: setPosition,
            getPosition: getPosition,
            getPageOffset: getPageOffset,
            setPageOffset: setPageOffset,
            setInlineBlock: setInlineBlock,
            getBackgroundColor: getBackgroundColor,
            getComputedOverflowX: getComputedOverflowX,
            getComputedOverflowY: getComputedOverflowY,
            getComputedZIndex: getComputedZIndex,
            getClientLeftTop: getClientLeftTop,
            getClientPosition: getClientPosition,
            getViewportPageOffset: getViewportPageOffset,
            setTransparentBackgroundImage: setTransparentBackgroundImage,
            clearTransparentBackgroundImage: clearTransparentBackgroundImage,
            getSize: getSize,
            getTransformedSize: getTransformedSize
        };
    }
);