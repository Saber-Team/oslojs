require([
  '../../src/history/history',
  '../../src/dom/util',
  '../../src/events/util',
  '../../src/history/eventtype',
  '../../src/log/log',
  '../../src/object/object',
  '../../src/string/util'
], function(History, dom, EventsUtil, HistoryEventType, log, object, string) {

  'use strict';

  var logger = log.getLogger('demo');
  //var logconsole = new goog.debug.DivConsole(goog.dom.getElement('log'));
  //logconsole.setCapturing(true);

  var events = object.getValues(HistoryEventType);
  log.info(logger, 'Listening for: ' + events.join(', ') + '.');

  var h = new History(true, 'history_blank.html');
  EventsUtil.listen(h, events, function(e) {
    log.info(logger, string.subs('dispatched: %s (token="%s", isNavigation=%s)',
      e.type, e.token, e.isNavigation));
  });
  EventsUtil.listen(h, HistoryEventType.NAVIGATE, navCallback);
  h.setEnabled(true);

  window.setToken = function(opt_token) {
    var input = dom.getElement('token_input');
    h.setToken(opt_token || input.value);
  };

  window.replaceToken = function(opt_token) {
    var input = dom.getElement('token_input');
    h.replaceToken(opt_token || input.value);
  };

  function navCallback(e) {
    var output = dom.getElement('token_output');
    if (output) {
      var token = (e.token == null) ? 'null' : '\u201C' + e.token + '\u201D';
      dom.setTextContent(output, token);
    }
  }

});