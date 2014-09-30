/**
 * @fileoverview 操作字符串的方法.
 * @modified Leo.Zhang
 * @email zmike86@gmail.com
 */

define('Sogou.String.Util',
    ['Sogou.Util'],
    function(util) {

        'use strict';

        /**
         * 比较版本号.
         * @param {string|number|boolean} left
         * @param {string|number|boolean} right
         * @return {number}  1 if left is higher.
         *                   0 if arguments are equal.
         *                  -1 if right is higher.
         * @private
         */
        function compareElements_(left, right) {
            if (left < right) return -1;
            else if (left > right) return 1;
            return 0;
        }

        /**
         * 连接多个字符串. 浏览器用'+'做字符串拼接不是很高效. null和undefined会被过滤掉.
         * 其他形参需要确保都转化成string类型.
         * 例如:
         * <pre>
         *     buildString('a', 'b', 'c', 'd') -> 'abcd'
         *     buildString(null, undefined) -> ''
         * </pre>
         * @param {...*} var_args 形参数列. 非字符串会被js引擎做类型转换.
         * @return {string} 合并结果.
         */
        function buildString(var_args) {
            return Array.prototype.join.call(arguments, '');
        }

        /**
         * 一个用于正则的字符串含有一些未转义字符会引起错误.将这些字符转义.
         * @param {*} s 字符串.
         * @return {string} 返回对症则安全的字符串.
         */
        function regExpEscape(s) {
            return String(s).replace(/([-()\[\]{}+?*.$\^|,:#<!\\])/g, '\\$1').
                replace(/\x08/g, '\\x08'); // ascii码\x08是退格
        }

        /**
         * 去掉字符串左右空白.
         * @param {string} str 操作字符串.
         * @return {string}
         */
        function trim(str) {
            // IE在正则中使用\s并不包含&nbsp;这样的空格,也称为non-breaking-space(0xa0),
            // (ECMAScript spec section 7.2), 所以手动包含进来保证跨浏览器的兼容性.
            return str.replace(/^[\s\xa0]+|[\s\xa0]+$/g, '');
        }

        /**
         * 去除左侧空格.
         * @param {string} str 操作字符串.
         * @return {string}
         */
        function trimLeft(str) {
            return str.replace(/^[\s\xa0]+/, '');
        }

        /**
         * 去除右侧空格.
         * @param {string} str 操作字符串.
         * @return {string}
         */
        function trimRight(str) {
            return str.replace(/[\s\xa0]+$/, '');
        }

        /**
         * 转义用
         * @type {RegExp}
         * @private
         */
        var amperRe_ = /&/g;

        /**
         * 转义用
         * @type {RegExp}
         * @private
         */
        var ltRe_ = /</g;

        /**
         * 转义用
         * @type {RegExp}
         * @private
         */
        var gtRe_ = />/g;

        /**
         * 转义用
         * @type {RegExp}
         * @private
         */
        var quotRe_ = /\"/g;

        /**
         * 转义用
         * @type {RegExp}
         * @private
         */
        var allRe_ = /[&<>\"]/;

        /**
         * 忽略大小写比较两个字符串是否相等.
         * @param {string} str1 字符串1.
         * @param {string} str2 字符串2.
         * @return {boolean}
         */
        function caseInsensitiveEquals(str1, str2) {
            return str1.toLowerCase() === str2.toLowerCase();
        }

        /**
         * 转义一些诸如'"', '&', '<', '>'的字符,让双引号内的字符串即便包含这些字符也能
         * 作为HTML标签的属性值.
         * 在html和XML中 > 是不需要转义的,但这里仍然需要转义是为了其他方法实现上的一致性.
         *
         * 注意:
         * HtmlEscape这个方法一般用在生成大规模html片段的时候,
         * 大型app使用静态正则表达式匹配字符串是一种优化技术,可以节省IE中的一半时间,因为字符串
         * 和正则表达式都会引起GC的分配回收.
         *
         * 转义前测试是否含有特殊字符会增加函数调用次数,但是测试发现实际上有助于提升平均速度.
         * 因为平均情况很少含有全部4个特殊字符,并且indexOf比replace更快. 最坏情况确实会有更多
         * 的函数调用,所以可以传参指定是否字符串中含有4个需转义字符.
         *
         * 测试结果(times tended to fluctuate +-0.05ms):
         *                                     FireFox                     IE6
         * (no chars / average (mix of cases) / all 4 chars)
         * no checks                     0.13 / 0.22 / 0.22         0.23 / 0.53 / 0.80
         * indexOf                       0.08 / 0.17 / 0.26         0.22 / 0.54 / 0.84
         * indexOf + re test             0.07 / 0.17 / 0.28         0.19 / 0.50 / 0.85
         *
         * 另外检查是否需要替换也可以减少对象的内存分配，当APP规模增长的时候差别就会体现出来。
         *
         * @param {string} str 要转义的字符串
         * @param {boolean=} opt_isLikelyToContainHtmlChars 不要检查是否含有特殊字符,如果确认
         *     特殊字符会多次出现的话就用这个参数.如果字符串很少几率出现html字符就默认不传这个参数.
         * @return {string} 转义后的字符串.
         */
        function htmlEscape(str, opt_isLikelyToContainHtmlChars) {
            if (opt_isLikelyToContainHtmlChars) {
                return str.replace(amperRe_, '&amp;')
                    .replace(ltRe_, '&lt;')
                    .replace(gtRe_, '&gt;')
                    .replace(quotRe_, '&quot;');
            } else {
                // 快速测试是否含有特殊字符, 最坏情况this makes barely a difference to the time taken
                if (!allRe_.test(str))
                    return str;

                // str.indexOf比regex.test快
                if (str.indexOf('&') !== -1)
                    str = str.replace(amperRe_, '&amp;');
                if (str.indexOf('<') !== -1)
                    str = str.replace(ltRe_, '&lt;');
                if (str.indexOf('>') !== -1)
                    str = str.replace(gtRe_, '&gt;');
                if (str.indexOf('"') !== -1)
                    str = str.replace(quotRe_, '&quot;');
                return str;
            }
        }

        /**
         * 字符串替代函数.
         * subs("foo%s hot%s", "bar", "dog") ==> "foobar hotdog".
         * @param {string} str 包含特定模式的字符串.
         * @param {...*} var_args 形参是代替项的数列.
         * @return {string} 原字符串中的％s会被逐一代替. 返回一个新的字符串.
         */
        function subs(str, var_args) {
            var splitParts = str.split('%s');
            var returnString = '';
            // 得到替代数列
            var subsArguments = Array.prototype.slice.call(arguments, 1);
            while (subsArguments.length &&
                // 循环代替知道split部分只剩下一项.
                // 在分裂的各部分间插入代替数列项.
                splitParts.length > 1) {
                returnString += splitParts.shift() + subsArguments.shift();
            }

            return returnString + splitParts.join('%s'); // 连接未用的'%s'
        }

        // exports
        return {
            /**
             * 串头检测.
             * @param {string} str 要检测的字符串.
             * @param {string} prefix 匹配的串头.
             * @return {boolean} 返回串头是否匹配.
             */
            startsWith: function(str, prefix) {
                return str.lastIndexOf(prefix, 0) === 0;
            },
            /**
             * 串尾检测.
             * @param {string} str The string to check.
             * @param {string} suffix A string to look for at the end of {@code str}.
             * @return {boolean} True if {@code str} ends with {@code suffix}.
             */
            endsWith: function(str, suffix) {
                var l = str.length - suffix.length;
                return l >= 0 && str.indexOf(suffix, l) === l;
            },
            /**
             * 检查字符串是否只包含空白符或长度为零.
             * @param {string} str 测试字符串.
             * @return {boolean} 是否为空.
             */
            isEmpty: function(str) {
                // 直接测试length === 0在所有浏览器中结果较慢(about the same in Opera).
                // 正则这么写的原因可以看trim方法.
                return /^[\s\xa0]*$/.test(str);
            },
            /**
             * 把字符串中的换行回车符替换成空格,多个换行会被替换成单一空格.
             * @param {string} str 操作字符串.
             * @return {string} 操作结果.
             */
            stripNewlines: function(str) {
                return str.replace(/(\r\n|\r|\n)+/g, ' ');
            },
            caseInsensitiveEquals: caseInsensitiveEquals,
            /**
             * 用unix的换行符\n代替Windows和Mac上的换行符: \r or \r\n.
             * @param {string} str 需要标准化的字符串.
             * @return {string} 标准化后的字符串.
             */
            canonicalizeNewlines: function(str) {
                return str.replace(/(\r\n|\r|\n)/g, '\n');
            },
            /**
             * URL-encodes a string
             * @param {*} str The string to url-encode.
             * @return {string} 返回对url安全的编码字符串. 具体的编码规则查看encodeURIComponent
             *     ('#', ':', 和其他的url中有特殊意义的关键字符都会被编码).
             */
            urlEncode: function(str) {
                return encodeURIComponent(String(str));
            },
            /**
             * URL-decodes the string. 需要特殊处理 '+'s js本身不会将 '+'转化为空格.
             * @param {string} str 要解码的字符串.
             * @return {string} 解码后的字符串.
             */
            urlDecode: function(str) {
                return decodeURIComponent(str.replace(/\+/g, ' '));
            },
            /**
             * 转化 \n 至 <br>s 或者 <br />.
             * @param {string} str The string in which to convert newlines.
             * @param {boolean=} opt_xml 是否要用兼容XML的标签.
             * @return {string} 转化后的字符串.
             */
            newLineToBr: function(str, opt_xml) {
                return str.replace(/(\r\n|\r|\n)/g, opt_xml ? '<br />' : '<br>');
            },
            htmlEscape: htmlEscape,
            buildString: buildString,
            subs: subs,
            /**
             * 把字符串从选择器形式改为驼峰形式(比如 "multi-part-string" ==> "multiPartString"),
             * 主要用于js设置获取属性。
             * @param {string} str The string in selector-case form.
             * @return {string} The string in camelCase form.
             */
            toCamelCase: function(str) {
                return String(str).replace(/\-([a-z])/g, function(all, match) {
                    return match.toUpperCase();
                });
            },
            /**
             * 转化字符串成为TitleCase. 每个单独的单词首个字母都会大写,单词以空格分割. 支持自定义分隔符,会覆盖默认的空格,
             * 这时候如需要空格符要手动引入.
             *
             * Default delimiter => " ":
             *    toTitleCase('oneTwoThree')    => 'OneTwoThree'
             *    toTitleCase('one two three')  => 'One Two Three'
             *    toTitleCase('  one   two   ') => '  One   Two   '
             *    toTitleCase('one_two_three')  => 'One_two_three'
             *    toTitleCase('one-two-three')  => 'One-two-three'
             *
             * Custom delimiter => "_-.":
             *    toTitleCase('oneTwoThree', '_-.')       => 'OneTwoThree'
             *    toTitleCase('one two three', '_-.')     => 'One two three'
             *    toTitleCase('  one   two   ', '_-.')    => '  one   two   '
             *    toTitleCase('one_two_three', '_-.')     => 'One_Two_Three'
             *    toTitleCase('one-two-three', '_-.')     => 'One-Two-Three'
             *    toTitleCase('one...two...three', '_-.') => 'One...Two...Three'
             *    toTitleCase('one. two. three', '_-.')   => 'One. two. three'
             *    toTitleCase('one-two.three', '_-.')     => 'One-Two.Three'
             *
             * @param {string} str 驼峰式字符串.
             * @param {string=} opt_delimiters 自定义分隔符.
             * @return {string} String value in TitleCase form.
             */
            toTitleCase: function(str, opt_delimiters) {
                var delimiters = util.isString(opt_delimiters) ? regExpEscape(opt_delimiters) : '\\s';

                // For IE8, we need to prevent using an empty character set. Otherwise,
                // incorrect matching will occur.
                delimiters = delimiters ? '|[' + delimiters + ']+' : '';

                var regexp = new RegExp('(^' + delimiters + ')([a-z])', 'g');
                return str.replace(regexp, function(all, p1, p2) {
                    return p1 + p2.toUpperCase();
                });
            },
            trim: trim,
            trimLeft: trimLeft,
            trimRight: trimRight,
            /**
             * 测试字符串是否包含某个子串.
             * @param {string} s 测试字符串.
             * @param {string} ss 子串.
             * @return {boolean}
             */
            contains: function(s, ss) {
                return s.indexOf(ss) !== -1;
            },
            /**
             * 生成一个至少64-bits的随即字符串.
             * 不要依赖random函数,由随机算法和时间戳异或组合得到随机字符串,输出base-36的编码让结果更短.
             * @return {string} 返回举例. sn1s7vb4gcic.
             */
            getRandomString: function() {
                var x = 2147483648; // +2e31
                return Math.floor(Math.random() * x).toString(36) +
                    Math.abs(Math.floor(Math.random() * x) ^ (+new Date())).toString(36);
            },
            /**
             * 比较两个版本号.
             * @param {string|number} version1
             * @param {string|number} version2
             * @return {number}  1 if {@code version1} is higher.
             *                   0 if arguments are equal.
             *                  -1 if {@code version2} is higher.
             */
            compareVersions: function(version1, version2) {
                var order = 0;
                // Trim leading and trailing whitespace and split the versions into
                // subversions.
                var v1Subs = trim('' + version1).split('.');
                var v2Subs = trim('' + version2).split('.');
                var subCount = Math.max(v1Subs.length, v2Subs.length);

                // Iterate over the subversions, as long as they appear to be equivalent.
                for (var subIdx = 0; order === 0 && subIdx < subCount; subIdx++) {
                    var v1Sub = v1Subs[subIdx] || '';
                    var v2Sub = v2Subs[subIdx] || '';

                    // Split the subversions into pairs of numbers and qualifiers (like 'b').
                    // Two different RegExp objects are needed because they are both using
                    // the 'g' flag.
                    var v1CompParser = new RegExp('(\\d*)(\\D*)', 'g');
                    var v2CompParser = new RegExp('(\\d*)(\\D*)', 'g');
                    do {
                        var v1Comp = v1CompParser.exec(v1Sub) || ['', '', ''];
                        var v2Comp = v2CompParser.exec(v2Sub) || ['', '', ''];
                        // Break if there are no more matches.
                        if (v1Comp[0].length === 0 && v2Comp[0].length === 0) {
                            break;
                        }

                        // Parse the numeric part of the subversion. A missing number is
                        // equivalent to 0.
                        var v1CompNum = v1Comp[1].length === 0 ? 0 : parseInt(v1Comp[1], 10);
                        var v2CompNum = v2Comp[1].length === 0 ? 0 : parseInt(v2Comp[1], 10);

                        // Compare the subversion components. The number has the highest
                        // precedence. Next, if the numbers are equal, a subversion without any
                        // qualifier is always higher than a subversion with any qualifier. Next,
                        // the qualifiers are compared as strings.
                        order = compareElements_(v1CompNum, v2CompNum) ||
                            compareElements_(v1Comp[2].length === 0, v2Comp[2].length === 0) ||
                            compareElements_(v1Comp[2], v2Comp[2]);
                        // Stop as soon as an inequality is discovered.
                    } while (order == 0);
                }

                return order;
            }
        };
    }
);