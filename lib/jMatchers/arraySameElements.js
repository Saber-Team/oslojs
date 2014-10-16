/**
 * @fileoverview 针对jasmine扩展一个比较数组元素相等的匹配器,不考虑元素在数组中的位置.
 *     匹配器的写法见: http://jasmine.github.io/edge/custom_matcher.html
 * @modified Leo.Zhang
 * @email zmike86@gmail.com
 * @type {Object}
 */

var arraySameElements = {
    toEqualArrayItem: function(util, customEqualityTesters) {
        return {
            compare: function(actual, expected) {

                if (!Sogou || !Sogou.Util)
                    throw 'We need Sogou.Util to help testing';

                if (!Sogou || !Sogou.Array)
                    throw 'We need Sogou.Array to help testing';

                var result = {
                    pass: true
                };

                if (!Sogou.Util.isArrayLike(actual) || !Sogou.Util.isArrayLike(expected)) {
                    result.pass = false;
                } else if (actual.length !== expected.length) {
                    result.pass = false;
                } else {
                    var toFind = Sogou.Array.toArray(expected);
                    var index;
                    for(var i = 0; i < actual.length; ++i) {
                        index = Sogou.Array.indexOf(toFind, actual[i]);
                        if (index === -1) {
                            result.pass = false;
                            break;
                        }
                        toFind.splice(index, 1);
                    }
                }

                if (result.pass) {
                    result.message = "Expected " + actual + "'s items to be equal to " + expected + "'s items.";
                } else {
                    result.message = "Expected " + actual + "'s items to be equal to " + expected + "'s items, but it do not";
                }

                return result;
            }
        }
    }
};