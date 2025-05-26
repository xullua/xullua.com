let chatLog, userInput, sendButton, fileInput, fileUploadButton,
    filePreviewArea, fileNamePreview, removeFileButton,
    newChatButton, chatListContainer, chatSearchInput,
    settingsButton, settingsModal, closeSettingsModalButton,
    aiModelSelect, chatTitleElement,
    confirmationModal, confirmationTitle, confirmationMessage,
    confirmActionButton, cancelActionButton, closeConfirmationModalButtonElement;

const CHATS_STORAGE_KEY = 'chatGGR_chats';
const ACTIVE_CHAT_ID_KEY = 'chatGGR_activeChatId';
const SETTINGS_STORAGE_KEY = 'chatGGR_settings';
const AI_NAME = "ChatGGR";

let thinkingProcessStages = [];

let chats = [];
let activeChatId = null;
let appSettings = { aiModel: 'ChatGGR-Turbo' };
let thinkingIntervalId = null;
let selectedFile = null;
let activeDropdownMenu = null;
let confirmModalResolver = null;

document.addEventListener('DOMContentLoaded', initializeApp);

async function initializeApp() {
    console.log("Initializing App (vFinal)...");

    const getElement = (id, isCritical = true) => {
        const element = document.getElementById(id);
        if (!element && isCritical) {
            console.error(`Critical Error: HTML Element with ID "${id}" not found. Initialization cannot proceed.`);
            throw new Error(`Missing critical element: ${id}`);
        } else if (!element && !isCritical) {
            console.warn(`Warning: HTML Element with ID "${id}" not found. Some features might not work.`);
        }
        return element;
    };

    try {
        chatLog = getElement('chat-log');
        userInput = getElement('user-input');
        sendButton = getElement('send-button');
        fileInput = getElement('file-input');
        fileUploadButton = getElement('file-upload-button');
        filePreviewArea = getElement('file-preview-area', false);
        fileNamePreview = getElement('file-name-preview', false);
        removeFileButton = getElement('remove-file-button');
        newChatButton = getElement('new-chat-button');
        chatListContainer = getElement('chat-list-container');
        chatSearchInput = getElement('chat-search-input');
        settingsButton = getElement('settings-button');
        settingsModal = getElement('settings-modal');
        closeSettingsModalButton = getElement('close-settings-modal-button');
        aiModelSelect = getElement('ai-model-select');
        chatTitleElement = getElement('chat-title');
        confirmationModal = getElement('confirmation-modal');
        confirmationTitle = getElement('confirmation-title');
        confirmationMessage = getElement('confirmation-message');
        confirmActionButton = getElement('confirm-action-button');
        cancelActionButton = getElement('cancel-action-button');
        closeConfirmationModalButtonElement = getElement('close-confirmation-modal-button');
    } catch (error) {
        console.error("Initialization failed due to missing elements:", error);
        return;
    }

    await loadThinkingPhrases();

    loadAppSettingsFromLocalStorage();
    loadChatsFromLocalStorage();
    loadActiveChatIdFromLocalStorage();

    if (!activeChatId || !getChatById(activeChatId)) {
        if (chats.length > 0) {
            activeChatId = chats[0].id;
            saveActiveChatIdToLocalStorage();
        } else {
            createNewChat();
        }
    }

    if (activeChatId && getChatById(activeChatId)) {
        renderChatList();
        renderMessagesForActiveChat();
        updateChatTitle();
    } else if (chats.length > 0) {
        activeChatId = chats[0].id;
        saveActiveChatIdToLocalStorage();
        renderChatList();
        renderMessagesForActiveChat();
        updateChatTitle();
    }

    applyAppSettings();
    setupEventListeners();
    console.log("App initialized successfully.");
}

