//ヘッダースクロールの表示非表示
document.getElementById('header').classList.add('active')
$(function () {
	var hd_size = $('header').innerHeight();
	var pos = 0;
	$(window).on('scroll', function () {
		var current_pos = $(this).scrollTop();
		if (current_pos < pos || current_pos == 0) {
			document.getElementById('header').classList.add('active')
		} else {
			document.getElementById('header').classList.remove('active')
		}
		pos = current_pos;
	});
});

//topに戻る
jQuery(function() {
    var pagetop = $('#page_top');   
    pagetop.hide();
    $(window).scroll(function () {
        if ($(this).scrollTop() > 100) {  //Xpxスクロールで表示
            pagetop.fadeIn();
        } else {
            pagetop.fadeOut();
        }
    });
    pagetop.click(function () {
        $('body,html').animate({
            scrollTop: 0
        }, 500);
        return false;
    });
});
