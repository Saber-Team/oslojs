/** Oslo JavaScript Framework. */
!function(a){"use strict";var b=Object.prototype,c=Array.prototype,d=c.forEach,e=c.map,f=b.hasOwnProperty,g=b.toString,h={},i={id:null,uid:null,url:null,status:null,exports:{}};function j(){}function k(a){throw"more then one module defined with the same id: "+a}function l(a,b,c){var d=[];if(e&&a.map===e)d=a.map(b,c);else if(a.length===+a.length)for(var f=0;f<a.length;++f)d.push(b.call(c||null,a[f],f,a));return d}function m(a,b,c){if(d&&a.forEach===d)a.forEach(b,c);else if(a.length===+a.length)for(var e=0,f=a.length;f>e&&b.call(c,a[e],e,a)!==h;e++);}function n(a,b){for(var c=0;c<a.length;++c)if(a[c]===b)return c;return-1}var o={"[object Object]":"object","[object Array]":"array","[object Function]":"function","[object RegExp]":"regexp","[object String]":"string","[object Number]":"number"};function p(a){return o[g.call(a)]}function q(a){return void 0===a||null===a}var r=document,s=r.head||r.getElementsByTagName("head")[0],t=r.getElementsByTagName("base")[0];t&&(s=t.parentNode);var u,v,w="readyState"in r.createElement("script");function x(a,b){var c=r.createElement("script");c.charset="utf-8",c.async=!0,c.kernel_name=b,c.onreadystatechange=c.onload=c.onerror=function(){c.onreadystatschange=c.onload=c.onerror=null,v=null,!c.readyState||/complete/.test(c.readyState)},c.src=a,u=c,t?s.insertBefore(c,t):s.appendChild(c),u=null}function y(){return r.getElementsByTagName("script")}function z(){return r.currentScript||u||function(){var a;return w?v&&"interactive"==v.readyState?v:(a=y(),m(a,function(a){return"interactive"==a.readyState?(v=a,h):void 0}),v):void 0}()||function(){var a,b=null;try{throw new Error}catch(c){a=c.stack}if(!a)return b;var c=-1!=a.indexOf(" at ")?" at ":"@",d=a.indexOf(".async");if(d>-1)a=a.substring(d+7),a=a.split(c)[1],a=a.replace(/^([^\(]*\()/,"");else for(;-1!==a.indexOf(c);)a=a.substring(a.indexOf(c)+c.length);a=a.substring(0,a.indexOf(".js")+3),a=a.replace(/^([^\(]*\()/,"");var e=y();return m(e,function(c){var d=A(c);return d==a?(b=c,h):void 0}),b}()}function A(a){return a.hasAttribute?a.src:a.getAttribute("src",4)}function B(){var a=z();return a&&A(a)}var C=/\brequire\s*\(\s*(["'])([^'"\s]+)\1\s*\)/g,D=/(\/\*([\s\S]*?)\*\/|([^:]|^)\/\/(.*)$)/gm;function E(a,b,c){var d,e=K.cache,f=K.uidprefix+K.uid++,g=B();if("string"!=p(a)&&(c=b,b=a,a=null),"array"!=p(b)&&(c=b,b=null),a){if(e.id2path[a]&&K.debug)return k(a);e.id2path[a]=g,e.mods[a]=i}e.path2uid[g]?e.path2uid[g].push(f):e.path2uid[g]=[f],d=e.mods[f]=i,b||"function"!=p(c)||(b=[],c.length&&(c.toString().replace(D,"").replace(C,function(a,c,d){b.push(d)}),b=(1===c.length?["require"]:["require","exports","module"]).concat(b))),d=e.mods[f]=new _({uid:f,id:a,url:g,deps:b,factory:c,status:_.STATUS.uninit});var h=z().kernel_name;h&&U(h)&&!d.id&&(d.id=h),d.deps&&d.deps.length>0&&(d.deps=l(d.deps,function(a,b){("exports"==a||"module"==a)&&(d.cjsWrapper=!0);var c=I(a,d);return c&&(d.depMods[b]=c),a})),F(d)}E.amd={creator:"AceMood",email:"zmike86@gmail.com",version:"0.9"};function F(a){var b=K.cache,c=a.deps.length,d=K.paths&&K.paths[a.id]?!0:!1,e=d?Q.href:B();L.add(a),a.status=_.STATUS.fetching,b.mods[a.uid]||(b.mods[a.uid]=i),m(a.deps,function(d,f){if(a.depMods[f])return--c,void 0;var g=X(d,e),h=b.path2uid[g];h&&b.mods[h[0]]&&(b.mods[h[0]].status==_.STATUS.complete||J(g,a))?(--c,a.depMods[f]=b.mods[h[0]].exports):(M[g]?n(M[g],a)<0&&M[g].push(a):M[g]=[a],N[g]||(N[g]=!0,x(g,d)))}),0==c&&H(a)}function G(a,b){if("object"==p(a)&&!b)return K.config(a),null;if("array"==p(a)&&0==a.length)return"function"==p(b)?b():b;"string"==p(a)&&(a=[a]);var c,d=B();if(b){c=K.uidprefix+K.uid++;var e=new _({uid:c,id:null,url:d,deps:a,factory:b,status:_.STATUS.uninit});return e.depMods=l(a,function(a){var b=X(a,d);return I(a)||I(b)}),F(e),null}var f=X(a[0],d),g=I(a[0]);return 1==a.length&&g?g:(c=K.cache.path2uid[f][0],K.cache.mods[c].exports||null)}function H(a){L.remove(a),a.cjsWrapper?a.factory.apply(null,a.depMods):a.exports="function"==p(a.factory)?a.factory.apply(null,a.depMods):a.factory,q(a.exports)&&(a.exports={}),a.status=_.STATUS.complete,K.cache.mods[a.uid]=a,a.id&&(K.cache.mods[a.id]=a);var b=M[a.url];b&&(delete M[a.url],m(b,function(b){b.ready&&b.status==_.STATUS.fetching&&b.ready(a)}))}function I(a,b){if(K.builtin[a])return K.builtin[a];if(K.cache.mods[a]){var c=B(),d=X(a,c);if(K.cache.mods[a].status==_.STATUS.complete||J(d,b))return K.cache.mods[a].exports}return"require"==a?G:"module"==a?b:"exports"==a?b&&b.exports:null}G.toUrl=function(a){return X(a)};function J(a,b){var c,d=!1,e=K.cache.path2uid[a];return e&&(c=K.cache.mods[e[0]])&&n(M[b.url],c)>=0&&(d=!0),d}var K={};a.kernel&&(K._kernel=a.kernel),K.uid=0,K.uidprefix="AceMood@kernel_";var L={mods:{},add:function(a){if(this.mods[a.uid])throw"current mod with uid: "+a.uid+" and file path: "+a.url+" is fetching now";this.mods[a.uid]=a},clear:function(){this.mods={}},remove:function(a){this.mods[a.uid]&&(this.mods[a.uid]=null,delete this.mods[a.uid])}},M={},N={};K.config=function(a){if("object"!=p(a))throw"config object must an object";var b,c;for(b in a)if(f.call(a,b))if(K[b])for(c in a[b])K[b][c]=a[b][c];else K[b]=a[b]},K.cache={mods:{},id2path:{},path2uid:{}},K.config({baseUrl:"",debug:!0,builtin:{}}),K.reset=function(){K.cache={mods:{},id2path:{},path2uid:{}}},a.require=G,a.define=E,a.kernel=K;var O=/\/$/g,P=/\.(js|css|tpl|txt)$/,Q=a.location;function R(a){return a=a.replace(/(\/)+/g,"/"),a=S(a),a}function S(a){a=a.split("/");for(var b=0;b<a.length;++b)"."===a[b]?(a.splice(b,1),--b):".."===a[b]&&b>0&&".."!==a[b-1]&&(a.splice(b-1,2),b-=2);return a.join("/")}function T(){return Y(Q.href)}function U(a){return W(a)&&"."!==a.charAt(0)}function V(a){return/:\/\//.test(a)||/^\//.test(a)}function W(a){return!V(a)&&(/^(\.){1,2}\//.test(a)||"/"!==a.charAt(0))}function X(a,b){if("require"==a||"module"==a||"exports"==a)return a;U(a)&&(a=Z(a),a=$(a),b=null),a=R(a);var c="/"==a.charAt(0)?"":"/",d=(b?Y(b):T())+c+a;return P.test(d)||(d+=".js"),d=S(d),d}function Y(a){return O.test(a)?a.slice(0,-1):(a=a.split("/"),a.pop(),a.join("/"))}function Z(a){var b=[];if(K.paths){for(var c=a,d=a.split("/");!(c in K.paths)&&d.length;)b.unshift(d.pop()),c=d.join("/");a=K.paths[c]?K.paths[c]:c}return a+b.join("/")}function $(a){var b=K.packages,c="";return b&&b.length>0&&m(b,function(b){return 0===a.indexOf(b.name)?(a.length===b.name.length&&(c="/"+(b.main?b.main:"main")),a=a.replace(b.name,b.location||b.name)+c,h):void 0}),a}function _(a){this.uid=a.uid,this.id=a.id||null,this.url=a.url,this.deps=a.deps||[],this.depMods=new Array(this.deps.length),this.status=a.status||_.STATUS.uninit,this.factory=a.factory||j,this.exports={}}_.STATUS={uninit:0,fetching:1,loaded:2,complete:3},_.prototype.ready=function(a){if(a.url){if(K.paths&&K.paths[this.id])var b=!0;for(var c=0;c<this.deps.length;++c){var d=X(this.deps[c],b?Q.href:this.url);if(d===a.url){this.depMods[c]=a.exports;break}}}this.checkAllDepsOK()&&H(this)},_.prototype.checkAllDepsOK=function(){for(var a=!0,b=0;b<this.depMods.length;++b)if(q(this.depMods[b])){a=!1;break}return a},G.async=function(a,b){G([a],b)},G.url=function(a){return a},a._req=G,a._def=E}(this);