function setupEventListeners() {
    if (sendButton) sendButton.addEventListener('click', handleSendMessage);
    if (userInput) {
        userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
            }
        });
        userInput.addEventListener('input', autoResizeTextarea);
    }
    if (fileUploadButton) fileUploadButton.addEventListener('click', () => fileInput && fileInput.click());
    if (fileInput) fileInput.addEventListener('change', handleFileSelection);

    if (removeFileButton) {
        removeFileButton.addEventListener('click', clearSelectedFile);
    }

    if (newChatButton) newChatButton.addEventListener('click', createNewChat);
    if (chatSearchInput) chatSearchInput.addEventListener('input', handleChatSearch);
    if (settingsButton) settingsButton.addEventListener('click', openSettingsModal);
    if (closeSettingsModalButton) closeSettingsModalButton.addEventListener('click', closeSettingsModal);
    if (settingsModal) settingsModal.addEventListener('click', (e) => { if (e.target === settingsModal) closeSettingsModal(); });
    if (aiModelSelect) aiModelSelect.addEventListener('change', handleAiModelChange);

    if (confirmActionButton) confirmActionButton.addEventListener('click', () => resolveConfirmation(true));
    if (cancelActionButton) cancelActionButton.addEventListener('click', () => resolveConfirmation(false));
    if (closeConfirmationModalButtonElement) {
        closeConfirmationModalButtonElement.addEventListener('click', () => resolveConfirmation(false));
    }
    if (confirmationModal) confirmationModal.addEventListener('click', (e) => { if (e.target === confirmationModal) resolveConfirmation(false); });

    document.addEventListener('click', (event) => {
        if (activeDropdownMenu &&
            !activeDropdownMenu.contains(event.target) &&
            !event.target.closest('.chat-item-menu-trigger')) {
            closeActiveDropdownMenu();
        }
    });
}

async function loadThinkingPhrases() {
    // defaultStages を countMin と countMax を使うように修正
    const defaultStages = [
        {
            stageName: "準備中...",
            phrases: ["少々お待ちください...", "データを読み込んでいます...", "接続を確認しています..."],
            countMin: 1, // 最小表示数を1に設定
            countMax: 1, // 最大表示数も1に（単一フレーズなので）
            durationMin: 1500,
            durationMax: 2000
        }
    ];
    try {
        const response = await fetch('thinking_phrases.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (data && data.stages && Array.isArray(data.stages)) {
            // JSONファイルから読み込んだステージデータが正しい形式か確認 (任意ですが推奨)
            thinkingProcessStages = data.stages.map(stage => ({
                stageName: stage.stageName || "処理中...",
                phrases: Array.isArray(stage.phrases) && stage.phrases.length > 0 ? stage.phrases : ["情報を処理しています..."],
                countMin: typeof stage.countMin === 'number' && stage.countMin >= 0 ? stage.countMin : 1,
                countMax: typeof stage.countMax === 'number' && stage.countMax >= stage.countMin ? stage.countMax : (typeof stage.countMin === 'number' ? stage.countMin : 1),
                durationMin: typeof stage.durationMin === 'number' && stage.durationMin >= 0 ? stage.durationMin : 1000,
                durationMax: typeof stage.durationMax === 'number' && stage.durationMax >= stage.durationMin ? stage.durationMax : 2000,
            }));
        } else {
            console.warn("Thinking phrases JSON is not in expected format or empty, using default stages.");
            thinkingProcessStages = defaultStages;
        }
    } catch (error) {
        console.error("Could not load thinking phrases from JSON, using default stages:", error);
        thinkingProcessStages = defaultStages;
    }
}

function scrollToBottom(force = false, smooth = false) {
    if (!chatLog) return;
    const scrollAction = () => {
        if (!chatLog) return;
        if (smooth) {
            chatLog.scrollTo({ top: chatLog.scrollHeight, behavior: 'smooth' });
        } else {
            chatLog.scrollTop = chatLog.scrollHeight;
        }
    };
    if (force) {
        scrollAction();
    } else {
        requestAnimationFrame(() => {
            scrollAction();
            setTimeout(scrollAction, 300);
            setTimeout(scrollAction, 700);
        });
    }
}

