/**
 * @fileoverview Class for representing incremental data events.
 * @author Leo.Zhang
 * @email zmike86@gmail.com
 */

define([
  '../util/util',
  '../events/event',
  './eventtype'
], function(util, EventBase, EventType) {

  'use strict';

  /**
   * Class for representing incremental data events.
   * @param {Object} data 关联的数据.
   * @extends {EventBase}
   * @constructor
   */
  var IncrementalDataEvent = function(data) {
    EventBase.call(this, EventType.INCREMENTAL_DATA);

    /**
     * 关联的数据.
     * @type {Object}
     */
    this.data = data;
  };

  util.inherits(IncrementalDataEvent, EventBase);

  return IncrementalDataEvent;
});

