document.addEventListener('DOMContentLoaded', () => {

    const usersContainer = document.getElementById('users-container');
    const addUserBtn = document.getElementById('add-user-btn');
    const calculateBtn = document.getElementById('calculate-btn');
    const resetBtn = document.getElementById('reset-btn');
    const resultSection = document.getElementById('result-section');
    const totalAmountDisplay = document.getElementById('total-amount-display');
    const settlementDisplay = document.getElementById('settlement-display');
    const saveImageBtn = document.getElementById('save-image-btn');

    let users = [];
    let nextUserId = 1;

    /**
     * renderUsers
     */
    const renderUsers = () => {
        usersContainer.innerHTML = '';
        if (users.length === 0) {
            usersContainer.innerHTML = '<p>参加者を追加してください。</p>';
            return;
        }

        users.forEach((user, index) => {
            const userElement = document.createElement('div');
            userElement.className = 'user-entry';
            userElement.innerHTML = `
                <div class="entry-row">
                    <input type="text" value="${user.name}" oninput="updateUser(${user.id}, 'name', this.value)" placeholder="ユーザー${index + 1}" style="flex-grow: 1;">
                    <button class="btn btn-danger" onclick="deleteUser(${user.id})">削除</button>
                </div>
                <div class="entry-under">
                    <div class="amount-group">
                        <label>立替額：</label>
                        <input type="number" value="${user.amount}" oninput="updateUser(${user.id}, 'amount', this.valueAsNumber)" placeholder="0">
                    </div>
                    <div class="amount-group">
                        <label>控除額：</label>
                        <input type="number" value="${user.deduction}" oninput="updateUser(${user.id}, 'deduction', this.valueAsNumber)" placeholder="0">
                    </div>
                </div>
            `;
            usersContainer.appendChild(userElement);
        });
    };

    /**
     * updateUser
     */
    window.updateUser = (id, key, value) => {
        const user = users.find(u => u.id === id);
        if (user) {
            if (key === 'name') {
                user[key] = value;
            } else {
                user[key] = isNaN(value) || value < 0 ? 0 : value;
            }
            saveData();
        }
    };

    /**
     * addUser
     */
    const addUser = () => {
        const newUser = {
            id: nextUserId++,
            name: '',
            amount: 0,
            deduction: 0
        };
        users.push(newUser);
        renderUsers();
        saveData();
    };

    /**
     * deleteUser
     */
    window.deleteUser = (id) => {
        if (confirm('この参加者を削除しますか？')) {
            users = users.filter(user => user.id !== id);
            renderUsers();
            saveData();
        }
    };
    
    /**
     * saveData
     */
    const saveData = () => {
        localStorage.setItem('warikanUsers', JSON.stringify(users));
        localStorage.setItem('warikanNextUserId', nextUserId);
    };

    /**
     * loadData
     */
    const loadData = () => {
        const savedUsers = localStorage.getItem('warikanUsers');
        const savedNextUserId = localStorage.getItem('warikanNextUserId');
        if (savedUsers) users = JSON.parse(savedUsers);
        if (savedNextUserId) nextUserId = parseInt(savedNextUserId, 10);
    };
    
    /**
     * resetData
     */
    const resetData = () => {
        if (confirm('全ての入力内容をリセットします。よろしいですか？')) {
            localStorage.clear();
            location.reload(); 
        }
    };

    /**
     * calculateAndShowResult
     */
    const calculateAndShowResult = () => {
        if (users.length < 2) {
            alert('参加者は2人以上必要です。');
            return;
        }

        const totalAmount = users.reduce((sum, u) => sum + u.amount, 0);
        const totalDeductions = users.reduce((sum, u) => sum + u.deduction, 0);

        if (totalAmount < totalDeductions) {
            alert('控除額の合計が、支払額の合計を超えています。');
            return;
        }

        // ↓↓↓ 新しい計算ロジック ↓↓↓
        const commonAmount = totalAmount - totalDeductions;
        const commonShare = commonAmount / users.length;
        
        const usersWithNoDeduction = users.filter(u => u.deduction === 0).length;
        const deductionShare = usersWithNoDeduction > 0 ? totalDeductions / usersWithNoDeduction : 0;
        
        const balances = users.map((user, index) => {
            const finalShare = user.deduction > 0 
                ? commonShare 
                : commonShare + deductionShare;
            return {
                id: user.id,
                name: user.name.trim() || `ユーザー${index + 1}`,
                amount: user.amount,
                balance: user.amount - finalShare,
                deduction: user.deduction,
                finalShare: finalShare
            };
        });
        // ↑↑↑ ここまでが変更箇所 ↑↑↑
        
        const idToNameMap = Object.fromEntries(balances.map(u => [u.id, u.name]));

        const creditors = balances.filter(u => u.balance > 0).sort((a, b) => b.balance - a.balance);
        const debtors = balances.filter(u => u.balance < 0).sort((a, b) => a.balance - b.balance);
        const settlements = [];

        while (creditors.length > 0 && debtors.length > 0) {
            const creditor = creditors[0];
            const debtor = debtors[0];
            const transferAmount = Math.min(creditor.balance, -debtor.balance);

            settlements.push({
                fromId: debtor.id,
                toId: creditor.id,
                amount: Math.round(transferAmount)
            });

            creditor.balance -= transferAmount;
            debtor.balance += transferAmount;

            if (creditor.balance < 0.01) creditors.shift();
            if (Math.abs(debtor.balance) < 0.01) debtors.shift();
        }

        totalAmountDisplay.innerText = `合計金額: ${totalAmount.toLocaleString()}円`;
        
        const userSummaries = {};
        balances.forEach(b => {
            userSummaries[b.id] = { 
                name: b.name,
                payments: [], 
                receipts: [],
                prepaid: b.amount,
                deduction: b.deduction, 
                finalShare: b.finalShare
            };
        });

        settlements.forEach(s => {
            userSummaries[s.fromId].payments.push({ to: idToNameMap[s.toId], amount: s.amount });
            userSummaries[s.toId].receipts.push({ from: idToNameMap[s.fromId], amount: s.amount });
        });

        settlementDisplay.innerHTML = '';
        for (const id in userSummaries) {
            const summary = userSummaries[id];
            const totalPayments = summary.payments.reduce((sum, p) => sum + p.amount, 0);
            const totalReceipts = summary.receipts.reduce((sum, r) => sum + r.amount, 0);

            let transactionDetailsHtml = '';
            summary.payments.forEach(p => {
                transactionDetailsHtml += `<p><strong>${p.to}</strong>へ ${p.amount.toLocaleString()}円 支払い</p>`;
            });
            summary.receipts.forEach(r => {
                transactionDetailsHtml += `<p><strong>${r.from}</strong>から ${r.amount.toLocaleString()}円 受け取り</p>`;
            });
            if (transactionDetailsHtml === '') {
                transactionDetailsHtml = '<p>精算の必要はありません。</p>';
            }

            const cardHtml = `
                <div class="settlement-card">
                    <div class="user-name">${summary.name}</div>
                    <div class="summary-line">
                        <div>
                           <span>立替額：${summary.prepaid.toLocaleString()}円</span>
                           <span>控除額：${summary.deduction.toLocaleString()}円</span>
                        </div>
                        <div>
                             <span>支払い合計：${totalPayments.toLocaleString()}円</span>
                             <span>受け取り合計：${totalReceipts.toLocaleString()}円</span>
                        </div>
                        <div>
                             <span>最終的な負担額：${Math.round(summary.finalShare).toLocaleString()}円</span>
                        </div>
                    </div>
                    <div class="transaction-details">
                        ${transactionDetailsHtml}
                    </div>
                </div>
            `;
            settlementDisplay.innerHTML += cardHtml;
        }
        
        resultSection.style.display = 'block';
        resultSection.scrollIntoView({ behavior: 'smooth' });
    };

    /**
     * saveAsImage
     */
    const saveAsImage = () => {
        const totalClone = totalAmountDisplay.cloneNode(true);
        const settlementClone = settlementDisplay.cloneNode(true);

        const imageContainer = document.createElement('div');
        
        imageContainer.style.width = '720px';
        imageContainer.style.padding = '30px';
        imageContainer.style.backgroundColor = 'var(--secondback, white)';
        imageContainer.style.fontFamily = 'sans-serif';
        imageContainer.style.color = 'var(--maintext, black)';
        imageContainer.style.boxSizing = 'border-box';

        const titleEl = document.createElement('h2');
        titleEl.innerText = '割り勘計算結果';
        titleEl.style.textAlign = 'center';
        titleEl.style.color = 'var(--maintext, black)';
        titleEl.style.borderBottom = '2px solid var(--themecolor, #1c7eff)';
        titleEl.style.paddingBottom = '15px';
        titleEl.style.marginBottom = '25px';

        const footerEl = document.createElement('div');
        footerEl.innerHTML = `
            <p style="margin: 0; font-size: 0.9em;">xullua.comで作成</p>
            <p style="margin: 5px 0 0 0; font-size: 0.8em; color: var(--subtext, #555);">xla.jp/warikan</p>
        `;
        footerEl.style.textAlign = 'center';
        footerEl.style.marginTop = '30px';
        footerEl.style.paddingTop = '15px';

        imageContainer.appendChild(titleEl);
        imageContainer.appendChild(totalClone);
        imageContainer.appendChild(settlementClone);
        imageContainer.appendChild(footerEl);

        imageContainer.style.position = 'absolute';
        imageContainer.style.left = '-9999px';
        document.body.appendChild(imageContainer);

        html2canvas(imageContainer, {
            scale: 2,
            useCORS: true,
            backgroundColor: null
        }).then(canvas => {
            const a = document.createElement('a');
            a.href = canvas.toDataURL('image/png');
            a.download = 'warikan-result.png';
            a.click();
            document.body.removeChild(imageContainer);
        }).catch(err => {
            console.error("画像生成に失敗しました:", err);
            document.body.removeChild(imageContainer);
        });
    };

    addUserBtn.addEventListener('click', addUser);
    calculateBtn.addEventListener('click', calculateAndShowResult);
    resetBtn.addEventListener('click', resetData);
    saveImageBtn.addEventListener('click', saveAsImage);

    loadData();
    if (users.length === 0) addUser();
    else renderUsers();
});