function formatFileNameWithExtension(fileName) {
    if (!fileName || typeof fileName !== 'string') return '';
    const lastDotIndex = fileName.lastIndexOf('.');
    if (lastDotIndex > 0 && lastDotIndex < fileName.length - 1) {
        const nameWithoutExt = fileName.substring(0, lastDotIndex);
        const ext = fileName.substring(lastDotIndex + 1);
        return `${nameWithoutExt}.<span class="file-extension">${ext.toUpperCase()}</span>`;
    }
    return fileName;
}

function switchToChatNameEditMode(chatId, nameSpanElement) {
    if (!nameSpanElement) return;
    closeActiveDropdownMenu();

    const chat = getChatById(chatId);
    if (!chat) return;

    const originalName = chat.name;
    nameSpanElement.style.display = 'none';

    const inputElement = document.createElement('input');
    inputElement.type = 'text';
    inputElement.className = 'chat-item-name-edit';
    inputElement.value = originalName;

    if (nameSpanElement.parentElement) {
        nameSpanElement.parentElement.insertBefore(inputElement, nameSpanElement.nextSibling);
    } else {
        nameSpanElement.style.display = '';
        return;
    }

    inputElement.focus();
    inputElement.select();

    const finishEditing = (saveChanges) => {
        if (!inputElement.parentElement) return;

        if (saveChanges) {
            const newName = inputElement.value.trim();
            if (newName && newName !== originalName) {
                chat.name = newName;
                saveChatsToLocalStorage();
                if (chat.id === activeChatId) {
                    updateChatTitle();
                }
            }
        }
        inputElement.parentElement.removeChild(inputElement);
        nameSpanElement.style.display = '';
        renderChatList();
    };

    const blurHandler = () => finishEditing(true);
    const keydownHandler = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            inputElement.removeEventListener('blur', blurHandler);
            finishEditing(true);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            inputElement.removeEventListener('blur', blurHandler);
            finishEditing(false);
        }
    };

    inputElement.addEventListener('blur', blurHandler, { once: true });
    inputElement.addEventListener('keydown', keydownHandler);
}

function showConfirmationModal(title, message) {
    return new Promise((resolve) => {
        if (!confirmationModal || !confirmationTitle || !confirmationMessage) {
            resolve(false);
            return;
        }
        confirmationTitle.textContent = title;
        confirmationMessage.textContent = message;
        confirmationModal.classList.add('active');
        confirmModalResolver = resolve;
    });
}

function resolveConfirmation(result) {
    if (!confirmationModal) return;
    confirmationModal.classList.remove('active');
    if (confirmModalResolver) {
        confirmModalResolver(result);
        confirmModalResolver = null;
    }
}

function openChatItemMenuDynamic(chatId, triggerButton, nameSpanElementForEdit) {
    if (!triggerButton) return;
    closeActiveDropdownMenu();

    const chatItemElement = triggerButton.closest('.chat-list-item');
    if (!chatItemElement) return;

    const dropdownMenu = document.createElement('div');
    dropdownMenu.className = 'chat-item-dropdown-menu';

    const renameButton = document.createElement('button');
    renameButton.className = 'dropdown-item rename-chat';
    renameButton.textContent = '名前を変更';
    renameButton.addEventListener('click', (e) => {
        e.stopPropagation();
        switchToChatNameEditMode(chatId, nameSpanElementForEdit);
        closeActiveDropdownMenu();
    });

    const deleteButton = document.createElement('button');
    deleteButton.className = 'dropdown-item delete-chat';
    deleteButton.textContent = '削除';
    deleteButton.addEventListener('click', (e) => {
        e.stopPropagation();
        handleDeleteChat(chatId);
    });

    dropdownMenu.appendChild(renameButton);
    dropdownMenu.appendChild(deleteButton);
    chatItemElement.appendChild(dropdownMenu);

    dropdownMenu.style.display = 'block';
    activeDropdownMenu = dropdownMenu;
    chatItemElement.classList.add('menu-open');
}

