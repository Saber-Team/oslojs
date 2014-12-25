/**
 * @fileoverview 渲染引擎探测, 操作系统探测
 * @see <a href="http://www.useragentstring.com/">User agent strings</a>
 *     使用userAgent.product检测浏览器厂商.
 * @see ../../demos/useragent.html
 * @author Leo.Zhang
 * @email zmike86@gmail.com
 */

define(['../string/util'],
  function(string) {

    'use strict';

    /**
     * 某些客户代理(Gears WorkerPool)没有navigator对象,我们返回空字符串.
     * @return {string}
     */
    function getUserAgentString() {
      return window.navigator ? window.navigator.userAgent : '';
    }

    /**
     * @return {Object} 原声navigator对象.
     */
    function getNavigator() {
      // Need a local navigator reference instead of using the global one,
      // to avoid the rare case where they reference different objects.
      // (in a WorkerPool, for example).
      return window.navigator;
    }

    var ua = getUserAgentString();
    var navigator = getNavigator();

    /**
     * 是否Opera.
     * @return {boolean}
     */
    var isOPERA = (function() {
      return string.contains(ua, 'Opera') || string.contains(ua, 'OPR');
    })();

    /**
     * 是否Internet Explorer. 其他一些设备用了Trident渲染引擎. 比如AOL,Netscape 8
     * @return {boolean}
     */
    var isIE = (function() {
      return string.contains(ua, 'MSIE') || string.contains(ua, 'Trident');
    })();

    /**
     * @return {boolean} 渲染引擎是否Trident.
     */
    var isTrident = (function() {
      // IE从8开始才含有Trident token.
      return string.contains('Trident') || string.contains('MSIE');
    })();

    /**
     * 渲染引擎是否WebKit. Safari, Android and others.
     * @return {boolean}
     */
    var isWebKit = (function() {
      return string.caseInsensitiveContains(ua, 'WebKit');
    })();

    /**
     * 是否使用了Gecko引擎. Mozilla Firefox, Camino and more.
     * 因为WebKit浏览器也可能含有'Gecko' 并且navigator.product就是'Gecko',
     * 所以这部判断要在isWebKit之后.
     * @return {boolean}
     */
    var isGECKO = (function() {
      return string.contains(ua, 'Gecko') && !isWebKit && !isTrident;
    })();

    /**
     * 是否移动设备.
     * @return {boolean}
     */
    var isMOBILE = function() {
      return isWebKit() && string.contains(ua, 'Mobile');
    };

    /**
     * 运行UA的操作系统. 默认''因为navigator.platform可能无值 (on Rhino).
     * @type {string}
     */
    var PLATFORM = navigator && navigator.platform || '';

    /**
     * Macintosh operating system.
     * @type {boolean}
     */
    var isMAC = string.contains(PLATFORM, 'Mac');

    /**
     * Windows operating system.
     * @type {boolean}
     */
    var isWINDOWS = string.contains(PLATFORM, 'Win');

    /**
     * Linux operating system.
     * @type {boolean}
     */
    var isLINUX = string.contains(PLATFORM, 'Linux');

    /**
     * X11 windowing system.
     * @type {boolean}
     */
    var isX11 = !!navigator && string.contains(navigator.appVersion || '', 'X11');

    /**
     * Android.
     * @type {boolean}
     */
    var isANDROID = !!ua && string.contains(ua, 'Android');

    /**
     * iPhone.
     * @type {boolean}
     */
    var isIPHONE = !!ua && string.contains(ua, 'iPhone');

    /**
     * iPad.
     * @type {boolean}
     */
    var isIPAD = !!ua && string.contains(ua, 'iPad');

    /**
     * @return {string} 标明版本号的字符串.
     * @private
     */
    function determineVersion_() {
      // All browsers have different ways to detect the version and they all have
      // different naming schemes.

      // version is a string rather than a number because it may contain 'b', 'a',
      // and so on.
      var version = '', re;

      if (isOPERA && window.opera) {
        var operaVersion = window.opera.version;
        return (typeof operaVersion === 'function' ? operaVersion() : operaVersion);
      }

      if (isGECKO) {
        re = /rv\:([^\);]+)(\)|;)/;
      }
      else if (isIE) {
        re = /\b(?:MSIE|rv)[: ]([^\);]+)(\)|;)/;
      }
      else if (isWebKit) {
        // WebKit/125.4
        re = /WebKit\/(\S+)/;
      }

      if (re) {
        var arr = re.exec(getUserAgentString());
        version = arr ? arr[1] : '';
      }

      if (isIE) {
        // IE9可能会是document mode 9但检测UA得到的版本号低于9, 一般是设置了浏览器的代理模式.
        // 如果检测到的版本低于9,我们以documentMode为主. IE8也有这种问题.
        // 建议在meta头设置X-UA-Compatible为edge确保用的是documentMode 9.
        var docMode = getDocumentMode_();
        if (docMode > parseFloat(version))
          return '' + docMode;
      }
      return version;
    }

    /**
     * @return {number|undefined}
     * @private
     */
    function getDocumentMode_() {
      var doc = window.document;
      return doc ? doc.documentMode : undefined;
    }

    /**
     * UA的版本. 输出字符串因为可能有'b'(as in beta)也有可能有多个dots.
     * @type {string}
     */
    var VERSION = determineVersion_();

    /**
     * 缓存isVersionOrHigher的结果因为每次计算代价都比较大.
     * @const
     * @private
     */
    var isVersionOrHigherCache_ = {};

    /**
     * 经检测IE7(包含7)以下的版本都不支持documentMode属性, 所以要通过compatMode去
     * 得到当前的文档模式, 若是标准模式则浏览器版本就是文档模式版本, 否则混杂模式用5表示,
     * IE就是这么约定的.
     * @type {number|undefined}
     * @const
     */
    var DOCUMENT_MODE = (function() {
      var doc = window.document;
      if (!doc || !isIE)
        return void 0;
      var mode = getDocumentMode_();
      return mode || (doc.compatMode === 'CSS1Compat' ? parseInt(VERSION, 10) : 5);
    })();

    return {
      getUserAgentString: getUserAgentString,
      getNavigator: getNavigator,
      isOPERA: isOPERA,
      isIE: isIE,
      isWEBKIT: isWebKit,
      isMOBILE: isMOBILE,
      isGECKO: isGECKO,

      isMAC: isMAC,
      isWINDOWS: isWINDOWS,
      isLINUX: isLINUX,
      isX11: isX11,
      isANDROID: isANDROID,
      isIPHONE: isIPHONE,
      isIPAD: isIPAD,

      VERSION: VERSION,
      /**
       * 当前UA引擎的版本是否高于等于给定的版本号.
       * 注意: 检查Firefox或者Safari时, 确定用的是引擎的版本而非浏览器版本. 比如,
       * Firefox 3.0 用的是 Gecko 1.9; Safari 3.0 用的是 Webkit 522.11.
       * Opera 和 Internet Explorer 的版本是和product release number一致的.<br>
       * @see <a href="http://en.wikipedia.org/wiki/Safari_version_history">Webkit</a>
       * @see <a href="http://en.wikipedia.org/wiki/Gecko_engine">Gecko</a>
       *
       * @param {string|number} version 检测的版本号.
       * @return {boolean}
       */
      isVersionOrHigher: function(version) {
        return isVersionOrHigherCache_[version] ||
          (isVersionOrHigherCache_[version] = string.compareVersions(VERSION, version) >= 0);
      },
      /**
       * 只有IE有此特性, 其他浏览器返回false.
       * @param {number} documentMode
       * @return {boolean}
       */
      isDocumentModeOrHigher: function(documentMode) {
        return isIE && DOCUMENT_MODE >= documentMode;
      },
      DOCUMENT_MODE: DOCUMENT_MODE
    };
  }
);