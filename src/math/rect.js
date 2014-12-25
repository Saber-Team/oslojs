/**
 * @fileoverview 二维矩形类.
 * @author Leo.Zhang
 * @email zmike86@gmail.com
 */

define([
    '../util/util',
    './box',
    './coordinate',
    './size'
  ],
  function(util, Box, Coordinate, Size) {

    'use strict';

    /**
     * 矩形类.
     * @param {number} x Left.
     * @param {number} y Top.
     * @param {number} w Width.
     * @param {number} h Height.
     * @constructor
     */
    var Rect = function(x, y, w, h) {
      /** @type {number} */
      this.left = x;

      /** @type {number} */
      this.top = y;

      /** @type {number} */
      this.width = w;

      /** @type {number} */
      this.height = h;
    };


    /**
     * @return {!Rect} A new copy of this Rectangle.
     */
    Rect.prototype.clone = function() {
      return new Rect(this.left, this.top, this.width, this.height);
    };


    /**
     * 转化为盒子对象.
     * @return {!Box} A new Box representation of this Rectangle.
     */
    Rect.prototype.toBox = function() {
      var right = this.left + this.width;
      var bottom = this.top + this.height;
      return new Box(this.top, right, bottom, this.left);
    };


    /**
     * 这个方法返回两个Size是否有交集的同时改变了当前的Size对象,
     * 使之成为了交集的区域. If
     * there is no intersection, returns false and leaves this rectangle as is.
     * @param {Rect} rect A Rectangle.
     * @return {boolean} True if this rectangle intersects with the parameter.
     */
    Rect.prototype.intersection = function(rect) {
      var x0 = Math.max(this.left, rect.left);
      var x1 = Math.min(this.left + this.width, rect.left + rect.width);
      // 横向x轴有交集
      if (x0 <= x1) {
        var y0 = Math.max(this.top, rect.top);
        var y1 = Math.min(this.top + this.height, rect.top + rect.height);
        // 纵向y轴存在交集
        if (y0 <= y1) {
          this.left = x0;
          this.top = y0;
          this.width = x1 - x0;
          this.height = y1 - y0;

          return true;
        }
      }
      return false;
    };


    /**
     * 盒子转化成矩形.
     * @param {Box} box A box.
     * @return {!Rect} A new Rect.
     */
    Rect.createFromBox = function(box) {
      return new Rect(box.left, box.top, box.right - box.left, box.bottom - box.top);
    };


    /**
     * 判断相等.
     * @param {Rect} a A Rectangle.
     * @param {Rect} b A Rectangle.
     * @return {boolean}
     */
    Rect.equals = function(a, b) {
      if (a === b) {
        return true;
      }
      if (!a || !b) {
        return false;
      }
      return a.left === b.left && a.width === b.width &&
        a.top === b.top && a.height === b.height;
    };


    /**
     * 返回两矩形的交集.
     * @param {Rect} a A Rectangle.
     * @param {Rect} b A Rectangle.
     * @return {Rect} 有交集则返回新的矩形表示交集否则返回null.
     */
    Rect.intersection = function(a, b) {
      // There is no nice way to do intersection via a clone, because any such
      // clone might be unnecessary if this function returns null.  So, we duplicate
      // code from above.

      var x0 = Math.max(a.left, b.left);
      var x1 = Math.min(a.left + a.width, b.left + b.width);

      if (x0 <= x1) {
        var y0 = Math.max(a.top, b.top);
        var y1 = Math.min(a.top + a.height, b.top + b.height);

        if (y0 <= y1) {
          return new Rect(x0, y0, x1 - x0, y1 - y0);
        }
      }
      return null;
    };


    /**
     * 判断两矩形是否有交集.
     * @param {Rect} a A Rectangle.
     * @param {Rect} b A Rectangle.
     * @return {boolean}
     */
    Rect.intersects = function(a, b) {
      return (a.left <= b.left + b.width && b.left <= a.left + a.width &&
        a.top <= b.top + b.height && b.top <= a.top + a.height);
    };


    /**
     * 是否相交.
     * @param {Rect} rect A rectangle.
     * @return {boolean}
     */
    Rect.prototype.intersects = function(rect) {
      return Rect.intersects(this, rect);
    };


    /**
     * 返回一个矩形数组长度[0,4]表示第一个矩形减去交集后剩下区域.
     * @param {Rect} a A Rectangle.
     * @param {Rect} b A Rectangle.
     * @return {!Array.<!Rect>} 返回一个矩形数组长度[0,4]表示第一个矩形减去交集后剩下区域.
     */
    Rect.difference = function(a, b) {
      var intersection = Rect.intersection(a, b);
      // 若没有交集返回第一个矩形自身
      if (!intersection || !intersection.height || !intersection.width) {
        return [a.clone()];
      }

      var result = [];

      var top = a.top;
      var height = a.height;

      var ar = a.left + a.width;
      var ab = a.top + a.height;

      var br = b.left + b.width;
      var bb = b.top + b.height;

      // Subtract off any area on top where A extends past B
      if (b.top > a.top) {
        result.push(new Rect(a.left, a.top, a.width, b.top - a.top));
        top = b.top;
        // If we're moving the top down, we also need to subtract the height diff.
        height -= b.top - a.top;
      }
      // Subtract off any area on bottom where A extends past B
      if (bb < ab) {
        result.push(new Rect(a.left, bb, a.width, ab - bb));
        height = bb - top;
      }
      // Subtract any area on left where A extends past B
      if (b.left > a.left) {
        result.push(new Rect(a.left, top, b.left - a.left, height));
      }
      // Subtract any area on right where A extends past B
      if (br < ar) {
        result.push(new Rect(br, top, ar - br, height));
      }

      return result;
    };


    /**
     * 上一个方法的精简版.
     * @param {Rect} rect A Rectangle.
     * @return {!Array.<!Rect>} An array with 0 to 4 rectangles which
     *     together define the difference area of rectangle a minus rectangle b.
     */
    Rect.prototype.difference = function(rect) {
      return Rect.difference(this, rect);
    };


    /**
     * 扩大矩形面积以包含另一个矩形.
     * @param {Rect} rect The other rectangle.
     */
    Rect.prototype.boundingRect = function(rect) {
      // We compute right and bottom before we change left and top below.
      var right = Math.max(this.left + this.width, rect.left + rect.width);
      var bottom = Math.max(this.top + this.height, rect.top + rect.height);

      this.left = Math.min(this.left, rect.left);
      this.top = Math.min(this.top, rect.top);

      this.width = right - this.left;
      this.height = bottom - this.top;
    };


    /**
     * 生成一个新的矩形面积上包含给的矩形.
     * @param {Rect} a A rectangle.
     * @param {Rect} b A rectangle.
     * @return {Rect} null if either rect is null.
     */
    Rect.boundingRect = function(a, b) {
      if (!a || !b) {
        return null;
      }

      var clone = a.clone();
      clone.boundingRect(b);

      return clone;
    };


    /**
     * 包含与否.
     * @param {Rect|Coordinate} another 另一个矩形或一个坐标点.
     * @return {boolean}
     */
    Rect.prototype.contains = function(another) {
      if (another instanceof Rect) {
        return this.left <= another.left &&
          this.left + this.width >= another.left + another.width &&
          this.top <= another.top &&
          this.top + this.height >= another.top + another.height;
      } else { // (another instanceof Coordinate)
        return another.x >= this.left &&
          another.x <= this.left + this.width &&
          another.y >= this.top &&
          another.y <= this.top + this.height;
      }
    };


    /**
     * 获得坐标距离矩形最近点的距离平方. 若在矩形之内则返回0.
     * @param {!Coordinate} point A coordinate.
     * @return {number}
     */
    Rect.prototype.squaredDistance = function(point) {
      var dx = point.x < this.left ?
        this.left - point.x : Math.max(point.x - (this.left + this.width), 0);
      var dy = point.y < this.top ?
        this.top - point.y : Math.max(point.y - (this.top + this.height), 0);
      return dx * dx + dy * dy;
    };


    /**
     * 获得坐标距离矩形最近点的距离. 若在矩形之内则返回0.
     * @param {!Coordinate} point A coordinate.
     * @return {number}
     */
    Rect.prototype.distance = function(point) {
      return Math.sqrt(this.squaredDistance(point));
    };


    /**
     * @return {!Size} The size of this rectangle.
     */
    Rect.prototype.getSize = function() {
      return new Size(this.width, this.height);
    };


    /**
     * @return {!Coordinate} 获得左上角的坐标.
     */
    Rect.prototype.getTopLeft = function() {
      return new Coordinate(this.left, this.top);
    };


    /**
     * @return {!Coordinate} 获得对称中心的坐标.
     */
    Rect.prototype.getCenter = function() {
      return new Coordinate(this.left + this.width / 2, this.top + this.height / 2);
    };


    /**
     * @return {!Coordinate} 返回右下角的坐标.
     */
    Rect.prototype.getBottomRight = function() {
      return new Coordinate(this.left + this.width, this.top + this.height);
    };


    /**
     * @return {!Rect}
     */
    Rect.prototype.ceil = function() {
      this.left = Math.ceil(this.left);
      this.top = Math.ceil(this.top);
      this.width = Math.ceil(this.width);
      this.height = Math.ceil(this.height);
      return this;
    };


    /**
     * @return {!Rect}
     */
    Rect.prototype.floor = function() {
      this.left = Math.floor(this.left);
      this.top = Math.floor(this.top);
      this.width = Math.floor(this.width);
      this.height = Math.floor(this.height);
      return this;
    };


    /**
     * 四舍五入.
     * @return {!Rect} 返回自身.
     */
    Rect.prototype.round = function() {
      this.left = Math.round(this.left);
      this.top = Math.round(this.top);
      this.width = Math.round(this.width);
      this.height = Math.round(this.height);
      return this;
    };


    /**
     * 位移操作. 左上角同时位移,右下角同时位移.
     * @param {number|Coordinate} tx The value to translate left by or the
     *     the coordinate to translate this rect by.
     * @param {number=} opt_ty The value to translate top by.
     * @return {!Rect} This rectangle after translating.
     */
    Rect.prototype.translate = function(tx, opt_ty) {
      if (tx instanceof Coordinate) {
        this.left += tx.x;
        this.top += tx.y;
      } else {
        this.left += tx;
        if (util.isNumber(opt_ty)) {
          this.top += opt_ty;
        }
      }
      return this;
    };


    /**
     * 缩放操作. 左边距和宽度同时缩放by {@code sx}, 上边距和高度也是同时缩放 by
     * {@code opt_sy}.
     * @param {number} sx The scale factor to use for the x dimension.
     * @param {number=} opt_sy The scale factor to use for the y dimension.
     * @return {!Rect} 返回自身.
     */
    Rect.prototype.scale = function(sx, opt_sy) {
      var sy = util.isNumber(opt_sy) ? opt_sy : sx;
      this.left *= sx;
      this.width *= sx;
      this.top *= sy;
      this.height *= sy;
      return this;
    };

    return Rect;

  }
);
