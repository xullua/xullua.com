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

// Header/Footer を読み込む関数
async function loadCommonFiles() {
    try {
        const [headerRes, footerRes] = await Promise.all([
            fetch("header.html"),
            fetch("footer.html")
        ]);
        
        if (!headerRes.ok || !footerRes.ok) {
            throw new Error('Failed to load common files');
        }
        
        const headerHtml = await headerRes.text();
        const footerHtml = await footerRes.text();
        
        const headerElement = document.getElementById("header");
        const footerElement = document.getElementById("footer");
        
        if (headerElement) {
            headerElement.innerHTML = headerHtml;
        }
        if (footerElement) {
            footerElement.innerHTML = footerHtml;
        }
    } catch (error) {
        // エラー処理
    }
}

// DOM 準備完了時に実行
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadCommonFiles);
} else {
    loadCommonFiles();
}

// ヘッダーのスクロール処理（透明 ⇄ 背景表示の切り替え）
function initHeaderScroll() {
    const header = document.getElementById('header');
    if (!header) return;
    
    // スクロール位置に応じて transparent クラスを切り替え
    function handleScroll() {
        const scrollY = window.pageYOffset || document.documentElement.scrollTop;
        
        if (scrollY > 50) {
            // 50px 以上スクロールしたら背景を表示
            header.classList.remove('transparent');
        } else {
            // 50px 以下なら透明
            header.classList.add('transparent');
        }
    }
    
    // スクロールイベントをリスン
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // 初期状態を設定
    handleScroll();
}

// Header 読み込み完了後にスクロール処理を初期化
async function loadCommonFilesOriginal() {
    await loadCommonFiles();
    // Header が読み込まれた後にスクロール処理を初期化
    setTimeout(initHeaderScroll, 100);
}

// DOM 準備完了時に実行（上書き）
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadCommonFilesOriginal);
} else {
    loadCommonFilesOriginal();
}