//トップ背景ランダム表示
if ($('.top-hello').length) {
    var imgpass = "画像ファイルまでのパス";
    var imgfile = [];
    imgfile[0] = '//xullua.com/img/top-hello1.webp';
    imgfile[1] = '//xullua.com/img/top-hello2.webp';
    imgfile[2] = '//xullua.com/img/top-hello3.webp';
    imgfile[3] = '//xullua.com/img/top-hello4.webp';
    imgfile[4] = '//xullua.com/img/top-hello5.webp';
    imgfile[5] = '//xullua.com/img/top-hello6.webp';
    var n = Math.floor(Math.random() * imgfile.length);
    var bgbox = $('.top-hello');
    bgbox.css('background-image', 'url(' + imgfile[n] + ')');
}


document.addEventListener('scroll', function() {
    const header = document.querySelector('header');
    if (window.scrollY === 0) {
        header.classList.add('transparent');
    } else {
        header.classList.remove('transparent');
    }
});


// 時間ごとのあいさつ
var d = new Date();
var hours = d.getHours();
var greeting = document.getElementById("greeting");
var b = document.getElementsByTagName('body')[0];

function getGreetingMessage(hours, isEnglish) {
    if (isEnglish) {
        if (6 < hours && hours <= 10) {
            return "Morning";
        } else if (10 < hours && hours <= 17) {
            return "Good Afternoon";
        } else if (17 < hours && hours <= 23) {
            return "Good Evening";
        } else if (hours < 5) {
            return "Go to bed";
        }
    } else {
        if (6 < hours && hours <= 10) {
            return "おはよう";
        } else if (10 < hours && hours <= 17) {
            return "こんにちは";
        } else if (17 < hours && hours <= 23) {
            return "こんばんは";
        } else if (hours < 5) {
            return "早く寝ろ";
        }
    }
}

function changeTime() {
    var isEnglish = window.location.pathname.includes('/en/');
    greeting.textContent = getGreetingMessage(hours, isEnglish);
}

changeTime();



fetch('https://xullua.com/js/top-words.json')
    .then(response => response.json())
    .then(data => {
        // `data` に JSON データが格納されます
        const randomIndex = Math.floor(Math.random() * data.length); // ランダムなインデックスを生成
        const randomWord = data[randomIndex]; // ランダムに選んだ単語オブジェクトを取得

        // `text` と `name` を HTML ページに表示する
        const textElement = document.querySelector('#top-words-text');
        textElement.textContent = randomWord.text;

        const nameElement = document.querySelector('#top-words-name');
        nameElement.textContent = randomWord.name;
    })
    .catch(error => console.error(error));
