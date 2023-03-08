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