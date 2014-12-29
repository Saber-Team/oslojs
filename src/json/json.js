/**
 * @fileoverview JSON包.
 * @author Leo.Zhang
 * @email zmike86@gmail.com
 */

define(['../util/util'], function(util) {

  'use strict';

  // 是否环境中提供原生JSON对象
  var CAN_USE_NATIVE_JSON = !!util.global.JSON;


  /**
   * 内部使用的一个字符映射 for string.quote
   * @private
   * @type {Object}
   */
  var charToJsonCharCache_ = {
    '\"': '\\"',
    '\\': '\\\\',
    '/': '\\/',
    '\b': '\\b',
    '\f': '\\f',
    '\n': '\\n',
    '\r': '\\r',
    '\t': '\\t',

    '\x0B': '\\u000b' // '\v' is not supported in JScript
  };


  /**
   * 一些字符需要被替换掉, 用这个正则过滤.
   * The S60 browser has a bug where unicode characters are not matched by
   * regular expressions. The condition below detects such behaviour and
   * adjusts the regular expression accordingly.
   * @private
   * @type {RegExp}
   */
  var charsToReplace_ = /\uffff/.test('\uffff') ?
    /[\\\"\x00-\x1f\x7f-\uffff]/g : /[\\\"\x00-\x1f\x7f-\xff]/g;


  /**
   * 序列化类. 参数是stringify时用到的第二个参数, 见15.12.3
   * @param {?(function(this:Object, string, *): *|Array)} opt_replacer Replacer.
   * @constructor
   */
  var Serializer = function(opt_replacer) {
    /**
     * @type {function(this:Object, string, *): *|null|undefined|Array}
     * @private
     */
    this.replacer_ = opt_replacer;
  };


  /**
   * 序列化. 这个方法和原生的stringify有很大不同.
   * @param {*} object 对象.
   * @throws Error 循环引用出现.
   * @return {string} 返回JSON字符串.
   */
  Serializer.prototype.serialize = function(object) {
    // 原生JSON api在不同浏览器有严重问题, 所以此处不对stringify方法做检测.
    // 同我们自己实现的json的不同之处详见测试用例 json_test#assertSerialize.
    // This implementation is signficantly faster than custom json, at least on
    // Chrome.  See json_perf.html for a perf test showing the difference.

    /*if (CAN_USE_NATIVE_JSON) {
     return util.global.JSON.stringify(object, this.replacer_);
     }*/

    var sb = [];
    this.serialize_(object, sb);
    return sb.join('');
  };


  /**
   * @private
   * @param {*} object 要序列化的对象.
   * @param {Array} sb Array used as a string builder.
   * @throws Error 循环引用出现.
   */
  Serializer.prototype.serialize_ = function(object, sb) {
    switch (typeof object) {
      case 'string':
        this.serializeString_(object, sb);
        break;
      case 'number':
        this.serializeNumber_(object, sb);
        break;
      case 'boolean':
        sb.push(object);
        break;
      case 'undefined':
        // 对于undefined值返回'null'
        sb.push('null');
        break;
      case 'object':
        // null返回'null'
        if (object === null) {
          sb.push('null');
          break;
        }
        if (util.isArray(object)) {
          this.serializeArray(object, sb);
          break;
        }
        // 通过构造函数生成的new String, new Number, new Boolean也会走到这里,
        // 未来考虑转化成值类型处理. Not very big deal.
        this.serializeObject_(object, sb);
        break;
      case 'function':
        // Skip
        break;
      default:
        throw Error('Unknown type: ' + typeof object);
    }
  };


  /**
   * 序列化字符串.
   * @private
   * @param {string} s 要被序列化的字符串.
   * @param {Array} sb 一个数组作为string builder.
   */
  Serializer.prototype.serializeString_ = function(s, sb) {
    // 官方的JSON实现对于 international characters支持不好.
    sb.push('"', s.replace(charsToReplace_, function(c) {
      // caching the result improves performance by a factor 2-3
      if (c in charToJsonCharCache_) {
        return charToJsonCharCache_[c];
      }

      var cc = c.charCodeAt(0);
      var rv = '\\u';
      // 补位操作
      if (cc < 16) {
        rv += '000';
      } else if (cc < 256) {
        rv += '00';
      } else if (cc < 4096) { // \u1000
        rv += '0';
      }
      return charToJsonCharCache_[c] = rv + cc.toString(16);
    }), '"');
  };


  /**
   * 序列化数字. 对于NaN和Infinity返回'null', 这点同原生JSON api保持一致.
   * @param {number} n 数字.
   * @param {Array} sb 一个数组作为string builder.
   * @private
   */
  Serializer.prototype.serializeNumber_ = function(n, sb) {
    sb.push(isFinite(n) && !isNaN(n) ? n : 'null');
  };


  /**
   * 序列化数组
   * @param {Array} arr 数组对象.
   * @param {Array} sb 一个数组作为string builder.
   * @protected
   */
  Serializer.prototype.serializeArray = function(arr, sb) {
    var l = arr.length;
    sb.push('[');
    var sep = '';
    for (var i = 0; i < l; i++) {
      sb.push(sep);

      var value = arr[i];
      this.serialize_(
        this.replacer_ ? this.replacer_.call(arr, String(i), value) : value,
        sb);

      sep = ',';
    }
    sb.push(']');
  };


  /**
   * 序列化对象
   * @private
   * @param {Object} obj 序列化的对象.
   * @param {Array} sb 一个存放字符串的数组作为string builder.
   */
  Serializer.prototype.serializeObject_ = function(obj, sb) {
    sb.push('{');
    var sep = '';
    for (var key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        var value = obj[key];
        // Skip functions.
        if (typeof value !== 'function') {
          sb.push(sep);
          this.serializeString_(key, sb);
          sb.push(':');

          this.serialize_(
            this.replacer_ ? this.replacer_.call(obj, key, value) : value,
            sb);

          sep = ',';
        }
      }
    }
    sb.push('}');
  };


  /**
   * 测试一个字符串是否合理的JSON string. 检测不可用的字符
   * @param {string} s 测试字符串.
   * @return {boolean} True既为合法.
   * @private
   */
  function isValid_(s) {
    if (/^\s*$/.test(s)) {
      return false;
    }

    // From http://www.json.org/json2.js.
    // Changes: We dissallow \u2028 Line separator and \u2029 Paragraph separator
    // inside strings.  We also treat \u2028 and \u2029 as whitespace which they
    // are in the RFC but IE and Safari does not match \s to these so we need to
    // include them in the reg exps in all places where whitespace is allowed.
    // We allowed \x7f inside strings because some tools don't escape it,
    // e.g. http://www.json.org/java/org/json/JSONObject.java

    // Parsing happens in three stages. In the first stage, we run the text
    // against regular expressions that look for non-JSON patterns. We are
    // especially concerned with '()' and 'new' because they can cause invocation,
    // and '=' because it can cause mutation. But just to be safe, we want to
    // reject all unexpected forms.

    // We split the first stage into 4 regexp operations in order to work around
    // crippling inefficiencies in IE's and Safari's regexp engines. First we
    // replace all backslash pairs with '@' (a non-JSON character). Second, we
    // replace all simple value tokens with ']' characters. Third, we delete all
    // open brackets that follow a colon or comma or that begin the text. Finally,
    // we look to see that the remaining characters are only whitespace or ']' or
    // ',' or ':' or '{' or '}'. If that is so, then the text is safe for eval.

    // Don't make these static since they have the global flag.
    var backslashesRe = /\\["\\\/bfnrtu]/g;
    var simpleValuesRe =
      /"[^"\\\n\r\u2028\u2029\x00-\x08\x0a-\x1f]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g;
    var openBracketsRe = /(?:^|:|,)(?:[\s\u2028\u2029]*\[)+/g;
    var remainderRe = /^[\],:{}\s\u2028\u2029]*$/;

    return remainderRe.test(s.replace(backslashesRe, '@').
      replace(simpleValuesRe, ']').
      replace(openBracketsRe, ''));
  }


  /**
   * 反序列化成对象. 非法字符串会抛出异常. 见15.12.2
   * 在很大的字符串计算下会非常慢. 如果确保字符串没有危险可以用unsafeParse.
   * @param {*} s JSON串.
   * @param {?function(this:Object, string, *): *} opt_receiver
   * @return {Object} 反序列化得到的对象.
   */
  function parse(s, opt_receiver) {
    if (CAN_USE_NATIVE_JSON) {
      return util.global.JSON.parse(s, opt_receiver);
    }

    var o = String(s);
    if (isValid_(o)) {
      /** @preserveTry */
      try {
        return /** @type {Object} */ (eval('(' + o + ')'));
      } catch (ex) { }
    }
    throw Error('Invalid JSON string: ' + o);
  }


  /**
   * 非安全地反序列化成对象.
   * @param {*} s JSON串.
   * @return {Object} 反序列化得到的对象.
   */
  function unsafeParse(s) {
    return /** @type {Object} */ (eval('(' + s + ')'));
  }


  /**
   * 将对象序列化成json格式字符串.
   * @param {*} object 要序列化的对象.
   * @param {?function(this:Object, string, *): *} opt_replacer 对每个kv对执行这个替换函数,
   *     决定value如何被序列化.
   * @throws Error 对象属性循环引用时抛出异常.
   * @return {string} A JSON string.
   */
  function serialize(object, opt_replacer) {
    // NOTE: Currently, we never use JSON.stringify.
    // The last time I evaluated this, JSON.stringify had subtle bugs and behavior
    // differences on all browsers, and the performance win was not large enough
    // to justify all the issues. This may change in the future as browser
    // implementations get better.
    //
    // assertSerialize in json_test contains if branches for the cases
    // that fail.
    return new Serializer(opt_replacer).serialize(object);
  }


  // exports
  return {
    parse: parse,
    unsafeParse: unsafeParse,
    serialize: serialize,
    stringify: serialize
  };
});