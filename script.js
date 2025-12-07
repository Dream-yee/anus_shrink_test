// 變數宣告
let schoolData = {};
let newStandards = {};
const universitySelect = document.getElementById('university-select');
const departmentSelect = document.getElementById('department-select');
const resultsDiv = document.querySelector('.results');

// -----------------------------------------------------
// 1. 資料載入與初始化
// -----------------------------------------------------

async function loadData() {
    try {
        // 載入 data.json 檔案
        const response1 = await fetch('datas/historical_result.json');
        if (!response1.ok) {
            throw new Error(`HTTP error! status: ${response1.status}`);
        }
        schoolData = await response1.json();
        console.log(schoolData);
        
        
        // 初始化大學選單
        populateUniversities();
        // 綁定事件監聽器
        addEventListeners();
        
    } catch (error) {
        resultsDiv.innerHTML = `<p class="error-message">載入資料失敗：${error.message}</p>`;
        console.error("載入資料時發生錯誤:", error);
    }
}

// -----------------------------------------------------
// 2. 填充選單
// -----------------------------------------------------
function populateUniversities() {
    // ... (保持原有的載入學校邏輯) ...
    const universities = Object.keys(schoolData);
    universitySelect.innerHTML = '<option value="">-- 請選擇學校 --</option>'; // 清空並添加預設選項
    universities.forEach(uni => {
        const option = document.createElement('option');
        option.value = uni;
        option.textContent = uni;
        universitySelect.appendChild(option);
    });
    
    // 初始載入第一個學校（如果有的話）
    if (universities.length > 0) {
        universitySelect.value = universities[0];
        populateDepartments(universities[0]);
    }
}

function populateDepartments(selectedUniversity) {
    // ... (保持原有的載入科系邏輯) ...
    departmentSelect.innerHTML = '<option value="">-- 請選擇科系 --</option>';
    departmentSelect.disabled = true;
    // ⚠️ 移除這行，避免在選擇過程中閃爍提示：resultsDiv.innerHTML = `<p class="initial-prompt">請選擇校系以查詢資料。</p>`;

    if (selectedUniversity && schoolData[selectedUniversity]) {
        const departments = Object.keys(schoolData[selectedUniversity]);
        departments.forEach(dept => {
            const option = document.createElement('option');
            option.value = dept;
            option.textContent = dept;
            departmentSelect.appendChild(option);
        });
        departmentSelect.disabled = false;
        
        // 🌟 自動選擇第一個科系並顯示結果 (這是您要保留的行為)
        if (departments.length > 0) {
            departmentSelect.value = departments[0];
            // 🌟 立即觸發結果顯示
            displayResults(); 
        } else {
            // 如果學校有選單但沒有科系
            resultsDiv.innerHTML = `<h2>${selectedUniversity}</h2><p class="no-data">該學校無科系資料可供查詢。</p>`;
        }
    } else {
        // 如果選單被重置回 "-- 請選擇學校 --"
        resultsDiv.innerHTML = `<p class="initial-prompt">請選擇校系以查詢資料。</p>`;
    }
}

// -----------------------------------------------------
// 3. 顯示結果
// -----------------------------------------------------

/**
 * 根據極簡主義風格，渲染單一科系的歷年數據。
 * 將最新的 115 年數據和歷史數據整合並輸出。
 */
