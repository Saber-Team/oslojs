/** Sogou JavaScript Framework.  2014-10-27 build */
define("Sogou.Debug.LogLevel",[],function(){"use strict";var a=function(a,b){this.name=a,this.value=b};return a.prototype.toString=function(){return this.name},a.OFF=new a("OFF",1/0),a.SHOUT=new a("SHOUT",1200),a.SEVERE=new a("SEVERE",1e3),a.WARNING=new a("WARNING",900),a.INFO=new a("INFO",800),a.CONFIG=new a("CONFIG",700),a.FINE=new a("FINE",500),a.FINER=new a("FINER",400),a.FINEST=new a("FINEST",300),a.ALL=new a("ALL",0),a.PREDEFINED_LEVELS=[a.OFF,a.SHOUT,a.SEVERE,a.WARNING,a.INFO,a.CONFIG,a.FINE,a.FINER,a.FINEST,a.ALL],a.predefinedLevelsCache_=null,a.createPredefinedLevelsCache_=function(){a.predefinedLevelsCache_={};for(var b,c=0;b=a.PREDEFINED_LEVELS[c];c++)a.predefinedLevelsCache_[b.value]=b,a.predefinedLevelsCache_[b.name]=b},a.getPredefinedLevel=function(b){return a.predefinedLevelsCache_||a.createPredefinedLevelsCache_(),a.predefinedLevelsCache_[b]||null},a.getPredefinedLevelByValue=function(b){if(a.predefinedLevelsCache_||a.createPredefinedLevelsCache_(),b in a.predefinedLevelsCache_)return a.predefinedLevelsCache_[b];for(var c=0;c<a.PREDEFINED_LEVELS.length;++c){var d=a.PREDEFINED_LEVELS[c];if(d.value<=b)return d}return null},a});