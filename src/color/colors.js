/**
 * @fileoverview 颜色值相关的操作函数库
 *     需要知晓三种颜色表示：
 *     1. Rgb
 *         RGB color representation. 一个包含三个元素的数组 [r, g, b],
 *         三个数在[0, 255]之间表示红,绿,蓝色.
 *         @typedef {Array.<number>}
 *     2. HSV
 *         HSV color representation. 一个包含三个元素的数组 [h, s, v]:
 *         h (hue) must be an integer in [0, 360], cyclic.
 *         s (saturation) must be a number in [0, 1].
 *         v (value/brightness) must be an integer in [0, 255].
 *         @typedef {Array.<number>}
 *     3. HSL
 *         HSL color representation. 一个包含三个元素的数组 [h, s, l]:
 *         h (hue) [0, 360]之间的整数, cyclic.
 *         s (saturation) [0, 1]之间的整数.
 *         l (lightness) [0, 1]之间的整数.
 *         @typedef {Array.<number>}
 *
 * @author Leo.Zhang
 * @email zmike86@gmail.com
 */

define(['./names'],
  function(names) {

    'use strict';

    /**
     * 16进制颜色职匹配模式
     * @type {RegExp}
     * @private
     */
    var validHexColorRe_ = /^#(?:[0-9a-f]{3}){1,2}$/i;


    /**
     * rgb颜色标示的匹配模式
     * @type {RegExp}
     * @private
     */
    var rgbColorRe_ = /^(?:rgb)?\((0|[1-9]\d{0,2}),\s?(0|[1-9]\d{0,2}),\s?(0|[1-9]\d{0,2})\)$/i;


    /**
     * Regular expression for extracting the digits in a hex color triplet.
     * @type {RegExp}
     * @private
     */
    var hexTripletRe_ = /#(.)(.)(.)/;


    /**
     * @param {string} str 要检查的字符串
     * @return {string} 没有#就加上
     */
    function prependHashIfNecessaryHelper(str) {
      return str.charAt(0) === '#' ? str : '#' + str;
    }


    /**
     * 为颜色加上前缀零.
     * Small helper method.
     * @param {string} hex Hex value to prepend if single digit.
     * @return {string} hex value prepended with zero if it was single digit,
     *     otherwise the same value that was passed in.
     */
    function prependZeroIfNecessaryHelper(hex) {
      return hex.length === 1 ? '0' + hex : hex;
    }


    /**
     * 标准化hex格式颜色
     * @param {string} hexColor an hex color string.
     * @return {string} hex color in the format '#rrggbb' with all lowercase
     *     literals.
     */
    function normalizeHex(hexColor) {
      if (!isValidHexColor_(hexColor)) {
        throw Error('\'' + hexColor + '\' is not a valid hex color');
      }
      if (hexColor.length === 4) { // of the form #RGB
        hexColor = hexColor.replace(hexTripletRe_, '#$1$1$2$2$3$3');
      }
      return hexColor.toLowerCase();
    }


    /**
     * 检查是否合格16进制格式的颜色. 期望时#RRGGBB (ex: #1b3d5f) or #RGB (ex: #3CA == #33CCAA).
     * @param {string} str String to check.
     * @return {boolean} Whether the string is a valid hex color.
     * @private
     */
    function isValidHexColor_(str) {
      return validHexColorRe_.test(str);
    }


    /**
     * 是否合理的rgb color. 期望是'(r, g, b)'或者'rgb(r, g, b)', 每个数字在区间[0, 255].
     * @param {string} str String to check.
     * @return {!Array.<number>} the rgb representation of the color if it is
     *     a valid color, or the empty array otherwise.
     * @private
     */
    function isValidRgbColor_(str) {
      // Each component is separate (rather than using a repeater) so we can
      // capture the match. Also, we explicitly set each component to be either 0,
      // or start with a non-zero, to prevent octal numbers from slipping through.
      var regExpResultArray = str.match(rgbColorRe_);
      if (regExpResultArray) {
        var r = Number(regExpResultArray[1]);
        var g = Number(regExpResultArray[2]);
        var b = Number(regExpResultArray[3]);
        if (r >= 0 && r <= 255 &&
          g >= 0 && g <= 255 &&
          b >= 0 && b <= 255) {
          return [r, g, b];
        }
      }
      return [];
    }


    /**
     * 16进制表示法转化成RGB.
     * @param {string} hexColor Color to convert.
     * @return {!Array.<Number>} rgb颜色数组.
     */
    function hexToRgb(hexColor) {
      hexColor = normalizeHex(hexColor);
      // parseInt第二个参数可以传递进制数
      var r = parseInt(hexColor.substr(1, 2), 16);
      var g = parseInt(hexColor.substr(3, 2), 16);
      var b = parseInt(hexColor.substr(5, 2), 16);

      return [r, g, b];
    }


    /**
     * Converts a color from RGB to hex representation.
     * @param {number} r Amount of red, int between 0 and 255.
     * @param {number} g Amount of green, int between 0 and 255.
     * @param {number} b Amount of blue, int between 0 and 255.
     * @return {string} hex representation of the color.
     */
    function rgbToHex(r, g, b) {
      r = Number(r);
      g = Number(g);
      b = Number(b);
      if (isNaN(r) || r < 0 || r > 255 ||
        isNaN(g) || g < 0 || g > 255 ||
        isNaN(b) || b < 0 || b > 255) {
        throw Error('"(' + r + ',' + g + ',' + b + '") is not a valid RGB color');
      }
      var hexR = prependZeroIfNecessaryHelper(r.toString(16));
      var hexG = prependZeroIfNecessaryHelper(g.toString(16));
      var hexB = prependZeroIfNecessaryHelper(b.toString(16));
      return '#' + hexR + hexG + hexB;
    }


    /**
     * Converts a color from RGB to hex representation.
     * @param {Array.<number>} rgb rgb representation of the color.
     * @return {string} hex representation of the color.
     */
    function rgbArrayToHex(rgb) {
      return rgbToHex(rgb[0], rgb[1], rgb[2]);
    }


    /**
     * @param {string} str 任何形式的颜色字符串.
     * @return {Object} 返回对象有两个属性: 'hex'是颜色的16进制表示, 'type'表明传进来的是什么格式('hex', 'rgb', 'named').
     */
    function parse(str) {
      var result = {};
      str = String(str);

      var maybeHex = prependHashIfNecessaryHelper(str);
      if (isValidHexColor_(maybeHex)) {
        result.hex = normalizeHex(maybeHex);
        result.type = 'hex';
        return result;
      } else {
        var rgb = isValidRgbColor_(str);
        if (rgb.length) {
          result.hex = rgbArrayToHex(rgb);
          result.type = 'rgb';
          return result;
        } else if (names) {
          var hex = names[str.toLowerCase()];
          if (hex) {
            result.hex = hex;
            result.type = 'named';
            return result;
          }
        }
      }
      throw Error(str + ' is not a valid color string');
    }


    return {
      hexToRgb: hexToRgb,
      rgbToHex: rgbToHex,
      rgbArrayToHex: rgbArrayToHex,
      parse: parse
    };

  }
);