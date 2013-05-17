;( function ( window, $ ) {
	$.fn.marquee = function ( options ) {
		return this.each( function () {
			var $this = $( this );
			var $ul = $this.find( 'ul' );
			var liWidth = $ul.find( 'li:first' ).width();
			var containerWidth = $this.width();
			$ul.find('li').clone().appendTo( $ul );
			$ul.width( $ul.find('li').length * liWidth + 'px' );
						
			var doMarquee = function () {
				$ul.css( 'margin-left', '-=2px' );
				if ( Math.abs( parseInt( $ul.css( 'margin-left' ), 10 ) ) > $ul.width() / 2 ) {
					$ul.css( 'margin-left', '0px' );
				}
			}
			
			setInterval( doMarquee, 50 );
		});
	}
})( window, jQuery );