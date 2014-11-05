/**
 * @fileoverview dom模块里浏览器的兼容特性.
 * @author leo.Zhang
 * @email zmike86@gmail.com
 */

define('@dom.browserfeature', ['@ua.util'],
    function(ua) {

        'use strict';

        /**
         * Dom包里浏览器的相关兼容性.
         * @enum {boolean}
         */
        return {
            /**
             * 属性'name'和'type'是否可以在元素被创建后加到元素上.
             * IE9之前的版本是False. (指的一些表单元素?)
             */
            CAN_ADD_NAME_OR_TYPE_ATTRIBUTES: !ua.isIE || ua.isDocumentModeOrHigher(9),

            /**
             * 我们是否可以通过element.children获取元素的元素类型子元素.
             * Gecko 1.9.1以上没问题, IE 9以上也没问题. (IE9以下会把注释当做节点包含进来)
             */
            CAN_USE_CHILDREN_ATTRIBUTE: !ua.isGECKO && !ua.isIE ||
                ua.isIE && ua.isDocumentModeOrHigher(9) ||
                ua.isGECKO && ua.isVersionOrHigher('1.9.1'),

            /**
             * Opera, Safari 3 和 IE 9 都支持元素的 innerText 属性但它们包含了script和style
             * 内部的text nodes. 与document-mode无关.
             */
            CAN_USE_INNER_TEXT: ua.isIE && !ua.isVersionOrHigher('9'),

            /**
             * IE, Opera, 和 Safari>=4 支持 element.parentElement 获取父元素.
             */
            CAN_USE_PARENT_ELEMENT_PROPERTY: ua.isIE || ua.isOPERA || ua.isWEBKIT,

            /**
             * IE中设置innerHTML时非scope元素需要在它之前出现一个scoped元素.
             * MSDN: http://msdn.microsoft.com/en-us/library/ms533897(VS.85).aspx#1
             */
            INNER_HTML_NEEDS_SCOPED_ELEMENT: ua.isIE
        };
    }
);