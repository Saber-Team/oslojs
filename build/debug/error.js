/** 
 * Sogou JavaScript Library 
 * 2014-10-19 build 
 */
define("Sogou.Debug.Error",["Sogou.Util"],function(a){"use strict";var b=function(a){Error.captureStackTrace?Error.captureStackTrace(this,b):this.stack=(new Error).stack||"",a&&(this.message=String(a))};return a.inherits(b,Error),b.prototype.name="CustomError",b});