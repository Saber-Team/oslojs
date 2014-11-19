/**
 * @fileoverview 操作表单的函数.
 * @author Leo.Zhang
 * @email zmike86@gmail.com
 */

define('@dom.forms', ['@util', '@ds.Map'], function(util, Map) {

    'use strict';

    /**
     * 返回表单数据针对不同的第三个参数返回不同格式, 可以是map对象或者
     * application/x-www-url-encoded字符串. 不支持file inputs.
     * @param {HTMLFormElement} form 表单元素.
     * @param {Object} result 要返回的结果对象.
     * @param {Function} fnAppend 一个灵活的处理函数接收结果对象和name/value参数,
     * 将其添加到结果对象.
     * @private
     */
    function getFormDataHelper_(form, result, fnAppend) {
        var els = form.elements;
        var el, i, input, name, value;
        for (i = 0; el = els[i]; i++) {
            // 非表单元素不要包含进来. els在一些浏览器包含非表单元素.
            // Check for 'form' property.
            // See http://code.google.com/p/closure-library/issues/detail?id=227
            // and
            // http://www.whatwg.org/specs/web-apps/current-work/multipage/the-input-element.html#the-input-element
            if (el.form !== form || el.disabled ||
                // HTMLFieldSetElement has a form property but no value.
                el.tagName.toLowerCase() === 'fieldset') {
                continue;
            }

            name = el.name;
            switch (el.type.toLowerCase()) {
                case 'file':
                // file inputs are not supported
                case 'submit':
                case 'reset':
                case 'button':
                    // don't submit these
                    break;
                case 'select-multiple':
                    var values = getValue(el);
                    if (!util.isNull(values)) {
                        for (var j = 0; value = values[j]; j++) {
                            fnAppend(result, name, value);
                        }
                    }
                    break;
                default:
                    value = getValue(el);
                    if (!util.isNull(value)) {
                        fnAppend(result, name, value);
                    }
            }
        }

        // input[type=image] are not included in the elements collection
        var inputs = form.getElementsByTagName('input');
        for (i = 0; input = inputs[i]; i++) {
            if (input.form === form && input.type.toLowerCase() === 'image') {
                name = input.name;
                fnAppend(result, name, input.value);
                fnAppend(result, name + '.x', '0');
                fnAppend(result, name + '.y', '0');
            }
        }
    }


    /**
     * 将表单中的name/value对添加到map对象中.
     * @param {Map} map map对象.
     * @param {string} name 名字.
     * @param {string} value 值.
     * @private
     */
    function addFormDataToMap_(map, name, value) {
        var array = map.get(name);
        if (!array) {
            array = [];
            map.set(name, array);
        }
        array.push(value);
    }


    /**
     * 将name/value对以'name=value'形式加到string buffer array.
     * @param {Array} sb The string buffer array for storing data.
     * @param {string} name The name.
     * @param {string} value The value.
     * @private
     */
    function addFormDataToStringBuffer_(sb, name, value) {
        sb.push(encodeURIComponent(name) + '=' + encodeURIComponent(value));
    }


    /**
     * 可勾选的元素值.
     * @param {Element} el The element.
     * @return {?string} The value of the form element (or null).
     * @private
     */
    function getInputChecked_(el) {
        return el.checked ? el.value : null;
    }


    /**
     * 单选select元素的值.
     * @param {Element} el The element.
     * @return {?string} The value of the form element (or null).
     * @private
     */
    function getSelectSingle_(el) {
        var selectedIndex = el.selectedIndex;
        return selectedIndex >= 0 ? el.options[selectedIndex].value : null;
    }


    /**
     * 返回多选select元素的多个值.
     * @param {Element} el The element.
     * @return {Array.<string>?} The value of the form element (or null).
     * @private
     */
    function getSelectMultiple_(el) {
        var values = [];
        for (var option, i = 0; option = el.options[i]; i++) {
            if (option.selected) {
                values.push(option.value);
            }
        }
        return values.length ? values : null;
    }


    /**
     * 设置checkable input元素的checked属性. 目前最重要的使用场景就是设置
     * checkbox的check属性而不是重置它的value值.
     * @param {Element} el 元素.
     * @param {string|boolean=} opt_value The value, sets the element checked if
     *     val is set.
     * @private
     */
    function setInputChecked_(el, opt_value) {
        el.checked = (opt_value ? 'checked' : null);
    }


    /**
     * 设置单选元素select-one element的值.
     * @param {Element} el 元素.
     * @param {string=} opt_value The value of the selected option element.
     * @private
     */
    function setSelectSingle_(el, opt_value) {
        // unset any prior selections
        el.selectedIndex = -1;
        if (util.isString(opt_value)) {
            for (var option, i = 0; option = el.options[i]; i++) {
                if (option.value === opt_value) {
                    option.selected = true;
                    break;
                }
            }
        }
    }


    /**
     * 设置多选元素select-multiple的值. 复杂度N^2
     * @param {Element} el 元素.
     * @param {Array.<string>|string=} opt_value The value of the selected option
     *     element(s).
     * @private
     */
    function setSelectMultiple_(el, opt_value) {
        // reset string opt_values as an array
        if (util.isString(opt_value)) {
            opt_value = [opt_value];
        }
        for (var option, i = 0; option = el.options[i]; i++) {
            // we have to reset the other options to false for select-multiple
            option.selected = false;
            if (opt_value) {
                for (var value, j = 0; value = opt_value[j]; j++) {
                    if (option.value === value) {
                        option.selected = true;
                    }
                }
            }
        }
    }


    /**
     * 将表单数据整合到一个map对象中, map对象key是表单控件名, value是数组.
     * 不支持file inputs.
     * @param {HTMLFormElement} form 表单元素.
     * @return {!Map} 返回一个对象结构.
     */
    function getFormDataMap(form) {
        var map = new Map();
        getFormDataHelper_(form, map, addFormDataToMap_);
        return map;
    }


    /**
     * 将表单数据整合到一个 application/x-www-url-encoded 字符串.
     * 不支持file inputs.
     * @param {HTMLFormElement} form 表单元素.
     * @return {string} An application/x-www-url-encoded string.
     */
    function getFormDataString(form) {
        var sb = [];
        getFormDataHelper_(form, sb, addFormDataToStringBuffer_);
        return sb.join('&');
    }


    /**
     * 是否表单中有file input.
     * @param {HTMLFormElement} form 表单元素.
     * @return {boolean}
     */
    function hasFileInput(form) {
        var els = form.elements;
        for (var el, i = 0; el = els[i]; i++) {
            if (!el.disabled && el.type && el.type.toLowerCase() === 'file') {
                return true;
            }
        }
        return false;
    }


    /**
     * 启用或禁止表单元素.
     * @param {Element} el 一个表单或某个表单元素.
     * @param {boolean} disabled 是否禁止.
     */
    function setDisabled(el, disabled) {
        // 如果是表单则禁用其中所有元素
        if (el.tagName === 'FORM') {
            var els = el.elements;
            for (var i = 0; el = els[i]; i++) {
                setDisabled(el, disabled);
            }
        } else {
            // makes sure to blur buttons, multi-selects, and any elements which
            // maintain keyboard/accessibility focus when disabled
            if (disabled === true) {
                el.blur();
            }
            el.disabled = disabled;
        }
    }


    /**
     * 聚焦或者selects表单元素的内容.
     * @param {Element} el 某个表单元素.
     */
    function focusAndSelect(el) {
        el.focus();
        if (el.select) {
            el.select();
        }
    }


    /**
     * 是否元素有值.
     * @param {Element} el 元素.
     * @return {boolean}
     */
    function hasValue(el) {
        var value = getValue(el);
        return !!value;
    }


    /**
     * 是否元素有值.
     * @param {HTMLFormElement} form The form element.
     * @param {string} name Name of an input to the form.
     * @return {boolean} Whether the form has a value.
     */
    function hasValueByName(form, name) {
        var value = getValueByName(form, name);
        return !!value;
    }


    /**
     * 获取元素的值.
     * @param {Element} el The element.
     * @return {string|Array.<string>|null} The current value of the element
     *     (or null).
     */
    function getValue(el) {
        var type = el.type;
        if (!util.isDef(type)) {
            return null;
        }
        switch (type.toLowerCase()) {
            case 'checkbox':
            case 'radio':
                return getInputChecked_(el);
            case 'select-one':
                return getSelectSingle_(el);
            case 'select-multiple':
                return getSelectMultiple_(el);
            default:
                return util.isDef(el.value) ? el.value : null;
        }
    }


    /**
     * 返回表单字段值. 如果是radio组,返回被选中的按钮的value.
     * @param {HTMLFormElement} form 表单.
     * @param {string} name Name of an input to the form.
     * @return {Array.<string>|string|null} The value of the form element, or
     *     null if the form element does not exist or has no value.
     */
    function getValueByName(form, name) {
        var els = form.elements[name];

        if (els) {
            if (els.type) {
                return getValue(els);
            } else {
                for (var i = 0; i < els.length; i++) {
                    var val = getValue(els[i]);
                    if (val) {
                        return val;
                    }
                }
            }
        }
        return null;
    }


    /**
     * 设置元素的value值.
     * @param {Element} el 元素.
     * @param {*=} opt_value 要设置的值, 默认会被浏览器使用toString转化类型.
     * 设置多选的时候value应该是个数组.
     */
    function setValue(el, opt_value) {
        var type = el.type;
        if (util.isDef(type)) {
            switch (type.toLowerCase()) {
                case 'checkbox':
                case 'radio':
                    setInputChecked_(el,/** @type {string} */ (opt_value));
                    break;
                case 'select-one':
                    setSelectSingle_(el,/** @type {string} */ (opt_value));
                    break;
                case 'select-multiple':
                    setSelectMultiple_(el,/** @type {Array} */ (opt_value));
                    break;
                default:
                    el.value = (util.isDef(opt_value) && opt_value !== null) ? opt_value : '';
            }
        }
    }


    return {
        getFormDataMap: getFormDataMap,
        getFormDataString: getFormDataString,
        hasFileInput: hasFileInput,
        setDisabled: setDisabled,
        focusAndSelect: focusAndSelect,
        hasValue: hasValue,
        hasValueByName: hasValueByName,
        setValue: setValue
    };

});