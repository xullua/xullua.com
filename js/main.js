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

//トップ背景ランダム表示
if ($('.top-hello').length) {
    var imgpass = "画像ファイルまでのパス";
    // 表示させたい画像のファイル名＋拡張子を配列に格納
    var imgfile = [];
    imgfile[0] = 'img/top-hello1.webp';
    imgfile[1] = 'img/top-hello2.webp';
    imgfile[2] = 'img/top-hello3.webp';
    imgfile[3] = 'img/top-hello4.webp';
    imgfile[4] = 'img/top-hello5.webp';
    imgfile[5] = 'img/top-hello6.webp';
    // 画像の数を元に、ランダムな数値を算出
    var n = Math.floor(Math.random() * imgfile.length);
    var bgbox = $('.top-hello');
    // 算出したランダムな数値の順番にいるファイル情報をbackground-imageに設定する
    bgbox.css('background-image', 'url(' + imgfile[n] + ')');
}

//時間ごとのあいさつ
var d = new Date();
var hours = d.getHours();
var greeting = document.getElementById("greeting")
var b = document.getElementsByTagName('body')[0];
function changeTime() {
    if (6 < hours && hours <= 10) {
        greeting.textContent = "おはようございます";
    }
    else if (10 < hours && hours <= 17) {
        greeting.textContent = "こんにちは";
    }
    else if (17 < hours && hours <= 23) {
        greeting.textContent = "こんばんは";
    }
    else if (hours < 5) {
        greeting.textContent = "早く寝ろ";
    }
}
changeTime();
