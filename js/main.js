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