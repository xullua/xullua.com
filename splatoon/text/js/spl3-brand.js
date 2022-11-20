fetch("data/brand.json")
    .then(function (response) {
        return response.json();
    })
    .then(function (brand) {
        let placeholder = document.querySelector("#data-output");
        let out = "";
        for (let b of brand) {
            out += `
			<div class="area">
				<div class="top">
					<img src='${b.img}'>
                    <h3>${b.name}</h3>
				</div>
                <div class="info">
                    <div class="box">
                        <p>付きやすいギア</p>
                        <img src='${b.compatibleimg}'>
                        <h4>${b.compatible}</h4>
                    </div>
                    <div class="box">
                        <p>付きにくいギア</p>
                        <img src='${b.incompatibleimg}'>
                        <h4>${b.incompatible}</h4>
                    </div>
                </div>
            </div>
		`;
        }

        placeholder.innerHTML = out;
    });


//
(async () => {
    const Data = await (await fetch("data/brand.json")).json();
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
            if (Info.compatible.includes(text)) {
                Info.compatible = Highlight(Info.compatible, text);
                matched = true;
            }
            if (Info.incompatible.includes(text)) {
                Info.incompatible = Highlight(Info.incompatible, text);
                matched = true;
            }
            if (matched) Matched.push(Info);
            else Others.push(Info);
        }
        Matched.forEach(x => Out.appendChild(MakeElement(x)));
        Others.forEach(x => Out.appendChild(MakeElement(x)));
    }

    function MakeElement(b) {
        const result = document.createElement("div");
        result.className = "area";
        result.innerHTML = `\
        <div class="top">
        <img src='${b.img}'>
        <h3>${b.name}</h3>
    </div>
    <div class="info">
        <div class="box">
            <p>付きやすいギア</p>
            <img src='${b.compatibleimg}'>
            <h4>${b.compatible}</h4>
        </div>
        <div class="box">
            <p>付きにくいギア</p>
            <img src='${b.incompatibleimg}'>
            <h4>${b.incompatible}</h4>
        </div>
    </div>`
        return result;
    }

    document.getElementById("search").oninput = e => Search(e.target.value);
})();