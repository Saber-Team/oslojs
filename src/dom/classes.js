/**
 * @fileoverview 添加、移除、设置类名的实用函数集.
 *     更喜欢用dom.classlist因为dom.classlist更贴近语义上的Element.classList,
 *     由于使用了原生方法所以更快, 编译后的代码也更小.
 * @modified Leo.Zhang
 * @email zmike86@gmail.com
 *
 * Note: 这个模块主要是操作html元素也就是实现了HTMLElements接口的实例,对于实现了其他接口的元素‘
 * (SVGElements等)都无效.
 */

define('Sogou.Dom.Classes',
    ['Sogou.Util','Sogou.Array'],
    function(util, array) {

        'use strict';

        /**
         * 设元素类名.
         * @param {Node} element DOM元素.
         * @param {string} className 设置的类名.
         */
        function set(element, className) {
            element.className = className;
        }


        /**
         * 返回元素类名的数组.
         * @param {Node} element DOM元素.
         * @return {!Array} 返回类名数组. Some browsers add extra
         *     properties to the array. Do not depend on any of these!
         */
        function get(element) {
            var className = element.className;
            // 有些元素没有类名比如IE下的iframes.
            // 另外, Firefox中如果是SVG元素className不是字符串.
            return util.isString(className) && className.match(/\S+/g) || [];
        }


        /**
         * 给元素加类名. 不会重复添加.
         * @param {Node} element DOM元素.
         * @param {...string} var_args 类名.
         * @return {boolean} 是否全部类名都添加成功.
         */
        function add(element, var_args) {
            // 取得元素已有的类名数组
            var classes = get(element);
            // 取得要添加的类名数组
            var args = Array.prototype.slice.call(arguments, 1);
            var expectedCount = classes.length + args.length;
            add_(classes, args);
            set(element, classes.join(' '));
            return classes.length === expectedCount;
        }


        /**
         * 移除指定的类名(数组).
         * @param {Node} element DOM元素.
         * @param {...string} var_args Class name(s) to remove.
         * @return {boolean} 是否全部类名移除成功.
         */
        function remove(element, var_args) {
            var classes = get(element);
            var args = Array.prototype.slice.call(arguments, 1);
            var newClasses = getDifference_(classes, args);
            set(element, newClasses.join(' '));
            return newClasses.length === classes.length - args.length;
        }


        /**
         * Helper method for {@link dom.classes.add} and {@link dom.classes.addRemove}.
         * Adds one or more classes to the supplied classes array.
         * @param {Array.<string>} classes All class names for the element, will be
         *     updated to have the classes supplied in {@code args} added.
         * @param {Array.<string>} args Class names to add.
         * @private
         */
        function add_(classes, args) {
            for (var i = 0; i < args.length; i++) {
                if (!array.contains(classes, args[i])) {
                    classes.push(args[i]);
                }
            }
        }


        /**
         * 这个方法是返回数组1中与数组2中不重复的部分
         * Helper method for {@link dom.classes.remove} and
         * {@link dom.classes.addRemove}.
         * @param {!Array.<string>} arr1 First array.
         * @param {!Array.<string>} arr2 Second array.
         * @return {!Array.<string>} 返回数组1中在数组2中不存在的元素.
         * @private
         */
        function getDifference_(arr1, arr2) {
            return array.filter(arr1, function(item) {
                return !array.contains(arr2, item);
            });
        }


        /**
         * 更换类名, 新的名称会被加到末尾
         * 如果没找到旧类名, 新的也不会加上.
         * @param {Node} element DOM node to swap classes on.
         * @param {string} fromClass Class to remove.
         * @param {string} toClass Class to add.
         * @return {boolean} Whether classes were switched.
         */
        function swap(element, fromClass, toClass) {
            var classes = get(element);
            var removed = false;
            for (var i = 0; i < classes.length; i++) {
                if (classes[i] === fromClass) {
                    classes.splice(i--, 1);
                    removed = true;
                }
            }

            if (removed) {
                classes.push(toClass);
                set(element, classes.join(' '));
            }

            return removed;
        }


        /**
         * 一步到位的操作, 第二个参数是要删的类, 第三个参数是要加的类.
         * 如果一个类既要添加也要删除则会添加. 因此这个方法可以作为加强版的dom.classes.swap当有
         * 两个以上的类名需要交换的时候.
         * @param {Node} element DOM node to swap classes on.
         * @param {?(string|Array.<string>)} classesToRemove 要删除的类名数组.
         * @param {?(string|Array.<string>)} classesToAdd 要添加的类名数组.
         */
        function addRemove(element, classesToRemove, classesToAdd) {
            var classes = get(element);
            if (util.isString(classesToRemove)) {
                array.remove(classes, classesToRemove);
            } else if (util.isArray(classesToRemove)) {
                classes = getDifference_(classes, classesToRemove);
            }

            if (util.isString(classesToAdd) &&
                !array.contains(classes, classesToAdd)) {
                classes.push(classesToAdd);
            } else if (util.isArray(classesToAdd)) {
                add_(classes, classesToAdd);
            }

            set(element, classes.join(' '));
        }


        /**
         * 元素是否有指定类名.
         * @param {Node} element
         * @param {string} className
         * @return {boolean}
         */
        function has(element, className) {
            return array.contains(get(element), className);
        }


        /**
         * 添加或删除单一一个类名.
         * @param {Node} element DOM元素.
         * @param {string} className Class name to add or remove.
         * @param {boolean} enabled true adds, false removes.
         */
        function enable(element, className, enabled) {
            if (enabled) {
                add(element, className);
            } else {
                remove(element, className);
            }
        }


        /**
         * 有则删除类,无则添加类.
         * @param {Node} element DOM node to toggle class on.
         * @param {string} className Class to toggle.
         * @return {boolean} 操作完毕后是否还有此类名.
         */
        function toggle(element, className) {
            var add = !has(element, className);
            enable(element, className, add);
            return add;
        }


        return {
            set: set,
            get: get,
            add: add,
            remove: remove,
            swap: swap,
            addRemove: addRemove,
            has: has,
            enable: enable,
            toggle: toggle
        };

    }
);