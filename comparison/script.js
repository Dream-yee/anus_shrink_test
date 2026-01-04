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
const TARGET_YEARS = [CURRENT_YEAR - 2, CURRENT_YEAR - 1, CURRENT_YEAR];

/**
 * 修正後的結果渲染邏輯
 */
function renderComparisonResults(results) {
    resultsList.innerHTML = '';
    console.log(results);
    
    results.slice(0, 200).forEach((res) => {
        const item = res.item;
        const row = document.createElement('div');
        row.classList.add('comparison-row');
        
        // 生成三年的 HTML
        const yearsHtml = TARGET_YEARS.map(year => {
            let yearData = schoolData[item.uni][item.dept][year];
            
            // 處理資料結構差異：往年通常是 Array [0]，今年 (115) 是 Object
            let ydhtml;
            console.log(yearData);

            if (year === CURRENT_YEAR) {
                ydhtml = formatYearDetails(yearData, year);
            } else if (yearData !== undefined && yearData.length === 1) {
                yearData = yearData[0]
                ydhtml = formatYearDetails(yearData, year);
            } else if (yearData !== undefined) {
                ydhtml = "當年尚未合併"
            } else {
                ydhtml = "無資料"
            }
            
            return `
                <div class="history-year-box ${year === CURRENT_YEAR ? 'highlight-year' : ''}">
                    <span class="year-label">${year} 學年度</span>
                    <div class="year-content">
                        ${ydhtml}
                    </div>
                </div>
            `;
        }).join('');

        row.innerHTML = `
            <div class="dept-info">
                <span class="uni-name">${item.uni}</span>
                <span class="dept-name">${item.dept}</span>
            </div>
            <div class="history-grid">
                ${yearsHtml}
            </div>
        `;
        resultsList.appendChild(row);
    });
}

/**
 * 格式化每一年顯示的具體細節
 */
function formatYearDetails(data, year) {
    let html = '';

    // 1. 處理「科目倍數」(加權) - 這是每一年都有的
    if (data.科目倍數) {
        const weights = Object.entries(data.科目倍數)
            .map(([sub, w]) => `<span class="tag-weight">${sub}x${w}</span>`)
            .join(' ');
        html += `<div class="detail-section"><strong>加權：</strong><div class="tag-container">${weights}</div></div>`;
    }

    // 2. 區分「今年」與「往年」的特定數據
    if (year === CURRENT_YEAR) {
        // 今年：顯示學測標準
        if (data.學測標準) {
            const gsat = Object.entries(data.學測標準)
                .map(([sub, level]) => `${sub}:${level}`)
                .join(', ');
            html += `<div class="detail-section gsat-std"><strong>學測門檻：</strong><br>${gsat || '無'}</div>`;
        }
    } else {
        // 往年：顯示錄取分數與達標比例
        const admitted = data.錄取人數 || 'N/A';
        const score = data.一般考生錄取標準 || 'N/A';
        const ratio = data.達標比例 ? `${data.達標比例}%` : 'N/A';
        
        html += `
            <div class="result-metrics">
                <div class="metric-item">
                    <span class="m-label">錄取人數</span>
                    <span class="m-value">${admitted}</span>
                </div>
                <div class="metric-item">
                    <span class="m-label">加權平均</span>
                    <span class="m-value">${score}</span>
                </div>
                <div class="metric-item">
                    <span class="m-label">達標比例</span>
                    <span class="m-value">${ratio}</span>
                </div>
            </div>
        `;
    }

    return html;
}

document.addEventListener('DOMContentLoaded', loadData);