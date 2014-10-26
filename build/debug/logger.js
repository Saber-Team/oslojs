/** Sogou JavaScript Framework.  2014-10-27 build */
define("Sogou.Debug.Logger",["Sogou.Util","Sogou.Array","Sogou.Debug.Util","Sogou.Debug.LogBuffer","Sogou.Debug.LogRecord","Sogou.Debug.LogLevel"],function(a,b,c,d,e,f){var g=function(a){this.name_=a};g.prototype.parent_=null,g.prototype.level_=null,g.prototype.children_=null,g.prototype.handlers_=null,g.ENABLE_HIERARCHY=!0,g.ENABLE_HIERARCHY||(g.rootHandlers_=[],g.rootLevel_),g.getLogger=function(a){return h.getLogger(a)},g.logToProfilers=function(b){a.global.console&&(a.global.console.timeStamp?a.global.console.timeStamp(b):a.global.console.markTimeline&&a.global.console.markTimeline(b)),a.global.msWriteProfilerMark&&a.global.msWriteProfilerMark(b)},g.prototype.getName=function(){return this.name_},g.prototype.addHandler=function(a){c.LOGGING_ENABLED&&(g.ENABLE_HIERARCHY?(this.handlers_||(this.handlers_=[]),this.handlers_.push(a)):g.rootHandlers_.push(a))},g.prototype.removeHandler=function(a){if(c.LOGGING_ENABLED){var d=g.ENABLE_HIERARCHY?this.handlers_:g.rootHandlers_;return!!d&&b.remove(d,a)}return!1},g.prototype.getParent=function(){return this.parent_},g.prototype.getChildren=function(){return this.children_||(this.children_={}),this.children_},g.prototype.setLevel=function(a){c.LOGGING_ENABLED&&(g.ENABLE_HIERARCHY?this.level_=a:g.rootLevel_=a)},g.prototype.getLevel=function(){return c.LOGGING_ENABLED?this.level_:f.OFF},g.prototype.getEffectiveLevel=function(){return c.LOGGING_ENABLED?g.ENABLE_HIERARCHY?this.level_?this.level_:this.parent_?this.parent_.getEffectiveLevel():null:g.rootLevel_:f.OFF},g.prototype.isLoggable=function(a){return c.LOGGING_ENABLED&&a.value>=this.getEffectiveLevel().value},g.prototype.log=function(a,b,d){c.LOGGING_ENABLED&&this.isLoggable(a)&&this.doLogRecord_(this.getLogRecord(a,b,d))},g.prototype.getLogRecord=function(a,b,f){if(d.isBufferingEnabled())var g=d.getInstance().addRecord(a,b,this.name_);else g=new e(a,b,this.name_);return f&&(g.setException(f),g.setExceptionText(c.exposeException(f,arguments.callee.caller))),g},g.prototype.shout=function(a,b){c.LOGGING_ENABLED&&this.log(f.SHOUT,a,b)},g.prototype.severe=function(a,b){c.LOGGING_ENABLED&&this.log(f.SEVERE,a,b)},g.prototype.warning=function(a,b){c.LOGGING_ENABLED&&this.log(f.WARNING,a,b)},g.prototype.info=function(a,b){c.LOGGING_ENABLED&&this.log(f.INFO,a,b)},g.prototype.config=function(a,b){c.LOGGING_ENABLED&&this.log(f.CONFIG,a,b)},g.prototype.fine=function(a,b){c.LOGGING_ENABLED&&this.log(f.FINE,a,b)},g.prototype.finer=function(a,b){c.LOGGING_ENABLED&&this.log(f.FINER,a,b)},g.prototype.finest=function(a,b){c.LOGGING_ENABLED&&this.log(f.FINEST,a,b)},g.prototype.logRecord=function(a){c.LOGGING_ENABLED&&this.isLoggable(a.getLevel())&&this.doLogRecord_(a)},g.prototype.doLogRecord_=function(a){if(g.logToProfilers("log:"+a.getMessage()),g.ENABLE_HIERARCHY)for(var b=this;b;)b.callPublish_(a),b=b.getParent();else for(var c,d=0;c=g.rootHandlers_[d++];)c(a)},g.prototype.callPublish_=function(a){if(this.handlers_)for(var b,c=0;b=this.handlers_[c];c++)b(a)},g.prototype.setParent_=function(a){this.parent_=a},g.prototype.addChild_=function(a,b){this.getChildren()[a]=b};var h={};return h.loggers_={},h.rootLogger_=null,h.initialize=function(){h.rootLogger_||(h.rootLogger_=new g(""),h.loggers_[""]=h.rootLogger_,h.rootLogger_.setLevel(f.CONFIG))},h.getLoggers=function(){return h.loggers_},h.getRoot=function(){return h.initialize(),h.rootLogger_},h.getLogger=function(a){h.initialize();var b=h.loggers_[a];return b||h.createLogger_(a)},h.createFunctionForCatchErrors=function(a){return function(b){var c=a||h.getRoot();c.severe("Error: "+b.message+" ("+b.fileName+" @ Line: "+b.line+")")}},h.createLogger_=function(a){var b=new g(a);if(g.ENABLE_HIERARCHY){var c=a.lastIndexOf("."),d=a.substr(0,c),e=a.substr(c+1),f=h.getLogger(d);f.addChild_(e,b),b.setParent_(f)}return h.loggers_[a]=b,b},g});