function closeActiveDropdownMenu() {
    if (activeDropdownMenu) {
        const parentItem = activeDropdownMenu.closest('.chat-list-item');
        if (parentItem) parentItem.classList.remove('menu-open');
        if (activeDropdownMenu.parentElement) {
            activeDropdownMenu.parentElement.removeChild(activeDropdownMenu);
        }
        activeDropdownMenu = null;
    }
}

async function handleDeleteChat(chatId) {
    closeActiveDropdownMenu();
    const chat = getChatById(chatId);
    if (!chat) return;

    const confirmed = await showConfirmationModal("チャットの削除", `チャット「${chat.name}」を本当に削除しますか？この操作は元に戻せません。`);

    if (confirmed) {
        chats = chats.filter(c => c.id !== chatId);
        saveChatsToLocalStorage();

        if (activeChatId === chatId) {
            activeChatId = null;
            if (chats.length > 0) {
                activeChatId = chats[0].id;
                saveActiveChatIdToLocalStorage();
                renderMessagesForActiveChat();
                updateChatTitle();
            } else {
                createNewChat();
                renderChatList();
                return;
            }
        }
        renderChatList();
    }
}

function renderChatList(searchTerm = '') {
    if (!chatListContainer) return;
    const lowerSearchTerm = searchTerm.toLowerCase();
    chatListContainer.innerHTML = '';

    const filteredChats = chats.filter(chat =>
        chat.name && chat.name.toLowerCase().includes(lowerSearchTerm)
    );

    if (!filteredChats.length && searchTerm) {
        chatListContainer.innerHTML = `<p class="no-chats-found">「${searchTerm}」に一致するチャットはありません</p>`;
        return;
    }

    filteredChats.forEach(chat => {
        const chatItem = document.createElement('div');
        chatItem.classList.add('chat-list-item');
        chatItem.dataset.chatId = chat.id;
        if (chat.id === activeChatId) {
            chatItem.classList.add('active');
        }

        const nameSpan = document.createElement('span');
        nameSpan.classList.add('chat-item-name');
        nameSpan.textContent = chat.name || `Chat ${new Date(chat.createdAt).toLocaleDateString()}`;
        nameSpan.title = chat.name;

        chatItem.addEventListener('click', (e) => {
            if (!e.target.closest('.chat-item-menu-trigger') && !e.target.closest('.chat-item-name-edit')) {
                switchToChat(chat.id);
            }
        });

        const menuDiv = document.createElement('div');
        menuDiv.className = 'chat-item-menu';

        const menuTrigger = document.createElement('button');
        menuTrigger.className = 'chat-item-menu-trigger';
        menuTrigger.innerHTML = '<span class="material-icons-outlined">more_vert</span>';
        menuTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const existingMenu = chatItem.querySelector('.chat-item-dropdown-menu');
            if (activeDropdownMenu === existingMenu && existingMenu) {
                closeActiveDropdownMenu();
            } else {
                openChatItemMenuDynamic(chat.id, menuTrigger, nameSpan);
            }
        });

        menuDiv.appendChild(menuTrigger);

        chatItem.appendChild(nameSpan);
        chatItem.appendChild(menuDiv);
        chatListContainer.appendChild(chatItem);
    });
}

