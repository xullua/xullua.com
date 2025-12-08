// =========================================
// グローバル変数・定数
// =========================================
let chartInstance = null;
let lensData = []; // [S, T, FLm, FLM, Fm, FM, Mk, Pf, Sf, St, [CurvePoints], W, P]
let accData = [];
let userProfile = { name: '' };
let currentSessionId = null;
let is35mmMode = false;
let makerFilter = 'ALL';
let isViewMode = false;

const STORAGE_KEY = 'mylens_data_v2';
const HISTORY_KEY = 'mylens_history';

// メッセージ定義
const MESSAGES = {
    CONFIRM_NEW: '新規作成しますか？',
    CONFIRM_RESET: '初期データに戻しますか？',
    CONFIRM_CLEAR: '全削除しますか？',
    CONFIRM_DELETE: '削除？',
    CONFIRM_LOAD_FILE: 'このファイルを読み込みますか？',
    CONFIRM_DELETE_HISTORY: 'この履歴を削除しますか？',
    NOTIFY_EDIT_MODE: '編集モードに戻りました',
    NOTIFY_URL_COPIED: 'URLをコピーしました',
    NOTIFY_COPY_FAILED: 'コピーに失敗しました',
    NOTIFY_INVALID_INPUT: '英数字のみ入力可能です',
    LABEL_LIST: 'レンズ・機材リスト',
    LABEL_LIST_EDIT: 'レンズ・機材リスト編集',
    LABEL_LENS_EDIT: 'レンズを編集',
    LABEL_LENS_ADD: 'レンズを追加',
    LABEL_UPDATE: '更新',
    LABEL_ADD: '追加',
    LABEL_ACC_EDIT: 'アクセサリ編集',
    LABEL_ACC_ADD: 'アクセサリ追加',
    LABEL_SAVING: '保存中...',
    LABEL_SAVE_IMAGE: '画像を保存',
    STATUS_PAST: '(過去)',
    STATUS_WISH: '(欲しい)',
    TEXT_HISTORY_INTRO: '変更は現在作業中のファイルに上書きされます。「新規作成」すると新しいファイルになります。'
};

const DUMMY_LENS = [
    [0, 0, 50, 50, 1.8, 1.8, 'Sony', 'FE', '', 1, [], 186, 30000],
    [0, 1, 24, 70, 2.8, 2.8, 'Sony', 'FE', 'GM', 1, [], 886, 250000]
];
const DUMMY_ACC = [['Sony a7 IV', 658, 330000]];
const SENSOR_CROP = { 0: 1.0, 1: 1.5, 2: 2.0 };
const SENSOR_NAMES = { 0: 'フルサイズ', 1: 'APS-C', 2: 'M4/3' };
const STATUS_STYLES = {
    1: { color: '#007aff', dash: [] },
    0: { color: '#8e8e93', dash: [5, 5] },
    2: { color: '#ff9500', dash: [2, 4] }
};

// =========================================
// 初期化
// =========================================
document.addEventListener('DOMContentLoaded', () => {
    initChart();

    if (!currentSessionId) currentSessionId = Date.now().toString();

    const urlParams = new URLSearchParams(window.location.search);
    const sharedData = urlParams.get('data');
    if (sharedData) {
        try {
            const jsonStr = LZString.decompressFromEncodedURIComponent(sharedData);
            if (jsonStr) {
                const loaded = JSON.parse(jsonStr);
                if (Array.isArray(loaded)) lensData = loaded;
                else { lensData = loaded.lenses || []; accData = loaded.acc || []; userProfile = loaded.profile || { name: '' }; }
                isViewMode = true;
                renderUI();
                applyViewMode();
            } else loadData();
        } catch (e) { loadData(); }
    } else loadData();

    initUI();
});

