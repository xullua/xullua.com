fetch("blog.json")
    .then(function (response) {
        return response.json();
    })
    .then(function (blogs) {
        let placeholder = document.querySelector("#output");
        let out = "";
        for (let blog of blogs) {
            out += `
			<div class="blogbox">
                <a href="${blog.url}">
                    <img src="${blog.img}">
                    <h3>${blog.title}</h3>
                </a>
            </div>
		`;
        }

        placeholder.innerHTML = out;
    });


//
(async () => {
    const Data = await (await fetch("blog.json")).json();
    const Out = document.querySelector("#output");

    const Highlight = (source, text) => source.replace(text, `<span style="background-color: #fb07; border-radius: 5px;">${text}</span>`)

    function Search(text) {
        [...Out.children].forEach(x => Out.removeChild(x));
        const Matched = [];
        const Others = [];
        for (const Info of Data.map(x => JSON.parse(JSON.stringify(x)))) {
            let matched = false;
            if (Info.title.includes(text)) {
                Info.title = Highlight(Info.title, text);
                matched = true;
            }
            if (matched) Matched.push(Info);
            else Others.push(Info);
        }
        Matched.forEach(x => Out.appendChild(MakeElement(x)));
        Others.forEach(x => Out.appendChild(MakeElement(x)));
    }

    function MakeElement(blog) {
        const result = document.createElement("div");
        result.className = "blogbox";
        result.innerHTML = `\
        <a href="${blog.url}">
                    <img src="${blog.img}">
                    <h3>${blog.title}</h3>
                </a>`
        return result;
    }

    document.getElementById("search").oninput = e => Search(e.target.value);
})();