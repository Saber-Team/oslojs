/**
 * @fileoverview 一组函数用于操作浏览器的DOM本文的很多实现采用了来自
 * mochikit(http://mochikit.com/)的实现方式.
 * @author Leo.Zhang
 * @email zmike86@gmail.com
 *
 * 可以用 DomHelper 创建一个新的dom helpers引用不同的文档.
 * 这在多frame页面和多window页面时很有用.
 */

// todo: dom3的textContent方法和老的innerText的不同需要在本模块体现

define([
    '../util/util',
    '../object/object',
    '../array/array',
    '../ua/util',
    '../string/util',
    '../math/size',
    '../math/coordinate',
    './nodetype',
    './classes',
    './browserfeature'
  ],
  function(util, object, array, ua, string, Size, Coordinate, NodeType, classes, BrowserFeature) {

    'use strict';

    /**
     * 这个枚举里面的属性只能通过element.setAttribute(key, val)
     * 设置, 而不能用element[key] = val.
     * dom.setProperties需要做判断.
     * @type {Object}
     * @private
     */
    var DIRECT_ATTRIBUTE_MAP_ = {
      'cellpadding': 'cellPadding',
      'cellspacing': 'cellSpacing',
      'colspan': 'colSpan',
      'frameborder': 'frameBorder',
      'height': 'height',
      'maxlength': 'maxLength',
      'role': 'role',
      'rowspan': 'rowSpan',
      'type': 'type',
      'usemap': 'useMap',
      'valign': 'vAlign',
      'width': 'width'
    };


    /**
     * 以下这些元素计算文本长度时忽略他们的内容
     * @type {Object}
     * @private
     */
    var TAGS_TO_IGNORE_ = {
      'SCRIPT': 1,
      'STYLE': 1,
      'HEAD': 1,
      'IFRAME': 1,
      'OBJECT': 1
    };


    /**
     * 这个映射规定了这两个元素在获取文本内容时的具体值替换方案
     * @type {Object}
     * @private
     */
    var PREDEFINED_TAG_VALUES_ = {
      'IMG': ' ',
      'BR': '\n'
    };


    /**
     * 侦测是否可用原生的选择符查询API(W3C HTML5支持)(http://www.w3.org/TR/selectors-api/)
     * @param {!(Element|Document)} parent 文档对象或者一个元素.
     * @return {boolean} 是否提供的对象可以提供query APIs.
     * @private
     */
    var canUseQuerySelector_ = function(parent) {
      return !!(parent.querySelectorAll && parent.querySelector);
    };


    /**
     * Helper for getWindow. IE下有document.parentWindow
     * 标准下有document.defaultView都可取到window对象
     * @param {!Document} doc 文档对象.
     * @return {!Window} 文档对象关联的window.
     * @private
     */
    function getWindow_(doc) {
      return doc.parentWindow || doc.defaultView;
    }


    /**
     * 返回浏览器是否文档标准模式 "CSS1-compatible"
     * @param {Document} doc 要检查的文档对象.
     * @return {boolean} 是否标准模式.
     * @private
     */
    function isCss1CompatMode_(doc) {
      return doc.compatMode === 'CSS1Compat';
    }


    /**
     * 由于是取得视口大小, 所以长宽都是clientWidth clientHeight
     * Helper for getViewportSize.
     * @param {Window} win window对象.
     * @return {!Size} 返回一个Size实例.
     * @private
     */
    function getViewportSize_(win) {
      var doc = win.document;
      var el = isCss1CompatMode_(doc) ? doc.documentElement : doc.body;
      return new Size(el.clientWidth, el.clientHeight);
    }


    /**
     * 文档滚动的话需要确定取body还是documentElement的scrollLeft属性
     * Helper for getDocumentScrollElement.
     * @param {!Document} doc 获取滚动元素的document对象.
     * @return {Element} 滚动元素.
     * @private
     */
    function getDocumentScrollElement_(doc) {
      // Safari (2 and 3) 要用body.scrollLeft不论是quirks mode 还是 strict mode.
      return !ua.isWEBKIT && isCss1CompatMode_(doc) ? doc.documentElement : doc.body;
    }


    /**
     * 获取文档滚动距离（横纵向）
     * Nota: IE678不支持window.page[XY]Offset, 也不支持window.scroll[XY],支持的话
     * 两者的值应该相等,且都没有单位,默认是像素. 具体看：
     *     http://www.w3schools.com/jsref/prop_win_pagexoffset.asp
     *     https://developer.mozilla.org/en-US/docs/Web/API/Window.scrollX
     *     http://msdn.microsoft.com/en-us/library/ie/ff974683(v=vs.85).aspx
     * Helper for getDocumentScroll.
     * @param {!Document} doc 滚动的文档对象.
     * @return {!Coordinate} 含有 'x' and 'y'的坐标对象.
     * @private
     */
    function getDocumentScroll_(doc) {
      var el = getDocumentScrollElement_(doc);
      var win = getWindow_(doc);
      if (ua.isIE && ua.isVersionOrHigher('10') &&
        win.pageYOffset !== el.scrollTop) {
        // 键盘在搭载IE10的触控设备上 shifts the page using the pageYOffset
        // without modifying scrollTop. 这种情况, 需要用body的滚动距离scroll offsets.
        return new Coordinate(el.scrollLeft, el.scrollTop);
      }
      return new Coordinate(win.pageXOffset || el.scrollLeft, win.pageYOffset || el.scrollTop);
    }


    /**
     * 递归计算节点文本值
     * 返回值通过引用传递写入到buf中
     * @param {Node} node 要获取文本内容的节点.
     * @param {Array} buf string buffer.
     * @param {boolean} normalizeWhitespace 是否替换空格.
     * @private
     */
    function getTextContent_(node, buf, normalizeWhitespace) {
      if (node.nodeName in TAGS_TO_IGNORE_)
        return;
      if (node.nodeType === NodeType.TEXT) {
        // 文本节点需要处理内部的回车和换行
        if (normalizeWhitespace) {
          buf.push(String(node.nodeValue).replace(/(\r\n|\r|\n)/g, ''));
        } else {
          buf.push(node.nodeValue);
        }
      } else if (node.nodeName in PREDEFINED_TAG_VALUES_) {
        buf.push(PREDEFINED_TAG_VALUES_[node.nodeName]);
      } else {
        var child = node.firstChild;
        while (child) {
          getTextContent_(child, buf, normalizeWhitespace);
          child = child.nextSibling;
        }
      }
    }


    /**
     * 给定元素获取文档对象
     * 这个方法比较通用,浏览器基本都支持ownerDocument
     * @param {Node|Window} node dom节点.
     * @return {!Document} 从属的文档对象.
     */
    function getOwnerDocument(node) {
      return node.nodeType === NodeType.DOCUMENT ? node : node.ownerDocument;
    }


    /**
     * 获取document对象
     * @return {!Document} Document object.
     */
    function getDocument() {
      return document;
    }


    /**
     * 获得window对象.
     * @param {Document=} opt_doc 文档对象.
     * @return {!Window}
     */
    function getWindow(opt_doc) {
      return opt_doc ? getWindow_(opt_doc) : window;
    }


    /**
     * 删除节点.
     * @param {Node} node 删除的节点.
     * @return {Node} 删除了返回元素否则返回null.
     */
    function removeNode(node) {
      return node && node.parentNode ? node.parentNode.removeChild(node) : null;
    }


    /**
     * 移除所有子元素.
     * @param {Node} node 传入节点.
     */
    function removeChildren(node) {
      // 注意: 遍历 live collections 会慢, 这种方式最快.
      var child;
      while ((child = node.firstChild))
        node.removeChild(child);
    }


    /**
     * Helper for getElementsByTagNameAndClass.
     * @param {!Document} doc 文档对象.
     * @param {?string=} opt_tag 标签名.
     * @param {?string=} opt_class 类名.
     * @param {(Document|Element)=} opt_el 查找的最外层元素.
     * @return { {length: number} } 返回类数组对象 (含有数字下标).
     * @private
     */
    function getElementsByTagNameAndClass_(doc, opt_tag, opt_class, opt_el) {
      var parent = opt_el || doc;
      // 是通配符*的话 tagName记为‘’
      var tagName = (opt_tag && opt_tag !== '*') ? opt_tag.toUpperCase() : '';

      var i, el, els;
      var arrayLike, len;

      // 用原生的API查询节点
      if (canUseQuerySelector_(parent) && (tagName || opt_class)) {
        var query = tagName + (opt_class ? '.' + opt_class : '');
        return parent.querySelectorAll(query);
      }

      // 如果原生支持getElementsByClassName则先用此方法, 再逐个过滤tagName
      // 假设指定了tag name, 先类名在标签会遍历的次数少一些
      if (opt_class && parent.getElementsByClassName) {
        els = parent.getElementsByClassName(opt_class);
        if (tagName) {
          arrayLike = {};
          len = 0;
          // 指定标签.
          for (i = 0, el; el = els[i]; i++) {
            if (tagName === el.nodeName) {
              arrayLike[len++] = el;
            }
          }
          arrayLike.length = len;

          return arrayLike;
        }
        else {
          return els;
        }
      }

      // 最后利用原生tagName的方式查询
      els = parent.getElementsByTagName(tagName || '*');
      if (opt_class) {
        arrayLike = {};
        len = 0;
        for (i = 0, el; el = els[i]; i++) {
          var className = el.className;
          // 这里的一个技巧, element.className都有split方法可直接用.
          // 只有一个例外--SVG没有
          if (typeof className.split === 'function' &&
            array.contains(className.split(/\s+/), opt_class)) {
            arrayLike[len++] = el;
          }
        }
        arrayLike.length = len;
        return arrayLike;
      }
      else {
        return els;
      }
    }


    /**
     * 根据类名选元素，getElementsByClass是一个新接口,FF和IE一些老版本不支持但能用尽量用.
     * Note：这个原生方法返回的是HTMLCollection,和getElementsByTagName是一样的返回类型。
     * 可以看这里：
     *     https://developer.mozilla.org/en-US/docs/Web/API/document.getElementsByClassName
     *     http://www.w3schools.com/jsref/met_document_getelementsbyclassname.asp
     *     http://ejohn.org/blog/getelementsbyclassname-speed-comparison/
     * HTMLCollection和NodeList的异同参考：
     *     https://developer.mozilla.org/en-US/docs/Web/API/NodeList
     *     http://www.nczonline.net/blog/2010/09/28/why-is-getelementsbytagname-faster-that-queryselectorall/
     *     https://rniwa.com/2013-02-10/live-nodelist-and-htmlcollection-in-webkit/
     * @param {string} className 类名
     * @param {(Document|Element)=} opt_el 父元素
     * @return { {length: number} } The items found with the class name provided.
     */
    function getElementsByClass(className, opt_el) {
      var parent = opt_el || document;
      if (canUseQuerySelector_(parent))
        return parent.querySelectorAll('.' + className);
      else if (parent.getElementsByClassName)
        return parent.getElementsByClassName(className);

      return getElementsByTagNameAndClass_(document, '*', className, opt_el);
    }


    /**
     * 是否一个元素
     * @param {*} obj 测试的对象.
     * @return {boolean} 返回布尔值.
     */
    function isElement(obj) {
      return util.isObject(obj) && obj.nodeType === NodeType.ELEMENT;
    }


    /**
     * 返回浏览器是否文档标准模式 "CSS1-compatible" (standards-compliant).
     * @return {boolean}
     */
    function isCss1CompatMode() {
      return isCss1CompatMode_(document);
    }


    /**
     * 一次性在元素上设置多个属性.
     * @param {Element} element 要设置的元素.
     * @param {Object} properties Hash of property:value pairs.
     */
    function setProperties(element, properties) {
      object.forEach(properties, function(val, key) {
        if (key === 'style') {
          element.style.cssText = val;
        }
        else if (key === 'class') {
          element.className = val;
        }
        else if (key === 'for') {
          element.htmlFor = val;
        }
        else if (key in DIRECT_ATTRIBUTE_MAP_) {
          element.setAttribute(DIRECT_ATTRIBUTE_MAP_[key], val);
        }
        else if (string.startsWith(key, 'aria-') ||
          string.startsWith(key, 'data-')) {
          element.setAttribute(key, val);
        } else {
          element[key] = val;
        }
      });
    }


    /**
     * 获取视口的大小. Mochikit奉献吐血级别的跨浏览器方案
     *
     * Gecko标准模式:
     * docEl.clientWidth  Width of viewport 不包括滚动条
     * win.innerWidth     Width of viewport 包括滚动条
     * body.clientWidth   Width of body element.
     *
     * docEl.clientHeight Height of viewport 不包括滚动条
     * win.innerHeight    Height of viewport 包括滚动条
     * body.clientHeight  Height of document.
     *
     * Gecko Backwards compatible mode:
     * docEl.clientWidth  Width of viewport 不包括滚动条
     * win.innerWidth     Width of viewport 包括滚动条
     * body.clientWidth   Width of viewport 不包括滚动条
     *
     * docEl.clientHeight Height of document.
     * win.innerHeight    Height of viewport 包括滚动条
     * body.clientHeight  Height of viewport 不包括滚动条
     *
     * IE6/7 Standards mode:
     * docEl.clientWidth  Width of viewport 不包括滚动条
     * win.innerWidth     Undefined.
     * body.clientWidth   Width of body element.
     *
     * docEl.clientHeight Height of viewport 不包括滚动条
     * win.innerHeight    Undefined.
     * body.clientHeight  Height of document element.
     *
     * IE5 + IE6/7 Backwards compatible mode:
     * docEl.clientWidth  0.
     * win.innerWidth     Undefined.
     * body.clientWidth   Width of viewport 不包括滚动条
     *
     * docEl.clientHeight 0.
     * win.innerHeight    Undefined.
     * body.clientHeight  Height of viewport excluding scrollbar.
     *
     * Opera 9 Standards and backwards compatible mode:
     * docEl.clientWidth  Width of viewport excluding scrollbar.
     * win.innerWidth     Width of viewport 包括滚动条
     * body.clientWidth   Width of viewport excluding scrollbar.
     *
     * docEl.clientHeight Height of document.
     * win.innerHeight    Height of viewport 包括滚动条
     * body.clientHeight  Height of viewport excluding scrollbar.
     *
     * WebKit:
     * Safari 2
     * docEl.clientHeight Same as scrollHeight.
     * docEl.clientWidth  Same as innerWidth.
     * win.innerWidth     Width of viewport excluding scrollbar.
     * win.innerHeight    Height of the viewport including scrollbar.
     * frame.innerHeight  Height of the viewport exluding scrollbar.
     *
     * Safari 3 (tested in 522)
     *
     * docEl.clientWidth  Width of viewport excluding scrollbar.
     * docEl.clientHeight Height of viewport excluding scrollbar in strict mode.
     * body.clientHeight  Height of viewport excluding scrollbar in quirks mode.
     *
     * @param {Window=} opt_window Optional window element to test.
     * @return {!Size} Object with values 'width' and 'height'.
     */
    function getViewportSize(opt_window) {
      return getViewportSize_(opt_window || window);
    }


    /**
     * 查询节点的函数.
     * @param {?string=} opt_tag 标签名
     * @param {?string=} opt_class 可选 类名
     * @param {(Document|Element)=} opt_el 范围节点.
     * @return { {length: number} } 返回类数组对象 (含有数字下标).
     */
    function getElementsByTagNameAndClass(opt_tag, opt_class, opt_el) {
      return getElementsByTagNameAndClass_(document, opt_tag, opt_class, opt_el);
    }


    /**
     * 跨浏览器获取 document of a frame or iframe.
     * @param {Element} frame Frame元素.
     * @return {!Document}
     */
    function getFrameContentDocument(frame) {
      return frame.contentDocument || frame.contentWindow.document;
    }


    /**
     * 替换元素.如果老元素没有父节点则什么也不做.
     * @param {Node} newNode 新的节点.
     * @param {Node} oldNode 要替换的节点.
     */
    function replaceNode(newNode, oldNode) {
      var parent = oldNode.parentNode;
      if (parent) {
        parent.replaceChild(newNode, oldNode);
      }
    }


    /**
     * 是否一个节点包含另一个节点.
     * 这里面包含了一些技巧, 具体可以看这个:
     *     https://developer.mozilla.org/en-US/docs/Web/API/Node.compareDocumentPosition
     *     http://ejohn.org/blog/comparing-document-position/
     *
     * @param {Node} parent 父节点
     * @param {Node} descendant 后代节点
     * @return {boolean} Whether the parent node contains the descendent node.
     */
    function contains(parent, descendant) {
      // IE DOM IE下直接用DOM的原生方法
      if (parent.contains && descendant.nodeType === NodeType.ELEMENT) {
        return parent === descendant || parent.contains(descendant);
      }

      // W3C DOM Level 3
      if (typeof parent.compareDocumentPosition !== 'undefined') {
        return parent === descendant ||
          !!(parent.compareDocumentPosition(descendant) & 16);
      }

      // W3C DOM Level 1
      while (descendant && parent !== descendant) {
        descendant = descendant.parentNode;
      }
      return descendant === parent;
    }


    /**
     * 这个方法会冲刷掉元素的内容,类似设置innerHTML.
     * @param {Element} element 元素.
     * @param {string|number} text 文本内容.
     */
    function setTextContent(element, text) {
      if ('textContent' in element) {
        element.textContent = text;
      } else if (element.firstChild &&
        element.firstChild.nodeType === NodeType.TEXT) {
        // 若第一个子元素就是文本元素则删除其余元素并改变文本节点内容.
        while (element.lastChild !== element.firstChild) {
          element.removeChild(element.lastChild);
        }
        element.firstChild.data = text;
      } else {
        removeChildren(element);
        var doc = getOwnerDocument(element);
        element.appendChild(doc.createTextNode(String(text)));
      }
    }


    /**
     * 返回当前节点的文本内容, 不包含html标签和不可见的符号. 去掉换行并且把
     * 空格都合并, 这样每个字符都是可见的
     * 优先选择innerText. 其他浏览器做节点遍历. Line breaks are canonicalized in IE.
     * @param {Node} node 元素.
     * @return {string} 返回文本内容.
     */
    function getTextContent(node) {
      var textContent;
      // Note: IE9, Opera, 和Safari 3 支持innerText接口但其中包含了script标签内的文本节点.
      // 所以我们转而对这些浏览器过滤.
      if (BrowserFeature.CAN_USE_INNER_TEXT && ('innerText' in node)) {
        textContent = string.canonicalizeNewlines(node.innerText);
        // 但是 .innerText() 返回的文本包含 &shy;
        // 需要单独做过滤且移出重复的空格.
      }
      else {
        // 循环遍历取得所有文本内容并且去掉回车和换行
        var buf = [];
        getTextContent_(node, buf, true);
        textContent = buf.join('');
      }

      // 去除 &shy; 实体. Oslo.format.insertWordBreaks 会在Opera下不慎插入.
      textContent = textContent.replace(/ \xAD /g, ' ').replace(/\xAD/g, '');
      // 去除 &#8203; 实体. Oslo.format.insertWordBreaks 会在IE8下不慎插入.
      // 具体可以看看这个：
      //  http://stackoverflow.com/questions/7055600/
      //    u200b-zero-width-space-characters-in-my-js-code-where-did-they-came-from
      // 0宽度空格
      textContent = textContent.replace(/\u200B/g, '');

      // 老的浏览器可以用innerText的浏览器会自动转化 &nbsp; 成为 ' ', 将 / +/ 转化成 ' '.
      // 跳过这些浏览器
      if (!BrowserFeature.CAN_USE_INNER_TEXT) {
        textContent = textContent.replace(/ +/g, ' ');
      }
      if (textContent !== ' ') {
        textContent = textContent.replace(/^\s*/, '');
      }

      return textContent;
    }


    /**
     * 获取document的滚动距离
     * @return {!Coordinate} Object with values 'x' and 'y'.
     */
    function getDocumentScroll() {
      return getDocumentScroll_(document);
    }


    /**
     * 获取document滚动的元素(标准).
     * @return {Element} Scrolling element.
     */
    function getDocumentScrollElement() {
      return getDocumentScrollElement_(document);
    }


    /**
     * 获取当父 document 拥有焦点时获得焦点的对象。
     * @param {Document} doc 文档对象.
     * @return {Element} 焦点元素.
     */
    function getActiveElement(doc) {
      try {
        return doc && doc.activeElement;
      } catch (e) {
        // NOTE: 有时在IE中获取 document.activeElement 会抛出异常. 不很确定, 但怀疑焦点元素在一定时间段内被js移除
        // 出文档会引发这个问题.
        // 这种情况认为没有焦点元素"there is no active element."
      }

      return null;
    }


    /**
     * 获取给定元素符合条件的组父级元素
     * @param {Node} element 给定元素
     * @param {function(Node) : boolean} matcher 一个匹配函数.
     * @param {boolean=} opt_includeNode 是否从该元素开始遍历,默认从父元素开始
     * @param {number=} opt_maxSearchSteps 遍历的最大深度
     * @return {Node}
     */
    function getAncestor(element, matcher, opt_includeNode, opt_maxSearchSteps) {
      if (!opt_includeNode) {
        element = element.parentNode;
      }
      var ignoreSearchSteps = (opt_maxSearchSteps === null);
      var steps = 0;
      while (element && (ignoreSearchSteps || steps <= opt_maxSearchSteps)) {
        if (matcher(element)) {
          return element;
        }
        element = element.parentNode;
        steps++;
      }
      // Reached the root of the DOM without a match
      return null;
    }


    /**
     * 向上查找符合类名的祖先元素,如果元素自身也符合条件则返回自身.
     * @param {Node} element 元素.
     * @param {string} className 类名.
     * @return {Element} 返回null或者第一个找到的元素.
     */
    function getAncestorByClass(element, className) {
      return getAncestorByTagNameAndClass(element, null, className);
    }


    /**
     * 随DOM结构上溯到符合标准条件的祖先元素. 自身符合标准就返回自身.
     * @param {Node} element 开始查找的元素.
     * @param {?(TagName|string)=} opt_tag 标签名 (可以为 null/undefined).
     * @param {?string=} opt_class 类名 (可以为 null/undefined).
     * @return {Element} 第一个符合条件的祖先元素 或者没有就返回null
     */
    function getAncestorByTagNameAndClass(element, opt_tag, opt_class) {
      if (!opt_tag && !opt_class)
        return null;
      var tagName = opt_tag ? opt_tag.toUpperCase() : null;
      return /** @type {Element} */ (getAncestor(element,
        function(node) {
          return (!tagName || node.nodeName === tagName) &&
            (!opt_class || classes.has(node, opt_class));
        }, true));
    }


    /**
     * 返回第一个子元素.
     * @param {Node} node 父节点.
     * @return {Element} 返回第一个子元素.
     */
    function getFirstElementChild(node) {
      if (node.firstElementChild !== undefined) {
        return /** @type {Element} */(node).firstElementChild;
      }
      return getNextElementNode_(node.firstChild, true);
    }


    /**
     * 返回最后一个元素.
     * @param {Node} node
     * @return {Element}
     */
    function getLastElementChild(node) {
      if (node.lastElementChild !== undefined) {
        return /** @type {Element} */(node).lastElementChild;
      }
      return getNextElementNode_(node.lastChild, false);
    }


    /**
     * 返回下一个元素.
     * @param {Node} node
     * @return {Element}
     */
    function getNextElementSibling(node) {
      if (node.nextElementSibling !== undefined) {
        return /** @type {Element} */(node).nextElementSibling;
      }
      return getNextElementNode_(node.nextSibling, true);
    }


    /**
     * 返回上一个元素节点.
     * @param {Node} node
     * @return {Element}
     */
    function getPreviousElementSibling(node) {
      if (node.previousElementSibling !== undefined) {
        return /** @type {Element} */(node).previousElementSibling;
      }
      return getNextElementNode_(node.previousSibling, false);
    }


    /**
     * 返回下一个元素节点.
     * @param {Node} node
     * @param {boolean} forward 向前还是向后查找.
     * @return {Element} The first element.
     * @private
     */
    function getNextElementNode_(node, forward) {
      while (node && node.nodeType !== NodeType.ELEMENT) {
        node = forward ? node.nextSibling : node.previousSibling;
      }

      return /** @type {Element} */ (node);
    }


    /**
     * 在已存在节点前插入新节点 (i.e. as the previous sibling).
     * @param {Node} newNode 要插入的元素.
     * @param {Node} refNode 参考元素.
     */
    function insertSiblingBefore(newNode, refNode) {
      if (refNode.parentNode)
        refNode.parentNode.insertBefore(newNode, refNode);
    }


    /**
     * 在参照节点后插入一个节点 (i.e. as the next sibling).
     * @param {Node} newNode 要插入的元素.
     * @param {Node} refNode 参考元素.
     */
    function insertSiblingAfter(newNode, refNode) {
      if (refNode.parentNode)
        refNode.parentNode.insertBefore(newNode, refNode.nextSibling);
    }


    /**
     * 用指定的属性创建Dom元素.
     * 第三个可变参数是元素集合, 会被当做子元素加入到创建的节点中
     * 如下:
     * <code>createDom('div', null, createDom('p'), createDom('p'));</code>
     * 返回的div 带有两个段落元素.
     * @param {string} tagName 标签
     * @param {(Object|Array.<string>|string)=} opt_attributes 属性对象. 字符串会做为类名. 若是数组则认为是类名数组.
     * @param {...(Object|string|Array|NodeList)} var_args DOM节点或者字符串作为文本节点. 如若参数中有array
     *     或者 NodeList, 其中的元素会作为子结点插入.
     * @return {!Element} 返回创建的元素.
     */
    function createDom(tagName, opt_attributes, var_args) {
      return createDom_(document, arguments);
    }


    /**
     * 是否一个 DOM node.
     * @param {*} obj 测试对象.
     * @return {boolean}
     */
    function isNodeLike(obj) {
      return util.isObject(obj) && obj.nodeType > 0;
    }


    /**
     * 判断是否一个NodeList. 要有length属性和item方法.
     * @param {Object} val 测试对象.
     * @return {boolean}
     */
    function isNodeList(val) {
      // TODO: Now the isNodeList is part of dom module we can use ua to make this simpler.
      // A NodeList一定会有length属性.
      if (val && typeof val.length === 'number') {
        // non-Safari.
        if (util.isObject(val)) {
          // A NodeList 含有item方法(非IE平台) 或者 string类型的item属性(on IE).
          return typeof val.item === 'function' || typeof val.item === 'string';
          // Safari
        } else if (util.isFunction(val)) {
          return typeof val.item === 'function';
        }
      }

      return false;
    }


    /**
     * Helper for createDom.
     * @param {!Document} doc
     * @param {!Arguments} args Argument object
     * @return {!Element}
     * @private
     */
    function createDom_(doc, args) {
      var tagName = args[0];
      var attributes = args[1];

      // Internet Explorer is dumb: http://msdn.microsoft.com/workshop/author/
      //                            dhtml/reference/properties/name_2.asp
      // Also does not allow setting of 'type' attribute on 'input' or 'button'.
      // 地址已经被移除了, 可以google此地址.
      // 其实并非IE下不允许设置input和button的type和name属性(setAttribute和.操作均可)
      // 而是通过form.elementname方式取不到设置了name属性的input元素, IE会提示错误
      if (!BrowserFeature.CAN_ADD_NAME_OR_TYPE_ATTRIBUTES && attributes &&
        (attributes.name || attributes.type)) {
        var tagNameArr = ['<', tagName];
        // 开始把name和type等属性拼成html串
        if (attributes.name) {
          tagNameArr.push(' name="', string.htmlEscape(attributes.name), '"');
        }
        if (attributes.type) {
          tagNameArr.push(' type="', string.htmlEscape(attributes.type), '"');

          // Clone attributes map to remove 'type' without mutating the input.
          var clone = {};
          object.extend(clone, attributes);

          // JSCompiler can't see how object.extend added this property,
          // because it was essentially added by reflection.
          // So it needs to be quoted.
          // todo: (by zmike86)
          // 这个意思只能靠猜, 还没彻底研究编译器, extend并没有显式出现type的属性复制,
          // 但元素上确实需要名为type的属性, 所以其实extend时就已经是名为type的属性了
          // (见object.extend的实现代码), 这里如果用点属性则会被编译器重命名,
          // 删除的就不是type属性了.
          delete clone['type'];

          attributes = clone;
        }
        tagNameArr.push('>');
        tagName = tagNameArr.join('');
      }

      var element = doc.createElement(tagName);

      if (attributes) {
        if (util.isString(attributes)) {
          element.className = attributes;
        } else if (util.isArray(attributes)) {
          classes.add.apply(null, [element].concat(attributes));
        } else {
          setProperties(element, attributes);
        }
      }

      if (args.length > 2) {
        append_(doc, element, args, 2);
      }

      return element;
    }


    /**
     * 将文本或其他节点附加到指定的父节点上.
     * @param {!Document} doc 创建元素的doc对象.
     * @param {!Node} parent 父节点.
     * @param {!Arguments} args The values to add. See {@code dom.append}.
     * @param {number} startIndex 开始索引.
     * @private
     */
    function append_(doc, parent, args, startIndex) {
      function childHandler(child) {
        if (child) {
          parent.appendChild(util.isString(child) ?
            doc.createTextNode(child) : child);
        }
      }

      for (var i = startIndex; i < args.length; i++) {
        var arg = args[i];
        // TODO: Fix isArrayLike to return false for a text node.
        if (util.isArrayLike(arg) && !isNodeLike(arg)) {
          // 如果是node list, 首先要转化成真正的数组, 因为forEach方法不能被用来 mutate a NodeList.
          array.forEach(isNodeList(arg) ? array.toArray(arg) : arg, childHandler);
        } else {
          childHandler(arg);
        }
      }
    }


    /**
     * 返回包含子节点的数组.
     * @param {Element} element
     * @return {!(Array|NodeList)}
     */
    function getChildren(element) {
      // 先检查是否有内置的children可用.We check if the children attribute is supported for child elements
      // IE8的返回值有些问题,会包含comments.
      if (BrowserFeature.CAN_USE_CHILDREN_ATTRIBUTE && element.children !== undefined) {
        return element.children;
      }
      // 手动过滤.
      return array.filter(element.childNodes, function(node) {
        return node.nodeType === NodeType.ELEMENT;
      });
    }


    /**
     * 做一个默认domhelper的缓存.
     * @type {DomHelper}
     * @private
     */
    var defaultDomHelper_ = null;


    /**
     * 获取一个DOMHelper对象，相对于给定的元素所在的文档。
     * @param {(Node|Window)=} opt_element 元素所在文档的Helper对象
     * @return {!DomHelper} The DomHelper.
     */
    function getDomHelper(opt_element) {
      return opt_element ?
        new DomHelper(getOwnerDocument(opt_element)) :
        (defaultDomHelper_ || (defaultDomHelper_ = new DomHelper()));
    }


    /**
     * DOM helper Class with a new document object.
     * @param {Document=} opt_document 传入doc对象.
     * @constructor
     */
    var DomHelper = function(opt_document) {
      /**
       * 用到的文档对象
       * @type {!Document}
       * @private
       */
      this.document_ = opt_document || util.global.document || document;
    };


    // 原型对象
    var proto = {
      /**
       * @param {!Document} document Document object.
       */
      setDocument: function(document) {
        this.document_ = document;
      },
      getChildren: getChildren,
      /**
       * @return {!Document} Document object.
       */
      getDocument: function() {
        return this.document_;
      },
      /**
       * getElementById.
       * @param {string|Element} element Element ID or a DOM node.
       * @return {Element}
       */
      getElement: function(element) {
        if (util.isString(element))
          return this.document_.getElementById(element);
        else
          return element;
      },
      getElementsByTagNameAndClass: function(opt_tag, opt_class, opt_el) {
        return getElementsByTagNameAndClass_(this.document_, opt_tag, opt_class, opt_el);
      },
      /**
       * @see {dom.query}
       * @param {string} className 类名.
       * @param {Element|Document=} opt_el 范围元素.
       * @return { {length: number} } The items found.
       */
      getElementsByClass: function(className, opt_el) {
        var doc = opt_el || this.document_;
        return getElementsByClass(className, doc);
      },
      setProperties: setProperties,
      /**
       * 返回视口尺寸.
       * @return {!Size} Object with values 'width' and 'height'.
       */
      getViewportSize: function() {
        return getViewportSize(this.getWindow());
      },
      /**
       * @return {!Window} The window object.
       */
      getWindow: function() {
        return getWindow_(this.document_);
      },
      contains: contains,
      /**
       * 返回是否标准模式文档.
       * @return {boolean} True if in CSS1-compatible mode.
       */
      isCss1CompatMode: function() {
        return isCss1CompatMode_(this.document_);
      },
      /**
       * 看createDom方法.
       * 有个技巧把存在的节点加到新的父元素,相当于移动元素:
       * <code>createDom('div', null, oldElement.childNodes);</code>
       * @param {string} tagName 标签名.
       * @param {Object|string=} opt_attributes 属性.
       * @param {...dom.Appendable} var_args
       * @return {!Element} 返回节点引用.
       */
      createDom: function(tagName, opt_attributes, var_args) {
        return createDom_(this.document_, arguments);
      },
      /**
       * 创建元素.
       * @param {string} name 标签名.
       * @return {!Element}
       */
      createElement: function(name) {
        return this.document_.createElement(name);
      },
      /**
       * 创建文本节点.
       * @param {number|string} content Content.
       * @return {!Text} 返回新的文本节点.
       */
      createTextNode: function(content) {
        return this.document_.createTextNode(String(content));
      },
      /**
       * 获取滚动元素.
       * @return {Element} Scrolling element.
       */
      getDocumentScrollElement: function() {
        return getDocumentScrollElement_(this.document_);
      },
      /**
       * 获取滚动坐标.
       * @return {!Coordinate} Object with properties 'x' and 'y'.
       */
      getDocumentScroll: function() {
        return getDocumentScroll_(this.document_);
      },
      /**
       * 返回焦点元素.
       * @param {Document=} opt_doc The document to look in.
       * @return {Element} The active element.
       */
      getActiveElement: function(opt_doc) {
        return getActiveElement(opt_doc || this.document_);
      },
      isElement: isElement,
      getOwnerDocument: getOwnerDocument,
      getFrameContentDocument: getFrameContentDocument,
      removeNode: removeNode,
      removeChildren: removeChildren,
      setTextContent: setTextContent,
      getTextContent: getTextContent,
      getAncestor: getAncestor,
      getAncestorByClass: getAncestorByClass,
      getAncestorByTagNameAndClass: getAncestorByTagNameAndClass,
      replaceNode: replaceNode,
      getFirstElementChild: getFirstElementChild,
      getLastElementChild: getLastElementChild,
      getNextElementSibling: getNextElementSibling,
      getPreviousElementSibling: getPreviousElementSibling,
      insertSiblingBefore: insertSiblingBefore,
      insertSiblingAfter: insertSiblingAfter,
      isNodeList: isNodeList,
      isNodeLike: isNodeLike
    };


    // 混入原型对象
    util.mixin(DomHelper.prototype, proto);


    return {
      contains: contains,
      createDom: createDom,
      removeNode: removeNode,
      removeChildren: removeChildren,
      getChildren: getChildren,
      getDocument: getDocument,
      getDomHelper: getDomHelper,
      getActiveElement: getActiveElement,
      /**
       * getElementById.
       * @param {string|Element} element Element ID or a DOM node.
       * @return {Element}
       */
      getElement: function(element) {
        return util.isString(element) ? document.getElementById(element) : element;
      },
      getElementsByClass: getElementsByClass,
      getElementsByTagNameAndClass: getElementsByTagNameAndClass,
      getWindow: getWindow,
      getOwnerDocument: getOwnerDocument,
      getFrameContentDocument: getFrameContentDocument,
      getDocumentScroll: getDocumentScroll,
      getDocumentScrollElement: getDocumentScrollElement,
      isCss1CompatMode: isCss1CompatMode,
      isElement: isElement,
      setProperties: setProperties,
      getViewportSize: getViewportSize,
      replaceNode: replaceNode,
      setTextContent: setTextContent,
      getTextContent: getTextContent,
      getAncestor: getAncestor,
      getAncestorByClass: getAncestorByClass,
      getAncestorByTagNameAndClass: getAncestorByTagNameAndClass,
      getFirstElementChild: getFirstElementChild,
      getLastElementChild: getLastElementChild,
      getNextElementSibling: getNextElementSibling,
      getPreviousElementSibling: getPreviousElementSibling,
      insertSiblingBefore: insertSiblingBefore,
      insertSiblingAfter: insertSiblingAfter,
      isNodeList: isNodeList,
      isNodeLike: isNodeLike
    };
  }
);