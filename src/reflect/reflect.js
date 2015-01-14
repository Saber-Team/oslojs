/**
 * @fileoverview Useful compiler idioms.
 *
 */

define([
  '../util/util'
],function(util) {

  'use strict';

  var rf = {};

  /**
   * Syntax for object literal casts.
   * @see http://go/jscompiler-renaming
   * @see http://code.google.com/p/closure-compiler/wiki/
   *      ExperimentalTypeBasedPropertyRenaming
   *
   * Use this if you have an object literal whose keys need to have the same names
   * as the properties of some class even after they are renamed by the compiler.
   *
   * @param {!Function} type Type to cast to.
   * @param {Object} object Object literal to cast.
   * @return {Object} The object literal.
   */
  rf.object = function(type, object) {
    return object;
  };


  /**
   * To assert to the compiler that an operation is needed when it would
   * otherwise be stripped. For example:
   * <code>
   *     // Force a layout
   *     reflect.sinkValue(dialog.offsetHeight);
   * </code>
   * @type {!Function}
   */
  rf.sinkValue = function(x) {
    rf.sinkValue[' '](x);
    return x;
  };


  /**
   * The compiler should optimize this function away iff no one ever uses
   * reflect.sinkValue.
   */
  rf.sinkValue[' '] = util.nullFunction;


  /**
   * Check if a property can be accessed without throwing an exception.
   * @param {Object} obj The owner of the property.
   * @param {string} prop The property name.
   * @return {boolean} Whether the property is accessible. Will also return true
   *     if obj is null.
   */
  rf.canAccessProperty = function(obj, prop) {
    /** @preserveTry */
    try {
      rf.sinkValue(obj[prop]);
      return true;
    } catch (e) {}
    return false;
  };

  return rf;
});
