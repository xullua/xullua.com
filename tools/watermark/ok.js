// --- DOM要素の取得 ---
const imageLoader = document.getElementById('imageLoader');
const fileDropArea = document.querySelector('.file-drop-area');
const previewCanvas = document.getElementById('previewCanvas');
const ctx = previewCanvas.getContext('2d');
const downloadBtn = document.getElementById('downloadBtn');
const settingsPanel = document.querySelector('.settings-panel');
const aspectRatioSelector = document.getElementById('aspectRatioSelector');
const cropFitRadios = document.getElementsByName('cropFit');
const fontSizeSlider = document.getElementById('fontSize');
const textPlacementRadios = document.getElementsByName('textPlacement');
const textAlignSelect = document.getElementById('textAlign');
const textShadowCheck = document.getElementById('textShadow');
const cameraModelInput = document.getElementById('cameraModel');
const focalLengthInput = document.getElementById('focalLength');
const shutterSpeedInput = document.getElementById('shutterSpeed');
const fValueInput = document.getElementById('fValue');
const isoInput = document.getElementById('iso');
const locationInput = document.getElementById('location');
const paddingSlider = document.getElementById('padding');
const backgroundTypeRadios = document.getElementsByName('backgroundType');
const blurSlider = document.getElementById('blur-d2');
const blacknessSlider = document.getElementById('blackness-d2');
const bgColorRadios = document.getElementsByName('bgColor');
const bgColorPicker = document.getElementById('bgColorPicker');
const borderRadiusSlider = document.getElementById('borderRadius');
const shadowSlider = document.getElementById('shadow');
const formatSelector = document.getElementById('outputFormat');
const outputWidthInput = document.getElementById('outputWidth');
const outputHeightInput = document.getElementById('outputHeight');
const aspectLockCheck = document.getElementById('aspectLock');
const previewWidthSpan = document.getElementById('previewWidth');
const previewHeightSpan = document.getElementById('previewHeight');

// --- グローバル変数 ---
let currentImage = null;

// --- イベントリスナー ---
window.addEventListener('load', loadSettings);
imageLoader.addEventListener('change', handleImageSelect);
fileDropArea.addEventListener('drop', handleImageDrop);
fileDropArea.addEventListener('dragover', (e) => { e.preventDefault(); fileDropArea.style.borderColor = '#3498db'; });
fileDropArea.addEventListener('dragleave', () => { fileDropArea.style.borderColor = '#bdc3c7'; });
fileDropArea.addEventListener('click', () => imageLoader.click());
settingsPanel.addEventListener('input', () => {
    updateUI();
    drawCanvas();
    saveSettings();
});
downloadBtn.addEventListener('click', downloadImage);
outputWidthInput.addEventListener('input', () => {
    if (aspectLockCheck.checked && currentImage) {
        const logicalDims = getLogicalDimensions();
        outputHeightInput.value = Math.round(outputWidthInput.value / logicalDims.aspectRatio);
    }
});
outputHeightInput.addEventListener('input', () => {
    if (aspectLockCheck.checked && currentImage) {
        const logicalDims = getLogicalDimensions();
        outputWidthInput.value = Math.round(outputHeightInput.value * logicalDims.aspectRatio);
    }
});
bgColorPicker.addEventListener('input', () => {
    bgColorRadios.forEach(radio => radio.checked = false);
});


// --- 設定の保存と復元 ---
function saveSettings() {
    const settings = {
        aspectRatio: aspectRatioSelector.value,
        cropFit: document.querySelector('input[name="cropFit"]:checked').value,
        fontSize: fontSizeSlider.value,
        textPlacement: document.querySelector('input[name="textPlacement"]:checked').value,
        textAlign: textAlignSelect.value,
        textShadow: textShadowCheck.checked,
        padding: paddingSlider.value,
        backgroundType: document.querySelector('input[name="backgroundType"]:checked').value,
        blur: blurSlider.value,
        blackness: blacknessSlider.value,
        bgColor: document.querySelector('input[name="bgColor"]:checked')?.value || bgColorPicker.value,
        bgColorPicker: bgColorPicker.value,
        borderRadius: borderRadiusSlider.value,
        shadow: shadowSlider.value,
        outputFormat: formatSelector.value,
    };
    localStorage.setItem('watermarkAppSettings', JSON.stringify(settings));
}

