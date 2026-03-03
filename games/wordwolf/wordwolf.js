let players = [];
let wolfIndexes = [];
let currentIndex = 0;
let titles = [];
let hints = [];
let timerInterval = null;
let previousTimerSlots = [];
let presetNamesForNext = [];
let hasEnteredSetup = false;
let selectedPreset = null;

const PRESET_KEY = 'wordwolf-presets-v1';
const MAX_PRESETS = 8;
const setupSteps = ['setting', 'playername', 'playercheck', 'gamestart'];
const flowSections = ['start', 'setting', 'playername', 'playercheck', 'displayingtitle', 'gamestart', 'playinggame', 'answer'];

function hideAllFlowSections() {
    flowSections.forEach(sectionClass => {
        const section = document.querySelector(`.${sectionClass}`);
        if (section) {
            section.style.display = 'none';
        }
    });
}

function getCurrentSettings() {
    return {
        playerCount: parseInt(document.getElementById('player-count').value) || 3,
        wolfCount: parseInt(document.getElementById('wolf-count').value) || 1,
        category: getSelectedCategories(),
        timeLimitM: parseInt(document.getElementById('time-limit-m').value) || 0,
        timeLimitS: parseInt(document.getElementById('time-limit-s').value) || 0
    };
}

function getCategoryCheckboxes() {
    return Array.from(document.querySelectorAll('#category-select input[name="category"]'));
}

function getSelectedCategories() {
    const checkboxes = getCategoryCheckboxes();
    const selected = checkboxes.filter(input => input.checked).map(input => input.value);
    return selected.length > 0 ? selected : ['all'];
}

function setSelectedCategories(categories) {
    const checkboxes = getCategoryCheckboxes();
    const normalized = Array.isArray(categories)
        ? categories
        : (typeof categories === 'string' ? [categories] : ['all']);
    const selectedSet = new Set(normalized.length > 0 ? normalized : ['all']);

    checkboxes.forEach((input) => {
        input.checked = selectedSet.has(input.value);
    });

    enforceCategorySelectionRules();
}

function enforceCategorySelectionRules(changedInput = null) {
    const checkboxes = getCategoryCheckboxes();
    if (!checkboxes.length) {
        return;
    }

    const allInput = checkboxes.find(input => input.value === 'all');
    const specificInputs = checkboxes.filter(input => input.value !== 'all');

    if (changedInput && changedInput.value === 'all' && changedInput.checked) {
        specificInputs.forEach(input => {
            input.checked = false;
        });
        return;
    }

    if (changedInput && changedInput.value !== 'all' && changedInput.checked && allInput) {
        allInput.checked = false;
    }

    const selectedSpecificCount = specificInputs.filter(input => input.checked).length;

    if (selectedSpecificCount === 0) {
        if (allInput) {
            allInput.checked = true;
        }
        return;
    }

    if (allInput) {
        allInput.checked = false;
    }
}

function initializeCategorySelection() {
    const checkboxes = getCategoryCheckboxes();
    checkboxes.forEach((input) => {
        input.addEventListener('change', () => {
            enforceCategorySelectionRules(input);
        });
    });

    enforceCategorySelectionRules();
}

function applySettings(settings) {
    if (!settings) {
        return;
    }
    document.getElementById('player-count').value = settings.playerCount;
    document.getElementById('wolf-count').value = settings.wolfCount;
    setSelectedCategories(settings.category || ['all']);
    document.getElementById('time-limit-m').value = settings.timeLimitM;
    document.getElementById('time-limit-s').value = settings.timeLimitS;
}

