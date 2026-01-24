const searchInput = document.getElementById('comparison-search');
const pageContainer = document.getElementById('comparison-page');
const resultsList = document.getElementById('results-list');

let schoolData = {};
let searchEngine;

const GUESSING = [
    "物理治療 職能治療 語言治療",
    "醫學系 牙醫 獸醫",
    "四大 光電 物理 材料",
    "成大 中央 太空 地科",
    "四中 師北海 電機 資工",
    "台大 政大 東吳 中正 法律",
    "頂大 經濟 財政 財務 金融",
    "四大 物理學 化學 化工 材料",
    "頂大 外文 日語 土耳其語",
    "教育大學 師範 幼兒 特殊教育"
]


// 儲存目前的過濾狀態
const filterState = {
    include: [], // 必須採計的科目
    exclude: []  // 不能採計的科目
};


let inputSuggestion = document.getElementById("input-suggesion");

async function loadData() {
    try {
        const response = await fetch('../datas/historical_result.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        schoolData = await response.json();
        searchEngine = await import("../js_utils/search_engine.js");
        searchEngine.flattenData(schoolData)
        
        const randomElement = GUESSING[Math.floor(Math.random() * GUESSING.length)];
        
        inputSuggestion.textContent = randomElement;
    } catch (error) {
        console.error("載入資料時發生錯誤:", error);
    }
}

inputSuggestion.addEventListener('click', e => {
    searchInput.value = inputSuggestion.textContent;
    searching(inputSuggestion.textContent);
})

searchInput.addEventListener('input', debounce((e) => {
    const query = e.target.value.trim();
    searching(query);
}, 200));

function searching(query) {
    if (query.length > 0) {
        // 🌟 觸發向上移動動畫
        pageContainer.classList.remove('initial-state');
        pageContainer.classList.add('active-state');
        
        // 執行搜尋邏輯 (複用之前的 searchDepartments 邏輯)
        const results = searchEngine.get_result(query); // 假設這是你的搜尋函數
        renderComparisonResults(results);
    } else {
        // 如果清空，回到中間
        pageContainer.classList.add('initial-state');
        pageContainer.classList.remove('active-state');
        resultsList.innerHTML = '';
    }
}

// --- 設定當前年份 ---
const CURRENT_YEAR = 115;
const TARGET_YEARS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2, CURRENT_YEAR - 3];

let allFilteredResults = []; // 儲存所有符合條件的結果
let currentIndex = 0;       // 目前加載到的進度
const BATCH_SIZE = 5;      // 每一批顯示幾個

