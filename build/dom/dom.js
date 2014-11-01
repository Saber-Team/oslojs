/** Sogou JavaScript Framework.  2014-10-31 build */
define("Sogou.Dom.Util",["Sogou.Util","Sogou.Object","Sogou.Array","Sogou.UA.Util","Sogou.String.Util","Sogou.Math.Size","Sogou.Math.Coordinate","Sogou.Dom.NodeType","Sogou.Dom.Classes","Sogou.Dom.BrowserFeature"],function(a,b,c,d,e,f,g,h,i,j){"use strict";var k={cellpadding:"cellPadding",cellspacing:"cellSpacing",colspan:"colSpan",frameborder:"frameBorder",height:"height",maxlength:"maxLength",role:"role",rowspan:"rowSpan",type:"type",usemap:"useMap",valign:"vAlign",width:"width"},l={SCRIPT:1,STYLE:1,HEAD:1,IFRAME:1,OBJECT:1},m={IMG:" ",BR:"\n"},n=function(a){return!(!a.querySelectorAll||!a.querySelector)};function o(a){return a.parentWindow||a.defaultView}function p(a){return"CSS1Compat"===a.compatMode}function q(a){var b=a.document,c=p(b)?b.documentElement:b.body;return new f(c.clientWidth,c.clientHeight)}function r(a){return!d.isWEBKIT&&p(a)?a.documentElement:a.body}function s(a){var b=r(a),c=o(a);return d.isIE&&d.isVersionOrHigher("10")&&c.pageYOffset!==b.scrollTop?new g(b.scrollLeft,b.scrollTop):new g(c.pageXOffset||b.scrollLeft,c.pageYOffset||b.scrollTop)}function t(a,b,c){if(!(a.nodeName in l))if(a.nodeType===h.TEXT)c?b.push(String(a.nodeValue).replace(/(\r\n|\r|\n)/g,"")):b.push(a.nodeValue);else if(a.nodeName in m)b.push(m[a.nodeName]);else for(var d=a.firstChild;d;)t(d,b,c),d=d.nextSibling}function u(a){return a.nodeType===h.DOCUMENT?a:a.ownerDocument}function v(){return document}function w(a){return a?o(a):window}function x(a){return a&&a.parentNode?a.parentNode.removeChild(a):null}function y(a){for(var b;b=a.firstChild;)a.removeChild(b)}function z(a,b,d,e){var f,g,h,i,j,k=e||a,l=b&&"*"!==b?b.toUpperCase():"";if(n(k)&&(l||d)){var m=l+(d?"."+d:"");return k.querySelectorAll(m)}if(d&&k.getElementsByClassName){if(h=k.getElementsByClassName(d),l){for(i={},j=0,f=0,g;g=h[f];f++)l===g.nodeName&&(i[j++]=g);return i.length=j,i}return h}if(h=k.getElementsByTagName(l||"*"),d){for(i={},j=0,f=0,g;g=h[f];f++){var o=g.className;"function"==typeof o.split&&c.contains(o.split(/\s+/),d)&&(i[j++]=g)}return i.length=j,i}return h}function A(a,b){var c=b||document;return n(c)?c.querySelectorAll("."+a):c.getElementsByClassName?c.getElementsByClassName(a):z(document,"*",a,b)}function B(b){return a.isObject(b)&&b.nodeType===h.ELEMENT}function C(){return p(document)}function D(a,c){b.forEach(c,function(b,c){"style"===c?a.style.cssText=b:"class"===c?a.className=b:"for"===c?a.htmlFor=b:c in k?a.setAttribute(k[c],b):e.startsWith(c,"aria-")||e.startsWith(c,"data-")?a.setAttribute(c,b):a[c]=b})}function E(a){return q(a||window)}function F(a,b,c){return z(document,a,b,c)}function G(a){return a.contentDocument||a.contentWindow.document}function H(a,b){var c=b.parentNode;c&&c.replaceChild(a,b)}function I(a,b){if(a.contains&&b.nodeType===h.ELEMENT)return a===b||a.contains(b);if("undefined"!=typeof a.compareDocumentPosition)return a===b||!!(16&a.compareDocumentPosition(b));for(;b&&a!==b;)b=b.parentNode;return b===a}function J(a,b){if("textContent"in a)a.textContent=b;else if(a.firstChild&&a.firstChild.nodeType===h.TEXT){for(;a.lastChild!==a.firstChild;)a.removeChild(a.lastChild);a.firstChild.data=b}else{y(a);var c=u(a);a.appendChild(c.createTextNode(String(b)))}}function K(a){var b;if(j.CAN_USE_INNER_TEXT&&"innerText"in a)b=e.canonicalizeNewlines(a.innerText);else{var c=[];t(a,c,!0),b=c.join("")}return b=b.replace(/ \xAD /g," ").replace(/\xAD/g,""),b=b.replace(/\u200B/g,""),j.CAN_USE_INNER_TEXT||(b=b.replace(/ +/g," "))," "!==b&&(b=b.replace(/^\s*/,"")),b}function L(){return s(document)}function M(){return r(document)}function N(a){try{return a&&a.activeElement}catch(b){}return null}function O(a,b,c,d){c||(a=a.parentNode);for(var e=null===d,f=0;a&&(e||d>=f);){if(b(a))return a;a=a.parentNode,f++}return null}function P(a,b){return Q(a,null,b)}function Q(a,b,c){if(!b&&!c)return null;var d=b?b.toUpperCase():null;return O(a,function(a){return!(d&&a.nodeName!==d||c&&!i.has(a,c))},!0)}function R(a){return void 0!==a.firstElementChild?a.firstElementChild:V(a.firstChild,!0)}function S(a){return void 0!==a.lastElementChild?a.lastElementChild:V(a.lastChild,!1)}function T(a){return void 0!==a.nextElementSibling?a.nextElementSibling:V(a.nextSibling,!0)}function U(a){return void 0!==a.previousElementSibling?a.previousElementSibling:V(a.previousSibling,!1)}function V(a,b){for(;a&&a.nodeType!==h.ELEMENT;)a=b?a.nextSibling:a.previousSibling;return a}function W(a,b){b.parentNode&&b.parentNode.insertBefore(a,b)}function X(a,b){b.parentNode&&b.parentNode.insertBefore(a,b.nextSibling)}function Y(){return _(document,arguments)}function Z(b){return a.isObject(b)&&b.nodeType>0}function $(b){if(b&&"number"==typeof b.length){if(a.isObject(b))return"function"==typeof b.item||"string"==typeof b.item;if(a.isFunction(b))return"function"==typeof b.item}return!1}function _(c,d){var f=d[0],g=d[1];if(!j.CAN_ADD_NAME_OR_TYPE_ATTRIBUTES&&g&&(g.name||g.type)){var h=["<",f];if(g.name&&h.push(' name="',e.htmlEscape(g.name),'"'),g.type){h.push(' type="',e.htmlEscape(g.type),'"');var k={};b.extend(k,g),delete k.type,g=k}h.push(">"),f=h.join("")}var l=c.createElement(f);return g&&(a.isString(g)?l.className=g:a.isArray(g)?i.add.apply(null,[l].concat(g)):D(l,g)),d.length>2&&ab(c,l,d,2),l}function ab(b,d,e,f){function g(c){c&&d.appendChild(a.isString(c)?b.createTextNode(c):c)}for(var h=f;h<e.length;h++){var i=e[h];a.isArrayLike(i)&&!Z(i)?c.forEach($(i)?c.toArray(i):i,g):g(i)}}function bb(a){return j.CAN_USE_CHILDREN_ATTRIBUTE&&void 0!==a.children?a.children:c.filter(a.childNodes,function(a){return a.nodeType===h.ELEMENT})}var cb=null;function db(a){return a?new eb(u(a)):cb||(cb=new eb)}var eb=function(b){this.document_=b||a.global.document||document},fb={setDocument:function(a){this.document_=a},getChildren:bb,getDocument:function(){return this.document_},getElement:function(b){return a.isString(b)?this.document_.getElementById(b):b},getElementsByTagNameAndClass:function(a,b,c){return z(this.document_,a,b,c)},getElementsByClass:function(a,b){var c=b||this.document_;return A(a,c)},setProperties:D,getViewportSize:function(){return E(this.getWindow())},getWindow:function(){return o(this.document_)},contains:I,isCss1CompatMode:function(){return p(this.document_)},createDom:function(){return _(this.document_,arguments)},createElement:function(a){return this.document_.createElement(a)},createTextNode:function(a){return this.document_.createTextNode(String(a))},getDocumentScrollElement:function(){return r(this.document_)},getDocumentScroll:function(){return s(this.document_)},getActiveElement:function(a){return N(a||this.document_)},isElement:B,getOwnerDocument:u,getFrameContentDocument:G,removeNode:x,removeChildren:y,setTextContent:J,getTextContent:K,getAncestor:O,getAncestorByClass:P,getAncestorByTagNameAndClass:Q,replaceNode:H,getFirstElementChild:R,getLastElementChild:S,getNextElementSibling:T,getPreviousElementSibling:U,insertSiblingBefore:W,insertSiblingAfter:X,isNodeList:$,isNodeLike:Z};return a.mixin(eb.prototype,fb),{contains:I,createDom:Y,removeNode:x,removeChildren:y,getChildren:bb,getDocument:v,getDomHelper:db,getActiveElement:N,getElement:function(b){return a.isString(b)?document.getElementById(b):b},getElementsByClass:A,getElementsByTagNameAndClass:F,getWindow:w,getOwnerDocument:u,getFrameContentDocument:G,getDocumentScroll:L,getDocumentScrollElement:M,isCss1CompatMode:C,isElement:B,setProperties:D,getViewportSize:E,replaceNode:H,setTextContent:J,getTextContent:K,getAncestor:O,getAncestorByClass:P,getAncestorByTagNameAndClass:Q,getFirstElementChild:R,getLastElementChild:S,getNextElementSibling:T,getPreviousElementSibling:U,insertSiblingBefore:W,insertSiblingAfter:X,isNodeList:$,isNodeLike:Z}});