function updateProgressMessage(stepName) {
    const progressText = document.getElementById('progress-remaining');
    if (!progressText) {
        return;
    }

    if (stepName === 'playercheck' && players.length > 0) {
        const remainPlayers = Math.max(players.length - currentIndex, 0);
        progressText.textContent = `開始まで：お題確認があと${remainPlayers}人`; 
        return;
    }
    if (stepName === 'gamestart') {
        progressText.textContent = '準備完了：いつでもゲームを開始できます';
        return;
    }
    const currentStepIndex = setupSteps.indexOf(stepName);
    const remainSteps = currentStepIndex >= 0 ? Math.max((setupSteps.length - 1) - currentStepIndex, 0) : 0;
    progressText.textContent = remainSteps > 0 ? `開始まで：あと${remainSteps}ステップ` : '準備完了';
}

function setSetupProgress(stepName, shouldShow = true) {
    const progressElement = document.getElementById('setup-progress');
    if (!progressElement) {
        return;
    }

    progressElement.style.display = shouldShow ? 'block' : 'none';

    const currentStepIndex = setupSteps.indexOf(stepName);
    const stepItems = progressElement.querySelectorAll('li');
    stepItems.forEach((item, index) => {
        item.classList.remove('done', 'current');
        if (currentStepIndex === -1) {
            return;
        }
        if (index < currentStepIndex) {
            item.classList.add('done');
        } else if (index === currentStepIndex) {
            item.classList.add('current');
        }
    });

    updateProgressMessage(stepName);
}

function getSetupElements() {
    return {
        presetPanel: document.getElementById('preset-panel'),
        settingForm: document.getElementById('setting-form')
    };
}

function updatePresetPanelVisibility() {
    const { presetPanel } = getSetupElements();
    if (!presetPanel) {
        return;
    }

    const hasPresets = loadPresets().length > 0;
    presetPanel.style.display = hasEnteredSetup && hasPresets ? 'block' : 'none';
}

function showSettingForm() {
    const { presetPanel, settingForm } = getSetupElements();
    if (presetPanel) {
        presetPanel.style.display = 'none';
    }
    if (settingForm) {
        settingForm.style.display = 'block';
    }
}

function showPresetChooser() {
    const { presetPanel, settingForm } = getSetupElements();
    if (presetPanel) {
        presetPanel.style.display = 'block';
    }
    if (settingForm) {
        settingForm.style.display = 'none';
    }
}

function openSetupEntry() {
    hideAllFlowSections();
    document.querySelector('.setting').style.display = 'block';
    setSetupProgress('setting', true);
    renderPresetList();

    if (loadPresets().length > 0) {
        showPresetChooser();
    } else {
        showSettingForm();
    }
}

function startSetupFlow() {
    hasEnteredSetup = true;
    document.querySelector('.intro').style.display = 'none';
    openSetupEntry();
}

function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function openPresetModal(preset) {
    selectedPreset = preset;
    const modal = document.getElementById('preset-modal');
    if (!modal) {
        return;
    }

    document.body.classList.add('modal-open');
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
}

function closePresetModal() {
    const modal = document.getElementById('preset-modal');
    if (!modal) {
        return;
    }

    document.body.classList.remove('modal-open');
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    selectedPreset = null;
}

function applyPresetForEdit(preset) {
    applySettings(preset);
    presetNamesForNext = [...preset.players];
    showSettingForm();
}

function applyPresetForQuickStart(preset) {
    applySettings(preset);
    players = [...preset.players];
    currentIndex = 0;

    hideAllFlowSections();
    fetchTitles(() => {
        reselectWolfAndTitle();
        displayPlayerCheck();
    });
}

function applyPresetById(id, mode) {
    const panel = document.getElementById('preset-panel');
    const preset = loadPresets().find(item => item.id === id);
    if (!panel || !preset) {
        return;
    }

    if (mode === 'quick') {
        applyPresetForQuickStart(preset);
        return;
    }

    applyPresetForEdit(preset);
}

