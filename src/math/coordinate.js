/**
 * @fileoverview 一个表示二维坐标点的类.或者理解直接作为平面上的一个像素点.
 * @author Leo.Zhang
 * @email zmike86@gmail.com
 */

define('@math.coordinate', ['@util', '@math.util'],
    function(util, math) {

    'use strict';

    /**
     * 描述坐标的类.
     * @param {number=} opt_x Left, 默认 0.
     * @param {number=} opt_y Top, 默认 0.
     * @constructor
     */
    var Coordinate = function(opt_x, opt_y) {
        /**
         * X-value
         * @type {number}
         */
        this.x = util.isNull(opt_x) ? 0 : opt_x;
        /**
         * Y-value
         * @type {number}
         */
        this.y = util.isNull(opt_y) ? 0 : opt_y;
    };

    /**
     * 克隆当前坐标对象.
     * @return {!Coordinate} 返回克隆版本.
     */
    Coordinate.prototype.clone = function() {
        return new Coordinate(this.x, this.y);
    };

    /**
     * 比较两个coordinate实例是否相等.
     * @param {Coordinate} a A Coordinate.
     * @param {Coordinate} b A Coordinate.
     * @return {boolean} True iff the coordinates are equal, or if both are null.
     */
    Coordinate.equals = function(a, b) {
        if (a === b)
            return true;
        if (!a || !b) return false;
        return a.x === b.x && a.y === b.y;
    };

    /**
     * 计算两个像素点之间的距离.
     * @param {!Coordinate} a A Coordinate.
     * @param {!Coordinate} b A Coordinate.
     * @return {number}
     */
    Coordinate.distance = function(a, b) {
        var dx = a.x - b.x;
        var dy = a.y - b.y;
        return Math.sqrt(dx * dx + dy * dy);
    };

    /**
     * 计算像素点距离原点的绝对距离.
     * magnitude意为量级
     * @param {!Coordinate} a A Coordinate.
     * @return {number}
     */
    Coordinate.magnitude = function(a) {
        return Math.sqrt(a.x * a.x + a.y * a.y);
    };

    /**
     * 计算像素点的方位角(角度).
     * @param {!Coordinate} a A Coordinate.
     * @return {number} The angle, in degrees, clockwise from the positive X
     *     axis to {@code a}.
     */
    Coordinate.azimuth = function(a) {
        return math.angle(0, 0, a.x, a.y);
    };

    /**
     * 计算两点间距离的平方. 这个数值可以被用作比较非真实距离时.
     * 因为有些时候比较距离只需要比较两个距离的平方数即可
     *
     * Performance note: eliminating the square root is an optimization often used
     * in lower-level languages, but the speed difference is not nearly as
     * pronounced in JavaScript (only a few percent.)
     *
     * @param {!Coordinate} a A Coordinate.
     * @param {!Coordinate} b A Coordinate.
     * @return {number} The squared distance between {@code a} and {@code b}.
     */
    Coordinate.squaredDistance = function(a, b) {
        var dx = a.x - b.x;
        var dy = a.y - b.y;
        return dx * dx + dy * dy;
    };

    /**
     * 两个像素点之间的差值作为新的像素点.
     * @param {!Coordinate} a A Coordinate.
     * @param {!Coordinate} b A Coordinate.
     * @return {!Coordinate} A Coordinate representing the difference
     *     between {@code a} and {@code b}.
     */
    Coordinate.difference = function(a, b) {
        return new Coordinate(a.x - b.x, a.y - b.y);
    };

    /**
     * Returns the sum of two coordinates as a new Coordinate.
     * @param {!Coordinate} a A Coordinate.
     * @param {!Coordinate} b A Coordinate.
     * @return {!Coordinate} A Coordinate representing the sum of the two
     *     coordinates.
     */
    Coordinate.sum = function(a, b) {
        return new Coordinate(a.x + b.x, a.y + b.y);
    };

    /**
     * 对坐标点的x,y坐标进行上取整处理.
     * @return {!Coordinate} This coordinate with ceil'd fields.
     */
    Coordinate.prototype.ceil = function() {
        this.x = Math.ceil(this.x);
        this.y = Math.ceil(this.y);
        return this;
    };

    /**
     * 对坐标点的x,y坐标进行下取整处理.
     * @return {!Coordinate} This coordinate with floored fields.
     */
    Coordinate.prototype.floor = function() {
        this.x = Math.floor(this.x);
        this.y = Math.floor(this.y);
        return this;
    };

    /**
     * 对坐标点的x,y坐标进行四舍五入处理.
     * @return {!Coordinate} This coordinate with rounded fields.
     */
    Coordinate.prototype.round = function() {
        this.x = Math.round(this.x);
        this.y = Math.round(this.y);
        return this;
    };

    /**
     * 对坐标点进行位移操作.
     * 如果给了一个坐标实例 {@code Coordinate},
     * 则用此坐标的x,y做位移偏向量 否则两个参数做位移偏量.
     * @param {number|Coordinate} tx The value to translate x by or the
     *     the coordinate to translate this coordinate by.
     * @param {number=} opt_ty The value to translate y by.
     * @return {!Coordinate} This coordinate after translating.
     */
    Coordinate.prototype.translate = function(tx, opt_ty) {
        if (tx instanceof Coordinate) {
            this.x += tx.x;
            this.y += tx.y;
        } else {
            this.x += tx;
            if (util.isNumber(opt_ty)) {
                this.y += opt_ty;
            }
        }
        return this;
    };

    /**
     * 缩放坐标点的横纵坐标.
     * 用 {@code sx} 和 {@code opt_sy} 分别做缩放因子.
     * 如果 {@code opt_sy} 没给, 则 {@code sx} 做唯一的缩放因子.
     * @param {number} sx The scale factor to use for the x dimension.
     * @param {number=} opt_sy The scale factor to use for the y dimension.
     * @return {!Coordinate} This coordinate after scaling.
     */
    Coordinate.prototype.scale = function(sx, opt_sy) {
        var sy = util.isNumber(opt_sy) ? opt_sy : sx;
        this.x *= sx;
        this.y *= sy;
        return this;
    };

    return Coordinate;
});