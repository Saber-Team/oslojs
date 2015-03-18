/**
 * @fileoverview 操作dom元素的dataset.
 * 见 {@link http://www.w3.org/TR/html5/Overview.html#dom-dataset}.
 * @author Leo.Zhang
 * @email zmike86@gmail.com
 */

define(['../string/util'], function(string) {

  'use strict';

  /**
   * 设置dom的dataset属性时需要加的前缀.
   * @type {string}
   * @const
   * @private
   */
  var PREFIX_ = 'data-';

  var ds = {};

  /**
   * 设置元素自定义的data属性. 名称要是驼峰式的 (e.g "keyName" 对应于
   * "data-key-name" 属性).
   * @param {Element} element DOM元素.
   * @param {string} key 属性名称.
   * @param {string} value 属性值.
   */
  ds.set = function(element, key, value) {
    if (element.dataset) {
      element.dataset[key] = value;
    } else {
      element.setAttribute(
          PREFIX_ + string.toSelectorCase(key), value);
    }
  };

  /**
   * 获取元素的自定义data属性. 名称应是驼峰写法 (e.g "keyName" for the "data-key-name").
   * @param {Element} element DOM元素.
   * @param {string} key 属性名.
   * @return {?string} 属性值.
   */
  ds.get = function(element, key) {
    if (element.dataset) {
      return element.dataset[key];
    } else {
      return element.getAttribute(PREFIX_ + string.toSelectorCase(key));
    }
  };

  /**
   * Removes a custom data attribute from an element. The key should be
   * in camelCase format (e.g "keyName" for the "data-key-name" attribute).
   * @param {Element} element DOM node to get the custom data attribute from.
   * @param {string} key Key for the custom data attribute.
   */
  ds.remove = function(element, key) {
    if (element.dataset) {
      delete element.dataset[key];
    } else {
      element.removeAttribute(PREFIX_ + string.toSelectorCase(key));
    }
  };

  /**
   * Checks whether custom data attribute exists on an element. The key should be
   * in camelCase format (e.g "keyName" for the "data-key-name" attribute).
   *
   * @param {Element} element DOM node to get the custom data attribute from.
   * @param {string} key Key for the custom data attribute.
   * @return {boolean} Whether the attibute exists.
   */
  ds.has = function(element, key) {
    if (element.dataset) {
      return key in element.dataset;
    } else if (element.hasAttribute) {
      return element.hasAttribute(PREFIX_ + string.toSelectorCase(key));
    } else {
      return !!(element.getAttribute(PREFIX_ + string.toSelectorCase(key)));
    }
  };

  /**
   * Gets all custom data attributes as a string map.  The attribute names will be
   * camel cased (e.g., data-foo-bar -> dataset['fooBar']).  This operation is not
   * safe for attributes having camel-cased names clashing with already existing
   * properties (e.g., data-to-string -> dataset['toString']).
   * @param {!Element} element DOM node to get the data attributes from.
   * @return {!Object} The string map containing data attributes and their
   *     respective values.
   */
  ds.getAll = function(element) {
    if (element.dataset) {
      return element.dataset;
    } else {
      var dataset = {};
      var attributes = element.attributes;
      for (var i = 0; i < attributes.length; ++i) {
        var attribute = attributes[i];
        if (string.startsWith(attribute.name, PREFIX_)) {
          // We use substr(5), since it's faster than replacing 'data-' with ''.
          var key = string.toCamelCase(attribute.name.substr(5));
          dataset[key] = attribute.value;
        }
      }
      return dataset;
    }
  };

  return ds;
});