function appendMessageElement(text, sender, messageId, isThinking = false, fileInfo = null) {
    if (!chatLog) return null;
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', `${sender}-message`);
    if (messageId) messageElement.dataset.messageId = messageId;

    if (isThinking) {
        messageElement.classList.add('thinking-message');
        const wrapper = document.createElement('div');
        wrapper.className = 'thinking-content-wrapper';
        const spinner = document.createElement('div');
        spinner.className = 'rainbow-spinner';
        const textArea = document.createElement('div');
        textArea.className = 'thinking-text-area';
        const stageP = document.createElement('p');
        stageP.className = 'thinking-stage';
        const detailP = document.createElement('p');
        detailP.className = 'thinking-detail';
        textArea.appendChild(stageP);
        textArea.appendChild(detailP);
        wrapper.appendChild(spinner);
        wrapper.appendChild(textArea);
        messageElement.appendChild(wrapper);
    } else {
        const textContentDiv = document.createElement('div');
        textContentDiv.className = 'message-text-content';
        textContentDiv.innerHTML = text ? String(text).replace(/\n/g, '<br>') : '';
        messageElement.appendChild(textContentDiv);

        if (fileInfo && fileInfo.name) {
            const fileAttachment = document.createElement('div');
            fileAttachment.className = 'file-attachment';
            const fileIcon = document.createElement('span');
            fileIcon.className = 'material-icons-outlined file-icon';
            fileIcon.textContent = 'insert_drive_file';
            const fileNameSpan = document.createElement('span');
            fileNameSpan.className = 'file-name-text';
            fileNameSpan.innerHTML = formatFileNameWithExtension(fileInfo.name);
            fileAttachment.appendChild(fileIcon);
            fileAttachment.appendChild(fileNameSpan);
            messageElement.appendChild(fileAttachment);
        }
    }

    chatLog.appendChild(messageElement);
    requestAnimationFrame(() => scrollToBottom());
    return messageElement;
}

function renderMessagesForActiveChat() {
    if (!chatLog || !activeChatId) return;
    chatLog.innerHTML = '';
    const activeChat = getChatById(activeChatId);
    if (activeChat && activeChat.messages && Array.isArray(activeChat.messages)) {
        activeChat.messages.forEach(msg => {
            if (msg) {
                appendMessageElement(msg.text, msg.sender, msg.id, false, msg.file);
            }
        });
    }
    requestAnimationFrame(() => {
        scrollToBottom(true);
    });
}

