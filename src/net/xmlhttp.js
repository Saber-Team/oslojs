/**
 * @fileoverview 底层的处理XMLHttpRequest的操作模块.
 * @author Leo.Zhang
 * @email zmike86@gmail.com
 */

define('@net.xmlHttp',
    ['@net.defaultXmlHttpFactory'],
    function(DefaultXmlHttpFactory) {

        'use strict';

        /**
         * 一个静态的私有属性,保存了创建XMLHttpRequest对象的工厂实例,是全局的工厂.
         * @type {XmlHttpFactory}
         * @private
         */
        var factory_ = null;


        /**
         * 创建 XMLHttpRequest 对象的静态类.
         * @return {!(XMLHttpRequest|GearsHttpRequest)} A new XMLHttpRequest object.
         */
        var xmlHttp = function() {
            return factory_.createInstance();
        };


        /**
         * 用这个静态方法获得XMLHttpRequest objects的配置对象.
         * @return {Object} The options.
         */
        xmlHttp.getOptions = function() {
            return factory_.getOptions();
        };


        /**
         * XmlHttp对象中可以含有的选项.
         * @enum {number}
         */
        xmlHttp.OptionType = {
            /**
             * 还是IE下需要用util.nullFunction设置onreadystatechange而不是null.
             */
            USE_NULL_FUNCTION: 0,
            /**
             * NOTE: 在IE中如果send()发送到本地(*local* request)时会出错,readystate
             * 会一直是COMPLETE. 我们得忽略这种情况并且在send()外包裹try/catch 才能
             * 捕捉到这个error.
             */
            LOCAL_REQUEST_ERROR: 1
        };


        /**
         * XMLHTTP Status常量, 见:
         * http://msdn.microsoft.com/library/default.asp?url=/library/
         *   en-us/xmlsdk/html/0e6a34e4-f90c-489d-acff-cb44242fafc6.asp
         * @enum {number}
         */
        xmlHttp.ReadyState = {
            UNINITIALIZED: 0,
            LOADING: 1,
            LOADED: 2,
            INTERACTIVE: 3,
            COMPLETE: 4
        };


        /**
         * 设置factory_对象.
         * @param {!XmlHttpFactory} factory New global factory object.
         */
        xmlHttp.setGlobalFactory = function(factory) {
            factory_ = factory;
        };


        // Set the global factory to an instance of the default factory.
        xmlHttp.setGlobalFactory(new DefaultXmlHttpFactory());


        return xmlHttp;

    }
);