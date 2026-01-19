document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('url-generator-form');
    const targetUrlInput = document.getElementById('target-url');
    const salesCodeInput = document.getElementById('sales-code');
    const campaignCodeInput = document.getElementById('campaign-code');
    const generateBtn = document.getElementById('generate-btn');
    const shareToolBtn = document.getElementById('share-tool-btn');
    const resultDisplay = document.getElementById('result-display');
    const historyList = document.getElementById('history-list');
    const clearHistoryBtn = document.getElementById('clear-history-btn');

    const HISTORY_KEY = 'urlGeneratorHistory';
    const SALES_CODE_KEY = 'savedSalesCode';
    const CAMPAIGN_CODE_KEY = 'savedCampaignCode';

    // 1. 頁面載入時：預填輸入框
    // 優先從 URL 查詢參數載入
    const initParams = new URLSearchParams(window.location.search);
    if (initParams.has('url')) {
        targetUrlInput.value = initParams.get('url');
    }
    if (initParams.has('sales_code')) {
        salesCodeInput.value = initParams.get('sales_code');
    }
    if (initParams.has('campaign_code')) {
        const campaignValue = initParams.get('campaign_code');
        if (campaignCodeInput.querySelector(`option[value="${campaignValue}"]`)) {
            campaignCodeInput.value = campaignValue;
        }
    }

    // 如果 URL 沒有提供，則從 localStorage 載入上次儲存的編號
    if (!salesCodeInput.value) {
        salesCodeInput.value = localStorage.getItem(SALES_CODE_KEY) || '';
    }
    const savedCampaign = localStorage.getItem(CAMPAIGN_CODE_KEY);
    if (savedCampaign && campaignCodeInput.querySelector(`option[value="${savedCampaign}"]`)) {
        campaignCodeInput.value = savedCampaign;
    }


    // 2. 載入並渲染歷史紀錄
    let history = JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];

    function renderHistory() {
        historyList.innerHTML = '';
        if (history.length === 0) {
            historyList.innerHTML = '<p class="empty-history">目前沒有歷史紀錄。</p>';
            clearHistoryBtn.style.display = 'none';
            return;
        }

        clearHistoryBtn.style.display = 'block';
        history.forEach((item, index) => {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            historyItem.innerHTML = `
                <div class="url">${escapeHTML(item)}</div>
                <div class="actions">
                    <button class="copy-history-btn" data-index="${index}">複製</button>
                </div>
            `;
            historyList.appendChild(historyItem);
        });
    }

    // 預設網址按鈕功能
    const STAFF_URL_PATTERNS = ['hamibook.tw/staff/', 'omia.tw/staff/'];
    const presetUrlBtns = document.querySelectorAll('.preset-url-btn');

    presetUrlBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const baseUrl = btn.dataset.url;
            const salesCode = salesCodeInput.value.trim();
            // 如果已有 sales_code，就補上
            targetUrlInput.value = baseUrl + salesCode;
        });
    });

    // 當 sales_code 變更時，如果網址是特定格式，自動更新
    salesCodeInput.addEventListener('input', () => {
        const currentUrl = targetUrlInput.value.trim();
        const salesCode = salesCodeInput.value.trim();

        for (const pattern of STAFF_URL_PATTERNS) {
            if (currentUrl.includes(pattern)) {
                // 取得 base URL (到 /staff/ 為止)
                const baseIndex = currentUrl.indexOf(pattern) + pattern.length;
                const baseUrl = currentUrl.substring(0, baseIndex);
                targetUrlInput.value = baseUrl + salesCode;
                break;
            }
        }
    });

    // 3. 表單提交事件 (產生推廣網址)
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        let targetUrl = targetUrlInput.value.trim();
        const salesCode = salesCodeInput.value.trim();
        const campaignCode = campaignCodeInput.value.trim();

        if (!targetUrl) {
            alert('請填寫要分享的網址！');
            return;
        }

        // 檢查是否為特定 staff 網址，需要補上 sales_code
        for (const pattern of STAFF_URL_PATTERNS) {
            if (targetUrl.includes(pattern)) {
                const baseIndex = targetUrl.indexOf(pattern) + pattern.length;
                const baseUrl = targetUrl.substring(0, baseIndex);
                // 確保 sales_code 有補上
                if (salesCode && !targetUrl.endsWith(salesCode)) {
                    targetUrl = baseUrl + salesCode;
                    targetUrlInput.value = targetUrl;
                }
                break;
            }
        }

        let url;
        try {
            url = new URL(targetUrl);
        } catch (error) {
            alert('請輸入有效的網址，包含 http:// 或 https://');
            return;
        }

        // 根據特定網址強制使用對應的 campaign_code
        let finalCampaignCode = campaignCode;
        if (targetUrl.includes('hamibook.tw/staff/')) {
            finalCampaignCode = '2026exhibition';
        } else if (targetUrl.includes('omia.tw/staff/')) {
            finalCampaignCode = 'omiaplus';
        }

        // 加入推廣參數
        if (salesCode) url.searchParams.set('sales_code', salesCode);
        if (finalCampaignCode) url.searchParams.set('campaign_code', finalCampaignCode);

        // 加入 UTM 參數
        url.searchParams.set('utm_source', 'staff');
        url.searchParams.set('utm_medium', 'share');
        if (finalCampaignCode) url.searchParams.set('utm_campaign', finalCampaignCode);
        if (salesCode) url.searchParams.set('utm_content', salesCode);

        const finalUrl = url.toString();

        navigator.clipboard.writeText(finalUrl).then(() => {
            updateButtonState(generateBtn, '已複製！');
            resultDisplay.innerHTML = `<p>${escapeHTML(finalUrl)}</p>`;
            localStorage.setItem(SALES_CODE_KEY, salesCode);
            localStorage.setItem(CAMPAIGN_CODE_KEY, campaignCode);
            addToHistory(finalUrl);
        }).catch(err => {
            console.error('複製失敗:', err);
            alert('複製失敗，請手動複製。');
            resultDisplay.innerHTML = `<p>${escapeHTML(finalUrl)}</p>`;
        });
    });

    // 4. 分享工具連結事件
    shareToolBtn.addEventListener('click', () => {
        const targetUrl = targetUrlInput.value.trim();
        const campaignCode = campaignCodeInput.value.trim();

        if (!targetUrl) {
            alert('請至少填寫要分享的網址！');
            return;
        }

        const toolUrl = new URL(window.location.href);
        toolUrl.search = ''; // 清空現有參數

        toolUrl.searchParams.set('url', targetUrl);
        if (campaignCode) {
            toolUrl.searchParams.set('campaign_code', campaignCode);
        }
        // 故意不設定 sales_code

        const finalShareableUrl = toolUrl.toString();

        navigator.clipboard.writeText(finalShareableUrl).then(() => {
            updateButtonState(shareToolBtn, '已複製！');
        }).catch(err => {
            console.error('複製分享連結失敗:', err);
            alert('複製失敗，請手動複製連結。');
        });
    });


    // 5. 歷史紀錄相關功能
    function addToHistory(url) {
        history = history.filter(item => item !== url);
        history.unshift(url);
        if (history.length > 20) history.pop();
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
        renderHistory();
    }

    clearHistoryBtn.addEventListener('click', () => {
        if (confirm('確定要清除所有歷史紀錄嗎？')) {
            history = [];
            localStorage.removeItem(HISTORY_KEY);
            renderHistory();
        }
    });

    historyList.addEventListener('click', (e) => {
        if (e.target.classList.contains('copy-history-btn')) {
            const button = e.target;
            const index = button.dataset.index;
            const urlToCopy = history[index];
            navigator.clipboard.writeText(urlToCopy).then(() => {
                const originalText = button.textContent;
                button.textContent = '已複製';
                setTimeout(() => {
                    button.textContent = originalText;
                }, 1500);
            });
        }
    });

    // 6. Helper functions
    function escapeHTML(str) {
        const p = document.createElement("p");
        p.appendChild(document.createTextNode(str));
        return p.innerHTML;
    }

    function updateButtonState(button, tempText) {
        const originalText = button.textContent;
        button.textContent = tempText;
        button.classList.add('copied');
        setTimeout(() => {
            button.textContent = originalText;
            button.classList.remove('copied');
        }, 2000);
    }

    // 初始渲染
    renderHistory();
});
