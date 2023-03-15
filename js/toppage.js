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
        greeting.textContent = "おはよう";
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

fetch('js/top-words.json')
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