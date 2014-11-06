/** Oslo JavaScript Framework. */
define("@ds.queue",["@array"],function(a){"use strict";var b=function(){this.elements_=[],this.head_=0,this.tail_=0};return b.prototype={constructor:b,enqueue:function(a){this.elements_[this.tail_++]=a},dequeue:function(){if(this.head_===this.tail_)return void 0;var a=this.elements_[this.head_];return delete this.elements_[this.head_],this.head_++,a},peek:function(){return this.head_===this.tail_?void 0:this.elements_[this.head_]},getCount:function(){return this.tail_-this.head_},isEmpty:function(){return 0===this.tail_-this.head_},clear:function(){this.elements_.length=0,this.head_=0,this.tail_=0},contains:function(b){return a.contains(this.elements_,b)},remove:function(b){var c=a.indexOf(this.elements_,b);return 0>c?!1:(c===this.head_?this.dequeue():(a.removeAt(this.elements_,c),this.tail_--),!0)},getValues:function(){return this.elements_.slice(this.head_,this.tail_)}},b});