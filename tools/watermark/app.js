document.addEventListener('DOMContentLoaded', () => {

    const imageLoader = document.getElementById('imageLoader');
    const fileDropArea = document.querySelector('.file-drop-area');
    const previewCanvas = document.getElementById('previewCanvas');
    const ctx = previewCanvas.getContext('2d');
    const downloadBtn = document.getElementById('downloadBtn');
    const allSettingInputs = document.querySelectorAll('.settings-panel input, .settings-panel select');
    const aspectRatioSelector = document.getElementById('aspectRatioSelector');
    const cropFitInputs = document.querySelectorAll('input[name="cropFit"]');
    const cropFitOptions = document.getElementById('crop-fit-options');
    const textPlacementInputs = document.querySelectorAll('input[name="textPlacement"]');
    const textAlignInput = document.getElementById('textAlign');
    const fontSizeInput = document.getElementById('fontSize');
    const textShadowInput = document.getElementById('textShadow');
    const paddingInput = document.getElementById('padding');
    const backgroundTypeInputs = document.querySelectorAll('input[name="backgroundType"]');
    const bgBlurOptions = document.getElementById('bg-blur-options');
    const bgSolidOptions = document.getElementById('bg-solid-options');
    const blurInput = document.getElementById('blur-d2');
    const blacknessInput = document.getElementById('blackness-d2');
    const bgColorInputs = document.querySelectorAll('input[name="bgColor"]');
    const bgColorPicker = document.getElementById('bgColorPicker');
    const borderRadiusInput = document.getElementById('borderRadius');
    const shadowInput = document.getElementById('shadow');
    const cameraModelInput = document.getElementById('cameraModel');
    const focalLengthInput = document.getElementById('focalLength');
    const shutterSpeedInput = document.getElementById('shutterSpeed');
    const fValueInput = document.getElementById('fValue');
    const isoInput = document.getElementById('iso');
    const locationInput = document.getElementById('location');
    const outputFormatInput = document.getElementById('outputFormat');
    const outputWidthInput = document.getElementById('outputWidth');
    const outputHeightInput = document.getElementById('outputHeight');
    const aspectLockInput = document.getElementById('aspectLock');
    const previewWidthSpan = document.getElementById('previewWidth');
    const previewHeightSpan = document.getElementById('previewHeight');
    const frameSettings = document.getElementById('frame-settings');
    const presetList = document.getElementById('preset-list');
    const openSavePresetModalBtn = document.getElementById('openSavePresetModalBtn');
    const savePresetModal = document.getElementById('savePresetModal');
    const savePresetNameInput = document.getElementById('savePresetNameInput');
    const savePresetConfirmBtn = document.getElementById('savePresetConfirmBtn');
    const savePresetCancelBtn = document.getElementById('savePresetCancelBtn');
    const renameModal = document.getElementById('renameModal');
    const renameInput = document.getElementById('renameInput');
    const renameConfirmBtn = document.getElementById('renameConfirmBtn');
    const renameCancelBtn = document.getElementById('renameCancelBtn');
    const resetFineTuneBtn = document.getElementById('resetFineTuneBtn');
    const fineTuneInputs = {
        photoOffsetX: document.getElementById('photoOffsetX'), photoOffsetY: document.getElementById('photoOffsetY'), photoScale: document.getElementById('photoScale'),
        modelOffsetX: document.getElementById('modelOffsetX'), modelOffsetY: document.getElementById('modelOffsetY'), modelScale: document.getElementById('modelScale'),
        exifOffsetX: document.getElementById('exifOffsetX'), exifOffsetY: document.getElementById('exifOffsetY'), exifScale: document.getElementById('exifScale'),
    };
    const fineTuneValueInputs = {
        photoOffsetX: document.getElementById('photoOffsetXValue'), photoOffsetY: document.getElementById('photoOffsetYValue'), photoScale: document.getElementById('photoScaleValue'),
        modelOffsetX: document.getElementById('modelOffsetXValue'), modelOffsetY: document.getElementById('modelOffsetYValue'), modelScale: document.getElementById('modelScaleValue'),
        exifOffsetX: document.getElementById('exifOffsetXValue'), exifOffsetY: document.getElementById('exifOffsetYValue'), exifScale: document.getElementById('exifScaleValue'),
    };

    let sourceImage = new Image();
    sourceImage.averageLuminance = 128;
    let currentBgColor = '#ffffff';
    let presets = [];
    let renamingPresetId = null;

    function getFineTuneValues() {
        return {
            photo: { x: parseInt(fineTuneInputs.photoOffsetX.value), y: parseInt(fineTuneInputs.photoOffsetY.value), scale: parseInt(fineTuneInputs.photoScale.value) },
            model: { x: parseInt(fineTuneInputs.modelOffsetX.value), y: parseInt(fineTuneInputs.modelOffsetY.value), scale: parseInt(fineTuneInputs.modelScale.value) },
            exif: { x: parseInt(fineTuneInputs.exifOffsetX.value), y: parseInt(fineTuneInputs.exifOffsetY.value), scale: parseInt(fineTuneInputs.exifScale.value) }
        };
    }
    function updateFineTuneValueDisplays() {
        for (const key in fineTuneInputs) {
            fineTuneValueInputs[key].value = fineTuneInputs[key].value;
        }
    }

    function redrawCanvas() {
        if (!sourceImage.src) return;
        const placement = document.querySelector('input[name="textPlacement"]:checked').value;
        const align = textAlignInput.value;
        const targetAspectRatio = parseFloat(aspectRatioSelector.value);
        const cropFitMode = document.querySelector('input[name="cropFit"]:checked').value;

        if (isNaN(targetAspectRatio)) {
            cropFitOptions.style.display = 'none';
        } else {
            cropFitOptions.style.display = 'block';
        }

        const isFitWithAspectRatio = !isNaN(targetAspectRatio) && cropFitMode === 'fit';
        if (placement === 'margin' || (placement === 'image' && isFitWithAspectRatio)) {
            frameSettings.style.display = 'block';
        } else {
            frameSettings.style.display = 'none';
        }

        if (placement === 'margin') {
            if (align === 'center') {
                drawWithCenterMarginLayout(targetAspectRatio);
            } else if (align === 'right') {
                drawWithRightMarginLayout(targetAspectRatio);
            } else {
                drawWithCenterMarginLayout(targetAspectRatio);
            }
        } else {
            drawImageOnlyLayout(targetAspectRatio);
        }

        if (document.activeElement !== outputWidthInput && document.activeElement !== outputHeightInput) {
            updateOutputResolution(previewCanvas.width, previewCanvas.height);
        }
    }

    function drawImageOnlyLayout(targetAspectRatio = NaN) {
        let canvasWidth, canvasHeight;
        if (isNaN(targetAspectRatio)) {
            canvasWidth = sourceImage.naturalWidth;
            canvasHeight = sourceImage.naturalHeight;
        } else {
            const sourceRatio = sourceImage.naturalWidth / sourceImage.naturalHeight;
            if (sourceRatio > targetAspectRatio) {
                canvasWidth = sourceImage.naturalWidth;
                canvasHeight = canvasWidth / targetAspectRatio;
            } else {
                canvasHeight = sourceImage.naturalHeight;
                canvasWidth = canvasHeight * targetAspectRatio;
            }
        }
        previewCanvas.width = canvasWidth;
        previewCanvas.height = canvasHeight;

        const imageArea = { x: 0, y: 0, width: canvasWidth, height: canvasHeight };
        const drawParams = calculateImageDrawParams(imageArea);
        const cropFitMode = document.querySelector('input[name="cropFit"]:checked').value;
        const isFitMode = !isNaN(targetAspectRatio) && cropFitMode === 'fit';

        drawBackground();
        drawImageWithEffects(drawParams, !isFitMode);

        const fontSize = parseInt(fontSizeInput.value, 10);
        const modelText = cameraModelInput.value;
        const exifLine = [focalLengthInput.value, shutterSpeedInput.value, fValueInput.value, isoInput.value ? `ISO ${isoInput.value}` : ''].filter(Boolean).join('  ');
        const locationText = locationInput.value;
        const textLines = [{ text: modelText, isModel: true }, { text: exifLine, isModel: false }, { text: locationText, isModel: false }].filter(line => line.text);

        const align = textAlignInput.value;
        const padding = Math.round(drawParams.dWidth * 0.025);
        let x;
        if (align === 'left') x = drawParams.dx + padding;
        else if (align === 'center') x = drawParams.dx + drawParams.dWidth / 2;
        else x = drawParams.dx + drawParams.dWidth - padding;

        let currentY = drawParams.dy + drawParams.dHeight - padding;
        setupTextShadow();
        ctx.textAlign = align;
        for (let i = textLines.length - 1; i >= 0; i--) {
            const line = textLines[i];
            const isModel = line.isModel;
            const ft = isModel ? getFineTuneValues().model : getFineTuneValues().exif;
            const size = (isModel ? Math.round(fontSize * 1.1) : fontSize) * (ft.scale / 100);

            ctx.font = `${isModel ? 'bold ' : ''}${size}px sans-serif`;
            ctx.fillStyle = `rgba(255, 255, 255, ${isModel ? 1.0 : 0.75})`;
            ctx.fillText(line.text, x + ft.x, currentY + ft.y);
            currentY -= (size + Math.round(padding * 0.3));
        }
        updateResolutionDisplay(canvasWidth, canvasHeight);
    }

    function drawWithCenterMarginLayout(targetAspectRatio = NaN) {
        const globalPadding = parseInt(paddingInput.value, 10);
        const fontSize = parseInt(fontSizeInput.value, 10);
        const lineSpacing = Math.round(fontSize * 0.5);
        const modelText = cameraModelInput.value;
        const exifLine = [focalLengthInput.value, shutterSpeedInput.value, fValueInput.value, isoInput.value ? `ISO ${isoInput.value}` : ''].filter(Boolean).join('  ');
        const locationText = locationInput.value;

        const ftModel = getFineTuneValues().model;
        const ftExif = getFineTuneValues().exif;

        const modelSize = Math.round(fontSize * 1.1) * (ftModel.scale / 100);
        const exifSize = fontSize * (ftExif.scale / 100);

        const textLines = [{ text: modelText, size: modelSize, isModel: true }, { text: exifLine, size: exifSize, isModel: false }, { text: locationText, size: exifSize, isModel: false }].filter(line => line.text);
        let textBlockHeight = 0;
        if (textLines.length > 0) {
            textBlockHeight = textLines.reduce((sum, line) => sum + line.size, 0) + (textLines.length - 1) * lineSpacing;
        }

        const textIntrinsicPadding = (textBlockHeight > 0) ? Math.round(fontSize * 0.75) : 0;
        let canvasWidth, canvasHeight, imageArea;

        if (isNaN(targetAspectRatio)) {
            canvasWidth = sourceImage.naturalWidth + globalPadding * 2;
            canvasHeight = globalPadding + sourceImage.naturalHeight + (globalPadding / 2) + textIntrinsicPadding + textBlockHeight + textIntrinsicPadding + (globalPadding / 2);
            imageArea = { x: globalPadding, y: globalPadding, width: sourceImage.naturalWidth, height: sourceImage.naturalHeight };
        } else {
            const baseWidth = sourceImage.naturalWidth;
            canvasWidth = baseWidth + globalPadding * 2;
            canvasHeight = canvasWidth / targetAspectRatio;

            const requiredHeight = globalPadding + textBlockHeight + textIntrinsicPadding * 2 + (globalPadding / 2) * 2;

            imageArea = {
                x: globalPadding,
                y: globalPadding,
                width: canvasWidth - globalPadding * 2,
                height: canvasHeight - requiredHeight
            };
        }

        previewCanvas.width = canvasWidth;
        previewCanvas.height = canvasHeight;

        const drawParams = calculateImageDrawParams(imageArea);
        drawBackground();
        drawImageWithEffects(drawParams);

        if (textBlockHeight > 0) {
            const textColor = getTextColor();
            const x = canvasWidth / 2;
            ctx.textAlign = 'center';
            setupTextShadow();
            const textBlockTop = drawParams.dy + drawParams.dHeight + (globalPadding / 2) + textIntrinsicPadding;
            let currentY = textBlockTop;
            textLines.forEach(line => {
                const isModel = line.isModel;
                const ft = isModel ? ftModel : ftExif;
                ctx.font = `${isModel ? 'bold ' : ''}${line.size}px sans-serif`;
                ctx.fillStyle = `rgba(${textColor}, ${isModel ? 1.0 : 0.75})`;
                ctx.textBaseline = 'top';
                ctx.fillText(line.text, x + ft.x, currentY + ft.y);
                currentY += line.size + lineSpacing;
            });
        }
        updateResolutionDisplay(canvasWidth, canvasHeight);
    }

    function drawWithRightMarginLayout(targetAspectRatio = NaN) {
        const globalPadding = parseInt(paddingInput.value, 10);
        const fontSize = parseInt(fontSizeInput.value, 10);
        const lineSpacing = Math.round(fontSize * 0.5);
        const textHorizontalMargin = Math.round(fontSize * 2);
        const textAreaWidth = Math.round(fontSize * 12);
        const cropFitMode = document.querySelector('input[name="cropFit"]:checked').value;
        let canvasWidth, canvasHeight, drawParams, imageArea;

        if (isNaN(targetAspectRatio) || cropFitMode === 'crop') {
            const baseWidth = sourceImage.naturalWidth;
            const baseHeight = sourceImage.naturalHeight;
            canvasWidth = baseWidth + globalPadding * 2 + textHorizontalMargin + textAreaWidth;
            if (isNaN(targetAspectRatio)) {
                canvasHeight = baseHeight + globalPadding * 2;
            } else {
                canvasHeight = canvasWidth / targetAspectRatio;
            }
            imageArea = { x: globalPadding, y: globalPadding, width: baseWidth, height: canvasHeight - globalPadding * 2 };
            drawParams = calculateImageDrawParams(imageArea);
        } else {
            const baseWidth = sourceImage.naturalWidth + textHorizontalMargin + textAreaWidth;
            const baseHeight = sourceImage.naturalHeight;
            const contentRatio = baseWidth / baseHeight;
            if (contentRatio > targetAspectRatio) {
                canvasWidth = baseWidth + globalPadding * 2;
                canvasHeight = canvasWidth / targetAspectRatio;
            } else {
                canvasHeight = baseHeight + globalPadding * 2;
                canvasWidth = canvasHeight * targetAspectRatio;
            }
            imageArea = {
                x: globalPadding,
                y: globalPadding,
                width: canvasWidth - globalPadding * 2 - textHorizontalMargin - textAreaWidth,
                height: canvasHeight - globalPadding * 2
            };
            drawParams = calculateImageDrawParams(imageArea);
            const totalContentWidth = drawParams.dWidth + textHorizontalMargin + textAreaWidth;
            const offsetX = (canvasWidth - totalContentWidth) / 2;
            drawParams.dx = offsetX;
        }

        previewCanvas.width = canvasWidth;
        previewCanvas.height = canvasHeight;
        drawBackground();
        drawImageWithEffects(drawParams);

        const modelText = cameraModelInput.value;
        const exifLines = [focalLengthInput.value, shutterSpeedInput.value, fValueInput.value, isoInput.value ? `ISO ${isoInput.value}` : '', locationInput.value].filter(Boolean);
        const textColor = getTextColor();
        setupTextShadow();
        ctx.textAlign = 'left';

        const ftModel = getFineTuneValues().model;
        const ftExif = getFineTuneValues().exif;
        const modelSize = Math.round(fontSize * 1.1) * (ftModel.scale / 100);
        const exifSize = fontSize * (ftExif.scale / 100);

        const textX = drawParams.dx + drawParams.dWidth + textHorizontalMargin;

        ctx.font = `bold ${modelSize}px sans-serif`;
        ctx.fillStyle = `rgba(${textColor}, 1.0)`;
        ctx.textBaseline = 'middle';
        ctx.fillText(modelText, textX + ftModel.x, (drawParams.dy + drawParams.dHeight / 2) + ftModel.y);

        const imageBottom = drawParams.dy + drawParams.dHeight;
        let currentY = imageBottom;

        const needsMinMargin = globalPadding === 0 && (isNaN(targetAspectRatio) || cropFitMode !== 'fit');
        if (needsMinMargin) {
            currentY = Math.min(imageBottom, canvasHeight - fontSize);
        }

        ctx.font = `${exifSize}px sans-serif`;
        ctx.fillStyle = `rgba(${textColor}, 0.75)`;
        ctx.textBaseline = 'bottom';
        for (let i = exifLines.length - 1; i >= 0; i--) {
            ctx.fillText(exifLines[i], textX + ftExif.x, currentY + ftExif.y);
            currentY -= (exifSize + lineSpacing);
        }
        updateResolutionDisplay(canvasWidth, canvasHeight);
    }

    function drawImageWithEffects(params, forceZeroRadius = false) {
        const radius = forceZeroRadius ? 0 : parseInt(borderRadiusInput.value, 10);
        const shadowPower = parseInt(shadowInput.value, 10);
        const shadowOpacity = Math.pow(shadowPower / 100, 2);
        const ft = getFineTuneValues().photo;
        const scale = ft.scale / 100;

        const dWidth = params.dWidth * scale;
        const dHeight = params.dHeight * scale;
        const dx = params.dx + ft.x + (params.dWidth - dWidth) / 2;
        const dy = params.dy + ft.y + (params.dHeight - dHeight) / 2;

        ctx.save();

        ctx.beginPath();
        ctx.moveTo(dx + radius, dy);
        ctx.arcTo(dx + dWidth, dy, dx + dWidth, dy + dHeight, radius);
        ctx.arcTo(dx + dWidth, dy + dHeight, dx, dy + dHeight, radius);
        ctx.arcTo(dx, dy + dHeight, dx, dy, radius);
        ctx.arcTo(dx, dy, dx + dWidth, dy, radius);
        ctx.closePath();

        if (shadowOpacity > 0) {
            ctx.shadowColor = `rgba(0, 0, 0, ${shadowOpacity * 0.7})`;
            ctx.shadowBlur = 10 + (shadowPower * 0.5);
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
            ctx.fill();
        }

        ctx.clip();

        ctx.drawImage(sourceImage, params.sx, params.sy, params.sWidth, params.sHeight, dx, dy, dWidth, dHeight);

        ctx.restore();
    }

    function updateBackgroundOptionsVisibility() {
        const selectedType = document.querySelector('input[name="backgroundType"]:checked').value;
        if (selectedType === 'blur') {
            bgBlurOptions.style.display = 'block';
            bgSolidOptions.style.display = 'none';
        } else {
            bgBlurOptions.style.display = 'none';
            bgSolidOptions.style.display = 'block';
        }
    }

    function calculateImageDrawParams(imageArea, forceMode = null) {
        const cropFitMode = forceMode || document.querySelector('input[name="cropFit"]:checked').value;
        const sourceRatio = sourceImage.naturalWidth / sourceImage.naturalHeight;
        const targetRatio = imageArea.width / imageArea.height;
        let sx = 0, sy = 0, sWidth = sourceImage.naturalWidth, sHeight = sourceImage.naturalHeight;
        let dx = imageArea.x, dy = imageArea.y, dWidth = imageArea.width, dHeight = imageArea.height;
        if (cropFitMode === 'crop') {
            if (sourceRatio > targetRatio) {
                sWidth = sourceImage.naturalHeight * targetRatio;
                sx = (sourceImage.naturalWidth - sWidth) / 2;
            } else {
                sHeight = sourceImage.naturalWidth / targetRatio;
                sy = (sourceImage.naturalHeight - sHeight) / 2;
            }
        } else {
            if (sourceRatio > targetRatio) {
                dHeight = imageArea.width / sourceRatio;
                dy = imageArea.y + (imageArea.height - dHeight) / 2;
            } else {
                dWidth = imageArea.height * sourceRatio;
                dx = imageArea.x + (imageArea.width - dWidth) / 2;
            }
        }
        return { sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight };
    }
    function drawBackground() {
        const bgType = document.querySelector('input[name="backgroundType"]:checked').value;
        ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);

        if (bgType === 'blur') {
            const blurValue = parseInt(blurInput.value, 10);
            const blacknessValue = parseInt(blacknessInput.value, 10) / 100;

            if (blurValue > 0 && sourceImage.src) {
                const tempCanvas = document.createElement('canvas');
                const tempCtx = tempCanvas.getContext('2d');
                tempCanvas.width = previewCanvas.width;
                tempCanvas.height = previewCanvas.height;

                tempCtx.filter = `blur(${blurValue}px)`;

                const margin = blurValue * 2;

                tempCtx.drawImage(sourceImage, -margin, -margin, tempCanvas.width + margin * 2, tempCanvas.height + margin * 2);

                ctx.drawImage(tempCanvas, 0, 0);

            } else if (sourceImage.src) {
                ctx.drawImage(sourceImage, 0, 0, previewCanvas.width, previewCanvas.height);
            }

            if (blacknessValue > 0) {
                ctx.fillStyle = `rgba(0, 0, 0, ${blacknessValue})`;
                ctx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);
            }
        } else {
            ctx.fillStyle = currentBgColor;
            ctx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);
        }
    }
    function getTextColor() {
        const bgType = document.querySelector('input[name="backgroundType"]:checked').value;
        let luminance;
        if (bgType === 'blur') {
            const blackness = parseInt(blacknessInput.value, 10) / 100;
            luminance = sourceImage.averageLuminance * (1 - blackness);
        } else {
            const r = parseInt(currentBgColor.substr(1, 2), 16);
            const g = parseInt(currentBgColor.substr(3, 2), 16);
            const b = parseInt(currentBgColor.substr(5, 2), 16);
            luminance = (r * 0.299 + g * 0.587 + b * 0.114);
        }
        return (luminance >= 128) ? '0,0,0' : '255,255,255';
    }
    function setupTextShadow() {
        if (textShadowInput.checked) {
            const placement = document.querySelector('input[name="textPlacement"]:checked').value;
            const isMarginLayout = placement === 'margin';
            const shadowColor = isMarginLayout ? 'rgba(0, 0, 0, 0.25)' : 'rgba(0, 0, 0, 0.7)';
            ctx.shadowColor = shadowColor;
            ctx.shadowBlur = 5;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;
        } else {
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
        }
    }
    function updateResolutionDisplay(width, height) {
        previewWidthSpan.textContent = Math.round(width);
        previewHeightSpan.textContent = Math.round(height);
    }
    function handleImageFile(file) {
        previewCanvas.width = 600;
        previewCanvas.height = 400;
        ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#555';
        ctx.font = '20px sans-serif';
        ctx.fillText('ロード中...', previewCanvas.width / 2, previewCanvas.height / 2);

        const reader = new FileReader();
        reader.onload = e => {
            sourceImage.onload = () => {
                calculateAverageLuminance();
                extractExifAndDraw();
            };
            sourceImage.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
    function calculateAverageLuminance() {
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        const size = 50;
        tempCanvas.width = size;
        tempCanvas.height = size;
        tempCtx.drawImage(sourceImage, 0, 0, size, size);
        const imageData = tempCtx.getImageData(0, 0, size, size).data;
        let totalLuminance = 0;
        for (let i = 0; i < imageData.length; i += 4) {
            const r = imageData[i];
            const g = imageData[i + 1];
            const b = imageData[i + 2];
            totalLuminance += (r * 0.299 + g * 0.587 + b * 0.114);
        }
        sourceImage.averageLuminance = totalLuminance / (size * size);
    }
    function extractExifAndDraw() {
        EXIF.getData(sourceImage, function() {
            cameraModelInput.value = EXIF.getTag(this, "Model") || '';
            
            const focalLength = EXIF.getTag(this, "FocalLength");
            if (focalLength) {
                const formattedFocalLength = parseFloat(focalLength).toFixed(1);
                focalLengthInput.value = `${formattedFocalLength.replace(/\.0$/, '')}mm`;
            } else {
                focalLengthInput.value = '';
            }

            const exposureTime = EXIF.getTag(this, "ExposureTime");
            if (exposureTime) {
                shutterSpeedInput.value = exposureTime < 1 
                    ? `1/${Math.round(1 / exposureTime)}s`
                    : `${exposureTime.toString()}s`;
            } else {
                shutterSpeedInput.value = '';
            }

            const fNumber = EXIF.getTag(this, "FNumber");
            if (fNumber) {
                const formattedFNumber = parseFloat(fNumber).toFixed(1);
                fValueInput.value = `f/${formattedFNumber}`;
            } else {
                fValueInput.value = '';
            }

            isoInput.value = EXIF.getTag(this, "ISOSpeedRatings") || '';
            locationInput.value = '';

            redrawCanvas();
        });
    }
    function updateOutputResolution(newWidth, newHeight) {
        if (!aspectLockInput.checked) return;
        outputWidthInput.value = Math.round(newWidth);
        outputHeightInput.value = Math.round(newHeight);
    }
    function downloadImage() {
        if (!sourceImage.src) {
            alert("最初に画像をアップロードしてください。");
            return;
        }
        downloadBtn.textContent = "ダウンロード中...";
        downloadBtn.disabled = true;
        const outputWidth = parseInt(outputWidthInput.value, 10);
        const outputHeight = parseInt(outputHeightInput.value, 10);
        if (isNaN(outputWidth) || isNaN(outputHeight) || outputWidth <= 0 || outputHeight <= 0) {
            alert("有効な出力解像度を指定してください。");
            downloadBtn.textContent = "画像をダウンロード";
            downloadBtn.disabled = false;
            return;
        }
        const downloadCanvas = document.createElement('canvas');
        downloadCanvas.width = outputWidth;
        downloadCanvas.height = outputHeight;
        const downloadCtx = downloadCanvas.getContext('2d');
        downloadCtx.drawImage(previewCanvas, 0, 0, outputWidth, outputHeight);
        const format = outputFormatInput.value;
        const mimeType = `image/${format}`;
        const filename = `${(cameraModelInput.value || 'image').replace(/\s+/g, '_')}_watermarked.${format}`;
        downloadCanvas.toBlob(blob => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            downloadBtn.textContent = "画像をダウンロード";
            downloadBtn.disabled = false;
        }, mimeType, 0.95);
    }
    function saveSettings() {
        const settings = {};
        allSettingInputs.forEach(input => {
            if (input.type === 'radio') {
                if (input.checked) {
                    settings[input.name] = input.value;
                }
            } else if (input.type === 'checkbox') {
                settings[input.id] = input.checked;
            } else {
                settings[input.id] = input.value;
            }
        });
        localStorage.setItem('exifGeneratorSettings', JSON.stringify(settings));
    }
    function loadSettings(settingsObj) {
        const settings = settingsObj || JSON.parse(localStorage.getItem('exifGeneratorSettings'));
        if (settings) {
            allSettingInputs.forEach(input => {
                const key = input.id || input.name;
                if (settings[key] !== undefined) {
                    if (input.type === 'radio') {
                        if (input.value === settings[key]) {
                            input.checked = true;
                        }
                    } else if (input.type === 'checkbox') {
                        input.checked = settings[key];
                    } else {
                        input.value = settings[key];
                    }
                }
            });
            if (settings.bgColor) {
                currentBgColor = settings.bgColor;
                bgColorPicker.value = settings.bgColor;
            }
        }
        updateFineTuneValueDisplays();
    }
    function getPresets() {
        return JSON.parse(localStorage.getItem('exifGeneratorPresets')) || [];
    }
    function savePresets(newPresets) {
        presets = newPresets.slice(0, 10);
        localStorage.setItem('exifGeneratorPresets', JSON.stringify(presets));
        renderPresets();
    }
    function renderPresets() {
        presetList.innerHTML = '';
        presets.forEach(preset => {
            const item = document.createElement('div');
            item.className = 'preset-item';
            item.innerHTML = `
                <span data-id="${preset.id}">${preset.name}</span>
                <div class="actions">
                    <button class="menu-btn"><i class="fa-solid fa-ellipsis-vertical"></i></button>
                    <div class="preset-menu">
                        <button class="rename" data-id="${preset.id}"><i class="fa-solid fa-pen"></i> 名前の変更</button>
                        <button class="delete" data-id="${preset.id}"><i class="fa-solid fa-trash"></i> 削除</button>
                    </div>
                </div>
            `;
            presetList.appendChild(item);
        });
    }

    function setupEventListeners() {
        fileDropArea.addEventListener('click', () => imageLoader.click());
        imageLoader.addEventListener('change', e => e.target.files.length > 0 && handleImageFile(e.target.files[0]));
        fileDropArea.addEventListener('dragover', e => { e.preventDefault(); fileDropArea.style.borderColor = 'var(--themecolor)'; });
        fileDropArea.addEventListener('dragleave', () => { fileDropArea.style.borderColor = 'var(--sixthback)'; });
        fileDropArea.addEventListener('drop', e => {
            e.preventDefault();
            fileDropArea.style.borderColor = 'var(--sixthback)';
            e.dataTransfer.files.length > 0 && handleImageFile(e.dataTransfer.files[0]);
        });

        const redrawRequiredInputs = Array.from(allSettingInputs).filter(input =>
            !['outputWidth', 'outputHeight', 'aspectLock', 'presetNameInput'].includes(input.id)
        );
        redrawRequiredInputs.forEach(input => {
            const eventType = ['range', 'text', 'color', 'number'].includes(input.type) ? 'input' : 'change';
            input.addEventListener(eventType, () => {
                if (input.id === 'bgColorPicker') currentBgColor = input.value;
                if (input.name === 'bgColor') currentBgColor = document.querySelector('input[name="bgColor"]:checked').value;
                if (Object.values(fineTuneInputs).includes(input) || Object.values(fineTuneValueInputs).includes(input)) {
                    if (input.type === 'range') fineTuneValueInputs[input.id].value = input.value;
                    else fineTuneInputs[input.id.replace('Value', '')].value = input.value;
                }
                redrawCanvas();
                saveSettings();
            });
        });

        const saveOnlyInputs = [outputWidthInput, outputHeightInput, aspectLockInput];
        saveOnlyInputs.forEach(input => input.addEventListener('change', saveSettings));
        backgroundTypeInputs.forEach(input => input.addEventListener('change', updateBackgroundOptionsVisibility));

        let lastChangedByUserInput = null;
        outputWidthInput.addEventListener('focus', () => lastChangedByUserInput = 'width');
        outputHeightInput.addEventListener('focus', () => lastChangedByUserInput = 'height');
        [outputWidthInput, outputHeightInput].forEach(input => {
            input.addEventListener('input', () => {
                if (!aspectLockInput.checked || !lastChangedByUserInput) return;
                const aspectRatio = previewCanvas.width / previewCanvas.height;
                if (isNaN(aspectRatio) || aspectRatio === 0) return;
                if (input.id === 'outputWidth' && lastChangedByUserInput === 'width') {
                    const newWidth = parseInt(outputWidthInput.value, 10);
                    if (!isNaN(newWidth)) outputHeightInput.value = Math.round(newWidth / aspectRatio);
                } else if (input.id === 'outputHeight' && lastChangedByUserInput === 'height') {
                    const newHeight = parseInt(outputHeightInput.value, 10);
                    if (!isNaN(newHeight)) outputWidthInput.value = Math.round(newHeight * aspectRatio);
                }
                saveSettings();
            });
        });
        downloadBtn.addEventListener('click', downloadImage);

        openSavePresetModalBtn.addEventListener('click', () => {
            savePresetNameInput.value = '';
            savePresetModal.style.display = 'flex';
        });
        savePresetConfirmBtn.addEventListener('click', () => {
            const name = savePresetNameInput.value.trim();
            if (!name) {
                alert('プリセット名を入力してください。');
                return;
            }
            const settings = JSON.parse(localStorage.getItem('exifGeneratorSettings'));
            const newPreset = { id: Date.now(), name, settings };
            savePresets([newPreset, ...presets]);
            savePresetModal.style.display = 'none';
        });
        savePresetCancelBtn.addEventListener('click', () => savePresetModal.style.display = 'none');

        presetList.addEventListener('click', e => {
            const target = e.target;
            const item = target.closest('.preset-item');
            if (!item) return;
            const id = item.querySelector('span').dataset.id;

            if (target.tagName === 'SPAN') {
                const preset = presets.find(p => p.id == id);
                if (preset) {
                    loadSettings(preset.settings);
                    redrawCanvas();
                }
            } else if (target.closest('.menu-btn')) {
                const menu = item.querySelector('.preset-menu');
                menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
            } else if (target.closest('.rename')) {
                renamingPresetId = id;
                const preset = presets.find(p => p.id == id);
                renameInput.value = preset.name;
                renameModal.style.display = 'flex';
            } else if (target.closest('.delete')) {
                if (confirm('このプリセットを削除しますか？')) {
                    savePresets(presets.filter(p => p.id != id));
                }
            }
        });

        renameConfirmBtn.addEventListener('click', () => {
            const newName = renameInput.value.trim();
            if (newName && renamingPresetId) {
                const newPresets = presets.map(p => p.id == renamingPresetId ? { ...p, name: newName } : p);
                savePresets(newPresets);
            }
            renameModal.style.display = 'none';
        });
        renameCancelBtn.addEventListener('click', () => renameModal.style.display = 'none');

        resetFineTuneBtn.addEventListener('click', () => {
            Object.values(fineTuneInputs).forEach(input => input.value = input.id.includes('Scale') ? 100 : 0);
            updateFineTuneValueDisplays();
            redrawCanvas();
            saveSettings();
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.actions')) {
                document.querySelectorAll('.preset-menu').forEach(menu => menu.style.display = 'none');
            }
        });
    }

    presets = getPresets();
    renderPresets();
    loadSettings();
    setupEventListeners();
    updateBackgroundOptionsVisibility();
    redrawCanvas();
});
