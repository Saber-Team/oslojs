/**
 * @fileoverview ActionEvent事件类型
 * @modified Leo.Zhang
 * @email zmike86@gmail.com
 */

sogou('Sogou.Events.ActionEventType',
    [],
    function() {

        'use strict';

        /**
         * 事件类型
         * @enum {string}
         */
        return {
            ACTION: 'action',
            BEFOREACTION: 'beforeaction'
        };
    }
);