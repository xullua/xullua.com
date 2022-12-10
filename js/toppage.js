//トップ背景ランダム表示
if ($('.top-hello').length) {
    var imgpass = "画像ファイルまでのパス";
    var imgfile = [];
    imgfile[0] = 'img/top-hello1.webp';
    imgfile[1] = 'img/top-hello2.webp';
    imgfile[2] = 'img/top-hello3.webp';
    imgfile[3] = 'img/top-hello4.webp';
    imgfile[4] = 'img/top-hello5.webp';
    imgfile[5] = 'img/top-hello6.webp';
    var n = Math.floor(Math.random() * imgfile.length);
    var bgbox = $('.top-hello');
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

//現在の時間
function displayTime() {
    var currentTime = new Date();
    var hours = currentTime.getHours();
    var minutes = currentTime.getMinutes();
    var date = new Date();
    var month = date.getMonth() + 1;
    var day = date.getDate();
    var date = new Date();
    var day = date.getDay();
    var dayOfWeek = "";
    switch (day) {
        case 0:
            dayOfWeek = "Sun";
            break;
        case 1:
            dayOfWeek = "Mon";
            break;
        case 2:
            dayOfWeek = "Tue";
            break;
        case 3:
            dayOfWeek = "Wed";
            break;
        case 4:
            dayOfWeek = "Thu";
            break;
        case 5:
            dayOfWeek = "Fri";
            break;
        case 6:
            dayOfWeek = "Sat";
            break;
    }

    document.getElementById("top-time").innerHTML = hours + ":" + minutes;
    document.getElementById("top-date").innerHTML = month + "/" + day;
    document.getElementById("top-day").innerHTML = dayOfWeek;
}
setInterval(displayTime, 1000);