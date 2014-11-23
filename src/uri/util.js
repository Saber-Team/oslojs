/**
 * @fileoverview 这个模块包含一些处理URI strings的实用方法.
 * 这个模块提供了比Uri模块更轻量的一些实用函数. Uri模块在文件体积上比较大, 其中有些可能根本用不到,
 * 所以此模块设计成为一个轻量级实用函数集合. gzip后大约节省1.5k. 开发者尽量不要添加新的方法,而是添
 * 新的模块并且抽象已有代码.
 *
 * 此模块中不少方法有所限制. 比如假定各部分已经编码.
 * The query parameter mutation utilities also do not tolerate fragment identifiers.
 *
 * 设计上这个模块的函数比相应的Uri的函数要慢. 一些反复调用的函数可能在IE中会有平方级别的,
 * 尽管IE中对url有2kb的限制.
 *
 * 当前模块在编码方面不如Uri模块, 当前模块对字符串地改写是替换而不是解码后再编码.
 * 使用 RFC 3986 定义的一些特性 parsing/formatting URIs:
 *     http://www.ietf.org/rfc/rfc3986.txt
 *
 * @author Leo.Zhang
 * @email zmike86@gmail.com
 */

define('@uri.util',
    [
        '@util',
        '@string.util',
        '@ua.util'
    ],
    function(util, string, ua) {

        'use strict';

        /**
         * 一些特殊的Character codes.
         * @enum {number}
         * @private
         */
        var CharCode_ = {
            AMPERSAND: 38, // &
            EQUAL: 61,     // =
            HASH: 35,      // #
            QUESTION: 63   // ?
        };


        /**
         * 由各个已编码的部分组建URI. 方法中不会对各部分编码.
         * @param {?string=} opt_scheme 协议 as 'http'.
         * @param {?string=} opt_userInfo The user name before the '@'.
         * @param {?string=} opt_domain 域诸如 'www.google.com', 已经编码.
         * @param {(string|number|null)=} opt_port 端口号.
         * @param {?string=} opt_path 已编码的路径. 如果不为空则必须以'/'开头.
         * @param {?string=} opt_queryData 查询字符串.
         * @param {?string=} opt_fragment hash片段.
         * @return {string} 返回合并后的URI.
         */
        var buildFromEncodedParts = function(opt_scheme, opt_userInfo,
                                             opt_domain, opt_port, opt_path, opt_queryData, opt_fragment) {
            var out = '';

            if (opt_scheme) {
                out += opt_scheme + ':';
            }

            if (opt_domain) {
                out += '//';

                if (opt_userInfo) {
                    out += opt_userInfo + '@';
                }

                out += opt_domain;

                if (opt_port) {
                    out += ':' + opt_port;
                }
            }

            if (opt_path) {
                out += opt_path;
            }

            if (opt_queryData) {
                out += '?' + opt_queryData;
            }

            if (opt_fragment) {
                out += '#' + opt_fragment;
            }

            return out;
        };


        /**
         * 一个用于分解URI的正则.
         * {@link http://www.ietf.org/rfc/rfc3986.txt} says in Appendix B
         * As the "first-match-wins" algorithm is identical to the "greedy"
         * disambiguation method used by POSIX regular expressions, it is natural and
         * commonplace to use a regular expression for parsing the potential five
         * components of a URI reference.
         *
         * 下面的正则表达式拆分了well-formed URI into its components.
         *
         * <pre>
         * ^(([^:/?#]+):)?(//([^/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?
         *  12            3  4          5       6  7        8 9
         * </pre>
         *
         * The numbers in the second line above are only to assist readability; they
         * indicate the reference points for each subexpression (i.e., each paired
         * parenthesis). We refer to the value matched for subexpression <n> as $<n>.
         * For example, matching the above expression to
         * <pre>
         *     http://www.ics.uci.edu/pub/ietf/uri/#Related
         * </pre>
         * results in the following subexpression matches:
         * <pre>
         *    $1 = http:
         *    $2 = http
         *    $3 = //www.ics.uci.edu
         *    $4 = www.ics.uci.edu
         *    $5 = /pub/ietf/uri/
         *    $6 = <undefined>
         *    $7 = <undefined>
         *    $8 = #Related
         *    $9 = Related
         * </pre>
         * where <undefined> indicates that the component is not present, as is the
         * case for the query component in the above example. Therefore, we can
         * determine the value of the five components as
         * <pre>
         *    scheme    = $2
         *    authority = $4
         *    path      = $5
         *    query     = $7
         *    fragment  = $9
         * </pre>
         *
         * The regular expression has been modified slightly to expose the
         * userInfo, domain, and port separately from the authority.
         * The modified version yields
         * <pre>
         *    $1 = http              scheme
         *    $2 = <undefined>       userInfo -\
         *    $3 = www.ics.uci.edu   domain    | authority
         *    $4 = <undefined>       port     -/
         *    $5 = /pub/ietf/uri/    path
         *    $6 = <undefined>       query without ?
         *    $7 = Related           fragment without #
         * </pre>
         * @type {!RegExp}
         * @private
         */
        var splitRe_ = new RegExp(
            '^' +
                '(?:' +
                '([^:/?#.]+)' +                     // scheme - ignore special characters
                                                    // used by other URL parts such as :, ?, /, #, and .
                ':)?' +
                '(?://' +
                '(?:([^/?#]*)@)?' +                 // userInfo
                '([^/#?]*?)' +                      // domain
                '(?::([0-9]+))?' +                  // port
                '(?=[/#?]|$)' +                     // authority-terminating character
                ')?' +
                '([^?#]+)?' +                       // path
                '(?:\\?([^#]*))?' +                 // query
                '(?:#(.*))?' +                      // fragment
                '$');


        /**
         * split方法返回的各部分的索引URI component.
         * @enum {number}
         */
        var ComponentIndex = {
            SCHEME: 1,
            USER_INFO: 2,
            DOMAIN: 3,
            PORT: 4,
            PATH: 5,
            QUERY_DATA: 6,
            FRAGMENT: 7
        };


        /**
         * 分解URI. 分解后的各个部分可以通过component indices获取;
         * 比如:
         * <pre>
         *     uri.utils.split(someStr)[CompontentIndex.QUERY_DATA];
         * </pre>
         * @param {string} uri URI字符串.
         * @return {!Array.<string|undefined>} 编码的各个部分.
         *     Each component that is present will contain the encoded value, whereas
         *     components that are not present will be undefined or empty, depending
         *     on the browser's regular expression implementation.  Never null, since
         *     arbitrary strings may still look like path names.
         */
        var split = function(uri) {
            phishingProtection_();

            // See @return comment -- never null.
            return /** @type {!Array.<string|undefined>} */ (
                uri.match(splitRe_));
        };


        /**
         * Safari有个bug: 如果你的http URL中含有用户名username, e.g.,
         * http://evil.com%2F@google.com/
         * Safari会将window.location.href表述成
         * http://evil.com/google.com/
         * 所以程序会解析出错误的域名. 有的漏洞就利用这点诱导safari加载钓鱼网站的资源.
         *
         * 为解决此问题, 我们做一个 "Safari phishing check", 当用户被钓鱼时抛出异常.
         * 何时何地做这样的检测. 在有人尝试在Webkit上解析URI的时候. 这种方法不完美但能解决问题.
         * 有朝一日Safari修复了这个bug则这些代码可以移除.
         * Exploit的发现者: Masato Kinugawa.
         *
         * 目前测试Safari6.0.1和Safari7.0都没有此问题了(zmike86)
         * 但是Mac的Safari更该用户代理字符串设置并不改变对dom的支持,所以该模式下浏览器的实现并不可靠.
         *
         * @type {boolean}
         * @private
         */
        var needsPhishingProtection_ = ua.isWEBKIT;


        /**
         * 检查由于上述safari的bug导致的用户是否被钓鱼 being phished.
         * @private
         */
        var phishingProtection_ = function() {
            if (needsPhishingProtection_) {
                // Turn protection off, so that we don't recurse.
                needsPhishingProtection_ = false;

                // Use quoted access, just in case the user isn't using location externs.
                var location = util.globa.location;
                if (location) {
                    var href = location.href;
                    if (href) {
                        var domain = getDomain(href);
                        if (domain && domain !== location.hostname) {
                            // Phishing attack
                            needsPhishingProtection_ = true;
                            throw Error();
                        }
                    }
                }
            }
        };


        /**
         * 解码
         * @param {?string} uri A possibly null string.
         * @return {?string} The string URI-decoded, or null if uri is null.
         * @private
         */
        var decodeIfPossible_ = function(uri) {
            return uri && decodeURIComponent(uri);
        };


        /**
         * 通过索引获得URI的各个部分.
         * It is preferred to use the getPathEncoded() variety of functions ahead,
         * since they are more readable.
         *
         * @param {ComponentIndex} componentIndex 索引.
         * @param {string} uri 操作的URI.
         * @return {?string} (默认为)编码后的component, 如果没有该部分则返回null.
         * @private
         */
        var getComponentByIndex_ = function(componentIndex, uri) {
            // 对不存在的值统一转化成null.
            return split(uri)[componentIndex] || null;
        };


        /**
         * 获取协议部分, 不包括:和／
         * @param {string} uri The URI to examine.
         * @return {?string} The protocol or scheme, or null if none.  Does not
         *     include trailing colons or slashes.
         */
        var getScheme = function(uri) {
            return getComponentByIndex_(ComponentIndex.SCHEME, uri);
        };


        /**
         * 获取真正的协议名称. 如果URL是相对地址则页面location的协议名会被指定.
         * @param {string} uri URI.
         * @return {string} 返回小写的协议名.
         */
        var getEffectiveScheme = function(uri) {
            var scheme = getScheme(uri);
            if (!scheme && window.location) {
                var protocol = window.location.protocol;
                scheme = protocol.substr(0, protocol.length - 1);
            }
            // NOTE: When called from a web worker in Firefox 3.5, location maybe null.
            // All other browsers with web workers support self.location from the worker.
            return scheme ? scheme.toLowerCase() : '';
        };


        /**
         * 获取用户信息部分
         * @param {string} uri URI.
         * @return {?string} The user name still encoded, or null if none.
         */
        var getUserInfoEncoded = function(uri) {
            return getComponentByIndex_(ComponentIndex.USER_INFO, uri);
        };


        /**
         * 获取用户信息部分
         * @param {string} uri URI.
         * @return {?string} The decoded user info, or null if none.
         */
        var getUserInfo = function(uri) {
            return decodeIfPossible_(getUserInfoEncoded(uri));
        };


        /**
         * 获取域名部分
         * @param {string} uri URI.
         * @return {?string} The domain name still encoded, or null if none.
         */
        var getDomainEncoded = function(uri) {
            return getComponentByIndex_(ComponentIndex.DOMAIN, uri);
        };


        /**
         * 获取域名部分
         * @param {string} uri The URI to examine.
         * @return {?string} The decoded domain, or null if none.
         */
        var getDomain = function(uri) {
            return decodeIfPossible_(getDomainEncoded(uri));
        };


        /**
         * 返回端口号
         * @param {string} uri The URI to examine.
         * @return {?number} The port number, or null if none.
         */
        var getPort = function(uri) {
            // 强制返回数字. 如果getComponentByIndex_返回null或者非数字, 前半部就是NaN.
            // 于是会返回null (though also zero, which isn't a relevant port number).
            return Number(getComponentByIndex_(ComponentIndex.PORT, uri)) || null;
        };


        /**
         * 获取路径部分
         * @param {string} uri The URI to examine.
         * @return {?string} 可能encoded, 没有则返回null. 带有开头的/.
         */
        var getPathEncoded = function(uri) {
            return getComponentByIndex_(ComponentIndex.PATH, uri);
        };


        /**
         * 获取路径部分
         * @param {string} uri The URI to examine.
         * @return {?string} 返回解码后的路径, 没有则返回null. 带有开头的/.
         */
        var getPath = function(uri) {
            return decodeIfPossible_(getPathEncoded(uri));
        };


        /**
         * 返回查询字符串部分
         * @param {string} uri The URI to examine.
         * @return {?string} 默认为是编码的, 没有则返回null. 返回部分不包括?部分.
         */
        var getQueryData = function(uri) {
            return getComponentByIndex_(ComponentIndex.QUERY_DATA, uri);
        };


        /**
         * 获取url的哈希部分.
         * @param {string} uri 检查URI.
         * @return {?string} 返回不包含#的部分或者null.
         */
        var getFragmentEncoded = function(uri) {
            // ＃不可能出现在URL的其他地方.
            var hashIndex = uri.indexOf('#');
            return hashIndex < 0 ? null : uri.substr(hashIndex + 1);
        };


        /**
         * 设置url的哈希部分.
         * @param {string} uri 检查URI.
         * @param {?string} fragment 编码后的哈希值, 不包含＃.
         * @return {string} The URI with the fragment set.
         */
        var setFragmentEncoded = function(uri, fragment) {
            return removeFragment(uri) + (fragment ? '#' + fragment : '');
        };


        /**
         * 获取未编码的url的哈希部分
         * @param {string} uri The URI to examine.
         * @return {?string} The decoded fragment identifier, or null if none.  Does
         *     not include the hash mark.
         */
        var getFragment = function(uri) {
            return decodeIfPossible_(getFragmentEncoded(uri));
        };


        /**
         * 返回host地址包含了端口的部分.
         * @param {string} uri The URI string.
         * @return {string} Everything up to and including the port.
         */
        var getHost = function(uri) {
            var pieces = split(uri);
            return buildFromEncodedParts(
                pieces[ComponentIndex.SCHEME],
                pieces[ComponentIndex.USER_INFO],
                pieces[ComponentIndex.DOMAIN],
                pieces[ComponentIndex.PORT]);
        };


        /**
         * 获取host部分后面的部分.
         * @param {string} uri The URI string.
         * @return {string} The URI, 从路径部分开始并且包括查询字符串和哈希部分.
         */
        var getPathAndAfter = function(uri) {
            var pieces = split(uri);
            return buildFromEncodedParts(null, null, null, null,
                pieces[ComponentIndex.PATH],
                pieces[ComponentIndex.QUERY_DATA],
                pieces[ComponentIndex.FRAGMENT]);
        };


        /**
         * 获取去掉hash部分的URI.
         * @param {string} uri The URI to examine.
         * @return {string} Everything preceding the hash mark.
         */
        var removeFragment = function(uri) {
            // The hash mark may not appear in any other part of the URL.
            var hashIndex = uri.indexOf('#');
            return hashIndex < 0 ? uri : uri.substr(0, hashIndex);
        };


        /**
         * 检查是否同源, 适合用于同源策略same-origin policy.
         * 同源指的协议、域名和端口都相等.
         * @param {string} uri1 The first URI.
         * @param {string} uri2 The second URI.
         * @return {boolean} 返回是否同源.
         */
        var haveSameDomain = function(uri1, uri2) {
            var pieces1 = split(uri1);
            var pieces2 = split(uri2);
            return pieces1[ComponentIndex.DOMAIN] === pieces2[ComponentIndex.DOMAIN] &&
                pieces1[ComponentIndex.SCHEME] === pieces2[ComponentIndex.SCHEME] &&
                pieces1[ComponentIndex.PORT] === pieces2[ComponentIndex.PORT];
        };


        /**
         * Asserts that there are no fragment or query identifiers, only in uncompiled
         * mode.
         * @param {string} uri The URI to examine.
         * @private
         */
        var assertNoFragmentsOrQueries_ = function(uri) {
            // NOTE: would use asserts here, but jscompiler doesn't know that
            // indexOf has no side effects.
            if (util.DEBUG && (uri.indexOf('#') >= 0 || uri.indexOf('?') >= 0)) {
                throw Error('uri.utils: Fragment or query identifiers are not supported: [' + uri + ']');
            }
        };


        /**
         * Supported query parameter values by the parameter serializing utilities.
         *
         * If a value is null or undefined, the key-value pair is skipped, as an easy
         * way to omit parameters conditionally.  Non-array parameters are converted
         * to a string and URI encoded.  Array values are expanded into multiple
         * &key=value pairs, with each element stringized and URI-encoded.
         *
         * @typedef {*}
         */
        var QueryValue;


        /**
         * An array representing a set of query parameters with alternating keys
         * and values.
         *
         * Keys are assumed to be URI encoded already and live at even indices.
         * See QueryValue for details on how parameter values are encoded.
         *
         * Example:
         * <pre>
         * var data = [
         *   // Simple param: ?name=BobBarker
         *   'name', 'BobBarker',
         *   // Conditional param -- may be omitted entirely.
         *   'specialDietaryNeeds', hasDietaryNeeds() ? getDietaryNeeds() : null,
         *   // Multi-valued param: &house=LosAngeles&house=NewYork&house=null
         *   'house', ['LosAngeles', 'NewYork', null]
         * ];
         * </pre>
         *
         * @typedef {!Array.<string|uri.utils.QueryValue>}
         */
        var QueryArray;


        /**
         * 对url附加额外的参数.
         * Appends a URI and query data in a string buffer with special preconditions.
         * @param {!Array.<string|undefined>} buffer 一个字符串的数组. 第一个参数必须是base URI,
         *     这个url可能含有哈希片段. 如果数组项多于一个, 第二个参数必须是&字符. Undefined的项会被当作空字符串.
         * @return {string} The concatenated URI and query data.
         * @private
         */
        var appendQueryData_ = function(buffer) {
            // 有第二个参数则表示有要加的参数
            if (buffer[1]) {
                // 需要检查连接符, 目前是&字符, 同时还要保证不要影响url中原有的哈希片段.
                var baseUri = /** @type {string} */ (buffer[0]);
                var hashIndex = baseUri.indexOf('#');
                // 有哈希则把hash部分移到数组最后
                if (hashIndex >= 0) {
                    buffer.push(baseUri.substr(hashIndex));
                    buffer[0] = baseUri = baseUri.substr(0, hashIndex);
                }
                var questionIndex = baseUri.indexOf('?');
                // 没有?则需要把连接符改成?
                if (questionIndex < 0) {
                    buffer[1] = '?';
                } else if (questionIndex === baseUri.length - 1) {
                    // Question mark is the very last character of the existing URI, so don't
                    // append an additional delimiter.
                    buffer[1] = undefined;
                }
            }

            return buffer.join('');
        };


        /**
         * 对数组附加key=value对, 支持一个key多个值.
         * @param {string} key The key prefix.
         * @param {QueryValue} value The value to serialize.
         * @param {!Array.<string>} pairs 一个存放字符串的数组用于附加 'key=value'.
         * @private
         */
        var appendKeyValuePairs_ = function(key, value, pairs) {
            // 数组
            if (util.isArray(value)) {
                for (var j = 0; j < value.length; j++) {
                    // Convert to string explicitly, to short circuit the null and array
                    // logic in this function -- this ensures that null and undefined get
                    // written as literal 'null' and 'undefined', and arrays don't get
                    // expanded out but instead encoded in the default way.
                    appendKeyValuePairs_(key, String(value[j]), pairs);
                }
            }
            // 跳过null和undefined
            else if (!util.isNull(value)) {
                pairs.push('&', key,
                    // 如果是空字符也不要加＝了, 与UriBuilder.java保持一致.
                    value === '' ? '' : '=', string.urlEncode(value));
            }
        };


        /**
         * 通过一个键值交替的字符串数组构建.
         * @param {!Array.<string|undefined>} buffer 一个字符串数组存储结果.  The
         *     first element appended will be an '&', and may be replaced by the caller.
         * @param {QueryArray|Arguments} keysAndValues -- see the typedef.
         * @param {number=} opt_startIndex 数组中开始的地方, 默认从头开始.
         * @return {!Array.<string|undefined>} The buffer argument.
         * @private
         */
        var buildQueryDataBuffer_ = function(buffer, keysAndValues, opt_startIndex) {
            // keysAndValues长度减去startIndex必须是偶数长度
            for (var i = opt_startIndex || 0; i < keysAndValues.length; i += 2) {
                appendKeyValuePairs_(keysAndValues[i], keysAndValues[i + 1], buffer);
            }

            return buffer;
        };


        /**
         * 构建查询字符串. 通过一个键值交替的字符串数组构建. 空值的话会产生 "&key&".
         * @param {QueryArray} keysAndValues 一个字符串数组,键值交替出现.
         * @param {number=} opt_startIndex 数组中开始的地方, 默认从头开始.
         * @return {string} 返回编码后的查询字符串, 如 'a=1&b=2'.
         */
        var buildQueryData = function(keysAndValues, opt_startIndex) {
            var buffer = buildQueryDataBuffer_([], keysAndValues, opt_startIndex);
            buffer[0] = ''; // Remove the leading ampersand.
            return buffer.join('');
        };


        /**
         * buildQueryDataFromMap方法的辅助函数.
         * @param {!Array.<string|undefined>} buffer A string buffer to append to.  The
         *     first element appended will be an '&', and may be replaced by the caller.
         * @param {Object.<QueryValue>} map An object where keys are
         *     URI-encoded parameter keys, and the values conform to the contract
         *     specified in the QueryValue typedef.
         * @return {!Array.<string|undefined>} The buffer argument.
         * @private
         */
        var buildQueryDataBufferFromMap_ = function(buffer, map) {
            for (var key in map) {
                appendKeyValuePairs_(key, map[key], buffer);
            }
            return buffer;
        };


        /**
         * 从一个map构建查询字符串. 空字符串会产生 "&key&".
         * @param {Object} map An object where keys are URI-encoded parameter keys,
         *     and the values are arbitrary types or arrays.  Keys with a null value
         *     are dropped.
         * @return {string} 返回编码后的查询字符串,格式如下'a=1&b=2'.
         */
        var buildQueryDataFromMap = function(map) {
            var buffer = buildQueryDataBufferFromMap_([], map);
            buffer[0] = '';
            return buffer.join('');
        };


        /**
         * 对已有的url添加新的query参数.
         * The variable arguments may contain alternating keys and values.
         * Keys被假定成编码过后的, 但是values应该在这个函数中进行编码.
         * <pre>
         * appendParams('http://www.foo.com?existing=true',
         *     'key1', 'value1',
         *     'key2', 'value?willBeEncoded',
         *     'key3', ['valueA', 'valueB', 'valueC'],
         *     'key4', null);
         * result: 'http://www.foo.com?existing=true&' +
         *     'key1=value1&' +
         *     'key2=value%3FwillBeEncoded&' +
         *     'key3=valueA&key3=valueB&key3=valueC'
         * </pre>
         *
         * A single call to this function will not exhibit quadratic behavior in IE,
         * whereas multiple repeated calls may, although the effect is limited by
         * fact that URL's generally can't exceed 2kb.
         *
         * @param {string} uri 原始的url或许已经有了参数.
         * @param {...(QueryArray|string|QueryValue)} var_args
         *     An array or argument list conforming to QueryArray.
         * @return {string} The URI with all query parameters added.
         */
        var appendParams = function(uri, var_args) {
            return appendQueryData_(
                arguments.length === 2 ?
                    buildQueryDataBuffer_([uri], arguments[1], 0) :
                    buildQueryDataBuffer_([uri], arguments, 1));
        };


        /**
         * Appends query parameters from a map.
         *
         * @param {string} uri The original URI, which may already have query data.
         * @param {Object} map An object where keys are URI-encoded parameter keys,
         *     and the values are arbitrary types or arrays.  Keys with a null value
         *     are dropped.
         * @return {string} The new parameters.
         */
        var appendParamsFromMap = function(uri, map) {
            return appendQueryData_(buildQueryDataBufferFromMap_([uri], map));
        };


        /**
         * Appends a single URI parameter.
         *
         * Repeated calls to this can exhibit quadratic behavior in IE6 due to the
         * way string append works, though it should be limited given the 2kb limit.
         *
         * @param {string} uri The original URI, which may already have query data.
         * @param {string} key The key, which must already be URI encoded.
         * @param {*=} opt_value The value, which will be stringized and encoded
         *     (assumed not already to be encoded).  If omitted, undefined, or null, the
         *     key will be added as a valueless parameter.
         * @return {string} The URI with the query parameter added.
         */
        var appendParam = function(uri, key, opt_value) {
            var paramArr = [uri, '&', key];
            if (util.isDef(opt_value) && !util.isNull(opt_value)) {
                paramArr.push('=', string.urlEncode(opt_value));
            }
            return appendQueryData_(paramArr);
        };


        /**
         * 找寻查询字符串中下一个给定名字的参数.
         * 不初始化任何对象.
         * @param {string} uri URI. 如果指定了opt_hashIndex说明包含哈希片段.
         * @param {number} startIndex 开始找寻的索引处.
         * @param {string} keyEncoded 编码后的key.
         * @param {number} hashOrEndIndex 搜寻的截至位置. 一般是#出现的位置,没有哈希片段的话则是字符串的长度.
         * @return {number} The position of the first character in the key's name,
         *     immediately after either a question mark or a dot.
         * @private
         */
        var findParam_ = function(uri, startIndex, keyEncoded, hashOrEndIndex) {
            var index = startIndex;
            var keyLength = keyEncoded.length;

            // 分析url中键值周围的字符是否符合要求,通过正则来做开销比较大.
            while ((index = uri.indexOf(keyEncoded, index)) >= 0 &&
                index < hashOrEndIndex) {
                var precedingChar = uri.charCodeAt(index - 1);
                // Ensure that the preceding character is '&' or '?'.
                if (precedingChar === CharCode_.AMPERSAND ||
                    precedingChar === CharCode_.QUESTION) {
                    // Ensure the following character is '&', '=', '#', or NaN
                    // (end of string).
                    var followingChar = uri.charCodeAt(index + keyLength);
                    if (!followingChar ||
                        followingChar === CharCode_.EQUAL ||
                        followingChar === CharCode_.AMPERSAND ||
                        followingChar === CharCode_.HASH) {
                        return index;
                    }
                }
                index += keyLength + 1;
            }

            return -1;
        };


        /**
         * 匹配＃否则就是uri的结尾处.
         * @type {RegExp}
         * @private
         */
        var hashOrEndRe_ = /#|$/;


        /**
         * 确定URI中是否含有指定的key. 函数中没有对象的初始化.
         * @param {string} uri 处理的URI. 可能含有哈希片段.
         * @param {string} keyEncoded The URI-encoded key.  Case-sensitive.
         * @return {boolean} Whether the key is present.
         */
        var hasParam = function(uri, keyEncoded) {
            return findParam_(uri, 0, keyEncoded, uri.search(hashOrEndRe_)) >= 0;
        };


        /**
         * 获取一个参数的第一个值.
         * @param {string} uri 要处理的URI,可能会含有hash.
         * @param {string} keyEncoded 编码后的key.
         * @return {?string} 返回第一个解码后的参数值或者没有就返回null.
         */
        var getParamValue = function(uri, keyEncoded) {
            var hashOrEndIndex = uri.search(hashOrEndRe_);
            var foundIndex = findParam_(uri, 0, keyEncoded, hashOrEndIndex);

            if (foundIndex < 0) {
                return null;
            } else {
                var endPosition = uri.indexOf('&', foundIndex);
                if (endPosition < 0 || endPosition > hashOrEndIndex) {
                    endPosition = hashOrEndIndex;
                }
                // Progress forth to the end of the "key=" or "key&" substring.
                foundIndex += keyEncoded.length + 1;
                // Use substr, because it (unlike substring) will return empty string
                // if foundIndex > endPosition.
                return string.urlDecode(uri.substr(foundIndex, endPosition - foundIndex));
            }
        };


        /**
         * Gets all values of a query parameter.
         * @param {string} uri The URI to process.  May contain a framgnet.
         * @param {string} keyEncoded The URI-encoded key.  Case-snsitive.
         * @return {!Array.<string>} All URI-decoded values with the given key.
         *     If the key is not found, this will have length 0, but never be null.
         */
        var getParamValues = function(uri, keyEncoded) {
            var hashOrEndIndex = uri.search(hashOrEndRe_);
            var position = 0;
            var foundIndex;
            var result = [];

            while ((foundIndex = findParam_(uri, position, keyEncoded, hashOrEndIndex)) >= 0) {
                // Find where this parameter ends, either the '&' or the end of the
                // query parameters.
                position = uri.indexOf('&', foundIndex);
                if (position < 0 || position > hashOrEndIndex) {
                    position = hashOrEndIndex;
                }

                // Progress forth to the end of the "key=" or "key&" substring.
                foundIndex += keyEncoded.length + 1;
                // Use substr, because it (unlike substring) will return empty string
                // if foundIndex > position.
                result.push(string.urlDecode(uri.substr(foundIndex, position - foundIndex)));
            }

            return result;
        };


        /**
         * Regexp to find trailing question marks and ampersands.
         * @type {RegExp}
         * @private
         */
        var trailingQueryPunctuationRe_ = /[?&]($|#)/;


        /**
         * Removes all instances of a query parameter.
         * @param {string} uri The URI to process.  Must not contain a fragment.
         * @param {string} keyEncoded The URI-encoded key.
         * @return {string} The URI with all instances of the parameter removed.
         */
        var removeParam = function(uri, keyEncoded) {
            var hashOrEndIndex = uri.search(hashOrEndRe_);
            var position = 0;
            var foundIndex;
            var buffer = [];

            // Look for a query parameter.
            while ((foundIndex = findParam_(
                uri, position, keyEncoded, hashOrEndIndex)) >= 0) {
                // Get the portion of the query string up to, but not including, the ?
                // or & starting the parameter.
                buffer.push(uri.substring(position, foundIndex));
                // Progress to immediately after the '&'.  If not found, go to the end.
                // Avoid including the hash mark.
                position = Math.min((uri.indexOf('&', foundIndex) + 1) || hashOrEndIndex,
                    hashOrEndIndex);
            }

            // Append everything that is remaining.
            buffer.push(uri.substr(position));

            // Join the buffer, and remove trailing punctuation that remains.
            return buffer.join('').replace(trailingQueryPunctuationRe_, '$1');
        };


        /**
         * Replaces all existing definitions of a parameter with a single definition.
         *
         * Repeated calls to this can exhibit quadratic behavior due to the need to
         * find existing instances and reconstruct the string, though it should be
         * limited given the 2kb limit.  Consider using appendParams to append multiple
         * parameters in bulk.
         *
         * @param {string} uri The original URI, which may already have query data.
         * @param {string} keyEncoded The key, which must already be URI encoded.
         * @param {*} value The value, which will be stringized and encoded (assumed
         *     not already to be encoded).
         * @return {string} The URI with the query parameter added.
         */
        var setParam = function(uri, keyEncoded, value) {
            return appendParam(removeParam(uri, keyEncoded), keyEncoded, value);
        };


        /**
         * Generates a URI path using a given URI and a path with checks to
         * prevent consecutive "//". The baseUri passed in must not contain
         * query or fragment identifiers. The path to append may not contain query or
         * fragment identifiers.
         *
         * @param {string} baseUri URI to use as the base.
         * @param {string} path Path to append.
         * @return {string} Updated URI.
         */
        var appendPath = function(baseUri, path) {
            assertNoFragmentsOrQueries_(baseUri);

            // Remove any trailing '/'
            if (string.endsWith(baseUri, '/')) {
                baseUri = baseUri.substr(0, baseUri.length - 1);
            }
            // Remove any leading '/'
            if (string.startsWith(path, '/')) {
                path = path.substr(1);
            }
            return string.buildString(baseUri, '/', path);
        };


        /**
         * Standard supported query parameters.
         * @enum {string}
         */
        var StandardQueryParam = {
            /** Unused parameter for unique-identifying. */
            RANDOM: 'zx'
        };


        /**
         * Sets the zx parameter of a URI to a random value.
         * @param {string} uri Any URI.
         * @return {string} That URI with the "zx" parameter added or replaced to
         *     contain a random string.
         */
        var makeUnique = function(uri) {
            return setParam(uri, StandardQueryParam.RANDOM, string.getRandomString());
        };


        return {
            buildFromEncodedParts: buildFromEncodedParts,
            ComponentIndex: ComponentIndex,
            split: split,
            getScheme: getScheme,
            getEffectiveScheme: getEffectiveScheme,
            getUserInfoEncoded: getUserInfoEncoded,
            getUserInfo: getUserInfo,
            getDomainEncoded: getDomainEncoded,
            getDomain: getDomain,
            getPort: getPort,
            getPathEncoded: getPathEncoded,
            getPath: getPath,
            getQueryData: getQueryData,
            getFragmentEncoded: getFragmentEncoded,
            setFragmentEncoded: setFragmentEncoded,
            getFragment: getFragment,
            getHost: getHost,
            getPathAndAfter: getPathAndAfter,
            removeFragment: removeFragment,
            haveSameDomain: haveSameDomain,
            buildQueryData: buildQueryData,
            buildQueryDataFromMap: buildQueryDataFromMap,
            appendParams: appendParams,
            appendParamsFromMap: appendParamsFromMap,
            appendParam: appendParam,
            hasParam: hasParam,
            getParamValue: getParamValue,
            getParamValues: getParamValues,
            removeParam: removeParam,
            setParam: setParam,
            appendPath: appendPath,
            StandardQueryParam: StandardQueryParam,
            makeUnique: makeUnique
        };
    }
);