function validateSettingInput(playerCount, wolfCount) {
    const errorMsg = document.getElementById('error-msg');
    if (isNaN(playerCount) || playerCount < 3) {
        errorMsg.textContent = 'プレイヤー数は3人以上で入力してください。';
        errorMsg.style.display = 'block';
        return false;
    }
    if (isNaN(wolfCount) || wolfCount < 1 || wolfCount >= playerCount / 2) {
        errorMsg.textContent = 'ウルフの人数はプレイヤー数の半分未満で入力してください。';
        errorMsg.style.display = 'block';
        return false;
    }
    errorMsg.style.display = 'none';
    return true;
}

function createPlayerNameForm(playerCount, presetNames = []) {
    const playerNameSection = document.querySelector('.playername');
    let formHtml = '<h2>プレイヤー名設定</h2><p>プレイヤー名を入力してください。空欄の場合自動生成されます。</p>';

    for (let i = 0; i < playerCount; i++) {
        const initialName = presetNames[i] || '';
        formHtml += `<input type="text" class="player-name" placeholder="プレイヤー${i + 1} の名前" value="${escapeHtml(initialName)}">`;
    }
    formHtml += '<button id="set-names-btn">次へ</button>';
    playerNameSection.innerHTML = formHtml;

    hideAllFlowSections();
    playerNameSection.style.display = 'block';
    setSetupProgress('playername', true);

    document.getElementById('set-names-btn').addEventListener('click', () => {
        players = Array.from(document.querySelectorAll('.player-name')).map((input, index) => input.value.trim() || `プレイヤー${index + 1}`);
        currentIndex = 0;
        reselectWolfAndTitle();

        hideAllFlowSections();
        displayPlayerCheck();
    });
}

function loadPresets() {
    try {
        const raw = localStorage.getItem(PRESET_KEY);
        const presets = raw ? JSON.parse(raw) : [];
        return Array.isArray(presets) ? presets : [];
    } catch {
        return [];
    }
}

function savePresets(presets) {
    localStorage.setItem(PRESET_KEY, JSON.stringify(presets));
}

