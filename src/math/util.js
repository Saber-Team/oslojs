/**
 * @fileoverview 数学相关的函数. 都在math包里
 * @modified Leo.Zhang
 * @email zmike86@gmail.com
 */

define('Sogou.Math.Util',
    ['Sogou.Array'],
    function(array) {

        'use strict';

        /**
         * 给定一个整数, 返回一个大于等于0 小于此整数{@code a}的随机整数值.
         * @param {number} a 随机数上界 (exclusive).
         * @return {number} 随机数 0 <= N < a.
         */
        function randomInt(a) {
            return Math.floor(Math.random() * a);
        }

        /**
         * 给定上下界, 返回大于等于a小于b的随机值(非整型 float).
         * @param {number} a 随机数下界 (inclusive).
         * @param {number} b 随机数上界 (exclusive).
         * @return {number} 随机数 a <= N < b.
         */
        function uniformRandom(a, b) {
            return a + Math.random() * (b - a);
        }

        /**
         * 给定一个边界值,输入值若在其中则返回原值,否则返回范围内在数轴上离此值最近的数.(clamp本义是夹板)
         * @param {number} value 输入的数字.
         * @param {number} min 下界.
         * @param {number} max 上界.
         * @return {number} 若数字在界内则返回否则返回邻近的界值.
         */
        function clamp(value, min, max) {
            return Math.min(Math.max(value, min), max);
        }

        /**
         * 求余操作符%在js中返回a/b的余数,但和其他语言不同,余数一定是和被除数同号.
         * 举例, -1 % 8 == -1, 而其他语言的结果是7(Python).
         * 这个函数模拟了正确的求模行为(modulo behavior), 这对于在循环队列中计算偏移量很有用.
         * @param {number} a 被除数.
         * @param {number} b 除数.
         * @return {number} a % b的结果应在如下范围 0 and b(不论0 <= x < b或b < x <= 0, 由b的符号决定).
         */
        function modulo(a, b) {
            var r = a % b;
            // If r and b differ in sign, add b to wrap the result to the correct sign.
            return (r * b < 0) ? r + b : r;
        }

        /**
         * Performs linear interpolation between values a and b. Returns the value
         * between a and b proportional to x (when x is between 0 and 1. When x is
         * outside this range, the return value is a linear extrapolation).
         * @param {number} a A number.
         * @param {number} b A number.
         * @param {number} x The proportion between a and b.
         * @return {number} The interpolated value between a and b.
         */
        function lerp(a, b, x) {
            return a + x * (b - a);
        }

        /**
         * 测试两个数值是否近似相等,js中全部是浮点数表示,进行运算时会产生计算误差.
         * @param {number} a 操作数1.
         * @param {number} b 操作数2.
         * @param {number=} opt_tolerance 误差范围. 默认0.000001.
         * @return {boolean} 是否a与b近似相等.
         */
        function nearlyEquals(a, b, opt_tolerance) {
            return Math.abs(a - b) <= (opt_tolerance || 0.000001);
        }

        /**
         * 对于一个角度值标准化其为[0-360).
         * 负值会变成正数, 大于360度的会被限定在360之内(modulo 360).
         * @param {number} angle 角度.
         * @return {number}
         */
        function standardAngle(angle) {
            return modulo(angle, 360);
        }

        /**
         * 角度转化为弧度.
         * @param {number} angleDegrees 角度.
         * @return {number} 弧度.
         */
        function toRadians(angleDegrees) {
            return angleDegrees * Math.PI / 180;
        }

        /**
         * 弧度转化为角度.
         * @param {number} angleRadians 弧度.
         * @return {number} 角度.
         */
        function toDegrees(angleRadians) {
            return angleRadians * 180 / Math.PI;
        }

        /**
         * 给定一个角度和半径, 取得X轴的位置.
         * @param {number} degrees 角度(zero points in +X direction).
         * @param {number} radius 半径.
         * @return {number} The x-distance for the angle and radius.
         */
        function angleDx(degrees, radius) {
            return radius * Math.cos(toRadians(degrees));
        }

        /**
         * 给定一个角度和半径, 取得Y轴的位置.
         * @param {number} degrees 角度(zero points in +X direction).
         * @param {number} radius 半径.
         * @return {number} The y-distance for the angle and radius.
         */
        function angleDy(degrees, radius) {
            return radius * Math.sin(toRadians(degrees));
        }

        /**
         * 计算两个点之间连线的角度值(x1,y1)和(x2,y2).
         * Math.atan和Math.atan2返回的都是一个弧度表示的角度值.
         * Angle zero points in the +X direction, 90 degrees points in the +Y
         * direction (down) and from there we grow clockwise towards 360 degrees.
         * @param {number} x1 x of first point.
         * @param {number} y1 y of first point.
         * @param {number} x2 x of second point.
         * @param {number} y2 y of second point.
         * @return {number} 标准化过的向量的角度值(x1,y1 to x2,y2).
         */
        function angle(x1, y1, x2, y2) {
            return standardAngle(toDegrees(Math.atan2(y2 - y1, x2 - x1)));
        }

        /**
         * 计算两个角度间的差,控制在(-180, 180).
         * @param {number} startAngle 开始的角度.
         * @param {number} endAngle 终止的角度.
         * @return {number} 返回的角度+起始角度 = 结束角度. 正差值表示+方向,负差值表示-方向.
         *     The shortest route (clockwise vs counter-clockwise) between the angles
         *     is used.
         *     若差值是180度,此函数返回180(非-180)
         *     angleDifference(30, 40) is 10, and angleDifference(40, 30) is -10.
         *     angleDifference(350, 10) is 20, and angleDifference(10, 350) is -20.
         */
        function angleDifference(startAngle, endAngle) {
            var d = standardAngle(endAngle) - standardAngle(startAngle);
            if (d > 180) {
                d = d - 360;
            } else if (d <= -180) {
                d = 360 + d;
            }
            return d;
        }

        /**
         * -1,0,1 "sign" or "signum" function.
         * @param {number} x The number to take the sign of.
         * @return {number} -1 when negative, 1 when positive, 0 when 0.
         */
        function sign(x) {
            return x === 0 ? 0 : (x < 0 ? -1 : 1);
        }

        /**
         * JS实现的最大公共序列.
         * http://en.wikipedia.org/wiki/Longest_common_subsequence.
         *
         * @param {Array.<Object>} array1 数组1.
         * @param {Array.<Object>} array2 数组2.
         * @param {Function=} opt_compareFn 自定义的比较函数用于比较数组项.
         * @param {Function=} opt_collectorFn Function used to decide what to return
         *     as a result subsequence. It accepts 2 arguments: index of common element
         *     in the first array and index in the second. The default function returns
         *     element from the first array.
         * @return {Array.<Object>} A list of objects that are common to both arrays
         *     such that there is no common subsequence with size greater than the
         *     length of the list.
         */
        function longestCommonSubsequence(array1, array2, opt_compareFn, opt_collectorFn) {
            var compare = opt_compareFn || function(a, b) {
                return a === b;
            };

            var collect = opt_collectorFn || function(i1, i2) {
                return array1[i1];
            };

            var length1 = array1.length;
            var length2 = array2.length;
            var i, j;

            var arr = [];
            for (i = 0; i < length1 + 1; i++) {
                arr[i] = [];
                arr[i][0] = 0;
            }

            for (j = 0; j < length2 + 1; j++) {
                arr[0][j] = 0;
            }

            for (i = 1; i <= length1; i++) {
                for (j = 1; j <= length2; j++) {
                    if (compare(array1[i - 1], array2[j - 1])) {
                        arr[i][j] = arr[i - 1][j - 1] + 1;
                    } else {
                        arr[i][j] = Math.max(arr[i - 1][j], arr[i][j - 1]);
                    }
                }
            }

            // Backtracking
            var result = [];
            i = length1;
            j = length2;
            while (i > 0 && j > 0) {
                if (compare(array1[i - 1], array2[j - 1])) {
                    result.unshift(collect(i - 1, j - 1));
                    i--;
                    j--;
                } else {
                    if (arr[i - 1][j] > arr[i][j - 1]) {
                        i--;
                    } else {
                        j--;
                    }
                }
            }

            return result;
        }

        /**
         * 计算总和.
         * @param {...number} var_args Numbers to add.
         * @return {number} 形参总和,NaN意味着有非法值.
         */
        function sum(var_args) {
            return /** @type {number} */ (array.reduce(arguments,
                function(sum, value) {
                    return sum + value;
                }, 0));
        }

        /**
         * 计算均值.
         * @param {...number} var_args Numbers to average.
         * @return {number} 形参平均值,NaN意味着有非法值..
         */
        function average(var_args) {
            return sum.apply(null, arguments) / arguments.length;
        }

        /**
         * 返回标准方差.
         * 详见: http://en.wikipedia.org/wiki/Standard_deviation
         * @param {...number} var_args 计算的数列.
         * @return {number} 少于两个参数返回0, 若参数有非法值返回NaN.
         */
        function standardDeviation(var_args) {
            var sampleSize = arguments.length;
            if (sampleSize < 2) {
                return 0;
            }

            var mean = average.apply(null, arguments);
            var variance = sum.apply(null, array.map(arguments,
                function(val) {
                    return Math.pow(val - mean, 2);
                })) / (sampleSize - 1);

            return Math.sqrt(variance);
        }

        /**
         * 返回是否整数. 求模运算比对结果比范围检测性能好.
         * @param {number} num 测试数字.
         * @return {boolean}
         */
        function isInt(num) {
            return isFinite(num) && num % 1 === 0;
        }

        /**
         * 判断是否有理数.
         * @param {number} num 测试数字.
         * @return {boolean}
         */
        function isFiniteNumber(num) {
            return isFinite(num) && !isNaN(num);
        }

        /**
         * Math.floor的安全版本, 可以允许所给结果无限小地浮动于最近的整数.
         * 这种情况经常出现在浮点数计算的中间过程中. 例如Math.floor(Math.log(1000) /
         * Math.LN10) === 2, 而非得到3.
         * @param {number} num A number.
         * @param {number=} opt_epsilon 一个无限小的正数作为允许浮动的范围.
         * @return {number} The largest integer less than or equal to {@code num}.
         */
        function safeFloor(num, opt_epsilon) {
            return Math.floor(num + (opt_epsilon || 2e-15));
        }

        /**
         * Math.ceil的安全版本.
         * @param {number} num A number.
         * @param {number=} opt_epsilon An infinitesimally small positive number, the
         *     rounding error to tolerate.
         * @return {number} The smallest integer greater than or equal to {@code num}.
         */
        function safeCeil(num, opt_epsilon) {
            return Math.ceil(num - (opt_epsilon || 2e-15));
        }

        return {
            randomInt: randomInt,
            uniformRandom: uniformRandom,
            clamp: clamp,
            modulo: modulo,
            nearlyEquals: nearlyEquals,
            angle: angle,
            sign: sign,
            sum: sum,
            average: average,
            standardDeviation: standardDeviation,
            isInt: isInt,
            isFiniteNumber: isFiniteNumber,
            safeFloor: safeFloor,
            safeCeil: safeCeil
        };
    }
);