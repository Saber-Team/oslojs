require([
        'Sogou.Events.Util',
        'Sogou.Events.MouseWheelEventType',
        'Sogou.Events.MouseWheelHandler'
    ],
    function(EventUtil, EventType, MouseWheelHandler) {
        var MOUSEWHEEL = EventType.MOUSEWHEEL;

        function $(id) {
            return document.getElementById(id)
        }

        var x = 100, y = 100;
        var out = $('out');
        var hLine= $('h-line');
        var vLine = $('v-line');
        var status = $('status');

        var availWidth = out.clientWidth - vLine.offsetWidth;
        var availHeight = out.clientHeight - hLine.offsetHeight;

        function handleMouseWheel(e) {
            x += e.deltaX / 3;
            x = Math.max(0, Math.min(availWidth, x));
            y += e.deltaY / 3;
            y = Math.max(0, Math.min(availHeight, y));
            updateLines();
            e.preventDefault();
        }

        function updateLines() {
            vLine.style.left = x + 'px';
            hLine.style.left = x - hLine.offsetWidth / 2 + 'px';
            hLine.style.top = y + 'px';
            vLine.style.top = y - vLine.offsetHeight / 2 + 'px';
            status.innerHTML = x + ', ' + y;
        }

        updateLines();

        var mwh = new MouseWheelHandler(out);
        EventUtil.listen(mwh, MOUSEWHEEL, handleMouseWheel);

        EventUtil.listen(window, 'unload', function(e) {
            EventUtil.unlisten(mwh, MOUSEWHEEL, handleMouseWheel);
        });

        return null;
    }
);