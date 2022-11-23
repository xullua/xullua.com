fetch("data/gear.json")
    .then(function (response) {
        return response.json();
    })
    .then(function (gear) {
        let placeholder = document.querySelector("#data-output");
        let out = "";
        for (let g of gear) {
            out += `
			<div class="area">
				<div class="top">
					<img src='${g.img}'>
				</div>
                <div class="info">
                    <h3>${g.id}</h3>
                    <p>${g.explain}</p>
                    <p style="color: #aca900; font-size: 12px;">${g.effect}</p>
                </div>
            </div>
		`;
        }

        placeholder.innerHTML = out;
    });


//
(async () => {
    const Data = await (await fetch("data/gear.json")).json();
    const Out = document.querySelector("#data-output");

    const Highlight = (source, text) => source.replace(text, `<span style="color: var(--main-text); background-color: #fb07; border-radius: 5px;">${text}</span>`)

    function Search(text) {
        [...Out.children].forEach(x => Out.removeChild(x));
        const Matched = [];
        const Others = [];
        for (const Info of Data.map(x => JSON.parse(JSON.stringify(x)))) {
            let matched = false;
            if (Info.id.includes(text)) {
                Info.id = Highlight(Info.id, text);
                matched = true;
            }
            if (Info.explain.includes(text)) {
                Info.explain = Highlight(Info.explain, text);
                matched = true;
            }
            if (Info.effect.includes(text)) {
                Info.effect = Highlight(Info.effect, text);
                matched = true;
            }
            if (matched) Matched.push(Info);
            else Others.push(Info);
        }
        Matched.forEach(x => Out.appendChild(MakeElement(x)));
        Others.forEach(x => Out.appendChild(MakeElement(x)));
    }

    function MakeElement(Info) {
        const result = document.createElement("div");
        result.className = "area";
        result.innerHTML = `\
        <div class="top">
					<img src='${Info.img}'>
				</div>
                <div class="info">
                    <h3>${Info.id}</h3>
                    <p>${Info.explain}</p>
                    <p style="color: #aca900; font-size: 12px;">${Info.effect}</p>
                </div>`
        return result;
    }

    document.getElementById("search").oninput = e => Search(e.target.value);
})();