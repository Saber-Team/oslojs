/**
 * @fileoverview 拖拽事件类型.
 * @modified Leo.Zhang
 * @email zmike86@gmail.com
 */

define('Sogou.FX.DraggerEventType', [], function() {

    'use strict';

    /**
     * @enum {string}
     */
    return {
        // 拖拽可能还没开始就取消了. 可能的原因是:
        // 1. dragger未启用;
        // 2. 用鼠标右键进行拖拽;
        // 3. 在达到hysteresis distance前释放了按键.
        EARLY_CANCEL: 'earlycancel',
        START: 'start',
        BEFOREDRAG: 'beforedrag',
        DRAG: 'drag',
        END: 'end'
    };

});