function initUI() {
    if (isViewMode) return;

    document.getElementById('btn-open-list').addEventListener('click', () => { renderListModal(); openModal('modal-list'); });
    document.getElementById('btn-add-lens').addEventListener('click', () => openModal('modal-add', -1));
    document.getElementById('btn-add-acc').addEventListener('click', () => openModal('modal-acc'));
    document.getElementById('btn-new').addEventListener('click', () => { if (confirm(MESSAGES.CONFIRM_NEW)) clearData(); });
    document.getElementById('btn-history').addEventListener('click', openHistoryModal);

    document.querySelectorAll('.close-btn').forEach(btn => btn.addEventListener('click', closeAllModals));
    document.querySelectorAll('.modal').forEach(m => m.addEventListener('click', e => { if (e.target === m) closeAllModals(); }));

    document.getElementById('input-user-name').addEventListener('input', e => { userProfile.name = e.target.value; saveData(); });
    document.getElementById('form-add-lens').addEventListener('submit', handleLensSubmit);
    document.getElementById('form-add-acc').addEventListener('submit', handleAccSubmit);

    document.getElementById('btn-add-point').addEventListener('click', addZoomPointInput);

    document.querySelectorAll('input[name="lens-type"]').forEach(r => r.addEventListener('change', e => {
        toggleLensForm(e.target.value === "0"); updateLensPreview();
    }));
    document.querySelectorAll('input[name="lens-status"]').forEach(r => r.addEventListener('change', updateLensPreview));

    ['input-maker', 'input-prefix', 'input-suffix'].forEach(id => {
        document.getElementById(id).addEventListener('input', (e) => {
            validateAlphaNumeric(e.target);
            updateLensPreview();
        });
    });
    ['input-fl-min', 'input-fl-max', 'input-f-min', 'input-f-max'].forEach(id => {
        document.getElementById(id).addEventListener('input', updateLensPreview);
    });

    document.getElementById('toggle-35mm').addEventListener('change', e => { is35mmMode = e.target.checked; updateChart(); });
    document.getElementById('select-maker-filter').addEventListener('change', e => { makerFilter = e.target.value; updateChart(); });

    document.getElementById('btn-share-menu').addEventListener('click', openShareModal);
    document.getElementById('btn-copy-url').addEventListener('click', copyShareUrl);
    document.getElementById('btn-save-image').addEventListener('click', saveImage);
    document.getElementById('btn-reset').addEventListener('click', () => { if (confirm(MESSAGES.CONFIRM_RESET)) loadDummyData(); });
    document.getElementById('btn-clear').addEventListener('click', () => { if (confirm(MESSAGES.CONFIRM_CLEAR)) clearData(); });
}

// =========================================
// UI描画・モード制御
// =========================================
function renderUI() {
    document.getElementById('input-user-name').value = userProfile.name || '';
    if (isViewMode) document.getElementById('input-user-name').readOnly = true;

    updateMakerSelect();
    updateChart();
    updateTotalInfo();
    renderListModal();
    renderAccessoriesGrid();
}

function applyViewMode() {
    document.getElementById('btn-history').style.display = 'none';
    document.getElementById('btn-open-list').innerHTML = `<span class="material-symbols-rounded">inventory_2</span><span class="btn-label">${MESSAGES.LABEL_LIST}</span>`;
    document.getElementById('view-mode-badge').classList.remove('hidden');

    const footers = document.querySelectorAll('.modal-footer-actions');
    footers.forEach(f => f.classList.add('hidden'));

    document.querySelectorAll('.close-btn').forEach(btn => btn.addEventListener('click', closeAllModals));
    document.querySelectorAll('.modal').forEach(m => m.addEventListener('click', e => { if (e.target === m) closeAllModals(); }));

    document.getElementById('btn-open-list').addEventListener('click', () => { renderListModal(); openModal('modal-list'); });
    document.getElementById('btn-share-menu').addEventListener('click', openShareModal);
    document.getElementById('btn-copy-url').addEventListener('click', copyShareUrl);
    document.getElementById('btn-save-image').addEventListener('click', saveImage);
    document.getElementById('toggle-35mm').addEventListener('change', e => { is35mmMode = e.target.checked; updateChart(); });
    document.getElementById('select-maker-filter').addEventListener('change', e => { makerFilter = e.target.value; updateChart(); });

    document.getElementById('btn-add-lens').style.display = 'none';
    document.getElementById('btn-add-acc').style.display = 'none';

    document.getElementById('btn-new').style.display = '';
    document.getElementById('btn-new').addEventListener('click', () => { if (confirm(MESSAGES.CONFIRM_NEW)) clearData(); });

    const btnReset = document.getElementById('btn-reset');
    const btnClear = document.getElementById('btn-clear');
    if (btnReset) btnReset.style.display = 'none';
    if (btnClear) btnClear.style.display = 'none';
}

