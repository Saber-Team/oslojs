/**
 * @fileoverview cookies操作模块.
 * @author Leo.Zhang
 * @email zmike86@gmail.com
 */

define(['../util/util'], function(util) {

    'use strict';

    /**
     * cookies有大小限制. 根据规范一般来讲是4K,但确定不能超过这个极值,我们定为3950字节时就截断,
     * 因为有些老旧浏览器或者一些客户端代理将4K设置为4000而不是4096.
     * @type {number}
     */
    var MAX_COOKIE_LENGTH = 3950;

    /**
     * 分割cookie字符串的正则.
     * @type {RegExp}
     * @private
     */
    var SPLIT_RE_ = /\s*;\s*/;

    /**
     * 处理客户端浏览器cookies的类.
     * @param {Document} context 设置cookie的宿主文档对象.
     * @constructor
     */
    var Cookies = function(context) {
      /**
       * 宿主文档对象
       * @type {Document}
       * @private
       */
      this.document_ = context;
    };

    Cookies.MAX_COOKIE_LENGTH = MAX_COOKIE_LENGTH;

    /**
     * 返回客户端的永久cookies是否开启.
     * @return {boolean}
     */
    Cookies.prototype.isEnabled = function() {
      return navigator.cookieEnabled;
    };

    /**
     * 名字中不能出现'=', ';', 或者空白符.
     * NOTE: 以下名字虽然合法但其在cookie中有特殊意义应该避免.
     * - 以 '$' 开始的
     * - 'Comment'
     * - 'Domain'
     * - 'Expires'
     * - 'Max-Age'
     * - 'Path'
     * - 'Secure'
     * - 'Version'
     *
     * @param {string} name Cookie name.
     * @return {boolean} 名字是否合法.
     * @see <a href="http://tools.ietf.org/html/rfc2109">RFC 2109</a>
     * @see <a href="http://tools.ietf.org/html/rfc2965">RFC 2965</a>
     */
    Cookies.prototype.isValidName = function(name) {
      return !(/[;=\s]/.test(name));
    };

    /**
     * cookie值中不能出现 ';' 和断行符 'line break'.
     * 规范没有明确非法字符, 但是分号影响cookie解析, 断行符会截断名字.
     * @param {string} value 要验证的Cookie值.
     * @return {boolean} 值是否合法.
     *
     * @see <a href="http://tools.ietf.org/html/rfc2109">RFC 2109</a>
     * @see <a href="http://tools.ietf.org/html/rfc2965">RFC 2965</a>
     */
    Cookies.prototype.isValidValue = function(value) {
      return !(/[;\r\n]/.test(value));
    };

    /**
     * 设置cookie.max_age可以设成-1让cookie成为session cookie.想要删除cookies用remove()方法.
     * name和value都不会被编码,想要编码应该在之前有程序代码自己完成.
     * @throws {!Error} {@code name}没通过#isValidName的校验.
     * @throws {!Error} {@code value}没通过#isValidValue的校验.
     *
     * @param {string} name cookie名.
     * @param {string} value cookie值.
     * @param {number=} opt_maxAge 从现在开始的过期秒数. -1会使cookie成为session cookie.
     *     默认是-1(i.e. a session cookie).
     * @param {?string=} opt_path cookie的路径.对于前端来讲只有该路径的资源才能访问cookie.
     *     如果没传这个参数默认当前请求路径.
     * @param {?string=} opt_domain cookie的域, 如果没指定(浏览器会设置成请求的full host name).
     * @param {boolean=} opt_secure 是否只在安全协议下发送cookie.
     */
    Cookies.prototype.set = function(
      name, value, opt_maxAge, opt_path, opt_domain, opt_secure) {
      if (!this.isValidName(name)) {
        throw Error('Invalid cookie name "' + name + '"');
      }
      if (!this.isValidValue(value)) {
        throw Error('Invalid cookie value "' + value + '"');
      }
      if (!util.isDef(opt_maxAge)) {
        opt_maxAge = -1;
      }

      var domainStr = opt_domain ? ';domain=' + opt_domain : '';
      var pathStr = opt_path ? ';path=' + opt_path : '';
      var secureStr = opt_secure ? ';secure' : '';

      var expiresStr;

      // Case 1: session cookie.
      if (opt_maxAge < 0) {
        expiresStr = '';

        // Case 2: 使得cookie过期.
      } else if (opt_maxAge === 0) {
        // Note: 不用Jan 1, 1970 是因为 NS 4.76 会试图转化成本地时间, 如果本地时间在Jan 1, 1970之前,
        // 浏览器会完全忽略Expires attribute.
        var pastDate = new Date(1970, 1 /*Feb*/, 1);  // Feb 1, 1970
        expiresStr = ';expires=' + pastDate.toUTCString();

        // Case 3: 设置永久cookie.
      } else {
        var futureDate = new Date(util.now() + opt_maxAge * 1000);
        expiresStr = ';expires=' + futureDate.toUTCString();
      }

      this.setCookie_(name + '=' + value + domainStr + pathStr + expiresStr + secureStr);
    };

    /**
     * 返回cookie名的首个cookie值.
     * @param {string} name 要获取的cookie名.
     * @param {string=} opt_default 默认返回值.
     * @return {string|undefined} cookie值. 如果没有该cookie返回opt_default, 如果没有opt_default
     *     返回undefined.
     */
    Cookies.prototype.get = function(name, opt_default) {
      var nameEq = name + '=';
      var parts = this.getParts_();
      for (var i = 0, part; part = parts[i]; i++) {
        // startsWith
        if (part.lastIndexOf(nameEq, 0) === 0) {
          return part.substr(nameEq.length);
        }
        // 空cookie
        if (part === name) {
          return '';
        }
      }
      return opt_default;
    };

    /**
     * 通过使cookie过期从而删除该cookie.
     * @param {string} name cookie名.
     * @param {string=} opt_path cookie的路径, null的话使得完整请求域(full request path)下的cookie过期.
     *     没提供则默认 '/' (i.e. path=/).
     * @param {string=} opt_domain cookie的域, null的话则是删除完整请求域(full request host name)
     *     下的cookie. 默认是null(i.e. cookie at full request host name).
     * @return {boolean} 返回删除之前cookie是否存在.
     */
    Cookies.prototype.remove = function(name, opt_path, opt_domain) {
      var rv = this.containsKey(name);
      this.set(name, '', 0, opt_path, opt_domain);
      return rv;
    };

    /**
     * 获得所有cookies名.
     * @return {Array.<string>} cookies名字的数组.
     */
    Cookies.prototype.getKeys = function() {
      return this.getKeyValues_().keys;
    };

    /**
     * 获得所有cookies值.
     * @return {Array.<string>} cookies值的数组.
     */
    Cookies.prototype.getValues = function() {
      return this.getKeyValues_().values;
    };

    /**
     * @return {boolean} cookies是否为空.
     */
    Cookies.prototype.isEmpty = function() {
      return !this.getCookie_();
    };

    /**
     * @return {number} 返回当前文档中可访问的cookie数.
     */
    Cookies.prototype.getCount = function() {
      var cookie = this.getCookie_();
      if (!cookie) {
        return 0;
      }
      return this.getParts_().length;
    };

    /**
     * 是否存在给定名字的cookie.
     * @param {string} key cookie名.
     * @return {boolean}
     */
    Cookies.prototype.containsKey = function(key) {
      // get方法要么返回字符串要么返回undefined
      return util.isDef(this.get(key));
    };

    /**
     * 是否存在给定值的cookie. (复杂度O(n))
     * @param {string} value 给定值.
     * @return {boolean}
     */
    Cookies.prototype.containsValue = function(value) {
      // this O(n) in any case so lets do the trivial thing.
      var values = this.getKeyValues_().values;
      for (var i = 0; i < values.length; i++) {
        if (values[i] === value) {
          return true;
        }
      }
      return false;
    };

    /**
     * 删除所有当前域下的文档路径下的cookie. 其他域(子域)下的仍然保留.
     */
    Cookies.prototype.clear = function() {
      var keys = this.getKeyValues_().keys;
      for (var i = keys.length - 1; i >= 0; i--) {
        this.remove(keys[i]);
      }
    };

    /**
     * Private helper function测试设置cookie但不依赖于浏览器.
     * @param {string} s 要设置的cookie string.
     * @private
     */
    Cookies.prototype.setCookie_ = function(s) {
      this.document_.cookie = s;
    };

    /**
     * Private helper function测试获取cookies但不依赖于浏览器. IE6有可能返回null.
     * @return {?string} Returns the {@code document.cookie}.
     * @private
     */
    Cookies.prototype.getCookie_ = function() {
      return this.document_.cookie;
    };

    /**
     * @return {!Array.<string>} 以分号分割cookie串.
     * @private
     */
    Cookies.prototype.getParts_ = function() {
      return (this.getCookie_() || '').split(SPLIT_RE_);
    };

    /**
     * 获得cookies的所有名字和值.
     * @return {Object} 一个对象.
     * @private
     */
    Cookies.prototype.getKeyValues_ = function() {
      var parts = this.getParts_();
      var keys = [],
        values = [],
        index, part;
      for (var i = 0; part = parts[i]; i++) {
        index = part.indexOf('=');
        // empty name
        if (index === -1) {
          keys.push('');
          values.push(part);
        } else {
          keys.push(part.substring(0, index));
          values.push(part.substring(index + 1));
        }
      }
      return {keys: keys, values: values};
    };

    /**
     * 期望是单例.
     * @type {Cookies}
     */
    var cookies = new Cookies(document);

    return {
      Cookies: Cookies,
      cookies: cookies
    };
  }
);