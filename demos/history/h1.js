require([
  '../../src/history/history',
  '../../src/history/eventtype',
  '../../src/dom/util',
  '../../src/events/util',
  '../../src/log/log',
  '../../src/object/object',
  '../../src/string/util'
], function(History, HistoryEventType, dom, EventsUtil, log, object, string) {

  'use strict';

  var logger = log.getLogger('demo');
  //var logconsole = new debug.DivConsole(dom.getElement('log'));
  //logconsole.setCapturing(true);

  var events = object.getValues(HistoryEventType);
  log.info(logger, 'Listening for: ' + events.join(', ') + '.');

  window.setToken = function(opt_val) {
    var input = dom.getElement('token_input');
    h.setToken(opt_val || input.value);
    return false;
  };

  window.replaceToken = function() {
    var input = dom.getElement('token_input');
    h.replaceToken(input.value);
  };

  function navCallback(e) {
    var output = dom.getElement('token_output');
    if (output) {
      var token = (e.token == null) ? 'null' : '\u201C' + e.token + '\u201D';
      dom.setTextContent(output, token);
    }
  }

  var h = new History();
  EventsUtil.listen(h, events, function(e) {
    log.info(logger, string.subs('dispatched: %s (token="%s", isNavigation=%s)',
      e.type, e.token, e.isNavigation));
  });
  EventsUtil.listen(h, HistoryEventType.NAVIGATE, navCallback);
  h.setEnabled(true);
});