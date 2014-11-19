/** Oslo JavaScript Framework. */
define("@net.networkTester",["@util","@timer","@uri.Uri"],function(a,b,c){"use strict";var d=function(a,b,d){this.callback_=a,this.context_=b,d||(d=new c("//www.sogou.com/images/logo/new/sogou.png"),d.makeUnique()),this.uri_=d};return d.DEFAULT_TIMEOUT_MS=1e4,d.prototype.timeoutMs_=d.DEFAULT_TIMEOUT_MS,d.prototype.running_=!1,d.prototype.retries_=0,d.prototype.attempt_=0,d.prototype.pauseBetweenRetriesMs_=0,d.prototype.timeoutTimer_=null,d.prototype.pauseTimer_=null,d.prototype.getTimeout=function(){return this.timeoutMs_},d.prototype.setTimeout=function(a){this.timeoutMs_=a},d.prototype.getNumRetries=function(){return this.retries_},d.prototype.setNumRetries=function(a){this.retries_=a},d.prototype.getPauseBetweenRetries=function(){return this.pauseBetweenRetriesMs_},d.prototype.setPauseBetweenRetries=function(a){this.pauseBetweenRetriesMs_=a},d.prototype.getUri=function(){return this.uri_},d.prototype.setUri=function(a){this.uri_=a},d.prototype.isRunning=function(){return this.running_},d.prototype.start=function(){if(this.running_)throw Error("NetworkTester.start called when already running");this.running_=!0,this.attempt_=0,this.startNextAttempt_()},d.prototype.stop=function(){this.cleanupCallbacks_(),this.running_=!1},d.prototype.startNextAttempt_=function(){this.attempt_++,d.getNavigatorOffline_()?b.callOnce(a.bind(this.onResult,this,!1),0):(this.image_=new Image,this.image_.onload=a.bind(this.onImageLoad_,this),this.image_.onerror=a.bind(this.onImageError_,this),this.image_.onabort=a.bind(this.onImageAbort_,this),this.timeoutTimer_=b.callOnce(this.onImageTimeout_,this.timeoutMs_,this),this.image_.src=String(this.uri_))},d.getNavigatorOffline_=function(){return"onLine"in navigator&&!navigator.onLine},d.prototype.onImageLoad_=function(){this.onResult(!0)},d.prototype.onImageError_=function(){this.onResult(!1)},d.prototype.onImageAbort_=function(){this.onResult(!1)},d.prototype.onImageTimeout_=function(){this.onResult(!1)},d.prototype.onResult=function(a){this.cleanupCallbacks_(),a?(this.running_=!1,this.callback_.call(this.context_,!0)):this.attempt_<=this.retries_?this.pauseBetweenRetriesMs_?this.pauseTimer_=b.callOnce(this.onPauseFinished_,this.pauseBetweenRetriesMs_,this):this.startNextAttempt_():(this.running_=!1,this.callback_.call(this.context_,!1))},d.prototype.onPauseFinished_=function(){this.pauseTimer_=null,this.startNextAttempt_()},d.prototype.cleanupCallbacks_=function(){this.image_&&(this.image_.onload=null,this.image_.onerror=null,this.image_.onabort=null,this.image_=null),this.timeoutTimer_&&(b.clear(this.timeoutTimer_),this.timeoutTimer_=null),this.pauseTimer_&&(b.clear(this.pauseTimer_),this.pauseTimer_=null)},d});