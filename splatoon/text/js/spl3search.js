(async () => {
    const Data = await (await fetch("https://xullua.com/splatoon/data/mainweapon.json")).json();
    const Out = document.querySelector("#data-output");

    const Highlight = (source, text) => source.replace(text, `<span style="background-color: #fb07; border-radius: 5px;">${text}</span>`)

    function Search(text) {
        [...Out.children].forEach(x => Out.removeChild(x));
        const Matched = [];
        const Others = [];
        for (const Info of Data.map(x => JSON.parse(JSON.stringify(x)))) {
            let matched = false;
            if (Info.name.includes(text)) {
                Info.name = Highlight(Info.name, text);
                matched = true;
            }
            if (Info.id.includes(text)) {
                Info.id = Highlight(Info.id, text);
                matched = true;
            }
            if (Info.special.includes(text)) {
                Info.special = Highlight(Info.special, text);
                matched = true;
            }
            if (Info.sub.includes(text)) {
                Info.sub = Highlight(Info.sub, text);
                matched = true;
            }
            if (Info.category.includes(text)) {
                Info.category = Highlight(Info.category, text);
                matched = true;
            }
            if (matched) Matched.push(Info);
            else Others.push(Info);
        }
        Matched.forEach(x => Out.appendChild(MakeElement(x)));
        Others.forEach(x => Out.appendChild(MakeElement(x)));
    }

    function MakeElement(info) {
        const result = document.createElement("div");
        result.className = "area";
        result.innerHTML = `\
    <div class="top">
        <img src="${info.img}">
        <div class="name">
            <p class="category">${info.category}</p>
            <h3>${info.id}</h3>
        </div>
    </div>
    <div class="info">
        <div class="box">
            <img src="${info.subimg}">
            <div class="text">
                <p>??????????????????</p>
                <h4>${info.sub}</h4>
            </div>
        </div>
        <div class="box">
            <img src="${info.specialimg}">
            <div class="text">
                <p>???????????????????????????</p>
                <h4>${info.special}</h4>
            </div>
        </div>
        <div class="box">
            <div class="in">
                <div class="core">
                    <p><b>?????? : </b>${info.range}</p>
                    <p><b>???????????? : </b>${info.damage}</p>
                    <p><b>???????????? : </b>${info.speed}</p>
                    <p><b>???????????????P : </b>${info.specialpoint}</p>
                </div>
            </div>
        </div>
    </div>`
        return result;
    }
    
    document.getElementById("search").oninput = e => Search(e.target.value);
})();

