/**
 * @fileoverview JSON包. 这个模块并未做原生的JSON对象检测. TODO 合二为一
 * @modified Leo.Zhang
 * @email zmike86@gmail.com
 */

define('Sogou.JSON.Util',
    ['Sogou.Util'],
    function(util) {

        'use strict';


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
         * 反序列化成对象. 非法字符串会抛出异常.
         * 在很大的字符串计算下会非常慢. 如果确保字符串没有危险可以用unsafeParse.
         * @param {*} s JSON串.
         * @return {Object} 反序列化得到的对象.
         */
        function parse(s) {
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
         * JSON replacer, as defined in Section 15.12.3 of the ES5 spec.
         * TODO: Array should also be a valid replacer.
         *
         * @typedef {function(this:Object, string, *): *}
         */
        var Replacer = null;


        /**
         * JSON reviver, as defined in Section 15.12.2 of the ES5 spec.
         * @typedef {function(this:Object, string, *): *}
         */
        var Reviver = null;


        /**
         * 将对象序列化成json格式字符串.
         * @param {*} object 要序列化的对象.
         * @param {?Replacer=} opt_replacer 对每个kv对执行这个替换函数, 决定value如何被序列化.
         * @throws Error 对象属性循环引用时抛出异常.
         * @return {string} A JSON string.
         */
        function serialize(object, opt_replacer) {
            // NOTE: Currently, we never use JSON.stringify.
            //
            // The last time I evaluated this, JSON.stringify had subtle bugs and behavior
            // differences on all browsers, and the performance win was not large enough
            // to justify all the issues. This may change in the future as browser
            // implementations get better.
            //
            // assertSerialize in json_test contains if branches for the cases
            // that fail.
            return new Serializer(opt_replacer).serialize(object);
        }


        /**
         * 序列化类.
         * @param {?Replacer=} opt_replacer Replacer.
         * @constructor
         */
        var Serializer = function(opt_replacer) {
            /**
             * @type {Replacer|null|undefined}
             * @private
             */
            this.replacer_ = opt_replacer;
        };


        /**
         * 序列化.
         * @param {*} object 对象.
         * @throws Error if there are loops in the object graph.
         * @return {string} A JSON string.
         */
        Serializer.prototype.serialize = function(object) {
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
                    sb.push('null');
                    break;
                case 'object':
                    if (object === null) {
                        sb.push('null');
                        break;
                    }
                    if (util.isArray(object)) {
                        this.serializeArray(object, sb);
                        break;
                    }
                    // should we allow new String, new Number and new Boolean to be treated
                    // as string, number and boolean? Most implementations do not and the
                    // need is not very big
                    this.serializeObject_(object, sb);
                    break;
                case 'function':
                    // Skip functions.
                    break;
                default:
                    throw Error('Unknown type: ' + typeof object);
            }
        };


        /**
         * Character mappings used internally for string.quote
         * @private
         * @type {Object}
         */
        Serializer.charToJsonCharCache_ = {
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
         * Regular expression used to match characters that need to be replaced.
         * The S60 browser has a bug where unicode characters are not matched by
         * regular expressions. The condition below detects such behaviour and
         * adjusts the regular expression accordingly.
         * @private
         * @type {RegExp}
         */
        Serializer.charsToReplace_ = /\uffff/.test('\uffff') ?
            /[\\\"\x00-\x1f\x7f-\uffff]/g : /[\\\"\x00-\x1f\x7f-\xff]/g;


        /**
         * 序列化字符串.
         * @private
         * @param {string} s The string to serialize.
         * @param {Array} sb Array used as a string builder.
         */
        Serializer.prototype.serializeString_ = function(s, sb) {
            // The official JSON implementation does not work with international
            // characters.
            sb.push('"', s.replace(Serializer.charsToReplace_, function(c) {
                // caching the result improves performance by a factor 2-3
                if (c in Serializer.charToJsonCharCache_) {
                    return Serializer.charToJsonCharCache_[c];
                }

                var cc = c.charCodeAt(0);
                var rv = '\\u';
                if (cc < 16) {
                    rv += '000';
                } else if (cc < 256) {
                    rv += '00';
                } else if (cc < 4096) { // \u1000
                    rv += '0';
                }
                return Serializer.charToJsonCharCache_[c] = rv + cc.toString(16);
            }), '"');
        };


        /**
         * 序列化数字.
         * @private
         * @param {number} n 数字.
         * @param {Array} sb Array used as a string builder.
         */
        Serializer.prototype.serializeNumber_ = function(n, sb) {
            sb.push(isFinite(n) && !isNaN(n) ? n : 'null');
        };


        /**
         * 序列化数组
         * @param {Array} arr The array to serialize.
         * @param {Array} sb Array used as a string builder.
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
         * @param {Object} obj The object to serialize.
         * @param {Array} sb Array used as a string builder.
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


        // exports
        return {
            parse: parse,
            unsafeParse: unsafeParse,
            serialize: serialize,
            stringify: serialize,
            Serializer: Serializer
        };
    }
);