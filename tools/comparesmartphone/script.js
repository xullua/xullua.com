document.addEventListener('DOMContentLoaded', () => {
    fetch('iphones.json')
        .then(response => response.json())
        .then(data => {
            populateSelects(data);
            document.getElementById('phone1').selectedIndex = 0;
            document.getElementById('phone2').selectedIndex = 1;
            document.getElementById('phone3').selectedIndex = 2;
            comparePhones();
        });

    document.getElementById('phone1').addEventListener('change', comparePhones);
    document.getElementById('phone2').addEventListener('change', comparePhones);
    document.getElementById('phone3').addEventListener('change', comparePhones);
});

function populateSelects(data) {
    const phones = Object.keys(data);

    const selectIds = ['phone1', 'phone2', 'phone3'];
    selectIds.forEach(selectId => {
        const select = document.getElementById(selectId);
        let groups = {};

        phones.forEach(key => {
            const company = data[key].name.companyname;
            if (!groups[company]) {
                groups[company] = document.createElement('optgroup');
                groups[company].label = company;
            }
            const option = document.createElement('option');
            option.value = key;
            option.textContent = `${data[key].name.modelbrand} ${data[key].name.modelnumber}`;
            groups[company].appendChild(option);
        });

        for (const group in groups) {
            select.appendChild(groups[group]);
        }
    });
}

function comparePhones() {
    const phone1Key = document.getElementById('phone1').value;
    const phone2Key = document.getElementById('phone2').value;
    const phone3Key = document.getElementById('phone3').value;

    fetch('iphones.json')
        .then(response => response.json())
        .then(data => {
            const phone1 = data[phone1Key];
            const phone2 = data[phone2Key];
            const phone3 = data[phone3Key];

            document.getElementById('phone1-details').innerHTML = generatePhoneHtml(phone1);
            document.getElementById('phone2-details').innerHTML = generatePhoneHtml(phone2);
            document.getElementById('phone3-details').innerHTML = generatePhoneHtml(phone3);

            adjustHeight();
            adjustZoomRatioHeight();
        });
}

function generatePhoneHtml(phone) {
    return `
        <div class="icon">
            <img src="${phone.name.icon}" alt="${phone.name.modelnumber}">
        </div>
        <div class="name">
            <p class="companyname">${phone.name.companyname}</p>
            <p><span class="modelbrand">${phone.name.modelbrand}</span> <span class="modelnumber">${phone.name.modelnumber}</span></p>
        </div>
        <div class="display">
            <p class="displaysize">${phone.display.displaysize}"</p>
            <p class="displayname">${phone.display.displayname}</p>
            <p class="displayrefreshrate">${phone.display.displayrefreshrate}Hz</p>
            <p class="displaybrightness">${phone.display.displaybrightness}nits</p>
        </div>
        <div class="chip">
            <p class="socbrand">${phone.chip.socbrand}</p>
            <p class="socname">${phone.chip.socname}</p>
        </div>
        <div class="camera">
            <p class="camerabrand">${phone.camera.camerabrand}</p>
            <div class="zoomratio">
                <p>${phone.camera.maximumfocallength}x</p>
                <div class="in">
                    ${Object.values(phone.camera.zoomratio).map(ratio => `
                        <div class="${ratio.type}">
                            <p class="camerazoomratio">${ratio.ratio}x</p>
                            ${ratio.type === 'sensor' ? `
                            <div class="sensordetails">
                                <p class="sensorsize">${ratio.sensorsize}</p>
                                <p class="focallength">${ratio.focallength}mm</p>
                                <p class="resolution">${ratio.resolution}MP</p>
                            </div>` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
        <div class="charge">
            ${phone.charge.wattege ? `<p class="wattage">${phone.charge.wattege}w</p>` : ''}
            ${phone.charge.original.name ? `<p class="originalcharge"><span class="name">${phone.charge.original.name}</span> <span class="wattage">${phone.charge.original.wattage}W</span></p>` : ''}
            ${phone.charge.powerdelivery.name ? `<p class="powerdelivery"><span class="name">${phone.charge.powerdelivery.name}</span> <span class="wattage">${phone.charge.powerdelivery.wattage}W</span></p>` : ''}
            ${phone.charge.qi.name ? `<p class="qi"><span class="name">${phone.charge.qi.name}</span> <span class="wattage">${phone.charge.qi.wattage}W</span></p>` : ''}
        </div>
        <div class="weight">
            <p class="bodyweight">${phone.weight.bodyweight}g</p>
        </div>
    `;
}

function adjustHeight() {
    const phoneDetails = document.querySelectorAll('.phone-details');
    const maxHeights = [];

    phoneDetails.forEach(phone => {
        const children = phone.children;
        for (let i = 0; i < children.length; i++) {
            if (!maxHeights[i] || children[i].offsetHeight > maxHeights[i]) {
                maxHeights[i] = children[i].offsetHeight;
            }
        }
    });

    phoneDetails.forEach(phone => {
        const children = phone.children;
        for (let i = 0; i < children.length; i++) {
            children[i].style.height = `${maxHeights[i]}px`;
        }
    });
}

function adjustZoomRatioHeight() {
    const zoomRatios = document.querySelectorAll('.zoomratio');
    zoomRatios.forEach(zoomRatio => {
        const maxFocalLength = parseInt(zoomRatio.querySelector('p').textContent);
        const newHeight = 400 + (maxFocalLength - 25) * 4;
        zoomRatio.style.height = `${Math.min(Math.max(newHeight, 350), 450)}px`;
    });
}
