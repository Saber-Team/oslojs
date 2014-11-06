require([
        '@util',
        '@async.delay',
        '@async.throttle',
        '@events.util',
        '@timer',
        '@dom.util'
    ],
    function(util, Delay, Throttle, EventsUtil, Timer, dom) {

        'use strict';

        /**
         * 获得秒数.
         * @param {string} id
         * @return {number}
         */
        var getSeconds = function (id) {
            var time = Number(dom.getElement(id).value);
            if (isNaN(time)) {
                alert('Please enter a Number');
                return null;
            } else {
                return time;
            }
        };

        /**
         * 转换秒到微秒.
         * @param {number} seconds
         * @return {number}
         */
        var inMs = function (seconds) {
            return seconds * 1000;
        };

        // Delay.
        var delay = null;
        var delayStatus = dom.getElement('delayStatus');

        window.doDelay = function() {
            if (delay) {
                dom.setTextContent(delayStatus, 'Delay already set.');
                return;
            }

            var seconds = getSeconds('delaySeconds');
            if (!util.isNumber(seconds)) {
                return;
            }
            delay = new Delay(delayedAction, inMs(seconds));
            delay.start();
            dom.setTextContent(delayStatus, 'Delay for: ' + seconds + ' seconds.');
        };

        window.doReset = function(){
            if (!delay) {
                return;
            }
            dom.setTextContent(delayStatus, 'Delay Restarted.');
            delay.start();
        };

        /**
         * delay回调.
         */
        var delayedAction = function() {
            dom.setTextContent(delayStatus, 'Action called.');
            delay.dispose();
            delay = null;
        };


        // Throttle.

        var throttle = null;
        var throttleCount = 0;
        var throttleFireCount = 0;
        var throttleHits = dom.getElement('throttleHits');
        var throttleStatus = dom.getElement('throttleStatus');

        /**
         * Start a Throttle.
         */
        window.doThrottleStart = function() {
            var seconds = getSeconds('throttleSeconds');
            if (!util.isNumber(seconds)) {
                return;
            }

            if (throttle) {
                throttle.dispose();
                throttleCount = 0;
                throttleFireCount = 0;
            }

            throttle = new Throttle(throttleAction, inMs(seconds));

            // Reset the hits and the count.
            dom.setTextContent(throttleHits, throttleFireCount);
            dom.setTextContent(throttleStatus, throttleCount);
        };

        /**
         * Do the throttle action, this can be called as often as desired.
         */
        window.doThrottle = function(){
            if (throttle) {
                // Fire the throttle, this will only actually 'fire' no more than
                // once per interval.
                throttle.fire();
                dom.setTextContent(throttleHits, ++throttleFireCount);
            }
        };

        /**
         * Throttle Action Callback.
         */
        var throttleAction = function() {
            dom.setTextContent(throttleStatus, ++throttleCount);
        };


        // Timer.

        var timer = null;
        var timerStatus = dom.getElement('timerStatus');
        var tickCount = 0;

        window.doTimerStart = function() {
            var seconds = getSeconds('timerSeconds');
            if (!util.isNumber(seconds)) {
                return;
            }
            if (timer) {
                timer.dispose();
                tickCount = 0;
            }
            // A timer can be created with no callback object,
            // listen for the TICK event.
            timer = new Timer(inMs(seconds));
            timer.start();
            EventsUtil.listen(timer, Timer.TICK, tickAction);
        };

        window.doTimerStop = function() {
            if (timer) {
                timer.stop();
            }
        };

        /**
         * Reset the Timer.
         */
        window.doTimerRestart = function() {
            if (timer) {
                timer.start();
            }
        };

        /**
         * Tick callback, called whenever the Timer sends a TICK event.
         */
        var tickAction = function() {
            tickCount++;
            dom.setTextContent(timerStatus, 'Got tick: ' + tickCount);
        };


        // CallOnce Timer

        var doOnceTimer = null;
        var doOnceStatus = dom.getElement('doOnceStatus');

        /*
         * 只执行一次, optional delay.  Can not be restarted, like Delay,
         * only cleared.
         */
        window.doOnce = function() {
            if (doOnceTimer) {
                // Timer already set, do not reset it.
                return;
            }
            var seconds = getSeconds('doOnceSeconds');
            if (!util.isNumber(seconds)) {
                return;
            }
            dom.setTextContent(doOnceStatus, 'Will call action in ' + seconds + ' seconds.');
            doOnceTimer = Timer.callOnce(function() {
                dom.setTextContent(doOnceStatus, 'Action called.');
                doOnceTimer = null;
            }, inMs(seconds));
        };

        /*
         * Clear the doOnce.
         */
        window.doOnceClear = function() {
            Timer.clear(doOnceTimer);
            doOnceTimer = null;
            dom.setTextContent(doOnceStatus, 'Timer cleared, action not called.');
        };

    }
);