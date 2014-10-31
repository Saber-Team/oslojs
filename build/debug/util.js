/** Sogou JavaScript Framework.  2014-10-29 build */
define("Sogou.Debug.Util",["Sogou.Util","Sogou.Array","Sogou.String.Util","Sogou.UA.Util"],function(a,b,c,d){var e,f={},g=50,h=function(b){var c=window.location.href;if(a.isString(b))return{message:b,name:"Unknown error",lineNumber:"Not available",fileName:c,stack:"Not available"};var d,e,f=!1;try{d=b.lineNumber||b.line||"Not available"}catch(g){d="Not available",f=!0}try{e=b.fileName||b.filename||b.sourceURL||c}catch(g){e="Not available",f=!0}return!f&&b.lineNumber&&b.fileName&&b.stack&&b.message&&b.name?b:{message:b.message||"Not available",name:b.name||"UnknownError",lineNumber:d,fileName:e,stack:b.stack||"Not available"}},i=function(a){return k(a||arguments.callee.caller,[])},j=function(a){if(f[a])return f[a];if(e){var b=e(a);if(b)return f[a]=b,b}var c=String(a);if(!f[c]){var d=/function ([^\(]+)/.exec(c);if(d){var g=d[1];f[c]=g}else f[c]="[Anonymous]"}return f[c]},k=function(a,c){var d=[];if(b.contains(c,a))d.push("[...circular reference...]");else if(a&&c.length<g){d.push(j(a)+"(");for(var e=a.arguments,f=0;f<e.length;f++){f>0&&d.push(", ");var h,i=e[f];switch(typeof i){case"object":h=i?"object":"null";break;case"string":h=i;break;case"number":h=String(i);break;case"boolean":h=i?"true":"false";break;case"function":h=j(i),h=h?h:"[fn]";break;case"undefined":default:h=typeof i}h.length>40&&(h=h.substr(0,40)+"..."),d.push(h)}c.push(a),d.push(")\n");try{d.push(k(a.caller,c))}catch(l){d.push("[exception trying to get caller]\n")}}else a?d.push("[...long stack...]"):d.push("[end]");return d.join("")};return{LOGGING_ENABLED:a.DEBUG,catchErrors:function(b,c,e){var f=e||a.global,g=f.onerror,h=!!c;d.isWEBKIT&&!d.isVersionOrHigher("535.3")&&(h=!h),f.onerror=function(a,c,d){return g&&g(a,c,d),b({message:a,fileName:c,line:d}),h}},expose:function(a,b){if("undefined"==typeof a)return"undefined";if(null==a)return"NULL";var c=[];for(var d in a)if(b||"function"!=typeof a[d]){var e=d+" = ";try{e+=a[d]}catch(f){e+="*** "+f+" ***"}c.push(e)}return c.join("\n")},getFunctionName:j,setFunctionResolver:function(a){e=a},exposeException:function(a,b){try{var d=h(a),e="Message: "+c.htmlEscape(d.message)+'\nUrl: <a href="view-source:'+d.fileName+'" target="_new">'+d.fileName+"</a>\nLine: "+d.lineNumber+"\n\nBrowser stack:\n"+c.htmlEscape(d.stack+"-> ")+"[end]\n\nJS stack traversal:\n"+c.htmlEscape(i(b)+"-> ");return e}catch(f){return"Exception trying to expose exception! You win, we lose. "+f}},normalizeErrorObject:h}});