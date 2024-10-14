// グローバル変数
let players = [];
let wolfIndexes = [];
let currentIndex = 0;
let titles = [];
let hints = [];
let timerInterval = null;

// スタートボタン
document.getElementById('start-btn').addEventListener('click', () => {
    document.querySelector('.start').style.display = 'none';
    document.querySelector('.setting').style.display = 'block';
});

// 次へボタン (設定画面)
document.getElementById('next-btn').addEventListener('click', () => {
    const playerCount = parseInt(document.getElementById('player-count').value);
    const wolfCount = parseInt(document.getElementById('wolf-count').value);
    const errorMsg = document.getElementById('error-msg');

    if (isNaN(playerCount) || playerCount < 3) {
        errorMsg.textContent = 'プレイヤー数は3人以上で入力してください。';
        errorMsg.style.display = 'block';
        return;
    }
    if (isNaN(wolfCount) || wolfCount < 1 || wolfCount >= playerCount / 2) {
        errorMsg.textContent = 'ウルフの人数はプレイヤー数の半分未満で入力してください。';
        errorMsg.style.display = 'block';
        return;
    }

    // プレイヤー名の入力欄を生成
    const playerNameSection = document.querySelector('.playername');
    playerNameSection.innerHTML = '<h2>プレイヤー名設定</h2><p>プレイヤー名を入力してください。空欄の場合自動生成されます。</p>';
    for (let i = 0; i < playerCount; i++) {
        playerNameSection.innerHTML += `<input type="text" class="player-name" placeholder="プレイヤー${i + 1} の名前">`;
    }
    playerNameSection.innerHTML += '<button id="set-names-btn">次へ</button>';

    document.querySelector('.setting').style.display = 'none';
    playerNameSection.style.display = 'block';

    document.getElementById('set-names-btn').addEventListener('click', () => {
        players = Array.from(document.querySelectorAll('.player-name')).map((input, index) => input.value || `プレイヤー${index + 1}`);

        reselectWolfAndTitle();
        document.querySelector('.playername').style.display = 'none';
        displayPlayerCheck();
    });
});


// プレイヤー確認画面の表示
function displayPlayerCheck() {
    if (currentIndex < players.length) {
        const playerCheckSection = document.querySelector('.playercheck');
        playerCheckSection.querySelector('h2').textContent = `${players[currentIndex]}ですか`;
        playerCheckSection.querySelector('p').textContent = `はいを押すと、${players[currentIndex]}のお題が表示されます。他の人に見られないように気を付けてください。`;
        playerCheckSection.style.display = 'block';
    } else {
        document.querySelector('.gamestart').style.display = 'block';
    }
}

// プレイヤー確認ボタン
document.querySelector('.playercheck .player-check-btn').addEventListener('click', () => {
    document.querySelector('.playercheck').style.display = 'none';
    displayTitle();
});

// お題表示
function displayTitle() {
    const displayingTitleSection = document.querySelector('.displayingtitle');
    displayingTitleSection.querySelector('h2').textContent = `${players[currentIndex]}のお題`;

    // ウルフかどうかによってお題を決定
    const isWolf = wolfIndexes.includes(currentIndex);
    const title = isWolf ? titles[1] : titles[0];
    displayingTitleSection.querySelector('.player-title').textContent = title || 'お題が設定されていません';

    displayingTitleSection.style.display = 'block';
}

// お題了解ボタン
document.querySelector('.displayingtitle button').addEventListener('click', () => {
    document.querySelector('.displayingtitle').style.display = 'none';
    currentIndex++;
    displayPlayerCheck(); // 次のプレイヤーへ
});

// ゲーム開始ボタン
document.getElementById('game-start-btn').addEventListener('click', () => {
    document.querySelector('.gamestart').style.display = 'none';
    document.querySelector('.playinggame').style.display = 'block';
    displayHints();

    // 入力された時間制限を取得
    const minutes = parseInt(document.getElementById('time-limit-m').value) || 0;
    const seconds = parseInt(document.getElementById('time-limit-s').value) || 0;
    const totalTime = minutes * 60 + seconds;

    startTimer(totalTime); // カウントダウンを開始
});

// もう一度お題を確認するボタン
document.getElementById('review-title-btn').addEventListener('click', () => {
    document.querySelector('.gamestart').style.display = 'none';
    currentIndex = 0;
    displayPlayerCheck();
});

// お題を変えるボタン
document.getElementById('change-title-btn').addEventListener('click', () => {
    fetchTitles(() => {
        currentIndex = 0;
        reselectWolfAndTitle(); // 再選抜
        document.querySelector('.gamestart').style.display = 'none';
        displayPlayerCheck();
    });
});

