/*
 * A jQuery plugin library based on jQuery
 * version 1.1
 * report bug gao_st@126.com
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


})( window, jQuery );
