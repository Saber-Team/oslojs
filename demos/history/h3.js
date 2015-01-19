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
  //var logconsole = new debug.DivConsole(top.document.getElementById('log'));
  //logconsole.setCapturing(true);

  var events = object.getValues(HistoryEventType);
  log.info(logger, 'Listening for: ' + events.join(', ') + '.');

  var Hist = new History(
    false,
    'history_blank.html',
    top.document.getElementById('hist_state'));

  EventsUtil.listen(Hist, events, function(e) {
    log.info(logger,
      string.subs('dispatched: %s (token="%s", isNavigation=%s)',
      e.type, e.token, e.isNavigation));
  });
  EventsUtil.listen(Hist, HistoryEventType.NAVIGATE, navCallback);
  Hist.setEnabled(true);

  function navCallback(e) {
    var output = top.document.getElementById('token_output');
    if (output) {
      var token = (e.token == null) ? 'null' : '\u201C' + e.token + '\u201D';
      dom.setTextContent(output, token);
    }
  }

  window.Hist = Hist;

});