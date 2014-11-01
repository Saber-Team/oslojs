/** Sogou JavaScript Framework.  2014-10-31 build */
define("Sogou.DS.Map",["Sogou.Util","Sogou.Iter.Iterator","Sogou.Iter.StopIteration","Sogou.Object"],function(a,b,c,d){"use strict";var e=function(a,b){return Object.prototype.hasOwnProperty.call(a,b)},f=function(a){this.map_={},this.keys_=[];var b=arguments.length;if(b>1){if(b%2)throw Error("Uneven number of arguments");for(var c=0;b>c;c+=2)this.set(arguments[c],arguments[c+1])}else a&&this.addAll(a)};return f.prototype.count_=0,f.prototype.version_=0,f.prototype.getCount=function(){return this.count_},f.prototype.getValues=function(){this.cleanupKeysArray_();for(var a=[],b=0;b<this.keys_.length;b++){var c=this.keys_[b];a.push(this.map_[c])}return a},f.prototype.getKeys=function(){return this.cleanupKeysArray_(),this.keys_.concat()},f.prototype.containsKey=function(a){return e(this.map_,a)},f.prototype.containsValue=function(a){for(var b=0;b<this.keys_.length;b++){var c=this.keys_[b];if(e(this.map_,c)&&this.map_[c]===a)return!0}return!1},f.prototype.equals=function(a,b){if(this===a)return!0;if(this.count_!==a.getCount())return!1;var c=b||f.defaultEquals;this.cleanupKeysArray_();for(var d,e=0;d=this.keys_[e];e++)if(!c(this.get(d),a.get(d)))return!1;return!0},f.defaultEquals=function(a,b){return a===b},f.prototype.isEmpty=function(){return 0===this.count_},f.prototype.clear=function(){this.map_={},this.keys_.length=0,this.count_=0,this.version_=0},f.prototype.remove=function(a){return e(this.map_,a)?(delete this.map_[a],this.count_--,this.version_++,this.keys_.length>2*this.count_&&this.cleanupKeysArray_(),!0):!1},f.prototype.cleanupKeysArray_=function(){var a,b,c;if(this.count_!==this.keys_.length){for(a=0,b=0;a<this.keys_.length;)c=this.keys_[a],e(this.map_,c)&&(this.keys_[b++]=c),a++;this.keys_.length=b}if(this.count_!==this.keys_.length){var d={};for(a=0,b=0;a<this.keys_.length;)c=this.keys_[a],e(d,c)||(this.keys_[b++]=c,d[c]=1),a++;this.keys_.length=b}},f.prototype.get=function(a,b){return e(this.map_,a)?this.map_[a]:b},f.prototype.set=function(a,b){e(this.map_,a)||(this.count_++,this.keys_.push(a),this.version_++),this.map_[a]=b},f.prototype.addAll=function(a){var b,c;a instanceof f?(b=a.getKeys(),c=a.getValues()):(b=d.getKeys(a),c=d.getValues(a));for(var e=0;e<b.length;e++)this.set(b[e],c[e])},f.prototype.clone=function(){return new f(this)},f.prototype.transpose=function(){for(var a=new f,b=0;b<this.keys_.length;b++){var c=this.keys_[b],d=this.map_[c];a.set(d,c)}return a},f.prototype.toObject=function(){this.cleanupKeysArray_();for(var a={},b=0;b<this.keys_.length;b++){var c=this.keys_[b];a[c]=this.map_[c]}return a},f.prototype.getKeyIterator=function(){return this.__iterator__(!0)},f.prototype.getValueIterator=function(){return this.__iterator__(!1)},f.prototype.__iterator__=function(a){this.cleanupKeysArray_();var d=0,e=this.keys_,f=this.map_,g=this.version_,h=this,i=new b;return i.next=function(){for(;;){if(g!==h.version_)throw Error("The map has changed since the iterator was created");if(d>=e.length)throw c;var b=e[d++];return a?b:f[b]}},i},f});