function loadSettings() {
    const settings = JSON.parse(localStorage.getItem('watermarkAppSettings'));
    if (settings) {
        aspectRatioSelector.value = settings.aspectRatio || 'auto';
        document.querySelector(`input[name="cropFit"][value="${settings.cropFit || 'crop'}"]`).checked = true;
        fontSizeSlider.value = settings.fontSize || '48';
        document.querySelector(`input[name="textPlacement"][value="${settings.textPlacement || 'margin'}"]`).checked = true;
        textAlignSelect.value = settings.textAlign || 'center';
        textShadowCheck.checked = settings.textShadow !== false;
        paddingSlider.value = settings.padding || '50';
        document.querySelector(`input[name="backgroundType"][value="${settings.backgroundType || 'blur'}"]`).checked = true;
        blurSlider.value = settings.blur || '20';
        blacknessSlider.value = settings.blackness || '0';
        bgColorPicker.value = settings.bgColorPicker || '#ffffff';
        const solidColorRadio = document.querySelector(`input[name="bgColor"][value="${settings.bgColor}"]`);
        if (solidColorRadio) {
            solidColorRadio.checked = true;
        }
        borderRadiusSlider.value = settings.borderRadius || '0';
        shadowSlider.value = settings.shadow || '25';
        formatSelector.value = settings.outputFormat || 'jpeg';
    }
    updateUI();
}


// --- UIの表示/非表示を動的に更新 ---
function updateUI() {
    const aspectRatio = aspectRatioSelector.value;
    const textPlacement = document.querySelector('input[name="textPlacement"]:checked').value;
    const backgroundType = document.querySelector('input[name="backgroundType"]:checked').value;

    document.getElementById('crop-fit-options').style.display = (aspectRatio === 'auto') ? 'none' : 'block';
    document.getElementById('frame-settings').style.display = (textPlacement === 'margin') ? 'block' : 'none';
    
    const textAlignOptions = document.getElementById('text-align-options');
    textAlignOptions.style.display = 'block';
    textAlignOptions.querySelector('option[value="left"]').disabled = (textPlacement === 'margin');
    if (textPlacement === 'margin' && textAlignSelect.value === 'left') {
        textAlignSelect.value = 'center';
    }

    document.getElementById('bg-blur-options').style.display = (textPlacement === 'margin' && backgroundType === 'blur') ? 'block' : 'none';
    document.getElementById('bg-solid-options').style.display = (textPlacement === 'margin' && backgroundType === 'solid') ? 'block' : 'none';
}


// --- 画像処理 ---
function showLoading() {
    ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    ctx.fillStyle = '#666';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '20px sans-serif';
    ctx.fillText('ロード中...', previewCanvas.width / 2, previewCanvas.height / 2);
}

function handleImageSelect(e) {
    const files = e.target.files;
    if (files.length > 0) processImageFile(files[0]);
}

function handleImageDrop(e) {
    e.preventDefault();
    fileDropArea.style.borderColor = '#bdc3c7';
    const files = e.dataTransfer.files;
    if (files.length > 0) processImageFile(files[0]);
}

