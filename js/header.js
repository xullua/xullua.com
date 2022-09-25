$(function () {
    var hd_size = $('header').innerHeight();
    var pos = 0;
    $(window).on('scroll', function () {
        var current_pos = $(this).scrollTop();
        if (current_pos < pos || current_pos == 0) { 
            $('header').css({ 'top': 0 });
        } else {
            $('header').css({ 'top': '-' + hd_size + 'px' });
        }
        pos = current_pos;
    });
});