function restoreEditModeUI() {
    document.getElementById('btn-new').style.display = '';
    document.getElementById('btn-history').style.display = '';
    document.getElementById('btn-open-list').innerHTML = `<span class="material-symbols-rounded">edit</span><span class="btn-label">${MESSAGES.LABEL_LIST_EDIT}</span>`;
    document.getElementById('view-mode-badge').classList.add('hidden');

    const footers = document.querySelectorAll('.modal-footer-actions');
    footers.forEach(f => f.classList.remove('hidden'));

    document.getElementById('btn-add-lens').style.display = '';
    document.getElementById('btn-add-acc').style.display = '';
    document.getElementById('input-user-name').readOnly = false;

    const btnReset = document.getElementById('btn-reset');
    const btnClear = document.getElementById('btn-clear');
    if (btnReset) btnReset.style.display = '';
    if (btnClear) btnClear.style.display = '';

    showNotification(MESSAGES.NOTIFY_EDIT_MODE, 'info');
}

// =========================================
// 通知・バリデーション
// =========================================
function showNotification(msg, type = 'success') {
    const container = document.getElementById('notification-container');
    const toast = document.createElement('div');
    toast.className = `notification-toast ${type}`;
    const icon = type === 'error' ? '⚠️' : '✅';
    toast.innerHTML = `<span>${icon}</span><span>${msg}</span>`;
    container.appendChild(toast);
    requestAnimationFrame(() => { toast.classList.add('show'); });
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function validateAlphaNumeric(input) {
    const val = input.value;
    if (/[^a-zA-Z0-9\s]/.test(val)) {
        input.style.borderColor = 'var(--color-danger)';
        showNotification(MESSAGES.NOTIFY_INVALID_INPUT, 'error');
    } else {
        input.style.borderColor = '';
    }
}

// =========================================
// データ操作・永続化
// =========================================
function loadData() {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) {
        const o = JSON.parse(s);
        if (o.lenses) { lensData = o.lenses; accData = o.acc || []; userProfile = o.profile || { name: '' }; }
        else lensData = o;
    } else loadDummyData();
    renderUI();
}
function saveData() {
    if (isViewMode) return;
    const dataObj = { lenses: lensData, acc: accData, profile: userProfile };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataObj));
    updateHistory(dataObj);
}
function loadDummyData() { lensData = JSON.parse(JSON.stringify(DUMMY_LENS)); accData = JSON.parse(JSON.stringify(DUMMY_ACC)); userProfile = { name: 'My Gear' }; currentSessionId = Date.now().toString(); saveData(); renderUI(); }
function clearData() {
    if (isViewMode) {
        isViewMode = false;
        window.history.replaceState(null, '', window.location.pathname);
        restoreEditModeUI();
    }
    lensData = []; accData = []; userProfile = { name: '' };
    currentSessionId = Date.now().toString();
    saveData(); renderUI();
}

// =========================================
// 履歴機能
// =========================================
function updateHistory(currentData) {
    const s = localStorage.getItem(HISTORY_KEY);
    let hist = s ? JSON.parse(s) : [];

    const snapshot = {
        sessionId: currentSessionId,
        date: new Date().toLocaleString(),
        name: userProfile.name || 'No Name',
        summary: `${lensData.length} Lenses, ${accData.length} Accs`,
        data: currentData
    };

    if (hist.length > 0 && hist[0].sessionId === currentSessionId) {
        hist[0] = snapshot;
    } else {
        hist.unshift(snapshot);
    }

    if (hist.length > 10) hist = hist.slice(0, 10);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(hist));
}

