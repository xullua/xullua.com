//ヘッダースクロールの表示非表示
// ページが読み込まれた時に実行される処理
document.getElementById('header').classList.add('active')
window.onload = function () {
    var prevScrollpos = window.pageYOffset;
    var ticking = false;
    // スクロールイベントを監視し、headerの表示・非表示を切り替える
    window.addEventListener('scroll', function () {
        var currentScrollPos = window.pageYOffset;
        if (!ticking) {
            window.requestAnimationFrame(function () {
                // スクロール速度を計算
                var scrollSpeed = Math.abs(currentScrollPos - prevScrollpos);
                if (scrollSpeed > 30) {
                    if (prevScrollpos > currentScrollPos) {
                        document.getElementById('header').classList.add('active')
                    } else {
                        document.getElementById('header').classList.remove('active')
                    }
                }
                prevScrollpos = currentScrollPos;
                ticking = false;
            });
            ticking = true;
        }
    });
}


//Androidの場合別のフォントを読み込む
// ユーザーエージェントを取得する関数
function getOS() {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    if (/android/i.test(userAgent)) {
        return "Android";
    }
    return "Other";
}

// OSに応じてフォントを設定する関数
function setFont() {
    const os = getOS();
    if (os === "Android") {
        // Androidの場合はGoogle FontsのNoto Sans Japaneseを読み込む
        const link = document.createElement('link');
        link.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;500;700;900&family=Zen+Maru+Gothic:wght@400;500;700;900&display=swap';
        link.rel = 'stylesheet';
        document.head.appendChild(link);
    }
}
window.onload = setFont;