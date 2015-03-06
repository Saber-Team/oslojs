/** Oslo JavaScript Framework. */
define(["../util/util","../array/array","../string/util","../ds/map","./util","../ds/util"],function(a,b,c,d,e,f){"use strict";var g=function(b,c){var d;b instanceof g?(this.ignoreCase_=a.isDef(c)?c:b.getIgnoreCase(),this.setScheme(b.getScheme()),this.setUserInfo(b.getUserInfo()),this.setDomain(b.getDomain()),this.setPort(b.getPort()),this.setPath(b.getPath()),this.setQueryData(b.getQueryData().clone()),this.setFragment(b.getFragment())):b&&(d=e.split(String(b)))?(this.ignoreCase_=!!c,this.setScheme(d[e.ComponentIndex.SCHEME]||"",!0),this.setUserInfo(d[e.ComponentIndex.USER_INFO]||"",!0),this.setDomain(d[e.ComponentIndex.DOMAIN]||"",!0),this.setPort(d[e.ComponentIndex.PORT]),this.setPath(d[e.ComponentIndex.PATH]||"",!0),this.setQueryData(d[e.ComponentIndex.QUERY_DATA]||"",!0),this.setFragment(d[e.ComponentIndex.FRAGMENT]||"",!0)):(this.ignoreCase_=!!c,this.queryData_=new g.QueryData(null,null,this.ignoreCase_))};return g.preserveParameterTypesCompatibilityFlag=!1,g.RANDOM_PARAM=e.StandardQueryParam.RANDOM,g.prototype.scheme_="",g.prototype.userInfo_="",g.prototype.domain_="",g.prototype.port_=null,g.prototype.path_="",g.prototype.queryData_,g.prototype.fragment_="",g.prototype.isReadOnly_=!1,g.prototype.ignoreCase_=!1,g.prototype.toString=function(){var a=[],b=this.getScheme();b&&a.push(g.encodeSpecialChars_(b,g.reDisallowedInSchemeOrUserInfo_),":");var d=this.getDomain();if(d){a.push("//");var e=this.getUserInfo();e&&a.push(g.encodeSpecialChars_(e,g.reDisallowedInSchemeOrUserInfo_),"@"),a.push(c.urlEncode(d));var f=this.getPort();null!=f&&a.push(":",String(f))}var h=this.getPath();h&&(this.hasDomain()&&"/"!=h.charAt(0)&&a.push("/"),a.push(g.encodeSpecialChars_(h,"/"===h.charAt(0)?g.reDisallowedInAbsolutePath_:g.reDisallowedInRelativePath_)));var i=this.getEncodedQuery();i&&a.push("?",i);var j=this.getFragment();return j&&a.push("#",g.encodeSpecialChars_(j,g.reDisallowedInFragment_)),a.join("")},g.prototype.resolve=function(a){var b=this.clone(),c=a.hasScheme();c?b.setScheme(a.getScheme()):c=a.hasUserInfo(),c?b.setUserInfo(a.getUserInfo()):c=a.hasDomain(),c?b.setDomain(a.getDomain()):c=a.hasPort();var d=a.getPath();if(c)b.setPort(a.getPort());else if(c=a.hasPath(),c){if("/"!==d.charAt(0))if(this.hasDomain()&&!this.hasPath())d="/"+d;else{var e=b.getPath().lastIndexOf("/");-1!==e&&(d=b.getPath().substr(0,e+1)+d)}d=g.removeDotSegments(d)}return c?b.setPath(d):c=a.hasQuery(),c?b.setQueryData(a.getDecodedQuery()):c=a.hasFragment(),c&&b.setFragment(a.getFragment()),b},g.prototype.clone=function(){return new g(this)},g.prototype.getScheme=function(){return this.scheme_},g.prototype.setScheme=function(a,b){return this.enforceReadOnly(),this.scheme_=b?g.decodeOrEmpty_(a):a,this.scheme_&&(this.scheme_=this.scheme_.replace(/:$/,"")),this},g.prototype.hasScheme=function(){return!!this.scheme_},g.prototype.getUserInfo=function(){return this.userInfo_},g.prototype.setUserInfo=function(a,b){return this.enforceReadOnly(),this.userInfo_=b?g.decodeOrEmpty_(a):a,this},g.prototype.hasUserInfo=function(){return!!this.userInfo_},g.prototype.getDomain=function(){return this.domain_},g.prototype.setDomain=function(a,b){return this.enforceReadOnly(),this.domain_=b?g.decodeOrEmpty_(a):a,this},g.prototype.hasDomain=function(){return!!this.domain_},g.prototype.getPort=function(){return this.port_},g.prototype.setPort=function(a){if(this.enforceReadOnly(),a){if(a=Number(a),isNaN(a)||0>a)throw Error("Bad port number "+a);this.port_=a}else this.port_=null;return this},g.prototype.hasPort=function(){return null!==this.port_},g.prototype.getPath=function(){return this.path_},g.prototype.setPath=function(a,b){return this.enforceReadOnly(),this.path_=b?g.decodeOrEmpty_(a):a,this},g.prototype.hasPath=function(){return!!this.path_},g.prototype.hasQuery=function(){return""!==this.queryData_.toString()},g.prototype.setQueryData=function(a,b){return this.enforceReadOnly(),a instanceof g.QueryData?(this.queryData_=a,this.queryData_.setIgnoreCase(this.ignoreCase_)):(b||(a=g.encodeSpecialChars_(a,g.reDisallowedInQuery_)),this.queryData_=new g.QueryData(a,null,this.ignoreCase_)),this},g.prototype.setQuery=function(a,b){return this.setQueryData(a,b)},g.prototype.getEncodedQuery=function(){return this.queryData_.toString()},g.prototype.getDecodedQuery=function(){return this.queryData_.toDecodedString()},g.prototype.getQueryData=function(){return this.queryData_},g.prototype.getQuery=function(){return this.getEncodedQuery()},g.prototype.setParameterValue=function(a,b){return this.enforceReadOnly(),this.queryData_.set(a,b),this},g.prototype.setParameterValues=function(b,c){return this.enforceReadOnly(),a.isArray(c)||(c=[String(c)]),this.queryData_.setValues(b,c),this},g.prototype.getParameterValues=function(a){return this.queryData_.getValues(a)},g.prototype.getParameterValue=function(a){return this.queryData_.get(a)},g.prototype.getFragment=function(){return this.fragment_},g.prototype.setFragment=function(a,b){return this.enforceReadOnly(),this.fragment_=b?g.decodeOrEmpty_(a):a,this},g.prototype.hasFragment=function(){return!!this.fragment_},g.prototype.hasSameDomainAs=function(a){return!((this.hasDomain()||a.hasDomain())&&this.getDomain()!==a.getDomain()||(this.hasPort()||a.hasPort())&&this.getPort()!==a.getPort())},g.prototype.makeUnique=function(){return this.enforceReadOnly(),this.setParameterValue(g.RANDOM_PARAM,c.getRandomString()),this},g.prototype.removeParameter=function(a){return this.enforceReadOnly(),this.queryData_.remove(a),this},g.prototype.setReadOnly=function(a){return this.isReadOnly_=a,this},g.prototype.isReadOnly=function(){return this.isReadOnly_},g.prototype.enforceReadOnly=function(){if(this.isReadOnly_)throw Error("Tried to modify a read-only Uri")},g.prototype.setIgnoreCase=function(a){return this.ignoreCase_=a,this.queryData_&&this.queryData_.setIgnoreCase(a),this},g.prototype.getIgnoreCase=function(){return this.ignoreCase_},g.parse=function(a,b){return a instanceof g?a.clone():new g(a,b)},g.create=function(a,b,c,d,e,f,h,i){var j=new g(null,i);return a&&j.setScheme(a),b&&j.setUserInfo(b),c&&j.setDomain(c),d&&j.setPort(d),e&&j.setPath(e),f&&j.setQueryData(f),h&&j.setFragment(h),j},g.resolve=function(a,b){return a instanceof g||(a=g.parse(a)),b instanceof g||(b=g.parse(b)),a.resolve(b)},g.removeDotSegments=function(a){if(".."==a||"."==a)return"";if(c.contains(a,"./")||c.contains(a,"/.")){for(var b=c.startsWith(a,"/"),d=a.split("/"),e=[],f=0;f<d.length;){var g=d[f++];"."==g?b&&f==d.length&&e.push(""):".."==g?((e.length>1||1==e.length&&""!=e[0])&&e.pop(),b&&f==d.length&&e.push("")):(e.push(g),b=!0)}return e.join("/")}return a},g.decodeOrEmpty_=function(a){return a?decodeURIComponent(a):""},g.encodeSpecialChars_=function(b,c){return a.isString(b)?encodeURI(b).replace(c,g.encodeChar_):null},g.encodeChar_=function(a){var b=a.charCodeAt(0);return"%"+(15&b>>4).toString(16)+(15&b).toString(16)},g.reDisallowedInSchemeOrUserInfo_=/[#\/\?@]/g,g.reDisallowedInRelativePath_=/[\#\?:]/g,g.reDisallowedInAbsolutePath_=/[\#\?]/g,g.reDisallowedInQuery_=/[\#\?@]/g,g.reDisallowedInFragment_=/#/g,g.haveSameDomain=function(a,b){var c=e.split(a),d=e.split(b);return c[e.ComponentIndex.DOMAIN]==d[e.ComponentIndex.DOMAIN]&&c[e.ComponentIndex.PORT]==d[e.ComponentIndex.PORT]},g.QueryData=function(a,b,c){this.encodedQuery_=a||null,this.ignoreCase_=!!c},g.QueryData.prototype.ensureKeyMapInitialized_=function(){if(!this.keyMap_&&(this.keyMap_=new d,this.count_=0,this.encodedQuery_))for(var a=this.encodedQuery_.split("&"),b=0;b<a.length;b++){var e=a[b].indexOf("="),f=null,g=null;e>=0?(f=a[b].substring(0,e),g=a[b].substring(e+1)):f=a[b],f=c.urlDecode(f),f=this.getKeyName_(f),this.add(f,g?c.urlDecode(g):"")}},g.QueryData.createFromMap=function(b,c,d){var e=f.getKeys(b);if("undefined"==typeof e)throw Error("Keys are undefined");for(var h=new g.QueryData(null,null,d),i=f.getValues(b),j=0;j<e.length;j++){var k=e[j],l=i[j];a.isArray(l)?h.setValues(k,l):h.add(k,l)}return h},g.QueryData.createFromKeysValues=function(a,b,c,d){if(a.length!=b.length)throw Error("Mismatched lengths for keys/values");for(var e=new g.QueryData(null,null,d),f=0;f<a.length;f++)e.add(a[f],b[f]);return e},g.QueryData.prototype.keyMap_=null,g.QueryData.prototype.count_=null,g.QueryData.prototype.getCount=function(){return this.ensureKeyMapInitialized_(),this.count_},g.QueryData.prototype.add=function(a,b){this.ensureKeyMapInitialized_(),this.invalidateCache_(),a=this.getKeyName_(a);var c=this.keyMap_.get(a);return c||this.keyMap_.set(a,c=[]),c.push(b),this.count_++,this},g.QueryData.prototype.remove=function(a){return this.ensureKeyMapInitialized_(),a=this.getKeyName_(a),this.keyMap_.containsKey(a)?(this.invalidateCache_(),this.count_-=this.keyMap_.get(a).length,this.keyMap_.remove(a)):!1},g.QueryData.prototype.clear=function(){this.invalidateCache_(),this.keyMap_=null,this.count_=0},g.QueryData.prototype.isEmpty=function(){return this.ensureKeyMapInitialized_(),0==this.count_},g.QueryData.prototype.containsKey=function(a){return this.ensureKeyMapInitialized_(),a=this.getKeyName_(a),this.keyMap_.containsKey(a)},g.QueryData.prototype.containsValue=function(a){var c=this.getValues();return b.contains(c,a)},g.QueryData.prototype.getKeys=function(){this.ensureKeyMapInitialized_();for(var a=this.keyMap_.getValues(),b=this.keyMap_.getKeys(),c=[],d=0;d<b.length;d++)for(var e=a[d],f=0;f<e.length;f++)c.push(b[d]);return c},g.QueryData.prototype.getValues=function(a){this.ensureKeyMapInitialized_();var b=[];if(a)this.containsKey(a)&&(b=b.concat(this.keyMap_.get(this.getKeyName_(a))));else for(var c=this.keyMap_.getValues(),d=0;d<c.length;d++)b=b.concat(c[d]);return b},g.QueryData.prototype.set=function(a,b){return this.ensureKeyMapInitialized_(),this.invalidateCache_(),a=this.getKeyName_(a),this.containsKey(a)&&(this.count_-=this.keyMap_.get(a).length),this.keyMap_.set(a,[b]),this.count_++,this},g.QueryData.prototype.get=function(a,b){var c=a?this.getValues(a):[];return g.preserveParameterTypesCompatibilityFlag?c.length>0?c[0]:b:c.length>0?String(c[0]):b},g.QueryData.prototype.setValues=function(a,c){this.remove(a),c.length>0&&(this.invalidateCache_(),this.keyMap_.set(this.getKeyName_(a),b.toArray(c)),this.count_+=c.length)},g.QueryData.prototype.toString=function(){if(this.encodedQuery_)return this.encodedQuery_;if(!this.keyMap_)return"";for(var a=[],b=this.keyMap_.getKeys(),d=0;d<b.length;d++)for(var e=b[d],f=c.urlEncode(e),g=this.getValues(e),h=0;h<g.length;h++){var i=f;""!==g[h]&&(i+="="+c.urlEncode(g[h])),a.push(i)}return this.encodedQuery_=a.join("&")},g.QueryData.prototype.toDecodedString=function(){return g.decodeOrEmpty_(this.toString())},g.QueryData.prototype.invalidateCache_=function(){this.encodedQuery_=null},g.QueryData.prototype.filterKeys=function(a){return this.ensureKeyMapInitialized_(),f.forEach(this.keyMap_,function(c,d){b.contains(a,d)||this.remove(d)},this),this},g.QueryData.prototype.clone=function(){var a=new g.QueryData;return a.encodedQuery_=this.encodedQuery_,this.keyMap_&&(a.keyMap_=this.keyMap_.clone(),a.count_=this.count_),a},g.QueryData.prototype.getKeyName_=function(a){var b=String(a);return this.ignoreCase_&&(b=b.toLowerCase()),b},g.QueryData.prototype.setIgnoreCase=function(a){var b=a&&!this.ignoreCase_;b&&(this.ensureKeyMapInitialized_(),this.invalidateCache_(),f.forEach(this.keyMap_,function(a,b){var c=b.toLowerCase();b!=c&&(this.remove(b),this.setValues(c,a))},this)),this.ignoreCase_=a},g.QueryData.prototype.extend=function(){for(var a=0;a<arguments.length;a++){var b=arguments[a];f.forEach(b,function(a,b){this.add(b,a)},this)}},g});