function openHistoryModal() {
    const modal = document.getElementById('modal-history');
    const container = document.getElementById('history-list-container');
    const s = localStorage.getItem(HISTORY_KEY);
    const hist = s ? JSON.parse(s) : [];

    container.innerHTML = `<p style="color:#666; font-size:0.9rem;">${MESSAGES.TEXT_HISTORY_INTRO}</p>`;
    hist.forEach((h, i) => {
        const div = document.createElement('div');
        div.className = 'history-item clickable';
        const isCurrent = h.sessionId === currentSessionId;
        const bg = isCurrent ? 'border: 1px solid var(--color-primary);' : '';
        div.style = bg;
        div.onclick = () => loadHistory(i);
        div.innerHTML = `
            <div class="h-info">
                <span>${h.name}</span> <small>(${h.date})</small><br>
                ${h.summary}
            </div>
            <div class="h-actions">
                <button class="delete-btn" onclick="event.stopPropagation(); deleteHistory(${i})">${MESSAGES.LABEL_UPDATE === '更新' ? '削除' : 'Del'}</button>
            </div>
        `;
        container.appendChild(div);
    });
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

window.loadHistory = (i) => {
    if (!confirm(MESSAGES.CONFIRM_LOAD_FILE)) return;
    const s = localStorage.getItem(HISTORY_KEY);
    const hist = JSON.parse(s);
    if (!hist[i]) return;
    const h = hist[i];

    lensData = h.data.lenses || [];
    accData = h.data.acc || [];
    userProfile = h.data.profile || { name: '' };
    currentSessionId = h.sessionId;

    if (isViewMode) {
        isViewMode = false;
        window.history.replaceState(null, '', window.location.pathname);
        restoreEditModeUI();
    }
    saveData(); renderUI(); closeAllModals();
};

window.deleteHistory = (i) => {
    if (!confirm(MESSAGES.CONFIRM_DELETE_HISTORY)) return;
    const s = localStorage.getItem(HISTORY_KEY);
    let hist = s ? JSON.parse(s) : [];
    hist.splice(i, 1);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(hist));
    openHistoryModal();
};

// =========================================
// チャートロジック
// =========================================
function updateChart() {
    if (!chartInstance) return;
    const filtered = (makerFilter === 'ALL') ? lensData : lensData.filter(l => l[6].toUpperCase() === makerFilter);

    let maxFL = 0, maxF = 0;
    chartInstance.data.datasets = filtered.map(lens => {
        const [s, t, flMin, flMax, fMin, fMax, maker, prefix, suffix, statusId, curves] = lens;
        const crop = is35mmMode ? SENSOR_CROP[s] : 1.0;
        const dMin = flMin * crop, dMax = flMax * crop;
        if (dMax > maxFL) maxFL = dMax; if (fMax > maxF) maxF = fMax;

        const spec = (t === 0) ? `${flMin}mm F${fMin}` : `${flMin}-${flMax}mm F${fMin == fMax ? fMin : fMin + '-' + fMax}`;
        const name = [maker, prefix, spec, suffix].filter(Boolean).join(' ');
        const st = STATUS_STYLES[statusId ?? 1];
        const pts = [];

        if (t === 0) {
            pts.push({ x: dMin, y: fMin, labelName: name });
        } else {
            pts.push({ x: dMin, y: fMin, labelName: name });
            if (Array.isArray(curves) && curves.length > 0) {
                const sorted = [...curves].sort((a, b) => a.x - b.x);
                sorted.forEach(p => {
                    const cx = p.x * crop;
                    if (cx > dMin && cx < dMax) {
                        pts.push({ x: cx, y: p.y, labelName: name });
                    }
                });
            }
            pts.push({ x: dMax, y: fMax, labelName: name });
        }
        return {
            label: name, collapsedSpec: spec, data: pts, showLine: t === 1,
            borderColor: st.color, backgroundColor: st.color, borderDash: st.dash,
            pointRadius: 6, borderWidth: 3, fill: false, tension: 0
        };
    });
    chartInstance.options.scales.x.max = (maxFL > 280) ? 2000 : 300;
    chartInstance.options.scales.y.max = (maxF > 7.5) ? 24 : 8;

    // Tick Color Update (Dynamic)
    const lineColor = getComputedStyle(document.documentElement).getPropertyValue('--line').trim() || '#666';
    chartInstance.options.scales.x.ticks.color = lineColor;
    chartInstance.options.scales.y.ticks.color = lineColor;
    chartInstance.options.scales.x.grid.color = lineColor;
    chartInstance.options.scales.y.grid.color = lineColor;

    chartInstance.update();

    // Controls Visibility Logic
    // S, T, FLm, FLM, Fm, FM, Mk, Pf, Sf, St(9)
    const makers = [...new Set(lensData.map(l => (l[6] || '').toLowerCase()))];
    const allFF = lensData.every(l => l[9] == 0); // 0 = Full Frame

    // Check maker count logic: if 1 maker AND all FF, hide.
    const floatControls = document.querySelector('.chart-float-controls');
    if (floatControls) {
        if (makers.length <= 1 && allFF) {
            floatControls.style.display = 'none';
        } else {
            floatControls.style.display = 'flex';
        }
    }
}

