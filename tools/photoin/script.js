document.addEventListener('DOMContentLoaded', () => {
    // --- Constants & State ---
    const DB_NAME = 'PhotoflameDB';
    const DB_VERSION = 1;
    const STORE_NAME = 'history';
    let db;
    let currentLang = 'ja';

    // Image Transform State
    let imgState = {
        scale: 1,
        x: 0,
        y: 0,
        isDragging: false,
        startX: 0,
        startY: 0
    };

    const translations = {
        ja: {
            directions: "経路",
            start: "ナビ開始",
            call: "電話",
            save: "保存"
        },
        en: {
            directions: "Directions",
            start: "Start",
            call: "Call",
            save: "Save"
        },
        ko: {
            directions: "경로",
            start: "시작",
            call: "전화",
            save: "저장"
        }
    };

    // --- Elements ---
    const imageInput = document.getElementById('imageInput');
    const targetImage = document.getElementById('targetImage');
    const imageContainer = document.querySelector('.image-container');
    const canvasContainer = document.getElementById('canvasContainer');
    const downloadBtn = document.getElementById('downloadBtn');
    const previewFrame = document.getElementById('previewFrame');

    // Controls
    const adjustImageToggle = document.getElementById('adjustImageToggle');
    const resetImageBtn = document.getElementById('resetImageBtn');

    // Modals
    const historyBtn = document.getElementById('historyBtn');
    const shareBtn = document.getElementById('shareBtn');
    // Modals are now dynamic, so we don't get them by ID here
    // const historyModal = document.getElementById('historyModal');
    // const shareModal = document.getElementById('shareModal');
    // const closeButtons = document.querySelectorAll('.close-modal');
    // const historyList = document.getElementById('historyList');
    // const generateUrlBtn = document.getElementById('generateUrlBtn');
    // const shareSettingsToggle = document.getElementById('shareSettings');
    // const shareTextToggle = document.getElementById('shareText');
    // const shareImageToggle = document.getElementById('shareImage');
    // const urlLengthWarning = document.getElementById('urlLengthWarning');
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');

    // Inputs Map
    const inputs = {
        placeName: { el: document.getElementById('placeName'), display: document.getElementById('displayPlaceName') },
        rating: { el: document.getElementById('rating'), display: document.getElementById('displayRating') },
        reviewCount: { el: document.getElementById('reviewCount'), display: document.getElementById('displayReviewCount') },
        category: { el: document.getElementById('category'), display: document.getElementById('displayCategory') },
        statusText: { el: document.getElementById('statusText'), display: document.getElementById('displayStatus') },
        locationText: { el: document.getElementById('locationText'), display: document.getElementById('displayLocation') }
    };

    // --- Initialization ---
    initDB();
    checkUrlParams();
    setupImageManipulation();

    // --- Event Listeners ---

    // Language Change
    document.querySelectorAll('input[name="language"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.checked) {
                setLanguage(e.target.value);
            }
        });
    });

    // Text Inputs
    Object.values(inputs).forEach(item => {
        item.el.addEventListener('input', (e) => {
            item.display.textContent = e.target.value;
            if (item.el.id === 'rating') {
                updateStars(e.target.value);
            }
        });
    });

    // Aspect Ratio
    document.querySelectorAll('input[name="aspectRatio"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.checked) {
                canvasContainer.className = `canvas-container ratio-${e.target.value.replace(':', '-')}`;
            }
        });
    });

    // Theme Mode
    document.querySelectorAll('input[name="themeMode"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.checked) {
                if (e.target.value === 'dark') {
                    previewFrame.classList.add('dark-mode');
                    previewFrame.classList.remove('light-mode');
                } else {
                    previewFrame.classList.add('light-mode');
                    previewFrame.classList.remove('dark-mode');
                }
            }
        });
    });

    // Image Upload Logic
    function handleImageFile(file) {
        if (!file || !file.type.startsWith('image/')) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            targetImage.src = event.target.result;
            targetImage.style.display = 'block'; // Ensure visible
            targetImage.onload = () => {
                // Reset transform on new image
                resetImageTransform();
            };
        };
        reader.readAsDataURL(file);

        EXIF.getData(file, function () {
            // EXIF logic here (if needed in future)
        });
    }

    // File Input Change
    imageInput.addEventListener('change', (e) => {
        handleImageFile(e.target.files[0]);
    });

    // Drag and Drop Support
    const dropZones = [document.querySelector('.file-upload-btn'), document.querySelector('.tool-preview')];

    dropZones.forEach(zone => {
        if (!zone) return;

        zone.addEventListener('dragover', (e) => {
            e.preventDefault();
            zone.classList.add('drag-active');
        });

        zone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            zone.classList.remove('drag-active');
        });

        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            zone.classList.remove('drag-active');
            const file = e.dataTransfer.files[0];
            handleImageFile(file);
        });
    });

    // Download & Save History
    downloadBtn.addEventListener('click', () => {
        const outputWidth = parseInt(document.getElementById('outputWidth').value) || 1080;
        const previewWidth = canvasContainer.offsetWidth;
        const scale = outputWidth / previewWidth;

        html2canvas(previewFrame, {
            scale: scale,
            useCORS: true,
            backgroundColor: null,
            logging: false,
            letterRendering: 1,
            allowTaint: true
        }).then(canvas => {
            const dataUrl = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = 'photoflame-export.png';
            link.href = dataUrl;
            link.click();

            // Save to History
            saveToHistory(dataUrl);
        });
    });

    // Image Adjustment Controls
    zoomSlider.addEventListener('input', (e) => {
        imgState.scale = parseFloat(e.target.value);
        updateImageTransform();
    });

    xSlider.addEventListener('input', (e) => {
        imgState.x = parseFloat(e.target.value);
        updateImageTransform();
    });

    ySlider.addEventListener('input', (e) => {
        imgState.y = parseFloat(e.target.value);
        updateImageTransform();
    });

    resetImageBtn.addEventListener('click', () => {
        resetImageTransform();
    });

    // Modals
    historyBtn.addEventListener('click', openHistoryModal);
    shareBtn.addEventListener('click', openShareModal);

    // Modal Close (Delegated)
    document.addEventListener('click', (e) => {
        if (e.target.closest('.close-modal') || e.target.classList.contains('modal-cancel')) {
            document.getElementById('commonModal').classList.remove('active');
        }
        if (e.target.id === 'commonModal') {
            document.getElementById('commonModal').classList.remove('active');
        }
    });

    // --- Image Manipulation Functions ---

    function setupImageManipulation() {
        // Mouse Events
        imageContainer.addEventListener('mousedown', startDrag);
        window.addEventListener('mousemove', drag);
        window.addEventListener('mouseup', endDrag);

        // Wheel Zoom
        imageContainer.addEventListener('wheel', (e) => {
            e.preventDefault();
            const zoomSensitivity = 0.001;
            const delta = -e.deltaY * zoomSensitivity;
            const newScale = Math.min(Math.max(0.01, imgState.scale + delta), 2); // Max 2 matches slider

            imgState.scale = newScale;
            zoomSlider.value = newScale; // Sync slider
            updateImageTransform();
        });

        // Touch Events (Basic support)
        // Note: Full pinch-to-zoom requires more complex logic, sticking to basic drag for now
        // or simple pinch if possible.
    }

    function startDrag(e) {
        e.preventDefault();
        imgState.isDragging = true;
        imgState.startX = e.clientX - imgState.x;
        imgState.startY = e.clientY - imgState.y;
        imageContainer.style.cursor = 'grabbing';
    }

    function drag(e) {
        if (!imgState.isDragging) return;
        e.preventDefault();
        imgState.x = e.clientX - imgState.startX;
        imgState.y = e.clientY - imgState.startY;

        // Sync sliders
        xSlider.value = imgState.x;
        ySlider.value = imgState.y;

        updateImageTransform();
    }

    function endDrag() {
        if (!imgState.isDragging) return;
        imgState.isDragging = false;
        imageContainer.style.cursor = 'grab';
    }

    function updateImageTransform() {
        targetImage.style.transform = `translate(${imgState.x}px, ${imgState.y}px) scale(${imgState.scale})`;
    }

    function resetImageTransform() {
        if (!targetImage.src || targetImage.style.display === 'none') return;

        const frameRect = previewFrame.getBoundingClientRect();
        const card = previewFrame.querySelector('.overlay-card');
        const cardRect = card.getBoundingClientRect();

        // Calculate visible height (Frame height - Card height + Corner radius overlap)
        // We want the image to go slightly behind the card's rounded corners.
        const cornerRadius = 16; // From CSS .overlay-card border-radius
        const visibleHeight = frameRect.height - cardRect.height + cornerRadius;

        const imgW = targetImage.naturalWidth;
        const imgH = targetImage.naturalHeight;

        // Calculate scale to cover the visible area
        // We want to fill frameRect.width x visibleHeight
        const scaleX = frameRect.width / imgW;
        const scaleY = visibleHeight / imgH;
        // Clamp scale between 0.01 and 2 to match slider limits
        const scale = Math.min(Math.max(Math.max(scaleX, scaleY), 0.01), 2);

        // Center in the visible area
        // The image's center (after scaling) should be at (frameWidth/2, visibleHeight/2)
        // Since transform-origin is center, we just need to translate the center of the image element 
        // to the center of the visible area.
        // However, the image element is positioned relative to the container.
        // If the image is 0,0 at top-left, its center is at imgW/2, imgH/2.
        // We want to move it so its center is at frameRect.width/2, visibleHeight/2.

        // But wait, the image element in CSS is position: absolute;
        // We need to ensure it's centered initially or calculate offset from top-left.
        // Let's assume top-left is 0,0.

        // Target Center X, Y
        const targetCenterX = frameRect.width / 2;
        const targetCenterY = visibleHeight / 2;

        // Current Center (untransformed)
        const currentCenterX = imgW / 2;
        const currentCenterY = imgH / 2;

        // Required Translation
        const tx = targetCenterX - currentCenterX;
        const ty = targetCenterY - currentCenterY;

        imgState.scale = scale;
        imgState.x = tx;
        imgState.y = ty;

        // Update sliders
        if (window.zoomSlider) window.zoomSlider.value = scale;
        if (window.xSlider) window.xSlider.value = tx;
        if (window.ySlider) window.ySlider.value = ty;

        updateImageTransform();
    }

    // --- Functions ---

    function showToast(message) {
        toastMessage.textContent = message;
        toast.classList.remove('hidden');
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 3000);
    }

    function setLanguage(lang) {
        currentLang = lang;
        const t = translations[lang];

        // Update UI text - ONLY inside the preview frame
        document.querySelectorAll('.preview-frame [data-i18n]').forEach(el => {
            const key = el.dataset.i18n;
            if (t[key]) el.textContent = t[key];
        });

        // Update placeholders (only if they are in the preview, but inputs are in sidebar...)
        // Wait, inputs are in sidebar but affect preview. The placeholders are for the USER to see.
        // User said "Edit panel language always Japanese".
        // So placeholders should probably stay Japanese too?
        // "Edit panel language always Japanese" -> So placeholders should be static Japanese.
        // I will REMOVE the placeholder updates.
    }

    function updateStars(rating) {
        const r = parseFloat(rating);
        const percentage = (r / 5) * 100;
        const starsFill = document.querySelector('.stars-fill');
        if (starsFill) starsFill.style.width = `${percentage}%`;
    }

    function resizePreview() {
        const container = document.querySelector('.preview-area');
        const canvas = document.getElementById('canvasContainer');
        if (!container || !canvas) return;

        // Reset transform to get natural size
        canvas.style.transform = 'none';

        const padding = 40; // 20px each side
        const availableWidth = container.clientWidth - padding;
        const availableHeight = container.clientHeight - padding;

        const naturalWidth = canvas.offsetWidth;
        const naturalHeight = canvas.offsetHeight;

        const scaleX = availableWidth / naturalWidth;
        const scaleY = availableHeight / naturalHeight;

        // Use the smaller scale to fit both dimensions, but max 1 (don't upscale pixelated)
        // Actually, user said "shrink accordingly", maybe upscaling is fine? 
        // Usually we don't want to upscale too much, but let's cap at 1 for now unless requested.
        // User said "screen width narrow... preview matches... same ratio... text smaller" -> Scale down.
        const scale = Math.min(scaleX, scaleY, 1);

        canvas.style.transform = `scale(${scale})`;
    }

    // Add resize listener
    window.addEventListener('resize', resizePreview);

    // Call resize on aspect ratio change
    document.querySelectorAll('input[name="aspectRatio"]').forEach(radio => {
        radio.addEventListener('change', () => {
            // Wait for CSS transition or immediate update
            setTimeout(resizePreview, 0);
        });
    });

    // Initial resize
    setTimeout(resizePreview, 0);

    // --- IndexedDB ---
    function initDB() {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (e) => {
            db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
            }
        };
        request.onsuccess = (e) => db = e.target.result;
        request.onerror = (e) => console.error("DB Error", e);
    }

    function saveToHistory(imageDataUrl) {
        if (!db) return;
        const state = getCurrentState();
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const item = {
            date: new Date(),
            thumbnail: imageDataUrl,
            state: state
        };
        store.add(item);
    }

    function loadHistory() {
        if (!db) return;
        const historyList = document.getElementById('historyList'); // Get dynamic element
        if (!historyList) return;

        historyList.innerHTML = '';
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.openCursor(null, 'prev');

        request.onsuccess = (e) => {
            const cursor = e.target.result;
            if (cursor) {
                const item = cursor.value;
                const div = document.createElement('div');
                div.className = 'history-item';
                div.innerHTML = `
                    <div class="history-content">
                        <div class="history-date">${item.date.toLocaleString()}</div>
                        <div class="history-text">${item.state.text.placeName || 'Untitled'}</div>
                    </div>
                    <div class="history-menu">
                        <button class="history-menu-btn"><span class="material-symbols-rounded">more_vert</span></button>
                        <div class="history-menu-dropdown">
                            <button class="text-danger delete-item-btn">削除</button>
                        </div>
                    </div>
                `;

                // Click on item to restore
                div.querySelector('.history-content').addEventListener('click', () => {
                    restoreState(item.state);
                    document.getElementById('commonModal').classList.remove('active');
                });

                // Menu Button Logic
                const menuBtn = div.querySelector('.history-menu-btn');
                const dropdown = div.querySelector('.history-menu-dropdown');
                const deleteBtn = div.querySelector('.delete-item-btn');

                menuBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    // Close other open menus
                    document.querySelectorAll('.history-menu-dropdown.active').forEach(el => {
                        if (el !== dropdown) el.classList.remove('active');
                    });
                    dropdown.classList.toggle('active');
                });

                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    customConfirm("この履歴を削除しますか？", () => {
                        deleteHistoryItem(item.id);
                    });
                });

                historyList.appendChild(div);
                cursor.continue();
            }
        };
    }

    function deleteHistoryItem(id) {
        if (!db) return;
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        store.delete(id);
        transaction.oncomplete = () => {
            loadHistory(); // Reload list
        };
    }

    function deleteAllHistory() {
        if (!db) return;
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        store.clear();
        transaction.oncomplete = () => {
            loadHistory(); // Reload list
        };
    }

    // --- Modal & Popups ---

    function showModal(title, contentHtml, actionsHtml = '') {
        document.getElementById("modalTitle").textContent = title;
        document.getElementById("modalBody").innerHTML = contentHtml;
        document.getElementById("modalActions").innerHTML = actionsHtml;
        document.getElementById("commonModal").classList.add("active");
    }

    function customConfirm(msg, callback) {
        showModal("確認", `<p>${msg}</p>`, `
            <button class="modal-cancel close-modal secondary-btn" style="width: auto; display: inline-block; margin: 0;">キャンセル</button>
            <button id="confirmOkBtn" class="primary-btn" style="width: auto; display: inline-block; margin: 0;">OK</button>
        `);

        const okBtn = document.getElementById("confirmOkBtn");
        const handler = () => {
            document.getElementById("commonModal").classList.remove("active");
            callback();
            okBtn.removeEventListener("click", handler);
        };
        okBtn.addEventListener("click", handler);
    }

    function openHistoryModal() {
        const template = document.getElementById("historyTemplate");
        const content = template.innerHTML;
        const actions = `
            <button id="deleteAllBtn" class="danger-btn" style="margin-right: auto;">すべて削除</button>
            <button id="newCreationBtn" class="secondary-btn" style="width: auto; margin-top: 0;">新規作成</button>
        `;

        showModal("履歴", content, actions);

        document.getElementById('newCreationBtn').addEventListener('click', () => {
            resetToDefault();
            document.getElementById('commonModal').classList.remove('active');
        });

        document.getElementById('deleteAllBtn').addEventListener('click', () => {
            customConfirm("すべての履歴を削除しますか？この操作は取り消せません。", () => {
                deleteAllHistory();
            });
        });

        // Close menus when clicking elsewhere
        const closeMenuHandler = (e) => {
            if (!e.target.closest('.history-menu')) {
                document.querySelectorAll('.history-menu-dropdown.active').forEach(el => el.classList.remove('active'));
            }
        };
        // Remove existing listener to avoid duplicates if any (though showModal creates new DOM usually, global listener is better)
        // Since showModal replaces innerHTML, we can attach a local listener to modalBody or use the global one.
        // Let's attach to modal content for scoped handling
        document.getElementById('modalBody').addEventListener('click', closeMenuHandler);

        loadHistory();
    }

    function resetToDefault() {
        // Check if current state differs from default (simplified check)
        const currentState = getCurrentState();
        const isDirty = currentState.text.placeName !== 'Place Name' || currentState.image.src !== targetImage.src; // Simplified dirty check

        if (isDirty) {
            customConfirm("入力内容をリセットしますか？現在の内容は履歴に保存されます。", () => {
                // Auto-save to history
                const element = document.querySelector('.preview-area');
                html2canvas(element, { scale: 0.5, useCORS: true, backgroundColor: null }).then(canvas => {
                    saveToHistory(canvas.toDataURL('image/png'));
                    showToast("編集中の内容を履歴に保存しました");
                    performReset();
                }).catch(err => {
                    console.error("Failed to save history thumbnail", err);
                    // Save anyway without thumbnail if failed
                    saveToHistory(null);
                    performReset();
                });
            });
        } else {
            performReset();
        }
    }

    function performReset() {
        // Reset to default state
        const defaultState = {
            image: {
                src: null,
                transform: { x: 0, y: 0, scale: 1 }
            },
            text: {
                placeName: 'Place Name',
                countryName: 'Country',
                lat: '00°00\'00"N',
                lng: '00°00\'00"E',
                date: '2023.10.27'
            },
            settings: {
                aspectRatio: '9-16',
                darkMode: false
            }
        };
        restoreState(defaultState);
    }

    function openShareModal() {
        const template = document.getElementById("shareSettingsTemplate");
        const content = template.innerHTML;
        const actions = `<button id="generateUrlBtn" class="primary-btn full-width" style="margin-top: 0;">URLを生成</button>`;

        showModal("共有", content, actions);

        // Re-attach listeners
        document.getElementById('shareSettings').addEventListener('change', checkUrlLength);
        document.getElementById('shareText').addEventListener('change', checkUrlLength);
        document.getElementById('shareImage').addEventListener('change', checkUrlLength);
        document.getElementById('generateUrlBtn').addEventListener('click', generateAndCopyUrl);

        checkUrlLength(); // Initial check
    }

    // --- State & Sharing ---
    function getCurrentState() {
        return {
            text: {
                placeName: inputs.placeName.el.value,
                rating: inputs.rating.el.value,
                reviewCount: inputs.reviewCount.el.value,
                category: inputs.category.el.value,
                statusText: inputs.statusText.el.value,
                locationText: inputs.locationText.el.value
            },
            settings: {
                aspectRatio: document.querySelector('input[name="aspectRatio"]:checked').value,
                themeMode: document.querySelector('input[name="themeMode"]:checked').value,
                outputWidth: document.getElementById('outputWidth').value
            },
            image: {
                src: targetImage.src,
                transform: imgState
            }
        };
    }

    function restoreState(state) {
        // Restore Text
        if (state.text) {
            Object.keys(state.text).forEach(key => {
                if (inputs[key]) {
                    inputs[key].el.value = state.text[key];
                    inputs[key].display.textContent = state.text[key];
                    if (key === 'rating') updateStars(state.text[key]);
                }
            });
        }

        // Restore Settings
        if (state.settings) {
            if (state.settings.aspectRatio) {
                const radio = document.querySelector(`input[name="aspectRatio"][value="${state.settings.aspectRatio}"]`);
                if (radio) {
                    radio.checked = true;
                    radio.dispatchEvent(new Event('change'));
                }
            }
            if (state.settings.themeMode) {
                const radio = document.querySelector(`input[name="themeMode"][value="${state.settings.themeMode}"]`);
                if (radio) {
                    radio.checked = true;
                    radio.dispatchEvent(new Event('change'));
                }
            }
            if (state.settings.outputWidth) {
                document.getElementById('outputWidth').value = state.settings.outputWidth;
            }
        }

        // Restore Image & Transform
        if (state.image) {
            if (state.image.src) {
                targetImage.src = state.image.src;
                targetImage.style.display = 'block';
            } else {
                // Clear image if src is null
                targetImage.src = '';
                targetImage.style.display = 'none'; // Or handle as needed, maybe show placeholder
            }
            if (state.image.transform) {
                imgState = state.image.transform;
                updateImageTransform();
            }
        }
    }

    function getShareData() {
        const includeSettings = document.getElementById('shareSettings').checked;
        const includeText = document.getElementById('shareText').checked;
        const includeImage = document.getElementById('shareImage').checked;

        const state = getCurrentState();
        const shareData = {};

        if (includeSettings) {
            shareData.s = state.settings;
            shareData.i = state.image.transform;
        }
        if (includeText) shareData.t = state.text;
        if (includeImage && state.image.src) {
            shareData.img = state.image.src;
        }
        return shareData;
    }

    function checkUrlLength() {
        const shareData = getShareData();
        const json = JSON.stringify(shareData);
        const compressed = LZString.compressToEncodedURIComponent(json);
        const url = window.location.href.split('?')[0] + '?d=' + compressed;

        const urlLengthWarning = document.getElementById('urlLengthWarning');
        if (url.length > 2000) {
            urlLengthWarning.style.display = 'flex';
        } else {
            urlLengthWarning.style.display = 'none';
        }
        return url;
    }

    function generateAndCopyUrl() {
        const url = checkUrlLength();

        navigator.clipboard.writeText(url).then(() => {
            document.getElementById('commonModal').classList.remove('active');
            showToast("コピーしました！");
        });
    }

    function checkUrlParams() {
        const params = new URLSearchParams(window.location.search);
        const compressed = params.get('d');
        if (compressed) {
            try {
                const json = LZString.decompressFromEncodedURIComponent(compressed);
                const data = JSON.parse(json);

                const stateToRestore = {};
                if (data.s) stateToRestore.settings = data.s;
                if (data.t) stateToRestore.text = data.t;
                if (data.i) {
                    stateToRestore.image = { transform: data.i };
                }
                if (data.img) {
                    if (!stateToRestore.image) stateToRestore.image = {};
                    stateToRestore.image.src = data.img;
                }

                restoreState(stateToRestore);
            } catch (e) {
                console.error("Failed to parse URL params", e);
            }
        }
    }

    // Initial URL check
    checkUrlParams();

    // Header New Button
    document.getElementById('newBtn').addEventListener('click', resetToDefault);

    // Global Modal Close Listener
    document.addEventListener('click', (e) => {
        if (e.target.closest('.close-modal') || e.target.id === 'commonModal') {
            // Don't close if clicking inside modal content (unless it's close button)
            if (e.target.id === 'commonModal' || e.target.closest('.close-modal')) {
                document.getElementById('commonModal').classList.remove('active');
            }
        }
    });
});
