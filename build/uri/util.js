/** 
 * Sogou JavaScript Library 
 * 2014-10-09 build 
 */
sogou("Sogou.Uri.Util",["Sogou.Util","Sogou.String.Util","Sogou.UA.Util"],function(a,b,c){"use strict";var d,e,f={AMPERSAND:38,EQUAL:61,HASH:35,QUESTION:63},g=function(a,b,c,d,e,f,g){var h="";return a&&(h+=a+":"),c&&(h+="//",b&&(h+=b+"@"),h+=c,d&&(h+=":"+d)),e&&(h+=e),f&&(h+="?"+f),g&&(h+="#"+g),h},h=new RegExp("^(?:([^:/?#.]+):)?(?://(?:([^/?#]*)@)?([^/#?]*?)(?::([0-9]+))?(?=[/#?]|$))?([^?#]+)?(?:\\?([^#]*))?(?:#(.*))?$"),i={SCHEME:1,USER_INFO:2,DOMAIN:3,PORT:4,PATH:5,QUERY_DATA:6,FRAGMENT:7},j=function(a){return l(),a.match(h)},k=c.isWEBKIT,l=function(){if(k){k=!1;var b=a.global.location;if(b){var c=b.href;if(c){var d=t(c);if(d&&d!=b.hostname)throw k=!0,Error()}}}},m=function(a){return a&&decodeURIComponent(a)},n=function(a,b){return j(b)[a]||null},o=function(a){return n(i.SCHEME,a)},p=function(a){var b=o(a);if(!b&&window.location){var c=window.location.protocol;b=c.substr(0,c.length-1)}return b?b.toLowerCase():""},q=function(a){return n(i.USER_INFO,a)},r=function(a){return m(q(a))},s=function(a){return n(i.DOMAIN,a)},t=function(a){return m(s(a))},u=function(a){return Number(n(i.PORT,a))||null},v=function(a){return n(i.PATH,a)},w=function(a){return m(v(a))},x=function(a){return n(i.QUERY_DATA,a)},y=function(a){var b=a.indexOf("#");return 0>b?null:a.substr(b+1)},z=function(a,b){return D(a)+(b?"#"+b:"")},A=function(a){return m(y(a))},B=function(a){var b=j(a);return g(b[i.SCHEME],b[i.USER_INFO],b[i.DOMAIN],b[i.PORT])},C=function(a){var b=j(a);return g(null,null,null,null,b[i.PATH],b[i.QUERY_DATA],b[i.FRAGMENT])},D=function(a){var b=a.indexOf("#");return 0>b?a:a.substr(0,b)},E=function(a,b){var c=j(a),d=j(b);return c[i.DOMAIN]==d[i.DOMAIN]&&c[i.SCHEME]==d[i.SCHEME]&&c[i.PORT]==d[i.PORT]},F=function(b){if(a.DEBUG&&(b.indexOf("#")>=0||b.indexOf("?")>=0))throw Error("uri.utils: Fragment or query identifiers are not supported: ["+b+"]")},G=function(a){if(a[1]){var b=a[0],c=b.indexOf("#");c>=0&&(a.push(b.substr(c)),a[0]=b=b.substr(0,c));var d=b.indexOf("?");0>d?a[1]="?":d==b.length-1&&(a[1]=void 0)}return a.join("")},H=function(c,d,e){if(a.isArray(d))for(var f=0;f<d.length;f++)H(c,String(d[f]),e);else null!=d&&e.push("&",c,""===d?"":"=",b.urlEncode(d))},I=function(a,b,c){for(var d=c||0;d<b.length;d+=2)H(b[d],b[d+1],a);return a},J=function(a,b){var c=I([],a,b);return c[0]="",c.join("")},K=function(a,b){for(var c in b)H(c,b[c],a);return a},L=function(a){var b=K([],a);return b[0]="",b.join("")},M=function(a){return G(2==arguments.length?I([a],arguments[1],0):I([a],arguments,1))},N=function(a,b){return G(K([a],b))},O=function(c,d,e){var f=[c,"&",d];return a.isDef(e)&&!a.isNull(e)&&f.push("=",b.urlEncode(e)),G(f)},P=function(a,b,c,d){for(var e=b,g=c.length;(e=a.indexOf(c,e))>=0&&d>e;){var h=a.charCodeAt(e-1);if(h==f.AMPERSAND||h==f.QUESTION){var i=a.charCodeAt(e+g);if(!i||i==f.EQUAL||i==f.AMPERSAND||i==f.HASH)return e}e+=g+1}return-1},Q=/#|$/,R=function(a,b){return P(a,0,b,a.search(Q))>=0},S=function(a,c){var d=a.search(Q),e=P(a,0,c,d);if(0>e)return null;var f=a.indexOf("&",e);return(0>f||f>d)&&(f=d),e+=c.length+1,b.urlDecode(a.substr(e,f-e))},T=function(a,c){for(var d,e=a.search(Q),f=0,g=[];(d=P(a,f,c,e))>=0;)f=a.indexOf("&",d),(0>f||f>e)&&(f=e),d+=c.length+1,g.push(b.urlDecode(a.substr(d,f-d)));return g},U=/[?&]($|#)/,V=function(a,b){for(var c,d=a.search(Q),e=0,f=[];(c=P(a,e,b,d))>=0;)f.push(a.substring(e,c)),e=Math.min(a.indexOf("&",c)+1||d,d);return f.push(a.substr(e)),f.join("").replace(U,"$1")},W=function(a,b,c){return O(V(a,b),b,c)},X=function(a,c){return F(a),b.endsWith(a,"/")&&(a=a.substr(0,a.length-1)),b.startsWith(c,"/")&&(c=c.substr(1)),b.buildString(a,"/",c)},Y={RANDOM:"zx"},Z=function(a){return W(a,Y.RANDOM,b.getRandomString())};return{buildFromEncodedParts:g,ComponentIndex:i,split:j,getScheme:o,getEffectiveScheme:p,getUserInfoEncoded:q,getUserInfo:r,getDomainEncoded:s,getDomain:t,getPort:u,getPathEncoded:v,getPath:w,getQueryData:x,getFragmentEncoded:y,setFragmentEncoded:z,getFragment:A,getHost:B,getPathAndAfter:C,removeFragment:D,haveSameDomain:E,QueryValue:d,QueryArray:e,buildQueryData:J,buildQueryDataFromMap:L,appendParams:M,appendParamsFromMap:N,appendParam:O,hasParam:R,getParamValue:S,getParamValues:T,removeParam:V,setParam:W,appendPath:X,StandardQueryParam:Y,makeUnique:Z}});