// =========================================
// フォーム操作
// =========================================
function toggleLensForm(isPrime) {
    const rowTele = document.getElementById('row-tele');
    const zoomPointsSec = document.getElementById('zoom-points-section');
    if (isPrime) {
        rowTele.style.display = 'none';
        zoomPointsSec.classList.add('hidden');
        document.getElementById('input-fl-max').required = false;
        document.getElementById('input-f-max').required = false;
    } else {
        rowTele.style.display = 'flex';
        zoomPointsSec.classList.remove('hidden');
        document.getElementById('input-fl-max').required = true;
        document.getElementById('input-f-max').required = true;
    }
}
function populateLensForm(data) {
    const [sensorId, typeId, flMin, flMax, fMin, fMax, maker, prefix, suffix, statusId, curves, weight, price] = data;
    document.getElementById('input-maker').value = maker;
    document.getElementById('input-prefix').value = prefix;
    document.getElementById('input-suffix').value = suffix;
    document.querySelector(`input[name="sensor-type"][value="${sensorId}"]`).checked = true;
    document.querySelector(`input[name="lens-type"][value="${typeId}"]`).checked = true;
    document.querySelector(`input[name="lens-status"][value="${statusId ?? 1}"]`).checked = true;

    document.getElementById('input-fl-min').value = flMin;
    document.getElementById('input-f-min').value = fMin;
    document.getElementById('input-fl-max').value = flMax || '';
    document.getElementById('input-f-max').value = fMax || '';
    document.getElementById('input-weight').value = weight || '';
    document.getElementById('input-price').value = price || '';

    toggleLensForm(typeId === 0);

    const container = document.getElementById('zoom-points-list');
    container.innerHTML = '';
    if (Array.isArray(curves)) {
        curves.forEach(p => addZoomPointInput(null, p.x, p.y));
    }
    updateLensPreview();
}

function addZoomPointInput(e, valX = null, valY = null) {
    const container = document.getElementById('zoom-points-list');
    const div = document.createElement('div');
    div.className = 'zoom-point-row';
    div.innerHTML = `
        <input type="number" class="minimal-input inp-p-fl" placeholder="FL (mm)" value="${valX || ''}" style="flex:1;">
        <input type="number" class="minimal-input inp-p-f" placeholder="F値" step="0.1" value="${valY || ''}" style="flex:1;">
        <button type="button" class="btn-del-point" onclick="this.parentElement.remove()">×</button>
    `;
    container.appendChild(div);
}

function handleLensSubmit(e) {
    e.preventDefault();
    const index = parseInt(document.getElementById('edit-index').value);
    const maker = document.getElementById('input-maker').value.trim();
    const prefix = document.getElementById('input-prefix').value.trim();
    const suffix = document.getElementById('input-suffix').value.trim();
    const sensorId = parseInt(document.querySelector('input[name="sensor-type"]:checked').value);
    const typeId = parseInt(document.querySelector('input[name="lens-type"]:checked').value);
    const statusId = parseInt(document.querySelector('input[name="lens-status"]:checked').value);
    const flMin = parseFloat(document.getElementById('input-fl-min').value);
    const fMin = parseFloat(document.getElementById('input-f-min').value);
    const weight = parseInt(document.getElementById('input-weight').value) || 0;
    const price = parseInt(document.getElementById('input-price').value) || 0;

    let flMax = flMin, fMax = fMin;
    let curves = [];

    if (typeId === 1) {
        flMax = parseFloat(document.getElementById('input-fl-max').value);
        fMax = parseFloat(document.getElementById('input-f-max').value);

        document.querySelectorAll('#zoom-points-list .zoom-point-row').forEach(row => {
            const x = parseFloat(row.querySelector('.inp-p-fl').value);
            const y = parseFloat(row.querySelector('.inp-p-f').value);
            if (!isNaN(x) && !isNaN(y)) curves.push({ x, y });
        });
    }

    if (isNaN(flMin) || isNaN(fMin)) return;
    const newItem = [sensorId, typeId, flMin, flMax, fMin, fMax, maker, prefix, suffix, statusId, curves, weight, price];

    if (index >= 0) lensData[index] = newItem;
    else lensData.push(newItem);

    saveData(); renderUI(); openModal('modal-list');
}

