/**
 * @fileoverview 定义一个默认的xhr工厂. 没必要亲自实例化它, 而是通过Sogou.Net.XmlHttp.
 *     实际上xmlhttp.js模块最后一行已经进行了默认设置.
 * @extends {XmlHttpFactory}
 * @constructor
 */

define('Sogou.Net.DefaultXmlHttpFactory',
    ['Sogou.Util','Sogou.Net.XmlHttpFactory'],
    function(util, XmlHttpFactory) {

        'use strict';

        /**
         * 定义一个默认的xhr工厂. 没必要亲自实例化它, 而是通过XmlHttp.
         * 实际上本文件最后一行已经进行了默认设置....
         * @extends {XmlHttpFactory}
         * @constructor
         */
        var DefaultXmlHttpFactory = function() {
            XmlHttpFactory.call(this);
        };

        util.inherits(DefaultXmlHttpFactory, XmlHttpFactory);


        /** @override */
        DefaultXmlHttpFactory.prototype.createInstance = function() {
            var progId = this.getProgId_();
            if (progId) {
                return new ActiveXObject(progId);
            } else {
                return new XMLHttpRequest();
            }
        };


        /** @override */
        DefaultXmlHttpFactory.prototype.internalGetOptions = function() {
            var progId = this.getProgId_();
            var options = {};
            if (progId) {
                //options[XmlHttp.OptionType.USE_NULL_FUNCTION] = true;
                //options[XmlHttp.OptionType.LOCAL_REQUEST_ERROR] = true;
                options[0] = true;
                options[1] = true;
            }
            return options;
        };


        /**
         * 在IE下创建ajax插件的prog id.
         * @type {?string|undefined}
         * @private
         */
        DefaultXmlHttpFactory.prototype.ieProgId_ = null;


        /**
         * @return {string} 返回 ActiveX PROG ID.
         * @private
         */
        DefaultXmlHttpFactory.prototype.getProgId_ = function() {
            // 在Internet Explorer中如何创建XMLHTTP对象:
            // http://blogs.msdn.com/xmlteam/archive/2006/10/23/
            //   using-the-right-version-of-msxml-in-internet-explorer.aspx
            // 但在win9x等老系统中的老版本IE我们不信任这些能够保证正确,所以我们只保留最后2条.
            if (!this.ieProgId_ && typeof XMLHttpRequest === 'undefined' &&
                typeof ActiveXObject !== 'undefined') {
                // Candidate Active X types.
                var ACTIVE_X_IDENTS = [
                    'MSXML2.XMLHTTP.6.0',
                    'MSXML2.XMLHTTP.3.0',
                    'MSXML2.XMLHTTP',
                    'Microsoft.XMLHTTP'
                ];
                for (var i = 0; i < ACTIVE_X_IDENTS.length; i++) {
                    var candidate = ACTIVE_X_IDENTS[i];
                    /** @preserveTry */
                    try {
                        new ActiveXObject(candidate);
                        // NOTE(user): cannot assign progid and return candidate in one line
                        // because JSCompiler complaings: BUG 658126
                        this.ieProgId_ = candidate;
                        return candidate;
                    } catch (e) {
                        // do nothing; try next choice
                    }
                }

                // 没找到匹配的版本
                throw Error('Could not create ActiveXObject. ActiveX might be disabled,' +
                    ' or MSXML might not be installed');
            }

            return /** @type {string} */ (this.ieProgId_);
        };


        return DefaultXmlHttpFactory;

    }
);