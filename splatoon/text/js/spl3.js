

fetch("data/mainweapon.json")
.then(function(response){
	return response.json();
})
.then(function(products){
	let placeholder = document.querySelector("#data-output");
	let out = "";
	for(let product of products){
		out += `
			<div class="area">
				<div class="top">
					<img src='${product.img}'>
					<div class="name">
						<p class="category">${product.category}</p>
						<h3>${product.id}</h3>
					</div>
				</div>
				<div class="info">
					<div class="box">
						<img src='${product.subimg}'>
						<div class="text">
							<p>サブウェポン</p>
							<h4>${product.sub}</h4>
						</div>
					</div>
					<div class="box">
						<img src='${product.specialimg}'>
						<div class="text">
							<p>スペシャルウェポン</p>
							<h4>${product.special}</h4>
						</div>
					</div>
					<div class="box">
						<div class="in">
							<div class="core">
								<p><b>射程 : </b>${product.range}</p>
								<p><b>ダメージ : </b>${product.damage}</p>
								<p><b>連射速度 : </b>${product.speed}</p>
								<p><b>スぺシャルP : </b>${product.specialpoint}</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		`;
	}

	placeholder.innerHTML = out;
});

//ヘッダースクロールの表示非表示
document.getElementById('header').classList.add('active')
$(function () {
    var hd_size = $('header').innerHeight();
    var pos = 0;
    $(window).on('scroll', function () {
        var current_pos = $(this).scrollTop();
        if (current_pos < pos || current_pos == 0) {
            document.getElementById('header').classList.add('active')
        } else {
            document.getElementById('header').classList.remove('active')
        }
        pos = current_pos;
    });
});