// ヘルパー: フォーム初期化など
function initLensForm(index) {
    const form = document.getElementById('form-add-lens');
    document.getElementById('edit-index').value = index;
    const btn = document.getElementById('btn-submit');
    const title = document.getElementById('modal-title');

    if (index >= 0) {
        title.textContent = MESSAGES.LABEL_LENS_EDIT; btn.textContent = MESSAGES.LABEL_UPDATE;
        populateLensForm(lensData[index]);
    } else {
        title.textContent = MESSAGES.LABEL_LENS_ADD; btn.textContent = MESSAGES.LABEL_ADD;
        form.reset();
        document.getElementById('zoom-points-list').innerHTML = '';
        toggleLensForm(true);
        document.querySelector('input[name="lens-type"][value="0"]').checked = true;
        document.querySelector('input[name="sensor-type"][value="0"]').checked = true;
        document.querySelector('input[name="lens-status"][value="1"]').checked = true;
        updateLensPreview();
    }
}
function updateLensPreview() {
    const maker = document.getElementById('input-maker').value.trim();
    const prefix = document.getElementById('input-prefix').value.trim();
    const suffix = document.getElementById('input-suffix').value.trim();
    const isPrime = document.querySelector('input[name="lens-type"]:checked').value === "0";
    const flMin = document.getElementById('input-fl-min').value;
    const fMin = document.getElementById('input-f-min').value;

    let spec = '';
    if (isPrime) { if (flMin && fMin) spec = `${flMin}mm F${fMin}`; }
    else {
        const flMax = document.getElementById('input-fl-max').value;
        const fMax = document.getElementById('input-f-max').value;
        if (flMin && flMax && fMin && fMax) { spec = `${flMin}-${flMax}mm F${fMin == fMax ? fMin : fMin + '-' + fMax}`; }
    }
    document.getElementById('name-preview').textContent = [maker, prefix, spec, suffix].filter(Boolean).join(' ') || '...';
}

function openModal(id, editIndex = -1) {
    closeAllModals();
    document.getElementById(id).classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    if (id === 'modal-add') initLensForm(editIndex);
    if (id === 'modal-acc') initAccForm(editIndex);
}
function closeAllModals() {
    document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
    document.body.style.overflow = '';
}

function initAccForm(index) {
    const form = document.getElementById('form-add-acc');
    document.getElementById('edit-index-acc').value = index;
    if (index >= 0) {
        document.querySelector('#modal-acc h2').textContent = MESSAGES.LABEL_ACC_EDIT; document.getElementById('btn-submit-acc').textContent = MESSAGES.LABEL_UPDATE;
        const [n, w, p] = accData[index];
        document.getElementById('input-acc-name').value = n; document.getElementById('input-acc-weight').value = w; document.getElementById('input-acc-price').value = p;
    } else {
        document.querySelector('#modal-acc h2').textContent = MESSAGES.LABEL_ACC_ADD; document.getElementById('btn-submit-acc').textContent = MESSAGES.LABEL_ADD; form.reset();
    }
}
function handleAccSubmit(e) {
    e.preventDefault();
    const index = parseInt(document.getElementById('edit-index-acc').value);
    const name = document.getElementById('input-acc-name').value.trim();
    const w = parseInt(document.getElementById('input-acc-weight').value) || 0;
    const p = parseInt(document.getElementById('input-acc-price').value) || 0;
    if (!name) return;
    const item = [name, w, p];
    if (index >= 0) accData[index] = item; else accData.push(item);
    saveData(); renderUI(); openModal('modal-list');
}

