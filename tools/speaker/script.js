$(function () {
    // --- State Management ---
    const defaultState = {
        text: "",
        source: "",
        date: "",
        template: "mfa",
        bgColor: "red", // Default Red
        customColor: "#ce0000",
        iconData: null,
        lineHeight: 1.8,
        fontSize: 32,
        padding: 60,
        iconSize: 60, // Smaller default
        moyamoyaSeed: Date.now() // Use seed instead of full params
    };

    let currentState = { ...defaultState };

    // Seeded RNG
    class SeededRandom {
        constructor(seed) {
            this.seed = seed;
        }
        next() {
            this.seed = (this.seed * 9301 + 49297) % 233280;
            return this.seed / 233280;
        }
    }

    // --- Elements ---
    const els = {
        text: $("#quoteInput"),
        source: $("#sourceInput"),
        date: $("#dateInput"),
        templateRadios: $("input[name='template']"),
        bgRadios: $("input[name='bgColor']"),
        customColor: $("#customBgColor"),
        iconUpload: $("#iconUpload"),
        lineHeight: $("#lineHeightRange"),
        fontSize: $("#fontSizeRange"),
        padding: $("#paddingRange"),
        iconSize: $("#iconSizeRange"),
        outputWidth: $("#outputWidth"),

        previewText: $("#previewText"),
        previewSource: $("#previewSource"),
        previewDate: $("#previewDate"),
        previewIcon: $("#previewIcon"),
        previewContainer: $("#previewContainer"),
        bgCanvas: document.getElementById("bgCanvas"),
        textColorPicker: $("#textColorPicker")
    };

    // --- Preset Icons (White) ---
    const presetIcons = [
        "earth",
        "star",
        "mic"
    ];

    // --- Initialization ---
    function init() {
        // Set default date if empty
        const today = new Date();
        const dateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;
        els.date.attr("placeholder", `例：${dateStr}`);
        if (!currentState.date) currentState.date = dateStr;

        // Inject Presets
        const presetContainer = $("#presetIcons");
        presetContainer.empty(); // Clear existing to prevent duplicates
        presetIcons.forEach(type => {
            let svgData = "";
            // White stroke/fill for MFA style
            if (type === "earth") svgData = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2'><circle cx='12' cy='12' r='10'/><path d='M2 12h20'/><path d='M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z'/></svg>`;
            else if (type === "star") svgData = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2'><polygon points='12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2'/></svg>`;
            else if (type === "mic") svgData = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2'><path d='M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z'/><path d='M19 10v2a7 7 0 0 1-14 0v-2'/><line x1='12' y1='19' x2='12' y2='23'/><line x1='8' y1='23' x2='16' y2='23'/></svg>`;

            const dataUri = "data:image/svg+xml;base64," + btoa(svgData);

            const btn = $(`<div class="preset-icon-btn"><img src="${dataUri}"></div>`);
            btn.click(() => {
                updateState({ iconData: dataUri });
            });
            presetContainer.append(btn);
        });

        loadFromURL();
        render();
        setupEventListeners();
        setupRichText();
        loadHistory();
    }

    // --- Event Listeners ---
    function setupEventListeners() {
        // Inputs
        els.text.on("input", () => { updateState({ text: els.text.html() }); });
        els.source.on("input", () => { updateState({ source: els.source.val() }); });
        els.date.on("input", () => { updateState({ date: els.date.val() }); });

        // Template Radio Change
        $(document).on("change", "input[name='template']", () => {
            updateState({ template: $("input[name='template']:checked").val() });
        });

        els.outputWidth.on("input", () => { render(); });

        $(document).on("change", "input[name='bgColor']", () => {
            updateState({
                bgColor: $("input[name='bgColor']:checked").val(),
                moyamoyaSeed: Date.now()
            });
        });

        els.customColor.on("input", () => {
            $("input[name='bgColor'][value='custom']").prop("checked", true);
            updateState({
                bgColor: "custom",
                customColor: els.customColor.val(),
                moyamoyaSeed: Date.now()
            });
        });

        // Sliders
        els.lineHeight.on("input", () => { updateState({ lineHeight: els.lineHeight.val() }); });
        els.fontSize.on("input", () => { updateState({ fontSize: els.fontSize.val() }); });
        els.padding.on("input", () => { updateState({ padding: els.padding.val() }); });
        els.iconSize.on("input", () => { updateState({ iconSize: els.iconSize.val() }); });

        // Icon
        $("#uploadIconBtn").click(() => els.iconUpload.click());
        els.iconUpload.on("change", function (e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function (event) {
                    updateState({ iconData: event.target.result });
                };
                reader.readAsDataURL(file);
            }
            $(this).val(''); // Reset input
        });

        // No Icon Button
        $("#noIconBtn").click(() => {
            updateState({ iconData: null });
        });

        // Buttons
        $("#regenBgBtn").click(function () {
            updateState({ moyamoyaSeed: Date.now() });
            const icon = $(this).find("i");
            icon.addClass("rotate-anim");
            setTimeout(() => icon.removeClass("rotate-anim"), 500);
        });
        $("#newBtn").click(() => {
            customConfirm("入力内容をリセットしますか？<br><small>現在の内容は履歴からアクセスできます。</small>", () => {
                saveToHistory(); // Auto save before reset
                currentState = { ...defaultState, date: els.date.attr("placeholder").replace("例：", "") };
                reflectStateToInputs();
                render();
                history.pushState("", document.title, window.location.pathname + window.location.search);
                showToast("リセットしました");
            });
        });
        $(document).on("click", "#shareBtn", openShareModal);
        $("#downloadBtn").click(downloadImage);

        // History
        $("#historyBtn").click(openHistoryModal);

        // Modal Close
        $(document).on("click", ".close-modal, .modal-cancel", function () {
            $("#commonModal").removeClass("active");
        });

        $(document).on("click", "#commonModal", function (e) {
            if (e.target === this) {
                $("#commonModal").removeClass("active");
            }
        });
    }

    function setupRichText() {
        $("button[data-command='bold']").click((e) => {
            e.preventDefault();
            document.execCommand('bold', false, null);
            updateState({ text: els.text.html() });
        });

        $("#textColorBtn").click(() => els.textColorPicker.click());
        els.textColorPicker.on("input", (e) => {
            document.execCommand('foreColor', false, e.target.value);
            updateState({ text: els.text.html() });
        });
    }

    // --- Core Logic ---

    function updateState(updates) {
        currentState = { ...currentState, ...updates };
        requestRender();
    }

    let renderTimeout;
    function requestRender() {
        if (renderTimeout) cancelAnimationFrame(renderTimeout);
        renderTimeout = requestAnimationFrame(render);
    }

    function render() {
        if (!els.previewContainer.length) return;

        // Update Preview Content
        els.previewText.html(currentState.text);
        els.previewSource.text(currentState.source || "出典・発言者");
        els.previewDate.text(currentState.date || "日付");

        // Icon
        const iconWrapper = $(".mfa-icon-wrapper");
        if (currentState.iconData) {
            els.previewIcon.attr("src", currentState.iconData).show();
            iconWrapper.show();
        } else {
            els.previewIcon.hide();
            iconWrapper.hide();
        }

        // Scaling Logic
        const containerWidth = els.previewContainer.width() || 100;
        const baseWidth = parseInt(els.outputWidth.val()) || 1080;
        const scale = containerWidth / baseWidth;

        // CSS Variables for Layout (Scaled)
        els.previewContainer.css({
            "--preview-line-height": currentState.lineHeight,
            "--preview-font-size": (currentState.fontSize * scale) + "px",
            "--preview-padding": (currentState.padding * scale) + "px",
            "--preview-icon-size": (currentState.iconSize * scale) + "px"
        });

        // Enforce Minimum Square Shape (JS based to allow growth)
        // Set min-height to current width
        const currentWidth = els.previewContainer.width();
        $(".content-layer").css("min-height", currentWidth + "px");

        // Background
        drawMoyamoya();
    }

    function reflectStateToInputs() {
        els.text.html(currentState.text);
        els.source.val(currentState.source);
        els.date.val(currentState.date);

        $(`input[name='template'][value='${currentState.template}']`).prop("checked", true);

        if (currentState.bgColor === 'custom') {
            els.customColor.val(currentState.customColor);
        }
        $(`input[name='bgColor'][value='${currentState.bgColor}']`).prop("checked", true);

        els.lineHeight.val(currentState.lineHeight);
        els.fontSize.val(currentState.fontSize);
        els.padding.val(currentState.padding);
        els.iconSize.val(currentState.iconSize);
    }

    // --- Background Generation (Seeded) ---

    function getBaseColor() {
        switch (currentState.bgColor) {
            case "red": return "#ce0000";
            case "orange": return "#b34700";
            case "blue": return "#1c7eff";
            case "custom": return currentState.customColor;
            default: return "#ce0000";
        }
    }

    function drawMoyamoya() {
        const canvas = els.bgCanvas;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        const rect = els.previewContainer[0].getBoundingClientRect();

        if (rect.width === 0 || rect.height === 0) return;

        // Resize canvas to match container
        canvas.width = rect.width;
        canvas.height = rect.height;

        const baseColor = getBaseColor();

        // Fill Base
        ctx.fillStyle = baseColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Generate Particles from Seed
        const rng = new SeededRandom(currentState.moyamoyaSeed);
        const count = 40;

        for (let i = 0; i < count; i++) {
            const x = rng.next() * canvas.width;
            const y = rng.next() * canvas.height;
            const r = (0.1 + rng.next() * 0.4) * canvas.width;
            const alpha = 0.05 + rng.next() * 0.15;

            const g = ctx.createRadialGradient(x, y, 0, x, y, r);
            g.addColorStop(0, `rgba(0, 0, 0, ${alpha})`);
            g.addColorStop(1, "rgba(0, 0, 0, 0)");

            ctx.fillStyle = g;
            ctx.globalCompositeOperation = "overlay";
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.globalCompositeOperation = "source-over";

        // Add subtle vignette
        const g = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, canvas.width / 3, canvas.width / 2, canvas.height / 2, canvas.width);
        g.addColorStop(0, "rgba(0,0,0,0)");
        g.addColorStop(1, "rgba(0,0,0,0.3)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    let lastWidth = 0;
    let resizeTimeout;
    const resizeObserver = new ResizeObserver(entries => {
        for (const entry of entries) {
            const width = entry.contentRect.width;
            // Debounce resize logic
            if (resizeTimeout) clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                if (Math.abs(width - lastWidth) > 1) {
                    lastWidth = width;
                    requestRender();
                } else {
                    drawMoyamoya();
                }
            }, 50);
        }
    });
    if (els.previewContainer.length) {
        resizeObserver.observe(els.previewContainer[0]);
    }


    // --- Modal & Popups ---

    function showModal(title, contentHtml, actionsHtml) {
        $("#modalTitle").text(title);
        $("#modalBody").html(contentHtml);
        $("#modalActions").html(actionsHtml);
        $("#commonModal").addClass("active");
    }

    function customAlert(msg) {
        showModal("お知らせ", `<p>${msg}</p>`, `<button class="primary-btn close-modal">OK</button>`);
    }

    function customConfirm(msg, callback) {
        showModal("確認", `<p>${msg}</p>`, `
            <button class="modal-cancel close-modal secondary-btn" style="width: auto; display: inline-block; margin: 0;">キャンセル</button>
            <button id="confirmOkBtn" class="primary-btn" style="width: auto; display: inline-block; margin: 0;">OK</button>
        `);
        $("#confirmOkBtn").one("click", () => {
            $("#commonModal").removeClass("active");
            callback();
        });
    }

    function showToast(msg) {
        const toast = $(`<div class="toast">${msg}</div>`);
        $("#toastContainer").append(toast);
        setTimeout(() => {
            toast.css("animation", "toastFadeOut 0.3s forwards");
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // --- URL Sharing ---

    function openShareModal() {
        console.log("Open Share Modal Clicked");
        try {
            const template = document.getElementById("shareSettingsTemplate");
            if (!template) {
                console.error("Share template not found");
                return;
            }
            const content = template.innerHTML;
            const actions = `<button id="generateUrlBtn" class="primary-btn">URLを生成</button>`;
            showModal("共有設定", content, actions);

            $("#generateUrlBtn").off("click").click(generateAndCopyUrl); // Ensure no duplicate listeners
            $("#modalBody input[type='checkbox']").change(checkUrlLength);
        } catch (e) {
            console.error("Error opening share modal:", e);
            showToast("エラーが発生しました");
        }
    }

    function getShareData() {
        const shareText = $("#shareText").is(":checked");
        const shareInfo = $("#shareInfo").is(":checked");
        const shareIcon = $("#shareIcon").is(":checked");
        const shareColor = $("#shareColor").is(":checked");
        const shareLayout = $("#shareLayout").is(":checked");

        const data = {};
        if (shareText) data.t = currentState.text;
        if (shareInfo) {
            data.s = currentState.source;
            data.d = currentState.date;
        }
        if (shareIcon) data.i = currentState.iconData;
        if (shareColor) {
            data.c = currentState.bgColor;
            data.cc = currentState.customColor;
            data.ms = currentState.moyamoyaSeed; // Share Seed Only!
        }
        if (shareLayout) {
            data.lh = currentState.lineHeight;
            data.fs = currentState.fontSize;
            data.p = currentState.padding;
            data.is = currentState.iconSize;
        }
        return data;
    }

    function checkUrlLength() {
        const data = getShareData();
        const json = JSON.stringify(data);
        const compressed = LZString.compressToEncodedURIComponent(json);
        const url = window.location.href.split('?')[0] + '?data=' + compressed;

        if (url.length > 2000) {
            $("#urlLengthWarning").slideDown();
        } else {
            $("#urlLengthWarning").slideUp();
        }
        return url;
    }

    function generateAndCopyUrl() {
        const url = checkUrlLength();
        navigator.clipboard.writeText(url).then(() => {
            $("#commonModal").removeClass("active");
            showToast("URLをコピーしました！");
        });
    }

    function loadFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const dataParam = urlParams.get('data');
        if (dataParam) {
            try {
                const decompressed = LZString.decompressFromEncodedURIComponent(dataParam);
                if (decompressed) {
                    const data = JSON.parse(decompressed);
                    const updates = {};
                    if (data.t !== undefined) updates.text = data.t;
                    if (data.s !== undefined) updates.source = data.s;
                    if (data.d !== undefined) updates.date = data.d;
                    if (data.i !== undefined) updates.iconData = data.i;
                    if (data.c !== undefined) updates.bgColor = data.c;
                    if (data.cc !== undefined) updates.customColor = data.cc;
                    if (data.lh !== undefined) updates.lineHeight = data.lh;
                    if (data.fs !== undefined) updates.fontSize = data.fs;
                    if (data.p !== undefined) updates.padding = data.p;
                    if (data.is !== undefined) updates.iconSize = data.is;

                    if (data.ms !== undefined) updates.moyamoyaSeed = data.ms;

                    currentState = { ...currentState, ...updates };
                    reflectStateToInputs();
                }
            } catch (e) {
                console.error("Failed to load from URL", e);
            }
        }
    }

    // --- History ---

    function loadHistory() {
        // Initial load not needed for modal, but maybe for restoring last session?
        // For now, just keeping the function placeholder if needed.
    }

    function openHistoryModal() {
        renderHistoryList();
    }

    function renderHistoryList() {
        const history = JSON.parse(localStorage.getItem("quote_history") || "[]");
        let html = "";
        if (history.length === 0) {
            html = "<p style='text-align:center; color:var(--sub-text);'>履歴はありません</p>";
        } else {
            history.forEach((item, index) => {
                // Determine border color based on history item color
                let borderColor = "#ce0000";
                if (item.state.bgColor === "orange") borderColor = "#b34700";
                else if (item.state.bgColor === "blue") borderColor = "#1c7eff";
                else if (item.state.bgColor === "custom") borderColor = item.state.customColor;

                html += `
                    <div class="history-item" data-index="${index}" style="border-left-color: ${borderColor};">
                        <div class="history-content">
                            <div class="history-date">${item.timestamp}</div>
                            <div class="history-text">${item.previewText || "無題"}</div>
                        </div>
                        <div class="history-menu">
                            <button class="history-menu-btn"><i class="fa-solid fa-ellipsis-vertical"></i></button>
                            <div class="history-menu-dropdown">
                                <button class="text-danger delete-item-btn" data-index="${index}">削除</button>
                            </div>
                        </div>
                    </div>
                `;
            });
        }

        const actions = `
            <button id="deleteAllBtn" class="danger-btn" style="margin-right: auto;">すべて削除</button>
            <button id="newCreationBtn" class="secondary-btn" style="width: auto; margin-top: 0;">新規作成</button>
        `;

        showModal("作成履歴", `<div class="history-list">${html}</div>`, actions);

        // Event Listeners
        $("#newCreationBtn").click(function () {
            resetToDefault();
            $("#commonModal").removeClass("active");
        });

        $("#deleteAllBtn").click(function () {
            customConfirm("すべての履歴を削除しますか？この操作は取り消せません。", () => {
                localStorage.removeItem("quote_history");
                renderHistoryList(); // Re-render
            });
        });

        // Item Click (Restore)
        $(".history-content").click(function () {
            const index = $(this).closest('.history-item').data("index");
            const item = history[index];
            $("#commonModal").removeClass("active");
            customConfirm("この履歴を復元しますか？", () => {
                currentState = item.state;
                reflectStateToInputs();
                requestRender();
                showToast("履歴を復元しました");
            });
        });

        // Menu Button
        $(".history-menu-btn").click(function (e) {
            e.stopPropagation();
            const dropdown = $(this).siblings('.history-menu-dropdown');
            // Close others
            $(".history-menu-dropdown").not(dropdown).removeClass('active');
            dropdown.toggleClass('active');
        });

        // Delete Item Button
        $(".delete-item-btn").click(function (e) {
            e.stopPropagation();
            const index = $(this).data("index");
            customConfirm("この履歴を削除しますか？", () => {
                deleteHistoryItem(index);
            });
        });

        // Close menu on outside click (handled by global listener or specific modal listener)
        $("#modalBody").off('click.menu').on('click.menu', function (e) {
            if (!$(e.target).closest('.history-menu').length) {
                $(".history-menu-dropdown").removeClass('active');
            }
        });
    }

    function deleteHistoryItem(index) {
        const history = JSON.parse(localStorage.getItem("quote_history") || "[]");
        history.splice(index, 1);
        localStorage.setItem("quote_history", JSON.stringify(history));
        renderHistoryList(); // Re-render
    }

    function resetToDefault() {
        // Check if dirty
        const isDirty = els.text.text() !== "" || els.source.val() !== "" || els.date.val() !== "";

        if (isDirty) {
            customConfirm("入力内容をリセットしますか？現在の内容は履歴に保存されます。", () => {
                saveToHistory();
                showToast("編集中の内容を履歴に保存しました");
                performReset();
            });
            return;
        }

        performReset();
    }

    function performReset() {
        currentState = { ...defaultState };
        // Re-init date
        const today = new Date();
        const dateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;
        if (!currentState.date) currentState.date = dateStr;

        reflectStateToInputs();
        requestRender();
        showToast("リセットしました");
    }

    function saveToHistory() {
        const history = JSON.parse(localStorage.getItem("quote_history") || "[]");
        const item = {
            id: Date.now(),
            timestamp: new Date().toLocaleString(),
            state: currentState,
            previewText: els.text.text().substring(0, 50)
        };
        history.unshift(item);
        if (history.length > 20) history.pop();
        localStorage.setItem("quote_history", JSON.stringify(history));
    }

    // --- Export ---

    function downloadImage() {
        saveToHistory();

        const element = els.previewContainer[0];
        const targetWidth = parseInt(els.outputWidth.val()) || 1080;

        // Clone for high-res capture
        const clone = element.cloneNode(true);
        clone.style.width = targetWidth + "px";
        clone.style.height = "auto";
        clone.style.position = "fixed";
        clone.style.top = "-9999px";
        clone.style.left = "-9999px";
        clone.style.transform = "none";
        clone.style.zIndex = "-1"; // Ensure it's behind everything

        // Apply CSS variables to clone (Use raw values as they are for base scale)
        clone.style.setProperty("--preview-font-size", currentState.fontSize + "px");
        clone.style.setProperty("--preview-padding", currentState.padding + "px");
        clone.style.setProperty("--preview-icon-size", currentState.iconSize + "px");
        clone.style.setProperty("--preview-line-height", currentState.lineHeight);

        document.body.appendChild(clone);

        // Redraw canvas on clone
        const cloneCanvas = clone.querySelector("canvas");
        const cloneCtx = cloneCanvas.getContext("2d");
        cloneCanvas.width = targetWidth;

        // Wait for layout
        setTimeout(() => {
            cloneCanvas.height = clone.offsetHeight;

            // Draw background on clone
            const baseColor = getBaseColor();
            cloneCtx.fillStyle = baseColor;
            cloneCtx.fillRect(0, 0, cloneCanvas.width, cloneCanvas.height);

            const rng = new SeededRandom(currentState.moyamoyaSeed);
            const count = 40;
            for (let i = 0; i < count; i++) {
                const x = rng.next() * cloneCanvas.width;
                const y = rng.next() * cloneCanvas.height;
                const r = (0.1 + rng.next() * 0.4) * cloneCanvas.width;
                const alpha = 0.05 + rng.next() * 0.15;

                const g = cloneCtx.createRadialGradient(x, y, 0, x, y, r);
                g.addColorStop(0, `rgba(0, 0, 0, ${alpha})`);
                g.addColorStop(1, "rgba(0, 0, 0, 0)");

                cloneCtx.fillStyle = g;
                cloneCtx.globalCompositeOperation = "overlay";
                cloneCtx.beginPath();
                cloneCtx.arc(x, y, r, 0, Math.PI * 2);
                cloneCtx.fill();
            }
            cloneCtx.globalCompositeOperation = "source-over";

            // Vignette on clone
            const g = cloneCtx.createRadialGradient(cloneCanvas.width / 2, cloneCanvas.height / 2, cloneCanvas.width / 3, cloneCanvas.width / 2, cloneCanvas.height / 2, cloneCanvas.width);
            g.addColorStop(0, "rgba(0,0,0,0)");
            g.addColorStop(1, "rgba(0,0,0,0.3)");
            cloneCtx.fillStyle = g;
            cloneCtx.fillRect(0, 0, cloneCanvas.width, cloneCanvas.height);

            html2canvas(clone, {
                scale: 1,
                useCORS: true,
                backgroundColor: null
            }).then(canvas => {
                const link = document.createElement('a');
                link.download = 'quote-' + Date.now() + '.png';
                link.href = canvas.toDataURL('image/png');
                link.click();
                document.body.removeChild(clone);
                showToast("画像を保存しました");
            }).catch(err => {
                console.error("Export failed:", err);
                document.body.removeChild(clone);
                showToast("保存に失敗しました");
            });
        }, 500); // Increased timeout for stability
    }

    init();

    // Header New Button
    $("#newBtn").click(resetToDefault);
});
