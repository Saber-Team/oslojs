/**
 * @fileoverview 针对jasmine扩展一个数组比较相等的匹配器.
 *     匹配器的写法见: http://jasmine.github.io/edge/custom_matcher.html
 * @modified Leo.Zhang
 * @email zmike86@gmail.com
 * @type {Object}
 */

var arrayEqual = {
    toEqualArray: function(util, customEqualityTesters) {
        return {
            compare: function(actual, expected) {
                var result = {
                    pass: true
                };

                var toString = {}.toString;
                if (toString.call(actual) !== '[object Array]' ||
                    toString.call(expected) !== '[object Array]') {
                    result.pass = false;
                } else if (actual.length !== expected.length) {
                    result.pass = false;
                } else {
                    for(var i = 0; i < actual.length; ++i) {
                        if (actual[i] != expected[i]) {
                            result.pass = false;
                            break;
                        }
                    }
                }

                if (result.pass) {
                    result.message = "Expected " + actual + " to be equal to " + expected;
                } else {
                    result.message = "Expected " + actual + " to be equal to " + expected + ", but it do not";
                }

                return result;
            }
        }
    }
};