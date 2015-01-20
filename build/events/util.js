/** Oslo JavaScript Framework. */
define(["../util/util","./browserevent","./browserfeature","./target","./listener","../array/array","../object/object","../debug/entrypointregistry"],function(a,b,c,d,e,f,g,h){"use strict";var i="__oslojs_events_fn_"+(1e9*Math.random()>>>0),j={},k={},l={},m="on",n={};function o(b){var c=!1;if(0===+b.keyCode)try{return b.keyCode=-1,void 0}catch(d){c=!0}(c||a.isNull(b.returnValue))&&(b.returnValue=!0)}function p(b){return b.keyCode<0||!a.isNull(b.returnValue)}function q(a,d,e){if(d.removed)return!0;var f,g=d.type,h=j;if(!(g in h))return!0;h=h[g];var i,k;if(!c.HAS_W3C_EVENT_SUPPORT){var l,m=e||window.event,n=!0 in h,q=!1 in h;if(n){if(p(m))return!0;o(m)}var r=new b;r.init(m,a),i=!0;try{if(n){f=[];for(var s=r.currentTarget;s;s=s.parentNode)f.push(s);for(k=h[!0],l=f.length-1;!r.propagationStopped_&&l>=0;l--)r.currentTarget=f[l],i&=E(k,f[l],g,!0,r);if(q)for(k=h[!1],l=0;!r.propagationStopped_&&l<f.length;l++)r.currentTarget=f[l],i&=E(k,f[l],g,!1,r)}else i=F(d,r)}finally{f&&(f.length=0)}return i}var t=new b(e,a);return i=F(d,t),i}function r(a){return a in n?n[a]:n[a]=m+a}function s(b){if(a.isNull(b))throw new Error("Listener can not be null.");if(a.isFunction(b))return b;if(a.isNull(b.handleEvent))throw new Error("An object listener must have handleEvent method.");return b[i]||(b[i]=function(a){return b.handleEvent(a)})}function t(b,c,d,f,g,h){if(!c)throw Error("Invalid event type");var i=!!g,m=j;c in m||(m[c]={count_:0}),m=m[c],i in m||(m[i]={count_:0},m.count_++),m=m[i];var n,o,p=a.getUid(b);if(m[p]){n=m[p];for(var q=0;q<n.length;q++)if(o=n[q],o.listener===d&&o.handler===h){if(o.removed)break;return f||(n[q].callOnce=!1),n[q]}}else n=m[p]=[],m.count_++;var s=y();o=new e(d,s,b,c,i,h),o.callOnce=f,s.src=b,s.listener=o,n.push(o),k[p]||(k[p]=[]),k[p].push(o),b.addEventListener?b.addEventListener(c,s,i):b.attachEvent(r(c),s);var t=o.key;return l[t]=o,o}function u(b,c,d){var e=j;if(c in e&&(e=e[c],d in e)){e=e[d];var f=a.getUid(b);if(e[f])return e[f]}return null}function v(a,b,c){return a instanceof d?a.getListeners(b,c):u(a,b,c)||[]}function w(a,b,c,e,f){var g=!!e;if(a instanceof d)return a.getListener(b,c,g,f);var h=u(a,b,g);if(h)for(var i=0;i<h.length;i++)if(!h[i].removed&&h[i].listener===c&&h[i].capture===g&&h[i].handler===f)return h[i];return null}function x(b,c,e){if(b instanceof d)return b.hasListener(c,e);var g=a.getUid(b),h=k[g];if(h){var i=!a.isNull(c),l=!a.isNull(e);if(i&&l){var m=j[c];return!!m&&!!m[e]&&g in m[e]}return i||l?f.some(h,function(a){return i&&a.type===c||l&&a.capture===e}):!0}return!1}function y(){var a=c.HAS_W3C_EVENT_SUPPORT?function(b){return q(a.src,a.listener,b)}:function(b){var c=q(a.src,a.listener,b);return c?void 0:c};return a}function z(b,c,e,f,g){if(a.isArray(c)){for(var h=0;h<c.length;h++)z(b,c[h],e,f,g);return null}return e=s(e),b instanceof d?b.listen(c,e,f,g):t(b,c,e,!1,f,g)}function A(b,c,e,f,g){var h;if(a.isArray(c)){for(h=0;h<c.length;h++)A(b,c[h],e,f,g);return null}if(b instanceof d)return b.unlisten(c,e,f,g);var i=!!f,j=u(b,c,i);if(!j)return!1;for(h=0;h<j.length;h++)if(j[h].listener===e&&j[h].capture===i&&j[h].handler===g)return C(j[h]);return!1}function B(b,c,e,f,g){if(a.isArray(c)){for(var h=0;h<c.length;h++)B(b,c[h],e,f,g);return null}var i;return e=s(e),i=b instanceof d?b.listenOnce(c,e,f,g):t(b,c,e,!0,f,g),i}function C(b){if(a.isNumber(b))return!1;var c=b;if(!c)return!1;if(c.removed)return!1;var e=c.src;if(e instanceof d)return e.unlistenByKey(c);var g=c.type,h=c.proxy,i=c.capture;e.removeEventListener?e.removeEventListener(g,h,i):e.detachEvent&&e.detachEvent(r(g),h);var m=a.getUid(e);if(k[m]){var n=k[m];f.remove(n,c),0===n.length&&delete k[m]}c.markAsRemoved();var o=j[g][i][m];return o&&(f.remove(o,c),0===o.length&&(delete j[g][i][m],j[g][i].count_--),0===j[g][i].count_&&(delete j[g][i],j[g].count_--),0===j[g].count_&&delete j[g]),delete l[c.key],!0}function D(a,b,c,e){if(a instanceof d)return a.fireListeners(b,c,e);var f=j;return b in f&&(f=f[b],c in f)?E(f[c],a,b,c,e):!0}function E(b,c,d,e,g){var h=1,i=a.getUid(c);if(b[i])for(var j=f.toArray(b[i]),k=0;k<j.length;k++){var l=j[k];l&&!l.removed&&(h&=F(l,g)!==!1)}return!!h}function F(a,b){var c=a.listener,d=a.context||a.src;return a.callOnce&&C(a),c.call(d,b)}function G(a,b,c,d,e){b.listen(a,c,d,e)}function H(a,b,c,d,e){b.unlisten(a,c,d,e)}function I(b,c){var e=0,f=a.isNull(b),h=a.isNull(c);if(f)g.forEach(l,function(a){C(a),e++});else{if(b&&b instanceof d)return b.removeAllListeners(c);var i=a.getUid(b);if(k[i])for(var j=k[i],m=j.length-1;m>=0;m--){var n=j[m];(h||c===n.type)&&(C(n),e++)}}return e}function J(){var a=0;return g.forEach(l,function(b){C(b),a++}),a}function K(a){q=a.protectEntryPoint(q)}return h.register(function(a){q=a(q)}),{listen:z,unlisten:A,getListeners:v,getListener:w,hasListener:x,listenOnce:B,unlistenByKey:C,fireListeners:D,fireListener:F,listenWithWrapper:G,unlistenWithWrapper:H,removeAll:I,removeAllNativeListeners:J,protectBrowserEventEntryPoint:K}});