async function showThinkingProcess(thinkingMsgElement) {
    if (!thinkingMsgElement || !thinkingMsgElement.isConnected) return; // 要素がDOMに接続されているか確認
    const stageTextElement = thinkingMsgElement.querySelector('.thinking-stage');
    const detailTextElement = thinkingMsgElement.querySelector('.thinking-detail');

    if (!stageTextElement || !detailTextElement) {
        console.warn("Thinking message elements not found.");
        return;
    }

    if (thinkingProcessStages.length === 0) {
        // これは loadThinkingPhrases で defaultStages が設定されるので通常は通らないはず
        stageTextElement.textContent = "思考中...";
        detailTextElement.textContent = "データを準備しています...";
        await new Promise(resolve => setTimeout(resolve, 1500));
        return;
    }

    try {
        for (const stage of thinkingProcessStages) {
            if (!thinkingMsgElement.isConnected) return; // 各ステージ開始前に接続確認

            stageTextElement.textContent = stage.stageName;

            const phrasesToShow = [];
            const availablePhrases = [...stage.phrases]; // フレーズのコピーを作成

            // countMin と countMax から表示するフレーズ数を決定
            // stageオブジェクトにcountMin/countMaxがない場合のフォールバックも考慮
            const minPhrases = (typeof stage.countMin === 'number' && stage.countMin >= 0) ? stage.countMin : 1;
            const maxPhrases = (typeof stage.countMax === 'number' && stage.countMax >= minPhrases) ? stage.countMax : minPhrases;

            let numPhrasesToDisplay = 0;
            if (availablePhrases.length > 0) {
                numPhrasesToDisplay = Math.floor(Math.random() * (maxPhrases - minPhrases + 1)) + minPhrases;
                // 利用可能なフレーズ数を超えないように調整
                numPhrasesToDisplay = Math.min(numPhrasesToDisplay, availablePhrases.length);
            }


            for (let i = 0; i < numPhrasesToDisplay; i++) {
                if (availablePhrases.length === 0) break; //念のため
                const randomIndex = Math.floor(Math.random() * availablePhrases.length);
                phrasesToShow.push(availablePhrases.splice(randomIndex, 1)[0]); // 選んだフレーズは重複しないように削除
            }

            if (phrasesToShow.length === 0 && availablePhrases.length > 0) {
                // numPhrasesToDisplayが0になったが、表示できるフレーズがまだある場合、最低1つは表示する (任意)
                // もしくは、何かしらのデフォルトフレーズを表示する
                phrasesToShow.push(availablePhrases[Math.floor(Math.random() * availablePhrases.length)]);
            } else if (phrasesToShow.length === 0 && availablePhrases.length === 0) {
                // 表示するフレーズが尽きた場合
                detailTextElement.textContent = "情報を整理中です..."; // デフォルトのフレーズ
                const duration = Math.floor(Math.random() * (stage.durationMax - stage.durationMin + 1)) + stage.durationMin;
                await new Promise(resolve => setTimeout(resolve, duration));
                if (!thinkingMsgElement.isConnected) return;
                continue; // 次のステージへ
            }


            for (const phrase of phrasesToShow) {
                if (!thinkingMsgElement.isConnected) return; // 各フレーズ表示前に接続確認

                detailTextElement.textContent = phrase;
                // アニメーションのリセットと再開
                detailTextElement.classList.remove('fade-in-from-bottom');
                void detailTextElement.offsetWidth; // 強制リフロー
                detailTextElement.classList.add('fade-in-from-bottom');

                const duration = Math.floor(Math.random() * (stage.durationMax - stage.durationMin + 1)) + stage.durationMin;
                await new Promise(resolve => setTimeout(resolve, duration));
            }
        }
    } catch (error) {
        console.error("Error during thinking process animation:", error);
        if (stageTextElement && detailTextElement && thinkingMsgElement.isConnected) {
            stageTextElement.textContent = "エラー発生";
            detailTextElement.textContent = "処理中に問題が発生しました。";
        }
    }
}

async function handleSendMessage() {
    if (!userInput || !sendButton) return;
    const messageText = userInput.value.trim();
    if (messageText === '' && !selectedFile) return;

    const userMessageData = addMessageToActiveChat('user', messageText, selectedFile);
    if (userMessageData) {
        appendMessageElement(userMessageData.text, 'user', userMessageData.id, false, userMessageData.file);
    }

    userInput.value = '';
    if (typeof autoResizeTextarea === "function") autoResizeTextarea();
    const currentFileForAI = selectedFile;
    clearSelectedFile();

    const thinkingMsgId = 'thinking-msg-' + Date.now();
    let currentThinkingMessageElem = appendMessageElement("", 'ai', thinkingMsgId, true); // ローカル変数に変更
    if (!currentThinkingMessageElem) return;
    scrollToBottom(true);

    await showThinkingProcess(currentThinkingMessageElem);

    let aiResponseText = 'ggrks';
    if (currentFileForAI) {
        aiResponseText = `「${currentFileForAI.name}」とメッセージね。はい、ggrks`;
    }

    const aiMessageData = addMessageToActiveChat('ai', aiResponseText, null);

    if (aiMessageData && currentThinkingMessageElem && currentThinkingMessageElem.isConnected) { // 要素がまだDOMにあるか確認
        updateThinkingMessageToFinal(currentThinkingMessageElem, aiResponseText, aiMessageData.id, null);
    } else if (aiMessageData) {
        appendMessageElement(aiMessageData.text, 'ai', aiMessageData.id, false, aiMessageData.file);
    } else if (currentThinkingMessageElem && currentThinkingMessageElem.isConnected) {
        currentThinkingMessageElem.remove();
    }

    if (userInput) userInput.focus();
    scrollToBottom();
}