// 終了して答えを確認ボタン
document.getElementById('end-game-btn').addEventListener('click', () => {
    document.querySelector('.playinggame').style.display = 'none';
    document.querySelector('.answer').style.display = 'block';
    displayAnswer();
    clearInterval(timerInterval); // タイマーを停止
});

// 答え表示
function displayAnswer() {
    const answerSection = document.querySelector('.answer');
    let tableHTML = '<h2>答え</h2><table><tbody><tr><th>プレイヤー名</th><th>役職</th><th>お題</th></tr>';
    players.forEach((player, index) => {
        let role = wolfIndexes.includes(index) ? 'ウルフ' : '市民';
        let title = wolfIndexes.includes(index) ? titles[1] : titles[0];
        let wolfClass = wolfIndexes.includes(index) ? ' class="wolf"' : ''; // ウルフにはクラスwolfを追加
        tableHTML += `<tr><td>${player}</td><td${wolfClass}>${role}</td><td>${title || '不明'}</td></tr>`;
    });
    tableHTML += '</tbody></table><div><button id="replay-btn">もう一度プレイ</button><button id="reset-settings-btn">設定に戻る</button></div>';

    answerSection.innerHTML = tableHTML;

    document.getElementById('replay-btn').addEventListener('click', () => {
        currentIndex = 0;
        reselectWolfAndTitle(); // 再選抜
        document.querySelector('.answer').style.display = 'none';
        displayPlayerCheck();
    });

    document.getElementById('reset-settings-btn').addEventListener('click', () => {
        currentIndex = 0;
        document.querySelector('.answer').style.display = 'none';
        document.querySelector('.setting').style.display = 'block';
    });
}

// 話題表示
function displayHints() {
    const hintSection = document.querySelector('.hint');
    hintSection.innerHTML = `
        <h3>話題</h3>
        <p>話題に困った際にこの話題を使って話しましょう。</p>
        <input type="radio" name="hint1" id="hint1">
        <label for="hint1">話題1を表示する</label>
        <p>話題1：${hints[0] || 'ヒントがありません'}</p>
        <input type="radio" name="hint2" id="hint2">
        <label for="hint2">話題2を表示する</label>
        <p>話題2：${hints[1] || 'ヒントがありません'}</p>
        <input type="radio" name="hint3" id="hint3">
        <label for="hint3">話題3を表示する</label>
        <p>話題3：${hints[2] || 'ヒントがありません'}</p>
    `;
}

// タイマーの開始
function startTimer(seconds) {
    const timerElement = document.getElementById('time-remaining');
    let remainingTime = seconds;
    let overtime = false;

    timerInterval = setInterval(() => {
        const minutes = Math.floor(Math.abs(remainingTime) / 60);
        const seconds = Math.abs(remainingTime) % 60;
        if (overtime) {
            timerElement.textContent = `超過： ${minutes}分${seconds.toString().padStart(2, '0')}秒`;
        } else {
            timerElement.textContent = `${minutes}分${seconds.toString().padStart(2, '0')}秒`;
        }

        if (remainingTime === 0) {
            overtime = true;
        }
        remainingTime--;
    }, 1000);
}

// JSONからお題と話題を取得（カテゴリーに基づいて絞り込む）
function fetchTitles(callback) {
    const selectedCategory = document.getElementById('category-select').value;

    fetch('title.json')
        .then(response => response.json())
        .then(data => {
            let filteredData;

            // カテゴリーを絞り込む。全ての場合は全データから選ぶ
            if (selectedCategory === 'all') {
                filteredData = data;
            } else {
                filteredData = data.filter(item => item.category === selectedCategory);
            }

            // ランダムにカテゴリーを選択
            const randomCategoryIndex = Math.floor(Math.random() * filteredData.length);
            const category = filteredData[randomCategoryIndex];

            // 選ばれたカテゴリーからお題とヒントをセット
            titles = [category.title1, category.title2];
            hints = [category.hint1, category.hint2, category.hint3];

            callback();
        })
        .catch(error => console.error("お題の読み込み中にエラーが発生しました:", error));
}



// ウルフとお題を再選抜
function reselectWolfAndTitle() {
    wolfIndexes = [];
    const playerCount = players.length;
    const wolfCount = parseInt(document.getElementById('wolf-count').value); // 入力されたウルフの人数に基づく

    while (wolfIndexes.length < wolfCount) {
        let randomIndex = Math.floor(Math.random() * playerCount);
        if (!wolfIndexes.includes(randomIndex)) {
            wolfIndexes.push(randomIndex);
        }
    }
    titles = [titles[0], titles[1]];
}

// ページ読み込み時にお題を取得
document.addEventListener('DOMContentLoaded', () => {
    fetchTitles(() => {
        document.querySelector('.start').style.display = 'block';
    });
});