function saveCurrentPreset() {
    if (!players.length) {
        return;
    }

    const settings = getCurrentSettings();
    const presets = loadPresets();
    const key = players.join('|');
    const existingIndex = presets.findIndex(item => item.key === key && item.playerCount === settings.playerCount);
    const now = new Date().toISOString();
    const preset = {
        id: existingIndex >= 0 ? presets[existingIndex].id : `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        key,
        savedAt: now,
        playerCount: settings.playerCount,
        wolfCount: settings.wolfCount,
        category: settings.category,
        timeLimitM: settings.timeLimitM,
        timeLimitS: settings.timeLimitS,
        players: [...players]
    };

    if (existingIndex >= 0) {
        presets.splice(existingIndex, 1);
    }
    presets.unshift(preset);
    savePresets(presets.slice(0, MAX_PRESETS));
    renderPresetList();
    updatePresetPanelVisibility();
}

function formatDate(isoDate) {
    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) {
        return '日時不明';
    }
    return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function renderPresetList() {
    const presetListElement = document.getElementById('preset-list');
    if (!presetListElement) {
        return;
    }

    const presets = loadPresets();
    if (presets.length === 0) {
        presetListElement.innerHTML = '';
        return;
    }

    const createCard = `
        <button class="preset-item new" data-action="new" type="button">
            <p>＋ 新規作成</p>
            <p class="preset-meta">新しい設定でプレイする</p>
        </button>
    `;

    const presetCards = presets.map((preset) => {
        const members = preset.players.join(' / ');
        return `
            <button class="preset-item" data-action="preset" data-id="${preset.id}" type="button">
                <p class="preset-meta">${formatDate(preset.savedAt)}</p>
                <p>${preset.playerCount}人（ウルフ${preset.wolfCount}人）</p>
                <p>${members}</p>
            </button>
        `;
    }).join('');

    presetListElement.innerHTML = `${createCard}${presetCards}`;
}

function displayPlayerCheck() {
    if (currentIndex < players.length) {
        const playerCheckSection = document.querySelector('.playercheck');
        playerCheckSection.querySelector('h2').textContent = `${players[currentIndex]}ですか`;
        playerCheckSection.querySelector('p').textContent = `はいを押すと、${players[currentIndex]}のお題が表示されます。他の人に見られないように気を付けてください。`;

        hideAllFlowSections();
        playerCheckSection.style.display = 'block';
        setSetupProgress('playercheck', true);
    } else {
        hideAllFlowSections();
        document.querySelector('.gamestart').style.display = 'block';
        setSetupProgress('gamestart', true);
    }
}

function displayTitle() {
    const displayingTitleSection = document.querySelector('.displayingtitle');
    displayingTitleSection.querySelector('h2').textContent = `${players[currentIndex]}のお題`;

    const isWolf = wolfIndexes.includes(currentIndex);
    const title = isWolf ? titles[1] : titles[0];
    displayingTitleSection.querySelector('.player-title').textContent = title || 'お題が設定されていません';

    hideAllFlowSections();
    displayingTitleSection.style.display = 'block';
}

function displayHints() {
    const hintSection = document.querySelector('.hint');
    const availableHints = hints.filter(Boolean);

    hintSection.innerHTML = `
        <div class="hint-intro" id="hint-intro">
            <h3>話題ヒント</h3>
            <p>会話に詰まったら、1枚ずつめくって使ってください。</p>
        </div>
        <ul class="hint-hand" id="hint-hand"></ul>
        <button id="hint-reveal-btn" class="hint-reveal-btn" type="button">ヒントを1枚めくる</button>
    `;

    const revealButton = document.getElementById('hint-reveal-btn');
    const handElement = document.getElementById('hint-hand');
    const introElement = document.getElementById('hint-intro');

    if (!revealButton || !handElement) {
        return;
    }

    if (availableHints.length === 0) {
        revealButton.disabled = true;
        revealButton.textContent = 'ヒントはありません';
        return;
    }

    const emojis = ['😄', '🥳', '✨', '🎉', '🌈', '🎈', '🍀', '🫧'];
    const gradients = [
        'linear-gradient(160deg, #3b82f6 0%, #1d4ed8 100%)',
        'linear-gradient(160deg, #ff4d6d 0%, #d90429 100%)',
        'linear-gradient(160deg, #f9a826 0%, #d97706 100%)',
        'linear-gradient(160deg, #22c55e 0%, #15803d 100%)',
        'linear-gradient(160deg, #a855f7 0%, #7e22ce 100%)',
        'linear-gradient(160deg, #fb7185 0%, #e11d48 100%)',
        'linear-gradient(160deg, #2dd4bf 0%, #0f766e 100%)'
    ];

    const pickList = (sourceList, count) => {
        const copied = [...sourceList].sort(() => Math.random() - 0.5);
        const result = [];
        for (let i = 0; i < count; i++) {
            result.push(copied[i % copied.length]);
        }
        return result;
    };

    const cardEmojis = pickList(emojis, availableHints.length);
    const cardBackgrounds = pickList(gradients, availableHints.length);
    let revealedCount = 0;

    const updateButtonState = () => {
        if (revealedCount >= availableHints.length) {
            revealButton.disabled = true;
            revealButton.textContent = 'すべて表示済み';
            return;
        }
        revealButton.disabled = false;
        revealButton.textContent = `${revealedCount + 1}枚目のヒントをめくる`;
    };

    revealButton.addEventListener('click', () => {
        if (revealedCount >= availableHints.length) {
            return;
        }

        const card = document.createElement('li');
        card.className = 'hint-card';
        card.style.setProperty('--card-bg', cardBackgrounds[revealedCount]);
        card.innerHTML = `
            <p class="hint-emoji" aria-hidden="true">${cardEmojis[revealedCount]}</p>
            <p class="hint-card-text">${escapeHtml(availableHints[revealedCount])}</p>
        `;
        handElement.appendChild(card);

        if (revealedCount === 0 && introElement) {
            introElement.classList.add('is-hidden');
        }

        requestAnimationFrame(() => {
            card.classList.add('is-visible');
        });

        revealedCount++;
        updateButtonState();
    });

    updateButtonState();
}

function renderTimerValue(minutes, seconds, overtime) {
    const timerElement = document.getElementById('time-remaining');
    const timerStatusElement = document.getElementById('time-status');
    if (!timerElement || !timerStatusElement) {
        return;
    }

    const slots = [...String(minutes), '分', ...String(seconds).padStart(2, '0'), '秒'];
    const timerHtml = slots.map((token, index) => {
        const isUnit = token === '分' || token === '秒';
        if (isUnit) {
            return `<span class="timer-unit">${token}</span>`;
        }
        const isUpdated = previousTimerSlots[index] !== token || previousTimerSlots.length !== slots.length;
        return `<span class="timer-digit${isUpdated ? ' is-updated' : ''}">${token}</span>`;
    }).join('');

    timerElement.innerHTML = timerHtml;
    previousTimerSlots = slots;

    if (overtime) {
        timerStatusElement.textContent = '制限時間を超過しています';
        timerStatusElement.classList.add('is-visible');
    } else {
        timerStatusElement.textContent = '';
        timerStatusElement.classList.remove('is-visible');
    }
}

function startTimer(totalSeconds) {
    clearInterval(timerInterval);
    previousTimerSlots = [];

    let remainingTime = totalSeconds;
    let overtime = false;

    const render = () => {
        const minutes = Math.floor(Math.abs(remainingTime) / 60);
        const seconds = Math.abs(remainingTime) % 60;
        renderTimerValue(minutes, seconds, overtime);
    };

    render();

    timerInterval = setInterval(() => {
        if (remainingTime === 0) {
            overtime = true;
        }
        remainingTime--;
        render();
    }, 1000);
}

function fetchTitles(callback) {
    const selectedCategories = getSelectedCategories();

    fetch('title.json')
        .then(response => response.json())
        .then(data => {
            const includeAll = selectedCategories.includes('all');
            const filteredData = includeAll
                ? data
                : data.filter(item => selectedCategories.includes(item.category));
            const targetData = filteredData.length > 0 ? filteredData : data;

            const randomCategoryIndex = Math.floor(Math.random() * targetData.length);
            const category = targetData[randomCategoryIndex];

            titles = [category.title1, category.title2];
            hints = [category.hint1, category.hint2, category.hint3];

            callback();
        })
        .catch(error => {
            console.error('お題の読み込み中にエラーが発生しました:', error);
            callback();
        });
}

function reselectWolfAndTitle() {
    wolfIndexes = [];
    const playerCount = players.length;
    const wolfCount = parseInt(document.getElementById('wolf-count').value) || 1;

    while (wolfIndexes.length < wolfCount) {
        const randomIndex = Math.floor(Math.random() * playerCount);
        if (!wolfIndexes.includes(randomIndex)) {
            wolfIndexes.push(randomIndex);
        }
    }
}

document.querySelectorAll('.start-trigger').forEach(button => {
    button.addEventListener('click', startSetupFlow);
});

initializeCategorySelection();

document.getElementById('next-btn').addEventListener('click', () => {
    const playerCount = parseInt(document.getElementById('player-count').value);
    const wolfCount = parseInt(document.getElementById('wolf-count').value);
    if (!validateSettingInput(playerCount, wolfCount)) {
        return;
    }

    const presetNames = presetNamesForNext.slice(0, playerCount);
    presetNamesForNext = [];
    createPlayerNameForm(playerCount, presetNames);
});

document.querySelector('.playercheck .player-check-btn').addEventListener('click', () => {
    displayTitle();
});

document.querySelector('.displayingtitle button').addEventListener('click', () => {
    currentIndex++;
    displayPlayerCheck();
});

document.getElementById('game-start-btn').addEventListener('click', () => {
    hideAllFlowSections();
    document.querySelector('.playinggame').style.display = 'block';
    document.body.classList.add('is-playing');
    setSetupProgress('gamestart', false);
    displayHints();

    const minutes = parseInt(document.getElementById('time-limit-m').value) || 0;
    const seconds = parseInt(document.getElementById('time-limit-s').value) || 0;
    const totalTime = minutes * 60 + seconds;
    startTimer(totalTime);
    saveCurrentPreset();
});

document.getElementById('review-title-btn').addEventListener('click', () => {
    currentIndex = 0;
    displayPlayerCheck();
});

document.getElementById('change-title-btn').addEventListener('click', () => {
    fetchTitles(() => {
        currentIndex = 0;
        reselectWolfAndTitle();
        displayPlayerCheck();
    });
});

document.getElementById('end-game-btn').addEventListener('click', () => {
    hideAllFlowSections();
    document.querySelector('.answer').style.display = 'block';
    document.body.classList.remove('is-playing');
    setSetupProgress('gamestart', false);
    displayAnswer();
    clearInterval(timerInterval);
});

function displayAnswer() {
    const answerSection = document.querySelector('.answer');
    let tableHTML = '<h2>答え</h2><table><tbody><tr><th>プレイヤー名</th><th>役職</th><th>お題</th></tr>';

    players.forEach((player, index) => {
        const role = wolfIndexes.includes(index) ? 'ウルフ' : '市民';
        const title = wolfIndexes.includes(index) ? titles[1] : titles[0];
        const wolfClass = wolfIndexes.includes(index) ? ' class="wolf"' : '';
        tableHTML += `<tr><td>${player}</td><td${wolfClass}>${role}</td><td>${title || '不明'}</td></tr>`;
    });

    tableHTML += '</tbody></table><div><button id="replay-btn">もう一度プレイ</button><button id="reset-settings-btn">設定に戻る</button></div>';
    answerSection.innerHTML = tableHTML;

    document.getElementById('replay-btn').addEventListener('click', () => {
        document.body.classList.remove('is-playing');
        fetchTitles(() => {
            currentIndex = 0;
            reselectWolfAndTitle();
            displayPlayerCheck();
        });
    });

    document.getElementById('reset-settings-btn').addEventListener('click', () => {
        currentIndex = 0;
        document.body.classList.remove('is-playing');
        openSetupEntry();
    });
}

document.getElementById('preset-list').addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
        return;
    }

    const item = target.closest('.preset-item');
    if (!(item instanceof HTMLButtonElement)) {
        return;
    }

    const action = item.dataset.action;
    if (action === 'new') {
        presetNamesForNext = [];
        showSettingForm();
        return;
    }

    const presetId = item.dataset.id;
    if (!presetId) {
        return;
    }

    const preset = loadPresets().find(record => record.id === presetId);
    if (!preset) {
        return;
    }

    openPresetModal(preset);
});

document.getElementById('preset-modal-backdrop').addEventListener('click', closePresetModal);

document.getElementById('preset-modal-quick').addEventListener('click', () => {
    if (!selectedPreset) {
        return;
    }
    const presetId = selectedPreset.id;
    closePresetModal();
    applyPresetById(presetId, 'quick');
});

document.getElementById('preset-modal-edit').addEventListener('click', () => {
    if (!selectedPreset) {
        return;
    }
    const presetId = selectedPreset.id;
    closePresetModal();
    applyPresetById(presetId, 'edit');
});

document.addEventListener('DOMContentLoaded', () => {
    renderPresetList();
    updatePresetPanelVisibility();

    const latestPreset = loadPresets()[0];
    if (latestPreset) {
        applySettings(latestPreset);
    }

    fetchTitles(() => {
        document.querySelector('.intro').style.display = 'block';
        document.querySelector('.start').style.display = 'block';
        setSetupProgress('setting', false);
    });
});