function updateThinkingMessageToFinal(thinkingMsgElement, finalText, messageId, fileInfo = null) {
    if (thinkingMsgElement) {
        thinkingMsgElement.classList.remove('thinking-message');
        // thinking-message特有のラッパーなどを削除
        const wrapper = thinkingMsgElement.querySelector('.thinking-content-wrapper');
        if (wrapper) thinkingMsgElement.removeChild(wrapper);

        // 通常のメッセージコンテンツを再構築 (appendMessageElementの通常メッセージ部分と類似)
        const textContentDiv = document.createElement('div');
        textContentDiv.className = 'message-text-content';
        textContentDiv.innerHTML = finalText ? String(finalText).replace(/\n/g, '<br>') : '';
        thinkingMsgElement.appendChild(textContentDiv);

        if (fileInfo && fileInfo.name) {
            const fileAttachment = document.createElement('div');
            fileAttachment.className = 'file-attachment';
            const fileIcon = document.createElement('span');
            fileIcon.className = 'material-icons-outlined file-icon';
            fileIcon.textContent = 'insert_drive_file';
            const fileNameSpan = document.createElement('span');
            fileNameSpan.className = 'file-name-text';
            fileNameSpan.innerHTML = formatFileNameWithExtension(fileInfo.name);
            fileAttachment.appendChild(fileIcon);
            fileAttachment.appendChild(fileNameSpan);
            thinkingMsgElement.appendChild(fileAttachment);
        }

        if (messageId) thinkingMsgElement.dataset.messageId = messageId;
        thinkingMsgElement.style.animationName = 'none';
        requestAnimationFrame(() => {
            thinkingMsgElement.style.animationName = 'messaggioEntrataAI';
        });
        scrollToBottom();
    }
}

function loadAppSettingsFromLocalStorage() {
    const storedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (storedSettings) {
        try {
            const parsedSettings = JSON.parse(storedSettings);
            appSettings = { ...appSettings, ...parsedSettings };
        } catch (e) { console.error("Error parsing app settings from localStorage", e); }
    }
}
function saveAppSettingsToLocalStorage() { localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(appSettings)); }
function applyAppSettings() { if (aiModelSelect && appSettings.aiModel) { aiModelSelect.value = appSettings.aiModel; } }
function handleAiModelChange(event) { if (event && event.target) { appSettings.aiModel = event.target.value; saveAppSettingsToLocalStorage(); } }
function openSettingsModal() { if (settingsModal) settingsModal.classList.add('active'); }
function closeSettingsModal() { if (settingsModal) settingsModal.classList.remove('active'); }
function handleChatSearch(event) { if (event && event.target) { const searchTerm = event.target.value; renderChatList(searchTerm); } }

function loadChatsFromLocalStorage() {
    const storedChats = localStorage.getItem(CHATS_STORAGE_KEY);
    if (storedChats) {
        try {
            chats = JSON.parse(storedChats);
            if (!Array.isArray(chats)) chats = [];
        } catch (e) { console.error("Error parsing chats from localStorage", e); chats = []; }
    } else { chats = []; }
}
function saveChatsToLocalStorage() { localStorage.setItem(CHATS_STORAGE_KEY, JSON.stringify(chats)); }
function loadActiveChatIdFromLocalStorage() { activeChatId = localStorage.getItem(ACTIVE_CHAT_ID_KEY); }
function saveActiveChatIdToLocalStorage() { if (activeChatId) localStorage.setItem(ACTIVE_CHAT_ID_KEY, activeChatId); else localStorage.removeItem(ACTIVE_CHAT_ID_KEY); }
function getChatById(chatId) { if (!chatId) return null; return chats.find(chat => chat.id === chatId); }

