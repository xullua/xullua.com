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

$(function () {
    var hd_size = $('header').innerHeight();
    var pos = 0;
    $(window).on('scroll', function () {
        var current_pos = $(this).scrollTop();
        if (current_pos < pos || current_pos == 0) {
            document.getElementById('mokuji').classList.add('active')
        } else {
            document.getElementById('mokuji').classList.remove('active')
        }
        pos = current_pos;
    });
});

