/**
 * @fileoverview 历史记录变化时分发的事件
 * @modified Leo.Zhang
 * @email zmike86@gmail.com
 */

define('@history.event',
    [
        '@util',
        '@events.eventbase',
        '@history.eventtype'
    ],
    function(util, EventBase, HistoryEventType) {

        'use strict';

        /**
         * 历史状态变化后分发的事件对象。新加了两个属性
         * @param {string} token 标识新的历史状态的字符串.
         * @param {boolean} isNavigation True如果是浏览器的前进后退行为触发的, 点击了一个链接,
         *     编辑了当前url, 或者调用window.history.(go|back|forward).
         *     False 如果token是被setToken或者replaceToken触发的.
         * @constructor
         * @extends {EventBase}
         */
        function HistoryEvent(token, isNavigation) {
            EventBase.call(this, HistoryEventType.NAVIGATE);
            /**
             * 当前历史状态
             * @type {string}
             */
            this.token = token;
            /**
             * 标识是否由浏览器的导航行为触发的
             * @type {boolean}
             */
            this.isNavigation = isNavigation;
        }

        util.inherits(HistoryEvent, EventBase);

        return HistoryEvent;
    }
);