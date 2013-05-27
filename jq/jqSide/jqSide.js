/*
 * A jQuery plugin library based on jQuery
 * version 1.1
 * bug report gao_st@126.com
 * [Change Log]
 * 2011-09-23	begin the first version
 */
;( function ( window, $, undefined ) {
/*
 * 缓存变量
 */
var document = window.document;

/*
 * 修复IE6背景缓存bug
 */
try{
	document.execCommand("BackgroundImageCache", false, true);
}catch(e){}

/*
 * 利用制表符检测IE678
 * 同样的代码 $.isIE678 = !+'\v1'; \v被低版本IE解析为v，v1就不能被转化为数字
 * 类似的代码 $.isIE678 = !-[1,];  利用IE对数组转换的特性来完成检测，但这可能会报语法错误
 */
$.isIE678 = "\v" == "v";

/*
 * 对渲染引擎和脚本引擎进行综合探测来判断IE版本
 */
if( $.isIE678 ){
	//IE8下字符串可以被当作数组取指定字符
	$.isIE8 = !!'1'[0];
	//documentMode是高版本浏览器向下兼容时提供的一种特有属性，在IE6和IETester中该属性未定义
	$.isIE6 = !$.isIE8 && (!document.documentMode || document.compatMode == "BackCompat"); 
	$.isIE7 = !$.isIE8 && !$.isIE6;
}

/*
 * 自动修复低版本IE的click BUG
 * 仅仅IE6、7、8有click问题
 */
if( $.isIE678 ){
	$.fn.extend({
		_bind_ : $.fn.bind,
		bind : function(type, data, fn){
			/^click$/gi.test(type) && fixIEClick( this );
			return this._bind_(type, data, fn);
		}
	});
	//IE click 修复函数
	var fixIEClick = function( obj ){
		var n=obj.length, i=0, dom;
		for(; i<n; i++){
			dom = obj[i];
			if( !dom.fixClick ){
				dom.fixClick = true;
				$(dom).bind("dblclick",function(e){
					//路径修复检查，避免多级修复导致的重复click问题
					var cur = e.target, n = 0;
					while ( cur && cur.nodeType !== 9 && ( cur.nodeType !== 1 || cur !== this ) ) {
						if ( cur.nodeType === 1 ) {
							if( cur.fixClick )
								return;
						}
						cur = cur.parentNode;
					}
					//模拟点击
					e.type = "click";
					e.source = "dblclick";
					//替换事件源并激发click事件
					$(e.target).trigger(e);
				});
			}
		}
	};
}

/*
 * 使得低版本IE识别HTML5标签
 */
if( $.isIE678 ){
	var html5 = "abbr,article,aside,audio,canvas,datalist,details,dialog,eventsource,figure,footer,header,hgroup,mark,menu,meter,nav,output,progress,section,time,video".split(','),
		i = html5.length;
	while(i--) document.createElement(html5[i]);
}

/* jQuery扩展 */
/*
 * Tab切换组件
 * callback		[可选]切换回调，当tab显式的时候调用，this指向当前tab，参数是 内容dom
 * method		[可选]切换方法，支持所有合理的方法监听
 * itemTag		[可选]tab元素，用于代理监听，默认 li
 * activeCss	[可选]选中态样式，默认 active
 * hookAttr		[可选]与内容卡关联的节点名称，默认 rel，节点内容为 selector，通常是 #contentID
 */
$.fn.createTab = function( callback, method, itemTag, activeCss, hookAttr ){
	if( !$.isFunction(callback) ){
		hookAttr = activeCss;
		activeCss = itemTag;
		itemTag = method;
		method = callback;
		callback = $.noop;
	}
	return this.each(function(){
		var tab = $(this), timer, css = activeCss || "active", tag = itemTag || "li", hook = hookAttr || "rel",
		//检查method，所有鼠标滑动触发都转化为mouseenter模式
		//fireMethod = !method || /mouse/i.test(method) ? "mouseenter" : method.toLowerCase(),
		fireMethod = method || "mouseenter",
		delay = fireMethod == "mouseenter",
		//切换tab
		toggTab = function( me ){
			$(tab.find("."+css).removeClass(css).attr(hook)).hide();
			var pnl = $(me.addClass(css).attr(hook)).show()[0];
			callback.call(me[0], pnl);
		};
		//绑定监听
		tab.delegate(tag, fireMethod, function(){
			var me = $(this);
			if( me.hasClass(css) || this.disabled )
				return;
			if( delay ){
				timer && window.clearTimeout(timer);
				timer = window.setTimeout(function(){toggTab(me)},200);
			}else
				toggTab(me);
		});
		delay && tab.delegate(tag, "mouseleave", function(){
			timer && window.clearTimeout(timer);
			timer = 0;
		});
		tag == "a" && tab.delegate(tag, "click", function(e){ e.preventDefault() });
	});
};

/*
 * 数据滚动组件
 * 2012-05-03  创建
 * 支持一个组合参数：
 *	perScroll	每次滚动的行数
 *	speed		每移动一个像素平均花费的时间（ms）
 *	interval	两次滚动之间的时间（含滚动时间）
 */
$.fn.scrollGrid = function( option ){
	var op = $.extend({
		perScroll : 3,
		speed : 14,
		interval : 5000
	}, option||{});
	//逐个进行处理
	return this.each(function(){
		var box = $(this), ul = box.find(">ul"), perScroll = op.perScroll, odd = ul.find("li").length%2, timer,
		action = function(){
			//动态计算需要移动的高度
			var height=0, orgLi = ul.find("li:lt("+ perScroll +")").each(function(){ height += $(this).outerHeight() }),
			//修复奇偶行的样式
			copyLi = orgLi.clone().removeClass("odd even").appendTo(ul).each(function(){ odd = (odd+1)%2; $(this).addClass( odd ? "odd" : "even" );  });
			//动画进行移动
			ul.animate({marginTop:"-"+ height +"px"}, height*op.speed, function(){
				orgLi.remove();
				ul.removeAttr("style");
			});
		};
		//检查外容器是否必要滚动
		if( ul.length == 1 && box[0].scrollHeight > box[0].offsetHeight ){
			box.bind({
				mouseenter : function(){ window.clearTimeout(timer); },
				mouseleave : function(){ timer = window.setInterval(action, op.interval); }
			});
			box.mouseleave();
		}
	});
};

/*
 * 固定位置组件〔for IE6〕
 */
$.fn.fixPosition = function(){
	var me = this, t, b, l, r, css = function(o,dir){var c=(o[0].currentStyle[dir]);return c.indexOf("%")+1?false:(o.css(dir).replace(/\D/g,"")||null);}, win = $(window), top, left, fn;
	if( me.css("position") == "absolute" ){
		t = css(me,"top");
		b = css(me,"bottom");
		l = css(me,"left");
		r = css(me,"right");
		//记录当前状态
		top = +win.scrollTop();
		left = +win.scrollLeft();
		fn = function(){
			var _top = +win.scrollTop(), _left = +win.scrollLeft();
			b && me.css("bottom", +b+1).css("bottom", b+"px");
			t && me.css("top", (+t + _top - top )+"px");
			r && me.css("right", +r+1).css("right", r+"px");
			l && me.css("left", (+l + _left - left )+"px");
		};
		win.scroll(fn).resize(fn);
	}
	return me;
};

/*
 * Cookie操作组件
 * 来源于jQueryUI/extend
 */
$.cookie = function (key, value, options) {
	// key and value given, set cookie...
	if (arguments.length > 1 && (value === null || typeof value !== "object")) {
		options = $.extend({}, options);
		if (value === null) {
			options.expires = -1;
		}
		if (typeof options.expires === 'number') {
			var days = options.expires, t = options.expires = new Date();
			t.setDate(t.getDate() + days);
		}
		return (document.cookie = [
			encodeURIComponent(key), '=',
			options.raw ? String(value) : encodeURIComponent(String(value)),
			options.expires ? '; expires=' + options.expires.toUTCString() : '', // use expires attribute, max-age is not supported by IE
			options.path ? '; path=' + options.path : '',
			options.domain ? '; domain=' + options.domain : '',
			options.secure ? '; secure' : ''
		].join(''));
	}
	// key and possibly options given, get cookie...
	options = value || {};
	var result, decode = options.raw ? function (s) { return s; } : decodeURIComponent;
	return (result = new RegExp('(?:^|; )' + encodeURIComponent(key) + '=([^;]*)').exec(document.cookie)) ? decode(result[1]) : null;
};

/*
 * localStorage组件
 * 支持IE6+浏览器，提供与原生localStorage类似的接口以及一个二次包装接口
 */
(function(c,f){if(c.localStorage)return;var g={file:c.location.hostname||"localStorage",o:null,init:function(){if(!this.o){var a,doc=document,box;try{a=new ActiveXObject('htmlfile');a.open();a.write('<s'+'cript>document.w=window;</s'+'cript><iframe src="/favicon.ico"></frame>');a.close();doc=a.w.frames[0].document}catch(e){doc=document}try{box=doc.body||doc.documentElement||doc,o=doc.createElement('input');o.type="hidden";o.addBehavior("#default#userData");box.appendChild(o);var d=new Date();d.setDate(d.getDate()+365);o.expires=d.toUTCString();o.load(this.file);this.o=o;c.localStorage.length=this.key()}catch(e){return false}};return true},item:function(a,b){if(!this.init())return;if(b!==f){b===null?this.o.removeAttribute(a):this.o.setAttribute(a,b+"");this.o.save(this.file)}else{var v=this.o.getAttribute(a);return v===null?f:v}},clear:function(){if(!this.init())return;var a=this.key(-1);for(var b in a)this.o.removeAttribute(b);this.o.save(this.file)},key:function(a){if(!this.init())return-1;var b=this.o.XMLDocument.documentElement.attributes,n=b.length,i=0,t,obj={};if(a===f)return n;if(a===-1){for(;t=b[i];i++)obj[t.name]=this.item(t.name);return obj}return a<n&&a>=0?b[a].name:f}};c.localStorage={setItem:function(a,b){g.item(a,b);this.length=g.key()},getItem:function(a){return g.item(a)},removeItem:function(a){g.item(a,null);this.length=g.key()},clear:function(){g.clear();this.length=g.key()},length:-1,key:function(i){return g.key(i)},isVirtualObject:true};g.init()})(window);(function(c,d,e){var f={set:function(a,b){if(this.get(a)!==e)this.remove(a);d.setItem(a,b)},get:function(a){var v=d.getItem(a);return v===null?e:v},remove:function(a){d.removeItem(a)},clear:function(){d.clear()},each:function(a){var b=this.obj(),fn=a||function(){},key;for(key in b)if(fn.call(this,key,this.get(key))===false)break},obj:function(){var a={},i=0,n,key;if(d.isVirtualObject){a=d.key(-1)}else{n=d.length;for(;i<n;i++){key=d.key(i);a[key]=this.get(key)}}return a}},j=c.jQuery;c.LS=c.LS||f;if(j)j.LS=j.LS||f})(window,window.localStorage);

/*
 * jQuery简单扩展[小工具集]
 */
$.extend({
	//从URL中捕获参数
	getUrlPara: function(paraName) {
		var str = window.location.search.replace(/^\?/g, ""), dstr = str;
		//先解码，解码失败则替换&链接符号，保证内容能够解析
		//解码失败的情况极其少见，以后确认算法后可以优化代码
		try{
			dstr = decodeURIComponent(str);
		}catch(e){
			dstr = str.replace(/"%26"/g, "&");
		}
		return $.getParaFromString(dstr, paraName);
	},
	//从HASH中捕获参数
	getHashPara: function(paraName) {return $.getParaFromString(window.location.hash.replace(/^#*/, ""), paraName); },
	//从字符串中捕获参数
	getParaFromString: function(str, paraName) {
		var reg = new RegExp("(?:^|&)" + $.safeRegStr(paraName) + "=([^&$]*)", "gi");
		return reg.test(str) ? decodeURIComponent(RegExp.$1) : "";
	},
	//替换安全的html字符串
	safeHTML : function( str ){
		return String(str)
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&#39;");
	},
	//替换安全的正则表达式字符串
	safeRegStr : function( str ){return String(str).replace(/([\\\(\)\{\}\[\]\^\$\+\-\*\?\|])/g, "\\$1"); },
	//false fn
	falseFn : function(){return false},
	//阻止冒泡函数
	stopProp : function(e){e.stopPropagation()},
	//阻止默认行为
	preventDft : function(e){e.preventDefault()},
	//判断是否是左键点击，e为jquery事件对象
	isLeftClick : function( e ){
		//IE 6 7 8		左键 1 右键 2 中键 4  若是组合键，则位或，如按下左键后不放点击右键，button为3
		//IE9以及其他		左键 0 中键 1 右键 2  组合键没有特殊值
		return e.button == ("\v" == "v" ? 1 : 0);
	},
	//代理选择一个文件路径
	fileAgent : function(){
		var agent = $("<input type='file'/>").hide().appendTo(document.body), file;
		agent.click();
		file = agent.val()||null;
		agent.remove();
		return file;
	},
	//格式化日期
	formatTime : function( timeNum, tmpl ){
		//转化为数字
		var num = /^\d+$/gi.test(timeNum+"") ? +timeNum : Date.parse(timeNum);
		//如果数据不能转化为日期，则直接返回不处理
		if( isNaN(num) )
			return timeNum;
		//转化日期
		var D = new Date(num), zz=function(a){ return ("0"+a).slice(-2);},
			yyyy = D.getFullYear(),
			M = D.getMonth()+1, MM = zz(M),
			d = D.getDate(), dd = zz(d),
			h = D.getHours(), hh = zz(h),
			m = D.getMinutes(), mm = zz(m),
			s = D.getSeconds(), ss = zz(s);
		return (tmpl||"yyyy-MM-dd hh:mm:ss")
				.replace(/yyyy/g, yyyy)
				.replace(/MM/g, MM).replace(/M/g, M)
				.replace(/dd/g, dd).replace(/d/g, d)
				.replace(/hh/g, hh).replace(/h/g, h)
				.replace(/mm/g, mm).replace(/m/g, m)
				.replace(/ss/g, ss).replace(/s/g, s);
	}
});

})( window, jQuery );
