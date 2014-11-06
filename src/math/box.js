/**
 * @fileoverview 盒子类.
 * @author Leo.Zhang
 * @email zmike86@gmail.com
 */

define('@math.Box',
    ['@util', '@math.Coordinate'],
    function(util, Coordinate) {

        'use strict';

        /**
         * Box表示一个盒子. 有top, right, bottom and left4个属性
         * Box在表示内外边距的时候非常有用.
         * @param {number} top
         * @param {number} right
         * @param {number} bottom
         * @param {number} left
         * @constructor
         */
        var Box = function(top, right, bottom, left) {
            /**
             * Top
             * @type {number}
             */
            this.top = top;

            /**
             * Right
             * @type {number}
             */
            this.right = right;

            /**
             * Bottom
             * @type {number}
             */
            this.bottom = bottom;

            /**
             * Left
             * @type {number}
             */
            this.left = left;
        };


        /**
         * 按照这个方法表示的意义, Box包含所有的坐标点.
         * 则坐标系应该是以左上为原点的坐标系.
         * @param {...Coordinate} var_args 一系列Coordinate的实例.
         * @return {!Box} 包含所有坐标点的盒子.
         */
        Box.boundingBox = function(var_args) {
            var box = new Box(arguments[0].y, arguments[0].x,
                arguments[0].y, arguments[0].x);
            for (var i = 1; i < arguments.length; i++) {
                var coord = arguments[i];
                box.top = Math.min(box.top, coord.y);
                box.right = Math.max(box.right, coord.x);
                box.bottom = Math.max(box.bottom, coord.y);
                box.left = Math.min(box.left, coord.x);
            }
            return box;
        };


        /**
         * 自我克隆.
         * @return {!Box} A clone of this Box.
         */
        Box.prototype.clone = function() {
            return new Box(this.top, this.right, this.bottom, this.left);
        };


        /**
         * 返回当前盒子是否包含另一个盒子或者坐标.
         * @param {Coordinate|Box} other A Coordinate or a Box.
         * @return {boolean} 返回是否包含.
         */
        Box.prototype.contains = function(other) {
            return Box.contains(this, other);
        };


        /**
         * 伸缩到给定的margins.
         * @param {number|Box} top Top margin or box with all margins.
         * @param {number=} opt_right Right margin.
         * @param {number=} opt_bottom Bottom margin.
         * @param {number=} opt_left Left margin.
         * @return {!Box} 返回自身.
         */
        Box.prototype.expand = function(top, opt_right, opt_bottom, opt_left) {
            if (util.isObject(top)) {
                this.top -= top.top;
                this.right += top.right;
                this.bottom += top.bottom;
                this.left -= top.left;
            } else {
                this.top -= top;
                this.right += opt_right;
                this.bottom += opt_bottom;
                this.left -= opt_left;
            }

            return this;
        };


        /**
         * 延展当前盒子至能包含另一个盒子.
         * NOTE(user): 这个函数需要很快的执行完毕,必须确保形参的类型和个数.
         * @param {Box} box 要包含的盒子.
         */
        Box.prototype.expandToInclude = function(box) {
            this.left = Math.min(this.left, box.left);
            this.top = Math.min(this.top, box.top);
            this.right = Math.max(this.right, box.right);
            this.bottom = Math.max(this.bottom, box.bottom);
        };


        /**
         * 上取整.
         * @return {!Box} 返回自身.
         */
        Box.prototype.ceil = function() {
            this.top = Math.ceil(this.top);
            this.right = Math.ceil(this.right);
            this.bottom = Math.ceil(this.bottom);
            this.left = Math.ceil(this.left);
            return this;
        };


        /**
         * 下取整.
         * @return {!Box} 返回自身.
         */
        Box.prototype.floor = function() {
            this.top = Math.floor(this.top);
            this.right = Math.floor(this.right);
            this.bottom = Math.floor(this.bottom);
            this.left = Math.floor(this.left);
            return this;
        };


        /**
         * 四舍五入
         * @return {!Box} 返回自身.
         */
        Box.prototype.round = function() {
            this.top = Math.round(this.top);
            this.right = Math.round(this.right);
            this.bottom = Math.round(this.bottom);
            this.left = Math.round(this.left);
            return this;
        };


        /**
         * 对盒子进行位移操作. 若参数是一个坐标, 坐标的x值改变盒子的left and right,
         * 坐标的y值改变盒子的top and bottom.
         * @param {number|Coordinate} tx The value to translate the x
         *     dimension values by or the the coordinate to translate this box by.
         * @param {number=} opt_ty The value to translate y dimension values by.
         * @return {!Box} 返回自身.
         */
        Box.prototype.translate = function(tx, opt_ty) {
            if (tx instanceof Coordinate) {
                this.left += tx.x;
                this.right += tx.x;
                this.top += tx.y;
                this.bottom += tx.y;
            } else {
                this.left += tx;
                this.right += tx;
                if (util.isNumber(opt_ty)) {
                    this.top += opt_ty;
                    this.bottom += opt_ty;
                }
            }
            return this;
        };


        /**
         * 缩放.
         * @param {number} sx The scale factor to use for the x dimension.
         * @param {number=} opt_sy The scale factor to use for the y dimension.
         * @return {!Box} 返回自身.
         */
        Box.prototype.scale = function(sx, opt_sy) {
            var sy = util.isNumber(opt_sy) ? opt_sy : sx;
            this.left *= sx;
            this.right *= sx;
            this.top *= sy;
            this.bottom *= sy;
            return this;
        };


        // 以下提供一些静态方法
        /**
         * 相等判断.
         * @param {Box} a A Box.
         * @param {Box} b A Box.
         * @return {boolean} 两个都是null也返回true.
         */
        Box.equals = function(a, b) {
            if (a === b) {
                return true;
            }
            if (!a || !b) {
                return false;
            }
            return a.top === b.top && a.right === b.right &&
                a.bottom === b.bottom && a.left === b.left;
        };


        /**
         * 是否包含给定的盒子或者坐标点.
         * @param {Box} box A Box.
         * @param {Coordinate|Box} other A Coordinate or a Box.
         * @return {boolean}
         */
        Box.contains = function(box, other) {
            if (!box || !other) {
                return false;
            }

            if (other instanceof Box) {
                return other.left >= box.left && other.right <= box.right &&
                    other.top >= box.top && other.bottom <= box.bottom;
            }

            // other is a Coordinate.
            return other.x >= box.left && other.x <= box.right &&
                other.y >= box.top && other.y <= box.bottom;
        };


        /**
         * 返回坐标点x方向相对盒子的位置. 若坐标在盒子内则返回0.
         * @param {Box} box A Box.
         * @param {Coordinate} coord A Coordinate.
         * @return {number} The x position of {@code coord} relative to the nearest
         *     side of {@code box}, or zero if {@code coord} is inside {@code box}.
         */
        Box.relativePositionX = function(box, coord) {
            if (coord.x < box.left) {
                return coord.x - box.left;
            } else if (coord.x > box.right) {
                return coord.x - box.right;
            }
            return 0;
        };


        /**
         * 返回坐标点y方向相对盒子的位置. 若坐标在盒子内则返回0.
         * @param {Box} box A Box.
         * @param {Coordinate} coord A Coordinate.
         * @return {number} The y position of {@code coord} relative to the nearest
         *     side of {@code box}, or zero if {@code coord} is inside {@code box}.
         */
        Box.relativePositionY = function(box, coord) {
            if (coord.y < box.top) {
                return coord.y - box.top;
            } else if (coord.y > box.bottom) {
                return coord.y - box.bottom;
            }
            return 0;
        };


        /**
         * 返回坐标点离盒子最近的边或角的距离. 若坐标点在盒子里面返回0.
         * @param {Box} box A Box.
         * @param {Coordinate} coord A Coordinate.
         * @return {number} 距离.
         */
        Box.distance = function(box, coord) {
            var x = Box.relativePositionX(box, coord);
            var y = Box.relativePositionY(box, coord);
            return Math.sqrt(x * x + y * y);
        };


        /**
         * 判断两个盒子是否有交集(intersect).
         * @param {Box} a A Box.
         * @param {Box} b A second Box.
         * @return {boolean}
         */
        Box.intersects = function(a, b) {
            return (a.left <= b.right && b.left <= a.right &&
                a.top <= b.bottom && b.top <= a.bottom);
        };


        /**
         * 上一个函数的加强版. 可指定一个阈值,间隔在此阈值内的都算作交集,但视觉上不一定相交.
         * @param {Box} a A Box.
         * @param {Box} b A second Box.
         * @param {number} padding The additional padding.
         * @return {boolean} Whether the boxes intersect.
         */
        Box.intersectsWithPadding = function(a, b, padding) {
            return (a.left <= b.right + padding && b.left <= a.right + padding &&
                a.top <= b.bottom + padding && b.top <= a.bottom + padding);
        };

        return Box;

    }
);