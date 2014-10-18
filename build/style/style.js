/** 
 * Sogou JavaScript Library 
 * 2014-10-19 build 
 */
define("Sogou.Style.Util",["Sogou.Util","Sogou.Array","Sogou.Dom.Util","Sogou.Dom.NodeType","Sogou.Dom.Vender","Sogou.Math.Coordinate","Sogou.Math.Size","Sogou.Object","Sogou.String.Util","Sogou.UA.Util"],function(a,b,c,d,e,f,g,h,i,j){"use strict";var k=new RegExp("matrix\\([0-9\\.\\-]+, [0-9\\.\\-]+, [0-9\\.\\-]+, [0-9\\.\\-]+, ([0-9\\.\\-]+)p?x?, ([0-9\\.\\-]+)p?x?\\)");function l(a,b){var c=i.toCamelCase(b);if(void 0===a.style[c]){var d=e.getVendorJsPrefix()+i.toTitleCase(b);if(void 0!==a.style[d])return d}return c}function m(a,b,c){var d=l(a,c);d&&(a.style[d]=b)}function n(a,b){return t(a,b)||u(a,b)||a.style&&a.style[b]}function o(a,b){return"number"==typeof a&&(a=(b?Math.round(a):a)+"px"),a}function p(a){var b;if(a.getBoundingClientRect){var d=F(a);b=new f(d.left,d.top)}else{var e=c.getDomHelper(a).getDocumentScroll(),g=L(a);b=new f(g.x-e.x,g.y-e.y)}return j.isGECKO&&!j.isVersionOrHigher(12)?f.sum(b,q(a)):b}function q(a){var b;j.isIE?b="-ms-transform":j.isWEBKIT?b="-webkit-transform":j.isOPERA?b="-o-transform":j.isGECKO&&(b="-moz-transform");var c;if(b&&(c=n(a,b)),c||(c=n(a,"transform")),!c)return new f(0,0);var d=c.match(k);return d?new f(parseFloat(d[1]),parseFloat(d[2])):new f(0,0)}function r(b,c,d){a.isString(c)?m(b,d,c):h.forEach(c,a.partial(m,b))}function s(a,b){var c=a.style[i.toCamelCase(b)];return"undefined"!=typeof c?c:a.style[l(a,b)]||""}function t(a,b){var d=c.getOwnerDocument(a);if(d.defaultView&&d.defaultView.getComputedStyle){var e=d.defaultView.getComputedStyle(a,null);if(e)return e[b]||e.getPropertyValue(b)||""}return""}function u(a,b){return a.currentStyle?a.currentStyle[b]:null}function v(a){return n(a,"position")}function w(a){return n(a,"backgroundColor")}function x(a){return n(a,"overflowX")}function y(a){return n(a,"overflowY")}function z(a){return n(a,"zIndex")}function A(a){var b=a.style,c="";if("opacity"in b)c=b.opacity;else if("MozOpacity"in b)c=b.MozOpacity;else if("filter"in b){var d=b.filter.match(/alpha\(opacity=([\d.]+)\)/);d&&(c=String(d[1]/100))}return""==c?c:Number(c)}function B(a,b){var c=a.style;"opacity"in c?c.opacity=b:"MozOpacity"in c?c.MozOpacity=b:"filter"in c&&(c.filter=""===b?"":"alpha(opacity="+100*b+")")}function C(a,b){a.style[j.isIE?"styleFloat":"cssFloat"]=b}function D(a){return a.style[j.isIE?"styleFloat":"cssFloat"]||""}function E(a){return"rtl"==n(a,"direction")}function F(a){var b;try{b=a.getBoundingClientRect()}catch(c){return{left:0,top:0,right:0,bottom:0}}if(j.isIE){var d=a.ownerDocument;b.left-=d.documentElement.clientLeft+d.body.clientLeft,b.top-=d.documentElement.clientTop+d.body.clientTop}return b}function G(a){if(j.isIE&&!j.isDocumentModeOrHigher(8))return a.offsetParent;for(var b=c.getOwnerDocument(a),d=n(a,"position"),e="fixed"==d||"absolute"==d,f=a.parentNode;f&&f!=b;f=f.parentNode)if(d=n(f,"position"),e=e&&"static"==d&&f!=b.documentElement&&f!=b.body,!e&&(f.scrollWidth>f.clientWidth||f.scrollHeight>f.clientHeight||"fixed"==d||"absolute"==d||"relative"==d))return f;return null}function H(a,b,c){var d=L(a);b instanceof f&&(c=b.y,b=b.x);var e=b-d.x,g=c-d.y;I(a,a.offsetLeft+e,a.offsetTop+g)}function I(a,b,c){var d,e,g=j.isGECKO&&(j.isMAC||j.isX11)&&j.isVersionOrHigher("1.9");b instanceof f?(d=b.x,e=b.y):(d=b,e=c),a.style.left=o(d,g),a.style.top=o(e,g)}function J(a){return new f(a.offsetLeft,a.offsetTop)}function K(a){var b;return b=a?c.getOwnerDocument(a):c.getDocument(),!j.isIE||j.isDocumentModeOrHigher(9)||c.getDomHelper(b).isCss1CompatMode()?b.documentElement:b.body}function L(a){var b,d=c.getOwnerDocument(a),e=n(a,"position"),g=j.isGECKO&&d.getBoxObjectFor&&!a.getBoundingClientRect&&"absolute"==e&&(b=d.getBoxObjectFor(a))&&(b.screenX<0||b.screenY<0),h=new f(0,0),i=K(d);if(a==i)return h;if(a.getBoundingClientRect){b=F(a);var k=c.getDomHelper(d).getDocumentScroll();h.x=b.left+k.x,h.y=b.top+k.y}else if(d.getBoxObjectFor&&!g){b=d.getBoxObjectFor(a);var l=d.getBoxObjectFor(i);h.x=b.screenX-l.screenX,h.y=b.screenY-l.screenY}else{var m=a;do{if(h.x+=m.offsetLeft,h.y+=m.offsetTop,m!=a&&(h.x+=m.clientLeft||0,h.y+=m.clientTop||0),j.isWEBKIT&&"fixed"==v(m)){h.x+=d.body.scrollLeft,h.y+=d.body.scrollTop;break}m=m.offsetParent}while(m&&m!=a);for((j.isOPERA||j.isWEBKIT&&"absolute"==e)&&(h.y-=d.body.offsetTop),m=a;(m=G(m))&&m!=d.body&&m!=i;)h.x-=m.scrollLeft,j.isOPERA&&"TR"==m.tagName||(h.y-=m.scrollTop)}return h}function M(a){var b=a.style;b.position="relative",j.isIE&&!j.isVersionOrHigher("8")?(b.zoom="1",b.display="inline"):b.display=j.isGECKO?j.isVersionOrHigher("1.9a")?"inline-block":"-moz-inline-box":"inline-block"}function N(a){if(j.isGECKO&&!j.isVersionOrHigher("1.9")){var b=parseFloat(t(a,"borderLeftWidth"));if(E(a)){var c=a.offsetWidth-a.clientWidth-b-parseFloat(t(a,"borderRightWidth"));b+=c}return new f(b,parseFloat(t(a,"borderTopWidth")))}return new f(a.clientLeft,a.clientTop)}function O(b){if(b.nodeType==d.ELEMENT)return p(b);var c=a.isFunction(b.getBrowserEvent),e=b;return b.targetTouches?e=b.targetTouches[0]:c&&b.getBrowserEvent().targetTouches&&(e=b.getBrowserEvent().targetTouches[0]),new f(e.clientX,e.clientY)}function P(a){var b=a.body,c=a.documentElement,d=b.scrollLeft||c.scrollLeft,e=b.scrollTop||c.scrollTop;return new f(d,e)}function Q(a,b){var c=a.style;j.isIE&&!j.isVersionOrHigher("8")?c.filter='progid:DXImageTransform.Microsoft.AlphaImageLoader(src="'+b+'", sizingMethod="crop")':(c.backgroundImage="url("+b+")",c.backgroundPosition="top left",c.backgroundRepeat="no-repeat")}function R(a){var b=a.style;"filter"in b?b.filter="":b.backgroundImage="none"}function S(a){return T(U,a)}function T(a,b){if("none"!=n(b,"display"))return a(b);var c=b.style,d=c.display,e=c.visibility,f=c.position;c.visibility="hidden",c.position="absolute",c.display="inline";var g=a(b);return c.display=d,c.position=f,c.visibility=e,g}function U(b){var c=b.offsetWidth,d=b.offsetHeight,e=j.isWEBKIT&&!c&&!d;if((a.isNull(c)||e)&&b.getBoundingClientRect){var f=F(b);return new g(f.right-f.left,f.bottom-f.top)}return new g(c,d)}return{setStyle:r,getStyle:s,getComputedStyle:t,getCascadedStyle:u,getComputedPosition:v,getOpacity:A,setOpacity:B,setFloat:C,getFloat:D,isRightToLeft:E,getOffsetParent:G,setPosition:I,getPosition:J,getPageOffset:L,setPageOffset:H,setInlineBlock:M,getBackgroundColor:w,getComputedOverflowX:x,getComputedOverflowY:y,getComputedZIndex:z,getClientLeftTop:N,getClientPosition:O,getViewportPageOffset:P,setTransparentBackgroundImage:Q,clearTransparentBackgroundImage:R,getSize:S}});