function displayResults() {
    // 假設 universitySelect, departmentSelect, schoolData, resultsDiv 已經在全局或父作用域中定義
    const uni = universitySelect.value;
    const dept = departmentSelect.value;

    if (!uni || !dept) {
        resultsDiv.innerHTML = `<p class="initial-prompt">請選擇校系以查詢資料。</p>`;
        return; 
    }
    
    // 獲取該科系的所有數據
    const data = schoolData[uni][dept]; 
    let html = '';

    // --- 1. 頂部標題與數據檢查 ---
    html += `<h2>${uni} - ${dept}</h2>`;

    if (!data || Object.keys(data).length === 0) {
        html += `<p class="no-data">**${dept}** 尚未有資料。</p>`;
        resultsDiv.innerHTML = html;
        return;
    }
    
    // 找出所有年份，由大到小排序
    const allYears = Object.keys(data)
        .sort((a, b) => parseInt(b) - parseInt(a));
    const currentYear = allYears[0]; // 假設是 '115'

    // --- 2. 渲染最新年度 (Current Year: 115) 的數據 ---
    
    if (data[currentYear]) {
        const newStandards = data[currentYear];
        const gsatCriteria = newStandards["學測標準"] || {};
        const multipliers = newStandards["科目倍數"] || {};
        
        // 格式化學測標準 (GSAT)
        const gsatTags = Object.entries(gsatCriteria)
            .map(([subject, standard]) => 
                `<span class="data-tag">${subject} <b>${standard}</b></span>`
            ).join('<span class="data-separator">|</span>');
        
        // 格式化分科倍率 (AST)
        const multiplierTags = Object.entries(multipliers)
            .map(([subject, multiplier]) => {
                const formattedMultiplier = (parseFloat(multiplier) || 0);
                return `<span class="data-tag multiplier-tag">${subject} <b>${formattedMultiplier}</b></span>`;
            }).join('<span class="data-separator">|</span>');
        
        const spots = newStandards["核定人數"];

        html += `
            <div class="current-criteria-box">
                <h3 class="box-title">${currentYear} 年 學測標準及採計科目</h3>
                
                <h5>核定人數: <b>${spots !== undefined ? spots : 'N/A'}</b></h5>

                <h5>${gsatTags || '<span class="data-tag">無學測檢定</span>'}</h5>

                <h5>${multiplierTags || '<span class="data-tag">該學系今年沒有參與考試分發。</h5>'}</div>
            </div>
        `;
    }


    // --- 3. 渲染歷史年份 (Historical Years) 的數據 ---
    
    const historicalYears = allYears.slice(1); // 排除最新年

    if (historicalYears.length > 0) {
        historicalYears.forEach(year => {
            // 歷史年份的資料是陣列 (List)，包含所有合併/拆分的舊系名記錄
            const records = data[year]; 

            records.forEach(record => {
                
                // 提取核心歷史數據
                const criteria = record["科目倍數"] || {};
                const spots = record["錄取人數"];
                const standard = record["一般考生錄取標準"];
                const percentage = record["達標比例"];
                const deptName = record["校系名稱"]; // 舊系名追溯
                
                // 追溯：如果校系名稱與目前查詢的名稱 (dept) 不同，則顯示括號
                const nameSuffix = (deptName && deptName !== dept) ? ` (${deptName})` : '';
                
                // 格式化科目倍數 (使用統一的標籤結構)
                const criteriaTags = Object.entries(criteria)
                    .map(([subject, multiplier]) => 
                        `<span class="data-tag multiplier-tag">${subject} <b>${(parseFloat(multiplier) || 0)}</b></span>`
                    ).join('<span class="data-separator">|</span>'); 

                // 輸出單筆歷史記錄
                html += `
                    <div class="historical-entry-box">
                        <h4 class="history-year-title">${year} 年 錄取標準 ${nameSuffix}</h4>
                        
                            <p>${criteriaTags || '無採計科目數據'}</p>

                        <div class="history-row-details">
                            <span class="detail-tag">
                                錄取人數: <b>${spots !== undefined ? spots : 'N/A'}</b>
                            </span>
                            
                            ${standard !== undefined ? 
                                `<span class="detail-tag">
                                    加權平均分數: <b>${standard}</b>
                                </span>` : ''
                            }

                            ${percentage !== undefined ? 
                                `<span class="detail-tag">
                                    達標考生佔比: <b>${percentage}%</b>
                                </span>` : ''
                            }
                        </div>
                    </div>
                `;
            });
        });
    }

    // --- 4. 顯示結果 ---
    resultsDiv.innerHTML = html;
}
// -----------------------------------------------------
// 4. 事件監聽器
// -----------------------------------------------------

function addEventListeners() {
    // 1. 學校選單變動時，更新科系選單
    universitySelect.addEventListener('change', function() {
        populateDepartments(this.value);
    });

    // 2. 科系選單變動時，立即顯示結果
    departmentSelect.addEventListener('change', function() {
        // 只有在選擇了有效科系時才顯示結果
        if (this.value) {
            displayResults();
        } else {
            // 如果選單被重置回 "-- 請選擇科系 --"
            resultsDiv.innerHTML = `<p class="initial-prompt">請選擇校系以查詢資料</p>`;
        }
    });
}

// 啟動應用程式
// 確保 DOM 元素存在後才執行 loadData
document.addEventListener('DOMContentLoaded', loadData);