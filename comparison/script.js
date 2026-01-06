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

searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    searching(query);
});

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
const TARGET_YEARS = [CURRENT_YEAR - 3, CURRENT_YEAR - 2, CURRENT_YEAR - 1, CURRENT_YEAR];

function renderComparisonResults(results) {
    resultsList.innerHTML = '';
    
    results.slice(0, 100).forEach((res) => {
        const item = res.item;
        const row = document.createElement('div');
        row.classList.add('comparison-row');

        const currentData = schoolData[item.uni][item.dept][CURRENT_YEAR];
        
        // 準備 114, 113 的詳細輔助 HTML
        let historyYears = TARGET_YEARS.filter(y => y !== CURRENT_YEAR);
        if (window.innerWidth < 600) 
            historyYears = historyYears.reverse()
        const historyHtml = historyYears.map(year => {
            let yearData = schoolData[item.uni][item.dept][year];
            let data;
            if(year === Number.toString(CURRENT_YEAR))
                data = yearData;
            else if (yearData !== undefined) data = yearData[0];
            if(year !== Number.toString(CURRENT_YEAR) && yearData !== undefined && yearData.length > 1) {
                return `<div class="history-block no-data">${year}年 該科系尚未合併</div>`;
            }
            else if (data !== undefined) {
                
                // 格式化往年的科目倍數（小標籤）
                const weights = Object.entries(data.科目倍數)
                    .map(([sub, w]) => `${sub} ${w}`).join(', ');
                
                return `
                    <div class="history-block">
                        <div class="h-top-line">
                            <span class="h-year">${year}年</span>
                            <span class="h-admitted">${data.錄取人數 || '--'}人</span>
                            <span class="h-score">加權平均: ${data.一般考生錄取標準 || '--'} <small>(前${data.達標比例 || '--'}%)</small></span>
                        </div>
                        <div class="h-weights">${weights}</div>
                    </div>
                `;
            }
            return `<div class="history-block no-data">${year}年 無資料</div>`;
        }).join('');

        row.innerHTML = `
            <div class="card-main">
                <div class="dept-header">
                    <div class="titles">
                        <span class="uni-name">${item.uni}</span>
                        <span class="dept-name">${item.dept}</span>
                    </div>
                </div>

                <div class="current-standards">
                    ${currentData ? formatCurrentYearDetails(currentData) : '<p class="no-data">尚未公佈 115 標準</p>'}
                </div>
            </div>

            <div class="card-history-section">
                <div class="history-grid-wrapper">
                    ${historyHtml}
                </div>
            </div>
        `;
        resultsList.appendChild(row);
    });
}

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

document.addEventListener('DOMContentLoaded', loadData);