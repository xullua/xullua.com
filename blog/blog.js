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


