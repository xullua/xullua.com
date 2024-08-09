// bereal.jsonファイルを読み込む
fetch('bereal.json')
  .then(response => response.json())
  .then(data => {
    // 最新のデータを取得
    const latestData = data[0];

    // 日付のフォーマットを変更（2024/8/9 → 2024年8月9日）
    const formatDate = (dateStr) => {
      const dateParts = dateStr.split('/');
      return `${dateParts[0]}年${dateParts[1]}月${dateParts[2]}日`;
    };

    // 1つ目のセクションへの挿入処理
    const newestSection = document.querySelector('.newest');
    const newestStatus = document.getElementById('neweststatus');
    const newestDate = document.getElementById('newestdate');
    const newestGo = document.getElementById('newestgo');

    // screenrecordingが"ok"かどうかで表示を変える
    if (latestData.screenrecording === 'ok') {
      newestSection.classList.add('ok');
      newestSection.classList.remove('ng');
      newestStatus.textContent = '問題なし';
      newestGo.textContent = '行きません';
    } else {
      newestSection.classList.add('ng');
      newestSection.classList.remove('ok');
      newestStatus.textContent = '問題あり';
      newestGo.textContent = '行きます';
    }

    // 日付の表示を更新
    newestDate.textContent = formatDate(latestData.date);

    // 2つ目のセクションへの挿入処理
    const archivesSection = document.getElementById('archives');
    archivesSection.innerHTML = ''; // 既存のコンテンツをクリア

    // 全てのデータをループして表示
    let archivesHTML = '';
    data.forEach(entry => {
      const formattedDate = formatDate(entry.date);
      const className = entry.screenrecording === 'ok' ? 'ok' : 'ng';
      const notificationText = entry.screenrecording === 'ok' ? '通知なし' : '通知あり';

      // HTMLを文字列として構築
      archivesHTML += `
        <article class="${className}">
          <div class="left">
            <h3>${formattedDate}</h3>
            <p><span>${entry.version}</span><span>${entry.os}</span></p>
          </div>
          <div class="right">
            <h4><span>${notificationText}</span></h4>
          </div>
        </article>`;
    });

    // 構築したHTMLを挿入
    archivesSection.innerHTML = archivesHTML;
  })
  .catch(error => console.error('Error loading JSON:', error));