function renderListModal() {
    const lContainer = document.getElementById('lens-list-container');
    const aContainer = document.getElementById('acc-list-container');
    lContainer.innerHTML = ''; aContainer.innerHTML = '';

    lensData.forEach((lens, i) => {
        const div = document.createElement('div');
        if (!isViewMode) {
            div.className = 'lens-item clickable';
            div.onclick = () => openModal('modal-add', i);
        } else {
            div.className = 'lens-item';
        }
        const [s, t, flMin, flMax, fMin, fMax, maker, prefix, suffix, statusId, cd, w, p] = lens;
        let spec = (t === 0) ? `${flMin}mm F${fMin}` : `${flMin}-${flMax}mm F${fMin == fMax ? fMin : fMin + '-' + fMax}`;
        const name = [maker, prefix, spec, suffix].filter(Boolean).join(' ');
        const stText = statusId === 0 ? MESSAGES.STATUS_PAST : statusId === 2 ? MESSAGES.STATUS_WISH : '';

        let actionsHtml = '';
        if (!isViewMode) {
            actionsHtml = `<div class="item-actions"><button class="delete-btn" onclick="event.stopPropagation(); delLens(${i})">削除</button></div>`;
        }
        div.innerHTML = `<div><h3>${stText} ${name}</h3><p>${SENSOR_NAMES[s]} | ${w || 0}g | ¥${(p || 0).toLocaleString()}</p></div>${actionsHtml}`;
        lContainer.appendChild(div);
    });

    accData.forEach((acc, i) => {
        const div = document.createElement('div');
        if (!isViewMode) {
            div.className = 'lens-item clickable';
            div.onclick = () => openModal('modal-acc', i);
        } else {
            div.className = 'lens-item';
        }
        const [name, w, p] = acc;
        let actionsHtml = '';
        if (!isViewMode) {
            actionsHtml = `<div class="item-actions"><button class="delete-btn" onclick="event.stopPropagation(); delAcc(${i})">削除</button></div>`;
        }
        div.innerHTML = `<div><h3>${name}</h3><p>Accessory | ${w || 0}g | ¥${(p || 0).toLocaleString()}</p></div>${actionsHtml}`;
        aContainer.appendChild(div);
    });
}
window.delLens = (i) => { if (confirm(MESSAGES.CONFIRM_DELETE)) { lensData.splice(i, 1); saveData(); renderUI(); openModal('modal-list'); } };
window.delAcc = (i) => { if (confirm(MESSAGES.CONFIRM_DELETE)) { accData.splice(i, 1); saveData(); renderUI(); openModal('modal-list'); } };

function renderAccessoriesGrid() {
    const container = document.getElementById('acc-grid-container');
    const section = document.getElementById('acc-grid-section');
    container.innerHTML = '';

    if (accData.length === 0) {
        section.classList.add('hidden');
        return;
    }
    section.classList.remove('hidden');
    accData.forEach(acc => {
        const [name, w, p] = acc;
        const div = document.createElement('div');
        div.className = 'acc-card';
        div.innerHTML = `<div class="acc-name">${name}</div><div class="acc-detail">${w || 0}g | ¥${(p || 0).toLocaleString()}</div>`;
        container.appendChild(div);
    });
}

// =========================================
// その他UI更新 (メーカーフィルタ等)
// =========================================
function updateMakerSelect() {
    const select = document.getElementById('select-maker-filter');
    const makers = new Set(lensData.map(l => l[6].toUpperCase()));

    if (makers.size <= 1) {
        select.style.display = 'none';
        makerFilter = 'ALL';
    } else {
        select.style.display = 'inline-block';
        const current = makerFilter;
        select.innerHTML = '<option value="ALL">All Makers</option>';
        makers.forEach(m => {
            if (m) {
                const opt = document.createElement('option');
                opt.value = m;
                opt.textContent = m;
                select.appendChild(opt);
            }
        });
        select.value = current;
    }

    const hasNonFF = lensData.some(l => l[0] !== 0);
    const toggleContainer = document.getElementById('toggle-35mm').parentElement;
    if (!hasNonFF && lensData.length > 0) {
        toggleContainer.style.display = 'none';
        is35mmMode = false;
        document.getElementById('toggle-35mm').checked = false;
    } else {
        toggleContainer.style.display = '';
    }
}

function updateTotalInfo() {
    let tw = 0, tp = 0;
    lensData.forEach(l => { if ((l[9] === undefined || l[9] === 1)) { tw += (l[11] || 0); tp += (l[12] || 0); } });
    accData.forEach(a => { tw += (a[1] || 0); tp += (a[2] || 0); });
    document.getElementById('val-total-weight').textContent = `${tw.toLocaleString()}g`;
    document.getElementById('val-total-price').textContent = `¥${tp.toLocaleString()}`;
}

