/**
 * @fileoverview Utilities for detecting, adding and removing classes.  Prefer
 * this over dom.classes for new code since it attempts to use classList
 * (DOMTokenList: http://dom.spec.whatwg.org/#domtokenlist) which is faster
 * and requires less code.
 *
 * Note: these utilities are meant to operate on HTMLElements and
 * will not work on elements with differing interfaces (such as SVGElements).
 * @author Leo.Zhang
 * @email zmike86@gmail.com
 */

define([
  '../util/util',
  '../array/array',
  '../asserts/asserts'
], function(util, array, asserts) {

  'use strict';

  /**
   * Override this define at build-time if you know your target supports it.
   * @define {boolean} Whether to use the classList property (DOMTokenList).
   */
  var ALWAYS_USE_DOM_TOKEN_LIST = false;

  var cl = {};

  /**
   * 是否使用原生的DOMTokenList方法.  See the spec at
   * {@link http://dom.spec.whatwg.org/#domtokenlist}.
   * @type {boolean}
   * @private
   */
  cl.NATIVE_DOM_TOKEN_LIST_ = ALWAYS_USE_DOM_TOKEN_LIST ||
    // Whether DOMTokenList exists.
    (!!util.global['DOMTokenList']);

  /**
   * Gets an array-like object of class names on an element.
   * @param {Element} element DOM node to get the classes of.
   * @return {!ArrayLike} Class names on {@code element}.
   */
  cl.get = cl.NATIVE_DOM_TOKEN_LIST_ ?
    function(element) {
      return element.classList;
    } :
    function(element) {
      var className = element.className;
      // Some types of elements don't have a className in IE (e.g. iframes).
      // Furthermore, in Firefox, className is not a string when the element is
      // an SVG element.
      return util.isString(className) && className.match(/\S+/g) || [];
    };

  /**
   * 设置元素类名.
   * @param {Element} element DOM node to set class of.
   * @param {string} className Class name(s) to apply to element.
   */
  cl.set = function(element, className) {
    element.className = className;
  };

  /**
   * Returns true if an element has a class.  This method may throw a DOM
   * exception for an invalid or empty class name if DOMTokenList is used.
   * @param {Element} element DOM node to test.
   * @param {string} className Class name to test for.
   * @return {boolean} Whether element has the class.
   */
  cl.contains = cl.NATIVE_DOM_TOKEN_LIST_ ?
    function(element, className) {
      asserts.assert(!!element.classList);
      return element.classList.contains(className);
    } :
    function(element, className) {
      return array.contains(cl.get(element), className);
    };

  /**
   * Adds a class to an element.  Does not add multiples of class names.  This
   * method may throw a DOM exception for an invalid or empty class name if
   * DOMTokenList is used.
   * @param {Element} element DOM node to add class to.
   * @param {string} className Class name to add.
   */
  cl.add = cl.NATIVE_DOM_TOKEN_LIST_ ?
    function(element, className) {
      element.classList.add(className);
    } :
    function(element, className) {
      if (!cl.contains(element, className)) {
        // Ensure we add a space if this is not the first class name added.
        element.className += element.className.length > 0 ?
          (' ' + className) : className;
      }
    };

  /**
   * Convenience method to add a number of class names at once.
   * @param {Element} element The element to which to add classes.
   * @param {ArrayLike.<string>} classesToAdd An array-like object
   * containing a collection of class names to add to the element.
   * This method may throw a DOM exception if classesToAdd contains invalid
   * or empty class names.
   */
  cl.addAll = cl.NATIVE_DOM_TOKEN_LIST_ ?
    function(element, classesToAdd) {
      array.forEach(classesToAdd, function(className) {
        cl.add(element, className);
      });
    } :
    function(element, classesToAdd) {
      var classMap = {};

      // Get all current class names into a map.
      array.forEach(cl.get(element),
        function(className) {
          classMap[className] = true;
        });

      // Add new class names to the map.
      array.forEach(classesToAdd,
        function(className) {
          classMap[className] = true;
        });

      // Flatten the keys of the map into the className.
      element.className = '';
      for (var className in classMap) {
        element.className += element.className.length > 0 ?
          (' ' + className) : className;
      }
    };

  /**
   * Removes a class from an element.  This method may throw a DOM exception
   * for an invalid or empty class name if DOMTokenList is used.
   * @param {Element} element DOM node to remove class from.
   * @param {string} className Class name to remove.
   */
  cl.remove = cl.NATIVE_DOM_TOKEN_LIST_ ?
    function(element, className) {
      element.classList.remove(className);
    } :
    function(element, className) {
      if (cl.contains(element, className)) {
        // Filter out the class name.
        element.className = array.filter(
          cl.get(element),
          function(c) {
            return c != className;
          }).join(' ');
      }
    };

  /**
   * Removes a set of classes from an element.  Prefer this call to
   * repeatedly calling {@code classlist.remove} if you want to remove
   * a large set of class names at once.
   * @param {Element} element The element from which to remove classes.
   * @param {ArrayLike.<string>} classesToRemove An array-like object
   * containing a collection of class names to remove from the element.
   * This method may throw a DOM exception if classesToRemove contains invalid
   * or empty class names.
   */
  cl.removeAll = cl.NATIVE_DOM_TOKEN_LIST_ ?
    function(element, classesToRemove) {
      array.forEach(classesToRemove, function(className) {
        cl.remove(element, className);
      });
    } :
    function(element, classesToRemove) {
      // Filter out those classes in classesToRemove.
      element.className = array.filter(
        cl.get(element),
        function(className) {
          // If this class is not one we are trying to remove,
          // add it to the array of new class names.
          return !array.contains(classesToRemove, className);
        }).join(' ');
    };

  /**
   * Adds or removes a class depending on the enabled argument.  This method
   * may throw a DOM exception for an invalid or empty class name if DOMTokenList
   * is used.
   * @param {Element} element DOM node to add or remove the class on.
   * @param {string} className Class name to add or remove.
   * @param {boolean} enabled Whether to add or remove the class (true adds,
   *     false removes).
   */
  cl.enable = function(element, className, enabled) {
    if (enabled) {
      cl.add(element, className);
    } else {
      cl.remove(element, className);
    }
  };

  /**
   * Switches a class on an element from one to another without disturbing other
   * classes. If the fromClass isn't removed, the toClass won't be added.  This
   * method may throw a DOM exception if the class names are empty or invalid.
   * @param {Element} element DOM node to swap classes on.
   * @param {string} fromClass Class to remove.
   * @param {string} toClass Class to add.
   * @return {boolean} Whether classes were switched.
   */
  cl.swap = function(element, fromClass, toClass) {
    if (cl.contains(element, fromClass)) {
      cl.remove(element, fromClass);
      cl.add(element, toClass);
      return true;
    }
    return false;
  };

  /**
   * Removes a class if an element has it, and adds it the element doesn't have
   * it.  Won't affect other classes on the node.  This method may throw a DOM
   * exception if the class name is empty or invalid.
   * @param {Element} element DOM node to toggle class on.
   * @param {string} className Class to toggle.
   * @return {boolean} True if class was added, false if it was removed
   *     (in other words, whether element has the class after this function has
   *     been called).
   */
  cl.toggle = function(element, className) {
    var add = !cl.contains(element, className);
    cl.enable(element, className, add);
    return add;
  };

  /**
   * Adds and removes a class of an element.  Unlike
   * {@link classlist.swap}, this method adds the classToAdd regardless
   * of whether the classToRemove was present and had been removed.  This method
   * may throw a DOM exception if the class names are empty or invalid.
   *
   * @param {Element} element DOM node to swap classes on.
   * @param {string} classToRemove Class to remove.
   * @param {string} classToAdd Class to add.
   */
  cl.addRemove = function(element, classToRemove, classToAdd) {
    cl.remove(element, classToRemove);
    cl.add(element, classToAdd);
  };

  return cl;
});