function renderComparisonResults(results, append = false) {
    if (!append) {
        resultsList.innerHTML = '';
        currentIndex = 0;
        allFilteredResults = results; // 保存搜尋後的結果
    }
    
    let i = 0;

    const nextBatch = allFilteredResults.slice(currentIndex, currentIndex + BATCH_SIZE);

    for(const res of nextBatch) {
        
        const item = res.item;
        const row = document.createElement('div');
        row.classList.add('comparison-row');

        const currentData = schoolData[item.uni][item.dept][CURRENT_YEAR];

        // exclude filter
        if(filterState.exclude.some(k => (currentData["科目倍數"] != undefined && currentData["科目倍數"][k] !== undefined) || (currentData["學測標準"] != undefined && currentData["學測標準"][k] !== undefined))) 
            continue;
        
        // include filter
        if(!filterState.include.every(k => (currentData["科目倍數"] !== undefined && currentData["科目倍數"][k] !== undefined) || (currentData["學測標準"] !== undefined && currentData["學測標準"][k] !== undefined)))
            continue;

        // 準備 114, 113 的詳細輔助 HTML;
        
        let historyHtml = "";

        for(const data of schoolData[item.uni][item.dept][CURRENT_YEAR - 1]) {

            const weights = Object.entries(data.科目倍數)
                .map(([sub, w]) => `${sub} ${w}`).join(', ');
            historyHtml += `
                    <div class="history-block">
                        <div class="h-top-line">
                            ${ item.dept !== data["校系名稱"] ? `<span class="h-year">${data["校系名稱"]}</span>` : "" }
                            <span class="h-score">加權平均: ${data.一般考生錄取標準 || '--'} <small>(前${data.達標比例 || '--'}%)</small></span>
                            <span class="h-admitted">${data.錄取人數 || '--'}人</span>
                        </div>
                        <div class="h-weights">${weights}</div>
                    </div>
                `;
        }

        if(historyHtml.length === 0) {
            historyHtml += `<div class="history-block no-data">${year}年 無資料</div>`
        }

        row.innerHTML = `
            <div class="card-main">
            
                <form action="https://uac2.ncku.edu.tw/cross_search/index.php?c=search&m=detail" method="post">
                    <button name="dep_id" value=${currentData.id} type="submit" class="jump-link to-uac-button" title="考分會原始資料">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                            <polyline points="15 3 21 3 21 9"></polyline>
                            <line x1="10" y1="14" x2="21" y2="3"></line>
                        </svg>
                    </button>
                </form>

                <div class="dept-header">
                    <div class="titles">
                        <span class="uni-name">${item.uni}</span>
                        <span class="dept-name">${item.dept}</span>
                        <span class="h-admitted">核定 ${schoolData[item.uni][item.dept][CURRENT_YEAR].核定人數 || '--'} 人</span>
                    </div>
                </div>

                <div class="current-standards">
                    ${currentData ? formatCurrentYearDetails(currentData) : '<p class="no-data">尚未公佈 115 標準</p>'}
                </div>
            </div>

            <div class="card-history-section">
                <div class="history-grid-wrapper">
                    <span class="h-year">去年</span>
                    ${historyHtml}
                    <a href="../?school=${item.uni}&dept=${item.dept}" class="jump-link" title="查看詳細分析">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                            <polyline points="15 3 21 3 21 9"></polyline>
                            <line x1="10" y1="14" x2="21" y2="3"></line>
                        </svg>
                    </a>
                </div>
            </div>
        `;
        resultsList.appendChild(row);
    }

    currentIndex += BATCH_SIZE;
}

// 建立 Intersection Observer
const observer = new IntersectionObserver((entries) => {
    if (searchInput.value.length !== 0 && entries[0].isIntersecting && currentIndex < allFilteredResults.length) {
        console.log("Lazy Load: 加載下一批...");
        renderComparisonResults(allFilteredResults, true); // true 代表是附加進去
    }
}, { threshold: 0.1 });

observer.observe(document.getElementById('load-more-trigger'));

/**
 * 專門格式化「今年 (115)」細節的函數
 */
function formatCurrentYearDetails(data) {
    let html = '';

    // 學測標準 (門檻)
    if (data.學測標準) {
        const gsat = Object.entries(data.學測標準)
            .map(([sub, level]) => `<span class="gsat-pill"><strong>${sub}</strong> ${level}</span>`)
            .join('');
        html += `
            <div class="std-section">
                <label>學測門檻</label>
                <div class="pills-wrapper">${gsat || '無'}</div>
            </div>`;
    }

    // 科目倍數 (加權)
    if (data.科目倍數) {
        const weights = Object.entries(data.科目倍數)
            .map(([sub, w]) => `<span class="weight-pill">${sub} <span class="weight-strong">${w}</span></span>`)
            .join(`<span class="data-separator">|</span>`);
        html += `
            <div class="std-section">
                <label>分科加權</label>
                <div class="pills-wrapper">${weights}</div>
            </div>`;
    }

    return html;
}

const filterItems = document.querySelectorAll('.filter-item');

filterItems.forEach(item => {
    item.addEventListener('click', () => {
        const subject = item.dataset.subject;

        if (!item.classList.contains('include') && !item.classList.contains('exclude')) {
            // 狀態 0 -> 1: 變成必選
            item.classList.add('include');
            filterState.include.push(subject);
        } else if (item.classList.contains('include')) {
            // 狀態 1 -> 2: 變成排除
            item.classList.remove('include');
            item.classList.add('exclude');
            filterState.include = filterState.include.filter(s => s !== subject);
            filterState.exclude.push(subject);
        } else {
            // 狀態 2 -> 0: 回到中立
            item.classList.remove('exclude');
            filterState.exclude = filterState.exclude.filter(s => s !== subject);
        }
        if(searchInput.value.length !== 0)
            searching(searchInput.value);
    });
});

// 防抖函數
function debounce(func, delay = 50) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => func.apply(this, args), delay);
    };
}

document.addEventListener('DOMContentLoaded', loadData);