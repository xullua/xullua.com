$(function () {
    var hd_size = $('header').innerHeight(); //ヘッダーの高さを取得
    var pos = 0;
    $(window).on('scroll', function () {
        var current_pos = $(this).scrollTop(); //現在の位置を取得
        if (current_pos < pos || current_pos == 0) { //上にスクロール もしくは 最上部
            $('header').css({ 'top': 0 }); //ヘッダーを表示
        } else {
            $('header').css({ 'top': '-' + hd_size + 'px' }); //ヘッダーを非表示(下にスクロール)
        }
        pos = current_pos;
    });
});