function autoResizeTextarea() {
    if (userInput) {
        userInput.style.height = 'auto';
        const scrollHeight = userInput.scrollHeight;
        const maxHeightStyle = window.getComputedStyle(userInput).maxHeight;
        let maxHeight = Infinity;
        if (maxHeightStyle && maxHeightStyle !== 'none') {
            maxHeight = parseInt(maxHeightStyle, 10);
        }
        if (!isNaN(scrollHeight) && !isNaN(maxHeight)) {
            userInput.style.height = Math.min(scrollHeight, maxHeight) + 'px';
        } else if (!isNaN(scrollHeight)) {
            userInput.style.height = scrollHeight + 'px';
        }
    }
}

function handleFileSelection(event) {
    if (event && event.target && event.target.files) {
        const file = event.target.files[0];
        if (file) {
            selectedFile = file;
            if (fileNamePreview && filePreviewArea) {
                fileNamePreview.innerHTML = formatFileNameWithExtension(selectedFile.name);
                filePreviewArea.style.display = 'flex';
            }
        }
        if (event.target) event.target.value = '';
    }
}
function clearSelectedFile() {
    selectedFile = null;
    if (typeof clearSelectedFileUIDisplay === "function") clearSelectedFileUIDisplay();
}
function clearSelectedFileUIDisplay() {
    if (fileNamePreview && filePreviewArea) {
        fileNamePreview.textContent = '';
        filePreviewArea.style.display = 'none';
    }
}

function createNewChat() {
    closeActiveDropdownMenu();
    const newChatId = 'chat-' + Date.now();
    const defaultChatName = `Chat ${new Date().toLocaleString('ja-JP', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
    const newChat = {
        id: newChatId,
        name: defaultChatName,
        createdAt: Date.now(),
        messages: []
    };
    chats.unshift(newChat);
    activeChatId = newChatId;

    saveChatsToLocalStorage();
    saveActiveChatIdToLocalStorage();

    renderChatList();
    renderMessagesForActiveChat();
    updateChatTitle();
    if (userInput) userInput.focus();
}

function switchToChat(chatId) {
    if (!chatId) return;
    if (activeChatId === chatId && document.querySelector(`.chat-list-item[data-chat-id="${chatId}"].active`)) {
        closeActiveDropdownMenu();
        return;
    }
    activeChatId = chatId;
    saveActiveChatIdToLocalStorage();
    renderChatList();
    renderMessagesForActiveChat();
    updateChatTitle();
    if (userInput) userInput.focus();
    closeActiveDropdownMenu();
}

function addMessageToActiveChat(sender, text, file = null) {
    if (!activeChatId && chats.length > 0) {
        activeChatId = chats[0].id;
        saveActiveChatIdToLocalStorage();
    } else if (!activeChatId && chats.length === 0) {
        createNewChat();
    }

    const activeChat = getChatById(activeChatId);
    if (!activeChat) {
        return null;
    }

    const message = {
        id: 'msg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        sender: sender,
        text: text || "",
        file: file ? { name: file.name, type: file.type, size: file.size } : null,
        timestamp: Date.now()
    };
    activeChat.messages.push(message);

    if (activeChat.messages.length === 1 && sender === 'user' && (text && text.trim() !== '')) {
        if (activeChat.name && activeChat.name.startsWith("Chat ")) {
            const newChatName = text.trim().substring(0, 30) + (text.trim().length > 30 ? '...' : '');
            activeChat.name = newChatName;
        }
    }
    const chatIndex = chats.findIndex(c => c.id === activeChatId);
    if (chatIndex > 0) {
        const [currentActiveChatDetails] = chats.splice(chatIndex, 1);
        chats.unshift(currentActiveChatDetails);
    }

    saveChatsToLocalStorage();
    renderChatList();
    updateChatTitle();
    return message;
}

function updateChatTitle() {
    if (!chatTitleElement) return;
    const activeChat = getChatById(activeChatId);
    if (activeChat) {
        chatTitleElement.textContent = activeChat.name || AI_NAME;
    } else {
        chatTitleElement.textContent = AI_NAME;
    }
}