function processImageFile(file) {
    showLoading();
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            currentImage = img;
            EXIF.getData(img, function() {
                cameraModelInput.value = EXIF.getTag(this, "Model") || '';
                const focalLength = EXIF.getTag(this, "FocalLength");
                focalLengthInput.value = focalLength ? `${focalLength.numerator / focalLength.denominator}mm` : '';
                shutterSpeedInput.value = formatShutterSpeed(EXIF.getTag(this, "ExposureTime"));
                const fNumber = EXIF.getTag(this, "FNumber");
                fValueInput.value = fNumber ? `F${fNumber.numerator / fNumber.denominator}`: '';
                isoInput.value = EXIF.getTag(this, "ISOSpeedRatings") || '';
                
                const dims = getLogicalDimensions();
                outputWidthInput.value = dims.width;
                outputHeightInput.value = dims.height;
                
                updateUI();
                drawCanvas();
            });
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function formatShutterSpeed(value) {
    if (!value) return '';
    if (value.numerator && value.denominator) {
        if (value.numerator >= value.denominator) {
            return `${value.numerator / value.denominator}s`;
        }
        return `1/${Math.round(value.denominator / value.numerator)}s`;
    }
    return '';
}


// --- Canvas描画ヘルパー関数 ---
function drawRoundedRect(ctx, x, y, width, height, radius) {
    radius = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.arcTo(x + width, y, x + width, y + radius, radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
    ctx.lineTo(x + radius, y + height);
    ctx.arcTo(x, y + height, x, y + height - radius, radius);
    ctx.lineTo(x, y + radius);
    ctx.arcTo(x, y, x + radius, y, radius);
    ctx.closePath();
}

function getTextBlockMetrics(ctx, baseFontSize) {
    const metrics = { height: 0, maxWidth: 0 };
    const modelText = cameraModelInput.value;
    const settingsText = [focalLengthInput.value, shutterSpeedInput.value, fValueInput.value, `ISO ${isoInput.value}`].filter(Boolean).join('   ');
    const locationText = locationInput.value;

    ctx.font = `bold ${baseFontSize}px sans-serif`;
    const modelWidth = ctx.measureText(modelText).width;
    
    ctx.font = `${baseFontSize * 0.75}px sans-serif`;
    const settingsWidth = ctx.measureText(settingsText).width;

    let locationWidth = 0;
    if (locationText) {
        ctx.font = `${baseFontSize * 0.65}px sans-serif`;
        locationWidth = ctx.measureText(locationText).width;
    }

    metrics.maxWidth = Math.max(modelWidth, settingsWidth, locationWidth);
    metrics.height = baseFontSize + (baseFontSize * 0.75) + (locationText ? (baseFontSize * 0.5 + baseFontSize * 0.65) : 0);
    return metrics;
}

function calculateDrawRects(containerWidth, containerHeight) {
    const targetAspectRatio = aspectRatioSelector.value === 'auto' ? containerWidth / containerHeight : parseFloat(aspectRatioSelector.value);
    const cropFit = document.querySelector('input[name="cropFit"]:checked').value;
    const imgAspectRatio = currentImage.width / currentImage.height;

    let sx = 0, sy = 0, sw = currentImage.width, sh = currentImage.height;
    let dx = 0, dy = 0, dw = containerWidth, dh = containerHeight;

    if (aspectRatioSelector.value !== 'auto' && cropFit === 'crop') {
        if (imgAspectRatio > targetAspectRatio) {
            sw = currentImage.height * targetAspectRatio;
            sx = (currentImage.width - sw) / 2;
        } else {
            sh = currentImage.width / targetAspectRatio;
            sy = (currentImage.height - sh) / 2;
        }
    } else {
        if (imgAspectRatio > targetAspectRatio) {
            dh = containerWidth / imgAspectRatio;
            dy = (containerHeight - dh) / 2;
        } else {
            dw = containerHeight * imgAspectRatio;
            dx = (containerWidth - dw) / 2;
        }
    }
    return { sx, sy, sw, sh, dx, dy, dw, dh };
}


// --- Canvas描画メイン関数 ---
function drawCanvas(targetCtx = ctx, scale = 1) {
    if (!currentImage) return;
    targetCtx.clearRect(0, 0, targetCtx.canvas.width, targetCtx.canvas.height);

    const logicalDims = getLogicalDimensions();
    const canvasWidth = logicalDims.width * scale;
    const canvasHeight = logicalDims.height * scale;
    targetCtx.canvas.width = canvasWidth;
    targetCtx.canvas.height = canvasHeight;

    const textPlacement = document.querySelector('input[name="textPlacement"]:checked').value;
    const backgroundType = document.querySelector('input[name="backgroundType"]:checked').value;
    const padding = parseInt(paddingSlider.value);
    const scaledPadding = padding * scale;
    const baseFontSize = parseInt(fontSizeSlider.value) * scale;
    const metrics = getTextBlockMetrics(targetCtx, baseFontSize);
    const MIN_MARGIN = 15 * scale;

    // --- 背景描画 ---
    if (textPlacement === 'margin') {
        if (backgroundType === 'blur') {
            const blurAmount = parseInt(blurSlider.value);
            targetCtx.save();
            targetCtx.filter = `blur(${blurAmount}px)`;
            targetCtx.drawImage(currentImage, -scaledPadding, -scaledPadding, canvasWidth + scaledPadding * 2, canvasHeight + scaledPadding * 2);
            targetCtx.restore();
            const blackness = parseInt(blacknessSlider.value) / 100;
            if (blackness > 0) {
                targetCtx.globalAlpha = blackness;
                targetCtx.fillStyle = 'black';
                targetCtx.fillRect(0, 0, canvasWidth, canvasHeight);
                targetCtx.globalAlpha = 1.0;
            }
        } else { // solid
            const solidColor = document.querySelector('input[name="bgColor"]:checked')?.value || bgColorPicker.value;
            targetCtx.fillStyle = solidColor;
            targetCtx.fillRect(0, 0, canvasWidth, canvasHeight);
        }
    }

    // --- 画像描画 ---
    const textAlign = textAlignSelect.value;
    const isRightLayout = textPlacement === 'margin' && textAlign === 'right';
    
    const imgContainerWidth = isRightLayout ? canvasWidth - metrics.maxWidth - 2 * Math.max(scaledPadding, MIN_MARGIN) - MIN_MARGIN : canvasWidth - 2 * scaledPadding;
    const imgContainerHeight = isRightLayout ? canvasHeight - 2 * scaledPadding : canvasHeight - 2 * scaledPadding - metrics.height - MIN_MARGIN;
    const drawRects = calculateDrawRects(imgContainerWidth, imgContainerHeight);
    
    const imgDx = scaledPadding + drawRects.dx;
    const imgDy = scaledPadding + drawRects.dy;

    const radius = parseInt(borderRadiusSlider.value) * scale;
    const shadow = parseInt(shadowSlider.value) * scale;
    if (shadow > 0 && textPlacement === 'margin') {
        targetCtx.save();
        targetCtx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        targetCtx.shadowBlur = shadow;
        targetCtx.shadowOffsetY = shadow / 2;
        drawRoundedRect(targetCtx, imgDx, imgDy, drawRects.dw, drawRects.dh, radius);
        targetCtx.fillStyle = 'white';
        targetCtx.fill();
        targetCtx.restore();
    }
    
    targetCtx.save();
    drawRoundedRect(targetCtx, imgDx, imgDy, drawRects.dw, drawRects.dh, radius);
    targetCtx.clip();
    targetCtx.drawImage(currentImage, drawRects.sx, drawRects.sy, drawRects.sw, drawRects.sh, imgDx, imgDy, drawRects.dw, drawRects.dh);
    targetCtx.restore();

    // --- テキスト描画 ---
    const textShadow = textShadowCheck.checked;
    if (textShadow) {
        targetCtx.shadowColor = 'rgba(0, 0, 0, 0.7)';
        targetCtx.shadowBlur = 10 * scale;
        targetCtx.shadowOffsetX = 2 * scale;
        targetCtx.shadowOffsetY = 2 * scale;
    }

    const solidBgValue = document.querySelector('input[name="bgColor"]:checked')?.value || bgColorPicker.value;
    const isDarkBg = textPlacement === 'margin' && backgroundType === 'solid' && (solidBgValue === '#000000' || parseInt(solidBgValue.substring(1, 3), 16) < 128);
    let textColor = (textPlacement === 'margin') ? (isDarkBg ? '#eee' : '#333') : '#fff';
    if (textPlacement === 'margin' && backgroundType === 'blur') textColor = '#fff';

    if (textPlacement === 'margin') {
        if (isRightLayout) {
            const modelText = cameraModelInput.value;
            const settingsItems = [focalLengthInput.value, shutterSpeedInput.value, fValueInput.value, `ISO ${isoInput.value}`].filter(Boolean);
            const locationText = locationInput.value;
            const textBlockX = imgDx + drawRects.dw + Math.max(scaledPadding, MIN_MARGIN);

            targetCtx.font = `bold ${baseFontSize}px sans-serif`;
            targetCtx.fillStyle = textColor;
            targetCtx.textAlign = 'left';
            targetCtx.textBaseline = 'middle';
            targetCtx.fillText(modelText, textBlockX, canvasHeight / 2);

            let otherInfoY = canvasHeight - Math.max(scaledPadding, MIN_MARGIN);
            targetCtx.textBaseline = 'bottom';
            targetCtx.globalAlpha = 0.75;
            
            if (locationText) {
                targetCtx.font = `${baseFontSize * 0.65}px sans-serif`;
                targetCtx.fillText(locationText, textBlockX, otherInfoY);
                otherInfoY -= (baseFontSize * 0.65) * 1.5; // 行間を広げる
            }

            targetCtx.font = `${baseFontSize * 0.75}px sans-serif`;
            for (let i = settingsItems.length - 1; i >= 0; i--) {
                targetCtx.fillText(settingsItems[i], textBlockX, otherInfoY);
                otherInfoY -= (baseFontSize * 0.75) * 1.5; // 行間を広げる
            }
            targetCtx.globalAlpha = 1.0;
        } else { // 中央レイアウト
            const textY = imgDy + drawRects.dh + (canvasHeight - (imgDy + drawRects.dh)) / 2;
            const modelText = cameraModelInput.value;
            const settingsText = [focalLengthInput.value, shutterSpeedInput.value, fValueInput.value, `ISO ${isoInput.value}`].filter(Boolean).join('   ');
            const locationText = locationInput.value;
            let currentY = textY - metrics.height / 2;
            targetCtx.textBaseline = 'top';
            targetCtx.textAlign = 'center';
            
            targetCtx.font = `bold ${baseFontSize}px sans-serif`;
            targetCtx.fillStyle = textColor;
            targetCtx.fillText(modelText, canvasWidth / 2, currentY);
            currentY += baseFontSize;

            targetCtx.globalAlpha = 0.75;
            targetCtx.font = `${baseFontSize * 0.75}px sans-serif`;
            targetCtx.fillText(settingsText, canvasWidth / 2, currentY);
            currentY += (baseFontSize * 0.75);
            
            if (locationText) {
                currentY += (baseFontSize * 0.5);
                targetCtx.font = `${baseFontSize * 0.65}px sans-serif`;
                targetCtx.fillText(locationText, canvasWidth / 2, currentY);
            }
            targetCtx.globalAlpha = 1.0;
        }
    } else { // 画像内テキスト
        let textX, align;
        const textAlign = textAlignSelect.value;
        const imgContainer = { x: imgDx, y: imgDy, w: drawRects.dw, h: drawRects.dh };
        if (textAlign === 'left') {
            textX = imgContainer.x + baseFontSize;
            align = 'left';
        } else if (textAlign === 'right') {
            textX = imgContainer.x + imgContainer.w - baseFontSize;
            align = 'right';
        } else {
            textX = imgContainer.x + imgContainer.w / 2;
            align = 'center';
        }
        
        targetCtx.textAlign = align;
        targetCtx.textBaseline = 'bottom';
        let currentY = imgContainer.y + imgContainer.h - baseFontSize;
        
        const settingsText = [focalLengthInput.value, shutterSpeedInput.value, fValueInput.value, `ISO ${isoInput.value}`].filter(Boolean).join('   ');
        const modelText = cameraModelInput.value;
        const locationText = locationInput.value;

        targetCtx.globalAlpha = 0.75;
        if (locationText) {
            targetCtx.font = `${baseFontSize * 0.65}px sans-serif`;
            targetCtx.fillStyle = textColor;
            targetCtx.fillText(locationText, textX, currentY);
            currentY -= (baseFontSize * 0.65) + (baseFontSize * 0.2);
        }
        targetCtx.font = `${baseFontSize * 0.75}px sans-serif`;
        targetCtx.fillStyle = textColor;
        targetCtx.fillText(settingsText, textX, currentY);
        currentY -= (baseFontSize * 0.75) + (baseFontSize * 0.2);
        
        targetCtx.globalAlpha = 1.0;
        targetCtx.font = `bold ${baseFontSize}px sans-serif`;
        targetCtx.fillStyle = textColor;
        targetCtx.fillText(modelText, textX, currentY);
    }
    targetCtx.shadowColor = 'transparent';

    if (targetCtx === ctx) {
        const logicalDims = getLogicalDimensions();
        previewWidthSpan.textContent = logicalDims.width;
        previewHeightSpan.textContent = logicalDims.height;
    }
}

function getLogicalDimensions() {
    if (!currentImage) return { width: 0, height: 0, aspectRatio: 1 };
    
    const textPlacement = document.querySelector('input[name="textPlacement"]:checked').value;
    const padding = parseInt(paddingSlider.value);
    const baseFontSize = parseInt(fontSizeSlider.value);
    const MIN_MARGIN = 15;
    
    const cropFit = document.querySelector('input[name="cropFit"]:checked').value;
    const targetAspectRatio = aspectRatioSelector.value === 'auto' ? null : parseFloat(aspectRatioSelector.value);

    let imgW = currentImage.width;
    let imgH = currentImage.height;

    if(textPlacement === 'image' && targetAspectRatio) {
        const imgAspectRatio = imgW / imgH;
        if(cropFit === 'crop'){
            if (imgAspectRatio > targetAspectRatio) {
                imgW = imgH * targetAspectRatio;
            } else {
                imgH = imgW / targetAspectRatio;
            }
        }
    }
    
    let width, height;

    if (textPlacement === 'margin') {
        const metrics = getTextBlockMetrics(ctx, baseFontSize);
        const textAlign = textAlignSelect.value;
        if (textAlign === 'right') {
            const textBlockWidth = metrics.maxWidth + 2 * MIN_MARGIN;
            width = 2 * padding + imgW + textBlockWidth;
            height = 2 * padding + Math.max(imgH, metrics.height);
        } else {
            const infoAreaHeight = metrics.height + MIN_MARGIN;
            width = imgW + 2 * padding;
            height = imgH + 2 * padding + infoAreaHeight;
        }
    } else {
        width = imgW;
        height = imgH;
    }

    if(targetAspectRatio) {
        const finalAspectRatio = width / height;
        if(cropFit === 'fit'){
            if(finalAspectRatio > targetAspectRatio){
                height = width / targetAspectRatio;
            } else {
                width = height * targetAspectRatio;
            }
        } else { // crop
            width = imgW;
            height = imgH;
        }
    }

    return { width: Math.round(width), height: Math.round(height), aspectRatio: width / height };
}

function downloadImage() {
    const width = parseInt(outputWidthInput.value);
    const height = parseInt(outputHeightInput.value);
    if (!width || !height || !currentImage) {
        alert("画像が選択されていないか、解像度が無効です。");
        return;
    }

    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    
    const logicalDims = getLogicalDimensions();
    const scale = width / logicalDims.width;

    drawCanvas(tempCtx, scale);

    const format = formatSelector.value;
    const mimeType = `image/${format}`;
    const dataUrl = tempCanvas.toDataURL(mimeType, 0.95);
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `watermarked_${Date.now()}.${format}`;
    link.click();
}
