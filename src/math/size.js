/**
 * @fileoverview 表示二维元素的尺寸的类.这里面很多方法同Coordinate类相同
 * @author Leo.Zhang
 * @email zmike86@gmail.com
 */

define('@math.size', [], function() {

    'use strict';

    /**
     * 表示尺寸的类. 不支持undefined width和 height.
     * @param {number} width Width.
     * @param {number} height Height.
     * @constructor
     */
    var Size = function(width, height) {
        /**
         * Width
         * @type {number}
         */
        this.width = width;
        /**
         * Height
         * @type {number}
         */
        this.height = height;
    };

    /**
     * 比较两个Size对象是否相等.
     * @param {Size} a A Size.
     * @param {Size} b A Size.
     * @return {boolean} 长宽都相等的尺寸对象视为相等.
     */
    Size.equals = function(a, b) {
        if (a === b)
            return true;
        if (!a || !b)
            return false;
        return a.width === b.width && a.height === b.height;
    };

    /**
     * @return {!Size} A new copy of the Size.
     */
    Size.prototype.clone = function() {
        return new Size(this.width, this.height);
    };

    /**
     * @return {number} 返回较长的边.
     */
    Size.prototype.getLongest = function() {
        return Math.max(this.width, this.height);
    };

    /**
     * @return {number} 返回较短的边.
     */
    Size.prototype.getShortest = function() {
        return Math.min(this.width, this.height);
    };

    /**
     * @return {number} 返回面积 (width * height).
     */
    Size.prototype.area = function() {
        return this.width * this.height;
    };

    /**
     * perimeter本义也为`周长`
     * @return {number} 返回周长 (width + height) * 2.
     */
    Size.prototype.perimeter = function() {
        return (this.width + this.height) * 2;
    };

    /**
     * 返回宽和高的比值
     * @return {number} The ratio of the size's width to its height.
     */
    Size.prototype.aspectRatio = function() {
        return this.width / this.height;
    };

    /**
     * @return {boolean} 返回面积是否为零.
     */
    Size.prototype.isEmpty = function() {
        return !this.area();
    };

    /**
     * 变化尺寸上界.
     * @return {!Size} 返回自身.
     */
    Size.prototype.ceil = function() {
        this.width = Math.ceil(this.width);
        this.height = Math.ceil(this.height);
        return this;
    };

    /**
     * 从宽高两方面证明是否小于给定的Size对象
     * @param {!Size} target size对象.
     * @return {boolean} 判断当前size对象是否小于等于目标size对象.
     */
    Size.prototype.fitsInside = function(target) {
        return this.width <= target.width && this.height <= target.height;
    };

    /**
     * 返回尺寸下界.
     * @return {!Size} 返回自身.
     */
    Size.prototype.floor = function() {
        this.width = Math.floor(this.width);
        this.height = Math.floor(this.height);
        return this;
    };

    /**
     * 四舍五入当前尺寸对象.
     * @return {!Size} 返回自身.
     */
    Size.prototype.round = function() {
        this.width = Math.round(this.width);
        this.height = Math.round(this.height);
        return this;
    };

    /**
     * 给定因子缩放高宽。
     * @param {number} sx 宽度缩放因子.
     * @param {number=} opt_sy 高度缩放因子.
     * @return {!Size} 返回自身.
     */
    Size.prototype.scale = function(sx, opt_sy) {
        var sy = (typeof opt_sy === 'number') ? opt_sy : sx;
        this.width *= sx;
        this.height *= sy;
        return this;
    };

    /**
     * 让当前的Size缩到能进入给定的Size里面, 这里需要判断宽高比了.
     * 以不变的比例缩放当前尺寸对象使得可以与目标尺寸对象相同的长(或宽)而不溢出. 当前对象的最初
     * aspect ratio仍然得以保留.(需要两个尺寸对象的长宽都是正数)
     * @param {!Size} target 目标size.
     * @return {!Size} 返回缩放后的自身.
     */
    Size.prototype.scaleToFit = function(target) {
        var s = this.aspectRatio() > target.aspectRatio() ?
            target.width / this.width :
            target.height / this.height;

        return this.scale(s);
    };

    return Size;
});