// =========================================
// 共有・画像保存
// =========================================
function openShareModal() {
    const input = document.getElementById('share-url-input');
    const jsonStr = JSON.stringify({ lenses: lensData, acc: accData, profile: userProfile });
    const compressed = LZString.compressToEncodedURIComponent(jsonStr);
    const url = new URL(window.location.href);
    url.searchParams.set('data', compressed);
    input.value = url.toString();
    document.getElementById('modal-share').classList.remove('hidden');
}

function copyShareUrl() {
    const input = document.getElementById('share-url-input');
    input.select();
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(input.value)
            .then(() => showNotification(MESSAGES.NOTIFY_URL_COPIED))
            .catch(() => { fallbackCopy(input); });
    } else {
        fallbackCopy(input);
    }
}
function fallbackCopy(input) {
    try {
        document.execCommand('copy');
        showNotification(MESSAGES.NOTIFY_URL_COPIED);
    } catch (err) {
        showNotification(MESSAGES.NOTIFY_COPY_FAILED, 'error');
    }
}

async function saveImage() {
    const target = document.getElementById('capture-target');
    const btn = document.getElementById('btn-save-image');
    document.querySelector('.app-container').classList.add('capture-mode');
    if (btn) btn.disabled = true;
    if (chartInstance) chartInstance.resize();

    try {
        await new Promise(r => setTimeout(r, 600));
        const bgColor = getComputedStyle(document.documentElement).getPropertyValue('--firstback').trim() || '#f0f0f4';
        const canvas = await html2canvas(target, { scale: 2, backgroundColor: bgColor, useCORS: true, logging: false });
        const link = document.createElement('a');
        link.download = `mylens-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    } catch (e) { console.error(e); }
    finally {
        document.querySelector('.app-container').classList.remove('capture-mode');
        if (btn) btn.disabled = false;
        if (chartInstance) chartInstance.resize();
    }
}

function initChart() {
    const ctx = document.getElementById('lensChart').getContext('2d');
    chartInstance = new Chart(ctx, {
        type: 'scatter',
        data: { datasets: [] },
        options: {
            responsive: true, maintainAspectRatio: false, layout: { padding: 10 },
            scales: {
                x: {
                    type: 'logarithmic',
                    min: 10,
                    max: 300,
                    grid: { color: '#222' },
                    ticks: {
                        color: getComputedStyle(document.documentElement).getPropertyValue('--line').trim() || '#666',
                        callback: v => [10, 14, 24, 35, 50, 85, 100, 135, 200, 300, 400, 600, 800, 1200, 2000].includes(v) ? v : ''
                    }
                },
                y: {
                    min: 0,
                    max: 8,
                    grid: { color: '#222' },
                    ticks: {
                        stepSize: 1,
                        color: getComputedStyle(document.documentElement).getPropertyValue('--line').trim() || '#666',
                        callback: v => [1, 1.4, 2, 2.8, 4, 5.6, 8, 11, 16, 22].includes(Number(v.toPrecision(2))) ? v : ''
                    }
                }
            },
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => c.raw.labelName } } }
        },
        plugins: [{
            id: 'lensSpecLabels',
            afterDatasetsDraw(chart) {
                const { ctx } = chart;
                chart.data.datasets.forEach((dataset, i) => {
                    const meta = chart.getDatasetMeta(i);
                    if (meta.hidden || dataset.data.length === 0) return;

                    const spec = dataset.collapsedSpec;
                    if (!spec) return;

                    const pt = meta.data[0];
                    if (!pt) return;

                    ctx.save();
                    ctx.font = 'bold 11px sans-serif';
                    ctx.fillStyle = dataset.borderColor || '#ccc';
                    ctx.textAlign = 'left';
                    ctx.textBaseline = 'bottom';

                    ctx.translate(pt.x, pt.y);

                    if (dataset.showLine && meta.data.length > 1) {
                        const pt2 = meta.data[1];
                        const angle = Math.atan2(pt2.y - pt.y, pt2.x - pt.x);
                        ctx.rotate(angle);
                        ctx.fillText(spec, 10, -4);
                    } else {
                        ctx.fillText(spec, 5, -5);
                    }

                    ctx.restore();
                });
            }
        }]
    });
}
window.openModal = openModal;
