document.addEventListener('DOMContentLoaded', () => {

    const CATEGORY_MAP = {
        'all': '全て',
        'pc-peripheral': 'PC周辺機器',
        'apple-product': 'Apple製品',
        'audio': 'オーディオ',
        'main-device': 'メイン',
        'room': '部屋',
        'usb-c': 'USB-C',
    };

    const deviceContainer = document.querySelector('.displaydevice');
    const filterContainer = document.querySelector('.search');

    let allDevices = [];

    async function initialize() {
        if (!deviceContainer || !filterContainer) {
            console.error('表示コンテナが見つかりません。');
            return;
        }

        try {
            const response = await fetch('js/devices.json');
            if (!response.ok) {
                throw new Error(`HTTPエラー: ステータス ${response.status}`);
            }
            allDevices = await response.json();

            const totalNumber = allDevices.length;

            const totalAmount = allDevices.reduce((sum, device) => {
                const priceAsNumber = parseInt(device.price, 10);

                if (!isNaN(priceAsNumber)) {
                    return sum + priceAsNumber;
                }

                return sum;
            }, 0);

            const numberElement = document.getElementById('numberofproducts');
            const amountElement = document.getElementById('totalamount');

            if (numberElement) {
                numberElement.textContent = totalNumber;
            }
            if (amountElement) {
                amountElement.textContent = totalAmount.toLocaleString();
            }

            if (allDevices.length > 0) {
                setupFilters();
                renderDevices(allDevices);
                setupViewTransitions();
            } else {
                deviceContainer.innerHTML = '<p>表示するデバイスがありません。</p>';
            }
        } catch (error) {
            console.error('デバイスの読み込みに失敗しました:', error);
            deviceContainer.innerHTML = '<p>デバイスの読み込み中にエラーが発生しました。</p>';
        }
    }

    function setupFilters() {
        const allCategories = new Set(allDevices.flatMap(device => device.sections));
        const categories = [...allCategories].sort();

        let filterHtml = `
            <input type="checkbox" name="filtercategory" id="filter-all" value="all" checked>
            <label for="filter-all">${CATEGORY_MAP['all']}</label>
        `;

        categories.forEach(categoryKey => {
            const displayName = CATEGORY_MAP[categoryKey] || categoryKey;

            filterHtml += `
                <input type="checkbox" name="filtercategory" id="filter-${categoryKey}" value="${categoryKey}">
                <label for="filter-${categoryKey}">${displayName}</label>
            `;
        });

        filterContainer.innerHTML = filterHtml;
        filterContainer.addEventListener('change', handleFilterChange);
    }

    function handleFilterChange(event) {
        const clickedCheckbox = event.target;
        const allCheckbox = document.getElementById('filter-all');

        if (clickedCheckbox.id === 'filter-all' && clickedCheckbox.checked) {
            document.querySelectorAll('.search input[type="checkbox"]:not(#filter-all)').forEach(cb => cb.checked = false);
        }
        else if (clickedCheckbox.id !== 'filter-all' && clickedCheckbox.checked) {
            allCheckbox.checked = false;
        }

        const checkedFilters = Array.from(document.querySelectorAll('.search input:checked')).map(cb => cb.value);

        if (checkedFilters.length === 0) {
            allCheckbox.checked = true;
            checkedFilters.push('all');
        }

        updateDeviceVisibility(checkedFilters);
    }

    function updateDeviceVisibility(filters) {
        const devicesInDom = document.querySelectorAll('.device');

        devicesInDom.forEach(deviceElement => {
            if (filters.includes('all')) {
                deviceElement.classList.remove('hidden');
                return;
            }

            const deviceCategories = deviceElement.dataset.sections.split(' ');
            const shouldShow = deviceCategories.some(cat => filters.includes(cat));

            if (shouldShow) {
                deviceElement.classList.remove('hidden');
            } else {
                deviceElement.classList.add('hidden');
            }
        });
    }

    function renderDevices(devices) {
        deviceContainer.innerHTML = devices.map(device => createDeviceHtml(device)).join('');
    }

    function createDeviceHtml(device) {
        const imageHtml = device.imageUrl ? `<img src="${device.imageUrl}" alt="${device.name}">` : '';
        const otherLinksHtml = device.links.other.map(link => `<a href="${link.url}" target="_blank" rel="noopener noreferrer">${link.title}</a>`).join('');

        const sectionsData = device.sections.join(' ');

        return `
            <div class="device" data-sections="${sectionsData}">
                <input type="checkbox" id="${device.id}" class="headerhidden">
                <label class="card-layout-${device.displaySize}" for="${device.id}">
                    ${imageHtml}
                    <div class="texts">
                        <div class="area1">
                            <p class="category">${device.category}</p>
                            <h3>${device.name}</h3>
                            <p class="explain">${device.description}</p>
                        </div>
                        <div class="area2">
                            <p class="price">¥${device.price.toLocaleString()}</p>
                        </div>
                        <div class="area3">
                            <a href="${device.links.amazon}" target="_blank" rel="noopener noreferrer">Amazon</a>
                        </div>
                    </div>
                </label>
                <article>
                    <label for="${device.id}"></label>
                    <div class="content">
                        ${imageHtml}
                        <div class="texts">
                            <div class="area1">
                                <p class="category">${device.category}</p>
                                <h3>${device.name}</h3>
                                <p class="explain">${device.description}</p>
                            </div>
                            <div class="area2">
                                <p class="price">¥${device.price.toLocaleString()}</p>
                            </div>
                            <div class="area3">
                                <div class="btns">
                                    <a href="${device.links.amazon}" target="_blank" rel="noopener noreferrer">Amazon</a>
                                    ${otherLinksHtml}
                                    <label for="${device.id}">閉じる</label>
                                </div>
                            </div>
                        </div>
                    </div>
                </article>
            </div>
        `;
    }

    function setupViewTransitions() {
        document.querySelectorAll('.device input[type="checkbox"].headerhidden').forEach(checkbox => {
            checkbox.addEventListener('click', async (event) => {
                if (!document.startViewTransition) return;
                event.preventDefault();
                const deviceElement = checkbox.closest('.device');
                if (!deviceElement) return;

                deviceElement.classList.add('is-transitioning');
                const transition = document.startViewTransition(() => {
                    checkbox.checked = !checkbox.checked;
                });
                try {
                    await transition.finished;
                } finally {
                    deviceElement.classList.remove('is-transitioning');
                }
            });
        });
    }

    initialize();
});