/**
 * @fileoverview 一个接口. 创建XMLHttpRequest对象和它们元数据(metadata)的抽象工厂.
 * @author Leo.Zhang
 * @email zmike86@gmail.com
 */

define(['../util/util'],
  function(util) {

    'use strict';

    /**
     * XmlHttpRequest 的抽象工厂类.
     * @constructor
     */
    var XmlHttpFactory = function() {};

    /**
     * XHR选项 - 只调用internalGetOptions一次.
     * @type {Object}
     * @private
     */
    XmlHttpFactory.prototype.cachedOptions_ = null;

    /**
     * @return {!(XMLHttpRequest|GearsHttpRequest)} 返回XMLHttpRequest实例.
     */
    XmlHttpFactory.prototype.createInstance = util.abstractMethod;

    /**
     * @return {Object} 返回创建时的配置对象.
     */
    XmlHttpFactory.prototype.getOptions = function() {
      return this.cachedOptions_ ||
        (this.cachedOptions_ = this.internalGetOptions());
    };

    /**
     * 一个受保护方法. 在子类中重写可以保全getOptions()返回的选项.
     * 这个方法不会被调用, 看DefaultXmlHttpFactory的实现就知道了.
     * @return {Object} 返回创建xhr对象的配置对象.
     * @protected
     */
    XmlHttpFactory.prototype.internalGetOptions = util.abstractMethod;

    return XmlHttpFactory;
  }
);