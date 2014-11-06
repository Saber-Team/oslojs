require([
        '@events.util',
        '@fx.eventType',
        '@fx.util',
        '@fx.easing',
        '@fx.Slide',
        '@fx.Resize',
        '@fx.fadeOutAndHide',
        '@fx.fadeInAndShow',
        '@fx.bgColorTransform',
        '@dom.util'
    ],
    function(EventUtil, EventType, fx, easing, Slide, Resize, FadeOutAndHide,
             FadeInAndShow, BgColorTransform, dom) {

        'use strict';

        var col = [0, 0, 0];
        var duration = 1000;

        var el = document.getElementById('test1');

        /**
         * Enables all buttons then disposes of the animation.
         * @param {!Event} e EventType.END event with
         *     the Animation object in its target.
         */
        function enableButtons(e) {
            for (var i = 0; i <= 15; i++) {
                document.getElementById('but' + i).disabled = false;
            }
            e.target.dispose();
        }

        function disableButtons() {
            for (var i = 0; i <= 15; i++) {
                document.getElementById('but' + i).disabled = true;
            }
        }

        window.slide = function(a, b) {
            var x = el.offsetLeft;
            var y = el.offsetTop;
            var anim = new Slide(el, [x, y], [a, b], duration, easing.easeOut);
            EventUtil.listen(anim, EventType.BEGIN, disableButtons);
            EventUtil.listen(anim, EventType.END, enableButtons);
            anim.play();
        };

        window.resize = function(a, b) {
            var w = el.offsetWidth;
            var h = el.offsetHeight;
            var anim = new Resize(el, [w, h], [a, b], duration, easing.easeOut);
            EventUtil.listen(anim, EventType.BEGIN, disableButtons);
            EventUtil.listen(anim, EventType.END, enableButtons);
            anim.play();
        };

        window.fadeout = function() {
            var anim = new FadeOutAndHide(el, duration);
            EventUtil.listen(anim, EventType.BEGIN, disableButtons);
            EventUtil.listen(anim, EventType.END, enableButtons);
            anim.play();
        };

        window.fadein = function() {
            var anim = new FadeInAndShow(el, duration);
            EventUtil.listen(anim, EventType.BEGIN, disableButtons);
            EventUtil.listen(anim, EventType.END, enableButtons);
            anim.play();
        };

        window.color = function(r, g, b) {
            var anim = new BgColorTransform(el, col, [r, g, b], duration);
            EventUtil.listen(anim, EventType.BEGIN, disableButtons);
            EventUtil.listen(anim, EventType.END, function(e) {
                col = [e.x, e.y, e.z];
                enableButtons(e);
            });
            anim.play();
        };

        window.toggleRequestAnimationFrame = function() {
            rafEnabled = !rafEnabled;
            fx.setAnimationWindow(rafEnabled ? window : null);
            updateRafButton();
        };

        function updateRafButton() {
            dom.setTextContent(dom.getElement('but15'),
                rafEnabled ? 'Disable timing control API' : 'Enable timing control API');
        }

        fx.setAnimationWindow(window);
        var rafEnabled = fx.animationWindow_;
        updateRafButton();
    }
);