const searchInput = document.getElementById('comparison-search');
const pageContainer = document.getElementById('comparison-page');
const resultsList = document.getElementById('results-list');

let schoolData = {};
let searchEngine;

async function loadData() {
    try {
        const response = await fetch('../datas/historical_result.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        schoolData = await response.json();
        searchEngine = await import("../js_utils/search_engine.js");
        searchEngine.flattenData(schoolData)
    } catch (error) {
        console.error("載入資料時發生錯誤:", error);
    }
}

searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    
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
});

// --- 設定當前年份 ---
const CURRENT_YEAR = 115;
const TARGET_YEARS = [CURRENT_YEAR - 3, CURRENT_YEAR - 2, CURRENT_YEAR - 1, CURRENT_YEAR];

function renderComparisonResults(results) {
    resultsList.innerHTML = '';
    
    results.slice(0, 200).forEach((res) => {
        const item = res.item;
        const row = document.createElement('div');
        row.classList.add('comparison-row');

        const currentData = schoolData[item.uni][item.dept][CURRENT_YEAR];
        
        // 準備 114, 113 的詳細輔助 HTML
        const historyYears = TARGET_YEARS.filter(y => y !== CURRENT_YEAR);
        const historyHtml = historyYears.map(year => {
            let yearData = schoolData[item.uni][item.dept][year];
            if (yearData !== undefined) {
                const data = Array.isArray(yearData) ? yearData[0] : yearData;
                
                // 格式化往年的科目倍數（小標籤）
                const weights = data.科目倍數 ? Object.entries(data.科目倍數)
                    .map(([sub, w]) => `${sub} ${w}`).join(', ') : '無資料';
                
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
                    <div class="current-year-badge">${CURRENT_YEAR} 年</div>
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