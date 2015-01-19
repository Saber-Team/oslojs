require([
  '../../src/events/util',
  '../../src/history/eventtype',
  '../../src/history/html5history',
  '../../src/uri/util'
], function(EventsUtil, EventType, Html5History, uri) {

  'use strict';

  var h;
  try {
    h = new Html5History();
  } catch (e) {
    document.write(e.message);
  }

  if (h) {
    var cur = 'kittens';

    EventsUtil.listen(h, EventType.NAVIGATE, function(e) {
      var token = e.token || 'kittens';
      var next = document.getElementById(token);
      if (next) {
        document.getElementById(cur).className = 'section';
        next.className = 'section active';
        cur = token;
      }
    });

    h.setUseFragment(false);
    // h.setPathPrefix(new Uri(document.location.href).getPath() + '/');
    h.setPathPrefix(uri.getPath(document.location.href) + '/');
    h.setEnabled(true);

    EventsUtil.listen(
      document.getElementById('links'), 'click', function(e) {
        if (e.target.tagName == 'A') {
          h.setToken(e.target.getAttribute('token'), e.target.title);
          e.preventDefault();
        }
      });
  }

});