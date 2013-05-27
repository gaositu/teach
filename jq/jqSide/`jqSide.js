/*
 * jqSide
 *
 * [Depend On]
 *		jQuery 1.4.2+
 *
 * [Change Log]
 * 2011-12-30  创建
 * 2011-12-30  增加 $.format 对象数据源的多级查找替换功能
 * 2012-01-06  完善低版本IE检测方法
 * 2012-01-12  修复defaultValue组件
 * 2012-02-13  修复 $.format 对象检测用正则表达式
 * 2012-03-01  修改垃圾回收函数名为 GC
 * 2012-03-15  增加addFav方法
 * 2012-03-31  暂时删除错误捕获方法以使用浏览器调试
 * 2012-04-11  修改bindTab方法，提高兼容和灵活性
 * 2012-04-26  完善_load / jqSide.loadJS / jqSide.loadCss 方法，支持高并发智能处理
 * 2012-05-03  增加$.fn.scrollGrid组件
 * 2012-05-18  增加ajax对404页面的检测，即返回内容不得含有DOCTYPE声明
 * 2012-05-25  增强loadJS/loadCss方法，增加检查函数
 * 2012-06-13  增强jqSide.get/jqSide.post方法，支持163.com各子域名跨域通讯（取消原接口的返回值；自动根据url参数识别判断是否需要跨域）
 * 2012-06-13  增加jqSide.agent$(domain, callback)方法，以获得指定域名下的代理页面的jQuery对象（通过callback第一个参数传递）
 * 2012-07-04  修改bindTab方法，增加回调处理
 * 2012-07-19  增加localStorage组件
 * 2012-08-02  增加fixPosition组件
 * 2012-09-20  完善ajax包装
 * 2012-11-02  扩大ajax包装key的标志，增加 *key 类型以去除cache参数
 * 2012-11-02  修复少数情况下ajax超时导致key缓存未清楚的bug
 *
 */
/*********************** jqBase Start ***********************
 *
 * jqBase 独立于各个产品和业务，是对基本数据类型以及JQuery的扩充
 * 是jqSide的基础模块，没有特殊需求，请保持其完整性
 * 代码优先原则：越基础越靠前；删除部分代码时请注意此原则
 */
(function(window, $, undefined){
//"use strict";
/*
 * 缓存正确的变量引用
 */
var document = window.document;

/*
 * 修复IE6背景缓存bug
 */
try{
	document.execCommand("BackgroundImageCache", false, true);
}catch(e){}

/*
 * 扩展Number对象
 */
$.extend(Number.prototype,{
	// dot 保留几位小数
	// step 逢几进位，默认5（四舍五入）
	Round : function(dot, step){var a = Math.pow(10, dot || 0); return step == 0 ? Math.ceil( this*a )/a : Math.round( this*a + (5 - (step || 5))/10 )/a; },
	// 同上
	Cint : function(step){ return this.Round(0, step); }
});

/*
 * 测试浏览器是否支持正则表达式预编译
 */
var testReg = /./, regCompile = testReg.compile && testReg.compile(testReg.source,"g");
//保存是否支持正则表达式预编译
RegExp.regCompile = regCompile;

/*
 * 预编译常用的正则表达式
 */
var compileReg = [
	/[\u4e00-\u9fa5\u3400-\u4db5\ue000-\uf8ff]/g,	//检测中文字符，共三区汉字：CJK-A、CJK-B、EUDC
	/^(?:\s|\xa0|\u3000)+|(?:\s|\xa0|\u3000)+$/g, //检测前后空格　\u00a0 == \xa0　是html中 &nbsp; 中文全角空格是 \u3000
	/([^\x00-\xff])/g	//检测双字节字符，并保留匹配结果
];
regCompile && $.each(compileReg, function(i, reg){
	compileReg[i] = reg.compile(reg.source, "g");
});

/*
 * 扩展String对象
 */
$.extend(String.prototype,{
	//删除前后空格
	trim : function(){return this.replace(compileReg[1],"");},
	//计算字节占位长度
	byteLen : function(){return this.replace(compileReg[2],"ma").length;},
	//按字节截取字符串
	// len		为要截取的字节数
	// holder	截取后的字符串后缀，比如"..."
	cutString : function( len, holder ){
		if( holder ){
			var hd = String(holder), hdLen = hd.length, str = this.replace(compileReg[2],"$1 ");
			len = len >= hdLen ? len-hdLen : 0;
			holder = str.length > len ? hd : "";
			return str.substr(0,len).replace(/([^\x00-\xff]) /g,'$1')+holder;
		}
		//算法来源于百度开源前端库
		//https://github.com/BaiduFE/Tangram-more/blob/master/src/SubstrByByte/substrByByte.js
		return this.substr(0,len).replace(compileReg[2],'$1 ').substr(0,len).replace(/([^\x00-\xff]) /g,'$1');
	},
	//截取文件名
	getFileName : function(){
		var m =/[^\\]+\.?[^\\\.]+$/g.exec(this.replace(/\//g, "\\"));
		return m ? m[0] : "";
	}
});

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

/*
 * 格式化模版字符串
 * string 待格式化的字符串，占位符为 {key} 而不是其他模版文件中的 ${key} : 是我想不到为什么要添加一个$前缀的原因和理由
 * source 填充数据，支持多参、数组、对象类型（对象名仅支持数字英文和下划线）
 */
var formatReg = regCompile ? /./.compile("\\{([\\w\\.]+)\\}", "g") : /\{([\w\.]+)\}/g;
$.format = function(string, source){
	var isArray = true, N, numReg,
		//检测数据源
		data = source === undefined ? null
				: $.isPlainObject(source) ? (isArray = false, source)
					: $.isArray(source) ? source
						: Array.prototype.slice.call(arguments, 1);
	if( data === null )
		return string;
	//数组长度
	N = isArray ? data.length : 0;
	//预编译数字检测正则表达式
	numReg = regCompile ? /./.compile("^\\d+$") : /^\d+$/;
	//执行替换
	return String(string).replace(formatReg, function(match, index) {
		var isNumber = numReg.test(index), n, fnPath, val;
		if( isNumber && isArray ){
			n = parseInt(index, 10);
			return n < N ? data[n] : match;
		}else{ //数据源为对象，则遍历逐级查找数据
			fnPath = index.split(".");
			val = data;
			for(var i=0; i<fnPath.length; i++)
				val = val[fnPath[i]];
			return val === undefined ? match : val;
		}
	});
};

/*
 * jQuery原型扩展
 */
$.fn.extend({
	// disabled / enabled
	// 和setControlEffect有样式联动，目的为了解决Ie6不支持多class联合定义的bug
	disabled: function( css ) {
		return this.each(function(){
			var fix = this.bindDownCssFix || "", dis = !css ? "disabled"+fix : css;
			$(this).attr("disabled", "disabled").addClass( dis )[0].disabled = true;
		});
	},
	enabled: function( css ) {
		return this.each(function(){
			var fix = this.bindDownCssFix || "",
				dis = !css ? "disabled"+fix : css;
			$(this).removeClass( dis ).removeAttr("disabled")[0].disabled = false;
		});
	},
	// 设置选择限制 / 取消选择限制
	disableSelection: function() {return this.attr('unselectable', 'on').css('MozUserSelect', 'none').bind('selectstart', $.falseFn);},
	enableSelection: function() {return this.removeAttr('unselectable').css('MozUserSelect', '').unbind('selectstart').bind('selectstart', $.stopProp);},
	// 禁止浏览器默认的拖曳事件
	disableDarg : function(){ return this.bind('dragstart', $.falseFn); },
	enableDarg : function(){ return this.unbind('dragstart', $.falseFn); },
	// 禁止右键 / 开启右键
	disableRightClick: function(){ return this.bind("contextmenu", $.falseFn); },
	enableRightClick : function(){ return this.unbind("contextmenu", $.falseFn).bind("contextmenu", $.stopProp); },
	//禁止/启用输入法
	disableIME : function(){ return this.css("ime-mode", "disabled"); },
	enableIME : function(){ return this.css("ime-mode", ""); }
});

/*
 * 设置元素多态样式，normal状态是默认状态，不予以特殊标记；link的hover动作通过CSS设定，JS不参与
 * downCSS		鼠标按下样式，默认 down
 * keepDownCss	鼠标点击后保持的样式，如果没有按下，则不用此参数
 */
$.fn.setControlEffect = function( downCss, keepDownCss ){
	return this.each(function(){
		//添加一次性标志位
		if( this.bindControlEffect )return;
		this.bindControlEffect = 1;
		//检测并绑定
		var down = downCss || "down", fix;
		//2011-05-30 增加对down样式的记忆功能，以便和disabled成对绑定
		if( /^down(.+)$/.test(down) )
			fix = RegExp.$1;
		fix !== undefined && (
			this.bindDownCssFix = fix,
			$(this).hasClass("disabled") && $(this).removeClass("disabled").addClass("disabled"+fix)
		);
		//按下状态
		//IE(<9)下连续高速点击，将导致一部分mousedown事件丢失
		//IE 6 7 8  左键 1 右键2 中键 4  若是组合键，则位或，如按下左键后不放点击右键，button为3
		//IE9以及其他  左键0 中键1 右键2  组合键没有特殊值
		$(this).enableDarg().disableDarg().bind({
			mousedown : function(e){
				if(!$.isLeftClick(e) || this.disabled || /disabled/gi.test(this.className) )
					return false;
				$(this).addClass(down);
			},
			mouseup : function(e){
				if(!$.isLeftClick(e))
					return false;
				$(this).removeClass(down);
			},
			mouseout : function(){$(this).removeClass(down);}
		});
		//保持状态
		//IE下连续高速点击，将导致一部分click事件丢失 ---- 此bug已经通过脚本修复
		keepDownCss && $(this).click(function(){
			$(this).toggleClass(keepDownCss);
		});
	});
};

/*
 * 闪动一个Dom元素
 * 不支持动画队列，仅仅支持单个元素调用
 */
$.fn.flash = function( num, speed, fn ){
	if( $.isFunction(num) ){
		fn = num;
		num = 0;
	}
	if( $.isFunction(speed) ){
		fn = speed;
		speed = 0;
	}
	var N = 2*(num||3), i=0, isShow = this.is(":visible"), timer = this.flashTimer, obj=this;
	//clear last timer
	timer && window.clearInterval(timer);
	//new timer
	timer = window.setInterval(function(){
		obj.css("visibility", i%2?"visible":"hidden");
		i++;
		if(i >= N){
			window.clearInterval(timer);
			obj.flashTimer = 0;
			$.isFunction(fn) && fn.call(obj);
		}
	}, speed || 200);
	//save timer
	this.flashTimer = timer;
	return this;
};

/*
 * 输入框默认值组件
 * dftValue 输入框默认值，为空则不处理
 * dftCss	默认值情况下的样式名，不传则轮换设置以下颜色值 #9a9a9a / #000
 */
$.fn.defaultValue = function(dftValue, dftCss){
	return this.each(function(){
		var me = $(this), evt, dft, evt;
		if( !me.is("input:text") && !me.is("textarea") )
			return;
		dft = dftValue || me.attr("defaultVal");
		if( dft ){
			me.attr("defaultVal", $.safeHTML(dft));
			evt = defaultValueEvents;
			dftCss && me.attr("defaultCss", $.safeHTML(dftCss));
			evt = {focus:defaultValueEvents,blur:defaultValueEvents};
			me.unbind(evt).bind(evt);
			//初始化
			evt.focus.call(this,{type:"focus"});
			evt.blur.call(this,{type:"blur"});
		}
	});
};
var defaultValueEvents = function( e ){
	var me = $(this), val = $.trim(me.val()), dft = me.attr("defaultVal") || "", css = me.attr("defaultCss");
	if( e.type == "focus" && dft == val ){
		me.val("");
		css ? me.removeClass(css) : me.css("color", "#333");
	}else if( e.type == "blur" && !val ){
		me.val(dft);
		css ? me.addClass(css) : me.css("color", "#9a9a9a");
	}
	if( e && e.type ){
	  e.value = val;
	  e.type = "i."+ e.type;
	  $(e.target).trigger(e);
	}
};

/*
 * 给出焦点[兼容性有问题，此方法暂不推荐使用]
 * len 为光标位置，默认内容最后
 *//*
$.fn.giveFocus = function( len ){
	var dom = this[this.length -1], tag, pos, range, can;
	if( dom[0] ){
		tag = dom.tagName.toLowerCase();
		if( tag == "input" || tag == "textarea" ){
			try{
				can = dom.readonly ? false : dom.createTextRange ? true : false;
				pos = len == undefined ? $(dom).val().length : len;
				if(can){
					range = dom.createTextRange();
					range.moveStart('character', pos);  
					range.collapse(true);  
					range.select();
				}
			}catch(e){
				dom.focus();
			}
		}
	}
	return this;
};*/

/*
 * Tab切换组件
 * callback		[可选]切换回调，当tab显式的时候调用，this指向当前tab，参数是 内容dom
 * method		[可选]切换方法，支持所有合理的方法监听
 * itemTag		[可选]tab元素，用于代理监听，默认 li
 * activeCss	[可选]选中态样式，默认 active
 * hookAttr		[可选]与内容卡关联的节点名称，默认 rel，节点内容为 selector，通常是 #contentID
 */
$.fn.bindTab = function( callback, method, itemTag, activeCss, hookAttr ){
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
 * 未压缩代码以及更多说明请查看localStorage组件目录
 */
(function(c,f){if(c.localStorage)return;var g={file:c.location.hostname||"localStorage",o:null,init:function(){if(!this.o){var a,doc=document,box;try{a=new ActiveXObject('htmlfile');a.open();a.write('<s'+'cript>document.w=window;</s'+'cript><iframe src="/favicon.ico"></frame>');a.close();doc=a.w.frames[0].document}catch(e){doc=document}try{box=doc.body||doc.documentElement||doc,o=doc.createElement('input');o.type="hidden";o.addBehavior("#default#userData");box.appendChild(o);var d=new Date();d.setDate(d.getDate()+365);o.expires=d.toUTCString();o.load(this.file);this.o=o;c.localStorage.length=this.key()}catch(e){return false}};return true},item:function(a,b){if(!this.init())return;if(b!==f){b===null?this.o.removeAttribute(a):this.o.setAttribute(a,b+"");this.o.save(this.file)}else{var v=this.o.getAttribute(a);return v===null?f:v}},clear:function(){if(!this.init())return;var a=this.key(-1);for(var b in a)this.o.removeAttribute(b);this.o.save(this.file)},key:function(a){if(!this.init())return-1;var b=this.o.XMLDocument.documentElement.attributes,n=b.length,i=0,t,obj={};if(a===f)return n;if(a===-1){for(;t=b[i];i++)obj[t.name]=this.item(t.name);return obj}return a<n&&a>=0?b[a].name:f}};c.localStorage={setItem:function(a,b){g.item(a,b);this.length=g.key()},getItem:function(a){return g.item(a)},removeItem:function(a){g.item(a,null);this.length=g.key()},clear:function(){g.clear();this.length=g.key()},length:-1,key:function(i){return g.key(i)},isVirtualObject:true};g.init()})(window);(function(c,d,e){var f={set:function(a,b){if(this.get(a)!==e)this.remove(a);d.setItem(a,b)},get:function(a){var v=d.getItem(a);return v===null?e:v},remove:function(a){d.removeItem(a)},clear:function(){d.clear()},each:function(a){var b=this.obj(),fn=a||function(){},key;for(key in b)if(fn.call(this,key,this.get(key))===false)break},obj:function(){var a={},i=0,n,key;if(d.isVirtualObject){a=d.key(-1)}else{n=d.length;for(;i<n;i++){key=d.key(i);a[key]=this.get(key)}}return a}},j=c.jQuery;c.LS=c.LS||f;if(j)j.LS=j.LS||f})(window,window.localStorage);

/*
 * 简易拖拉组件 $.fn.bindDrag
 * 不使用浏览器自带的拖拉事件，而是使用mousedown / mousemove / mouseup 事件
 * 一个组合参数，事件函数的调用者都指向Dom元素本身
 * {
 *	beforeDrag : fn,//鼠标按下时触发，接收一个参数，event 对象，若fn返回flase则不拖动
 *	dragStart : fn,	//准备拖动前触发，接收一个参数，event 对象，若fn返回flase则不拖动
 *	onDrag : fn,	//拖动中不断触发，接收一个参数，event 对象
 *	dragEnd : fn,	//拖动结束时触发，接收一个参数，event 对象
 *	pix : 3			//启用拖动像素差，不得小于1，不得大于10
 * }
 */
$.fn.bindDrag = function( options ){
	var op = $.extend({
			  beforeDrag:$.noop,
			  dragStart:$.noop,
			  onDrag:$.noop,
			  dragEnd:$.noop,
			  pix : 3
			}, options||{} ),
		dragCache,
		dragEvents = {
			mousedown : function(e){
				if( op.beforeDrag.call(this, e) === false) //用户停止
					return; //由原来的return false 修改 return; 2012-03-02 
				//缓存鼠标位置并标记
				dragCache = {
					mouse : [e.pageX, e.pageY],
					flag : 1
				};
				this.setCapture
					? this.setCapture()
					: window.captureEvents && window.captureEvents(window.Event.MOUSEMOVE|window.Event.MOUSEUP);
				$(this).one("losecapture", function(){$(document).mouseup()});
				//绑定document进行监听
				$(document).mousemove($.proxy(dragEvents.mousemove, this))
					.mouseup($.proxy(dragEvents.mouseup, this));
				//仅阻止默认行为，不阻止冒泡
				e.preventDefault();
			},
			mousemove : function(e){
				var cache = dragCache;
				if( cache.flag < 1 )
					return;
				if( cache.flag > 1 ){
					op.onDrag.call(this, e);
				}else if( Math.abs(e.pageX-cache.mouse[0])>=op.pix || Math.abs(e.pageY-cache.mouse[1])>=op.pix ){
					cache.flag = 2;
					if( op.dragStart.call(this, e) === false){ //用户停止
						cache.flag = 1;
						dragEvents.mouseup.call(this, e);
					}
				}
			},
			mouseup : function(e){
				var cache = dragCache;
				if(cache.flag > 1)
					op.dragEnd.call(this, e);
				//重置标签
				cache.flag = 0;
				this.releaseCapture
					? this.releaseCapture()
					: window.releaseEvents && window.releaseEvents(window.Event.MOUSEMOVE|window.Event.MOUSEUP);
				$(this).unbind("losecapture");
				//取消事件监听
				$(document).unbind("mousemove", dragEvents.mousemove)
					.unbind("mouseup", dragEvents.mouseup);
				return false;
			}
		};
	//像素差范围 [1,9]
	op.pix = op.pix < 1 ? 1 : op.pix > 9 ? 9 : op.pix;
	//绑定mousedown监听触发
	return this.mousedown(dragEvents.mousedown);
};

/*
 * 固定位置组件〔for IE6〕
 * 2012-08-02  编写
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

})(window, jQuery);
/*********************** jqBase End ***********************/
/*
 * 核心对象jqSide
 */
var jqSide = (function(window, $, undefined){
var jqSide = {
	/*
	 * UI版本
	 */
	version : "1.1",
	
	/*
	 * 内存强制回收函数引用
	 */
	GC : window.CollectGarbage || $.noop,
	
	/*
	 * 业务配置信息对象/缓存对象，由页面自定设置
	 */
//	config : {},
//	helper : {},
//	cache : {},

	/*
	 * 时间戳
	 */
	now : function(){return (new Date).getTime();},
	
	/*
	 * 快速初始化入口
	 * 需要在页面底部插入激活代码 jqSide.quickInit();
	 */
	quickInit : $.noop,
	
	/*
	 * 初始化入口
	 */
	init : function(){
		//动态事件绑定
//		$("a[href*=#jqSide]")
//			//防止多次绑定
//			.unbind("click", this.autoHashClick)
//			//绑定click事件
//			.click(this.autoHashClick);

		//各个页面独立的初始化任务
		this.myInit();
		
		//通用点击三态效果
		
		
		//页面卸载以及尺寸变化
		this.unload != $.noop && $(window).unload($.proxy(this.unload, this));
		this.resize != $.noop && $(window).resize($.proxy(this.resize, this));
		this.beforeUnload != $.noop && $(window).bind("beforeunload", $.proxy(this.beforeUnload, this));
		//主动激发一次resize事件
		window.setTimeout(function(){$(window).resize()},0);
		
		//删除过期成员
		delete this.init;
		this.quickInit && delete this.quickInit;
		//内存垃圾回收
		this.GC();
	},
	
	//各个页面独立的初始化任务，需要在页面中覆盖
	myInit : $.noop,
	//页面卸载任务
	unload : $.noop,
	//页面尺寸变化
	resize : $.noop,
	//窗口关闭前处理
	beforeUnload : $.noop,
	
	/*
	 * 自动绑定的click事件处理
	 * html结构：<a href="#jqSide.openMenu:1">...</a>
	 * this --> link
	 */
	autoHashClick : function(e){
		if( this.disabled || e.shiftKey || e.altKey || e.ctrlKey )return false;
		if( !/^#jqSide\.([^\:]+):?(.*)$/.test(this.hash) )
			return;
		//定位
		var method = RegExp.$1.split("."),
			para = RegExp.$2 ? RegExp.$2.split(",") : [],
			i, n, fn = jqSide, $this = fn;
		//将事件对象作为参数追加到参数列表中
		para.push(e);
		//查找方法
		n = method.length;
		for(i=0; i<n; i++){
			$this = fn;
			fn = fn[method[i]];
		}
		//执行
		return fn.apply($this, para);
	},
	
	/*
	 * 转化日期数字为指定格式
	 */
	formatTime : function( timeNum, tmpl ){return $.formatTime(timeNum, tmpl);},
	
	/*
	 * 字符串转化为json对象，适用小数据量转化
	 * 此处不对字符串进行安全检查，也不处理前后空格
	 * 将\/Date(...)\/格式的外层斜线去掉以供js使用
	 * $.parseJSON 也可进行json格式化，但是对输入检验比较严格，可以根据实际情况选择使用
	 */
	parseJSON : function(data){
		data = data.replace(/("|')\\?\/Date\((-?[0-9+]+)\)\\?\/\1/g, "new Date($2)");
		return (new Function("return " + data))();
	},
	
	/*
	 * 添加到收藏夹
	 */
	addFav : window.sidebar ? function(url, txt){ window.sidebar.addPanel(txt, url, "");} : function(url, txt){
		try{window.external.addFavorite(url,txt);}catch(e){window.alert("请尝试点击 Ctrl + D 来添加！");};
	},
	
	/*
	 * 发送GET类型的http请求
	 * 可根据类型参数来控制并发冲突，如果key是一个以 @开头的字符串，则表示去掉上一个同类型的ajax，否则就取消本次ajax除非上一个ajax完成
	 */
	get : function( url, data, callback, key ){ return _ajax("GET", url, data, callback, key); },
	
	/*
	 * 发送POST类型的http请求
	 */
	post : function( url, data, callback, key ){ return _ajax("POST", url, data, callback, key); },
	
	/*
	 * 获得指定域代理页面的jQuery对象
	 */
	agent$ : function( domain, callback ){
		createAgent(domain, callback);
		return this;
	},
	
	/*
	 * 加载javascript
	 */
	loadJS : function(url, chkFn, callback){
		//如果仅仅提供一个函数，则当作回调处理
		if( !callback ){
			callback = chkFn;
			chkFn = null;
		}
		if( $.isArray(url) ){
			//如果是数组，则并发加载
			var N = url.length, i=0, lastNum = N, loadOK = $.isFunction(callback) ? function(){--lastNum==0&&callback()} : $.noop;
			for(; i<N; i++)
				_load("script", url[i], chkFn, loadOK);
		}else //单文件加载
			_load("script", url, chkFn, callback);
		//返回jqSide
		return this;
	},
	/*
	 * 加载样式表
	 */
	loadCss : function(url){
		if( $.isArray(url) ){
			var N = url.length, i=0;
			for(; i<N; i++)
				_load("link", url[i]);
		}else
			_load("link", url);
		return this;
	}
},
/*
 * 创建跨域代理iframe
 * 需要在相应的域名根目录下放置 agent.htm（如 http://caipiao.163.com/agent.htm）
 */
altDomain = function( domain ){
	var d = (domain+"").toLowerCase(), i = d.indexOf("http");
	return i<0 ? /\.163\.com$/.test(d) ? d : ""
			   : i ? ""
			       : d.replace(/^https?:\/\//,"").replace(/\/.+$/,"");
},
agentCache = {},
createAgent = function( domain, callback ){
	var key = altDomain(domain), host = window.location.host+"", agent = agentCache[key], url = domain.replace(/https?:\/\/[^\/]+?/,"\1")+"/agent.htm";
	if( !key || key == host ){ //如果没有指定特殊的域名或是当前域名，则直接返回
		callback( $ );
		return;
	}
	if( agent ){ //如果已经创建了代理，则返回代理页面的 jQuery
		callback( agent );
		return;
	}
	//创建代理页面
	if( !document.body ){
		window.setTimeout(function(){ createAgent(domain, callback) }, 1);
		return;
	}
	var frame = $("<iframe scrolling='no' frameborder='0' width='0' height='0'/>")
	.insertAfter(document.body)
	.bind("load", function(){
		var agent = agentCache[key] = frame[0].contentWindow.jQuery;
		agent ? callback( agent ) : alert("跨域代理文件错误！<br/>"+ escape(url));
	}).attr("src", url);
},

/*
 * jqSide.get / jqSide.post 支持函数，私有
 * 当key为 @ 开头的字符串时，并发处理策略是：取消前一个未完成的ajax请求，然后发送新的ajax请求，否则取消当前函数；
 * 2012-06-12  增加跨域ajax请求的处理
 * 2012-09-20  完善ajax包装
 */
httpCache={},
ajax = function(type, url, data, callback, key){
	var host = window.location.host+"", domain = altDomain(url) || host, reg = /\.163\.com$/i, protocol = "http:", port = "80", fn;
	//分析url的访问协议
	if( /^(https?:)/i.test( url ) ){//如果指明了访问协议，则检查协议和端口号
		protocol = RegExp.$1.toLowerCase();
		if( /:(\d+)/i.test( url ) )
			port = RegExp.$1 || "80";
	}else{ //否则url是相对路径，则协议和端口都OK
		protocol = window.location.protocol;
		port = window.location.port || "80";
	}
	//如果访问协议和端口号不一致，则直接忽略此次ajax请求
	if( window.location.protocol != protocol || (window.location.port||"80") != port ){
		fn = $.isFunction(callback) ? callback : $.isFunction(data) ? data : $.noop;
		fn.call(jqSide, 2, "", "protocols or ports not match");
		return;
	}
	//同在163.com主域下才可以跨域处理，否则一律转化为相对路径访问
	//只有在http协议下才启用跨域代理
	if( reg.test( domain ) && reg.test( host ) && document.domain == "163.com" && protocol == "http:" ){
		createAgent(domain, function( jq ){
			_ajax(jq, type, url, data, callback, key);
		});
	}else{ //转化为相对路径
		_ajax(jQuery, type, url.replace(/https?:\/\/[^\/]+/, ""), data, callback, key);
	}
},
_ajax = function(jq, type, url, data, callback, key){
	var fn = $.isFunction(callback) ? callback : $.noop, URL = url, xhr, state, lib = jqSide, noCache = false, cachePara = (URL.indexOf("?")>=0 ? "&" : "?") +"cache="+ (+new Date());
	if( $.isFunction(data) ){
		fn = data;
		data = null;
		key = callback;
	}
	if( key && key.indexOf("*") == 0 ){ //无缓存
		noCache = true;
		key = key.substr(1);
	}
	if( key ){
		xhr = httpCache[key];
		if( xhr ){
			//普通并发处理，直接取消当前处理
			if( key.indexOf("@") !== 0 )
				return;
			//否则，取消上一个未完成的ajax请求
			state = xhr.readyState;
			if( state > 0 && state < 5 ){
				//IE9' abort bug, see more:
				//http://www.enkeladress.com/article.php/internetexplorer9jscripterror
				try{
					xhr.aborted = true;
				}catch(e){} //防止IE6报错
				xhr.abort();
			}
		}
	}
	//发送
	xhr = jq.ajax({
		url: URL + (noCache ? "" : cachePara),
		type: type,
		data: data,
		success : function( txt, status, res ){
			//主动删除缓存
			delete httpCache[key];
			//如果请求被取消，则不进行任何处理
			if( res.aborted )
				return;
			//无法连接服务器（返回空数据）被认为是错误，但chorme却认为是正确返回
			if( txt == undefined || txt == null || txt == "" || txt.indexOf("<!DOCTYPE")>=0 ){
				fn.call(lib, 1, txt, status);
				return;
			}
			//通知回调
			fn.call(lib, 0, txt, status);
		},
		error : function( res, status ){
			//主动删除缓存
			delete httpCache[key];
			//没有文件等错误，会返回两次error事件，一次状态是error，一次状态是null
			if( !status || status == "error" ){
				//通知回调
				fn.call(lib, 1, "", status);
				return;
			}
			if( res.aborted )
				return;
			//通知回调
			fn.call(lib, 1, res.responseText, status);
		}
	});
	//存储
	key && (httpCache[key] = xhr);
},

/*
 * 动态加载js/css
 */
resCache = {},
_load = function(type, url, chk, fn){
	var key = url.toLowerCase().replace(/#.*$/,"").replace("/\?.*$/", ""), tag, head, isFunc = $.isFunction, cache = resCache[key], chkFn = chk || $.noop;
	if( chkFn(url)===true ){ //如果检查函数认为已经加载，则立即返回
		isFunc(fn) && fn();
		return;
	}
	if( !cache ){ //尚未加载
		resCache[key] = [fn];
		tag = document.createElement(type), head = document.getElementsByTagName("head")[0] || document.documentElement;
		//添加缓存控制参数
		url = url + (url.indexOf("?") >=0 ? "&" : "?") + "ver="+ jqSide.version;
		if( type == "link" ){ // load css
			tag.rel = "stylesheet";
			tag.type = "text/css";
			tag.media = "screen";
			tag.href = url;
		}else{ //load js
			tag.type = "text/javascript";
			tag.src = url;
			tag.onload = tag.onreadystatechange = function(){
				if (!this.readyState || {loaded:1,complete:1}[this.readyState] ) {
					this.onload = this.onreadystatechange = null;
					this.parentNode.removeChild(this);
					var cache = resCache[key], n = cache.length, i=0;
					//立即重置缓存
					resCache[key] = 1;
					//调用回调
					for(; i<n; i++)
					  	isFunc(cache[i]) && cache[i]();
				}
			};
		}
		head.appendChild( tag, head.lastChild );
	}else if( cache == 1 ){ //已经加载过
		isFunc(fn) && fn();
	}else{ //加载中
		resCache[key].push(fn);
	}
};

//引用到window
return jqSide;
})(window, jQuery);

/*
 * 卸载事件
 */
jQuery(window).unload(function(){
	document.oncontextmenu = null;
	window.jqSide = null;
	window.onload = null;
	window.onresize = null;
	window.onunload = null;
	window.onerror = null;
	window.CollectGarbage && window.CollectGarbage();
});

//绑定页面完成监听
jQuery(document).ready(function(){ jqSide.init(); });