// 變數宣告
let schoolData = {};
let new_standards = {};
const universitySelect = document.getElementById('university-select');
const departmentSelect = document.getElementById('department-select');
const resultsDiv = document.querySelector('.results');

// -----------------------------------------------------
// 1. 資料載入與初始化
// -----------------------------------------------------

async function loadData() {
    try {
        // 載入 data.json 檔案
        const response1 = await fetch('historical_results.json');
        if (!response1.ok) {
            throw new Error(`HTTP error! status: ${response1.status}`);
        }
        schoolData = await response1.json();

        let response2 = await fetch('all_department_criteria.json');
        if (!response2.ok) {
            throw new Error(`HTTP error! status: ${response2.status}`);
        }
        new_standards = await response2.json();
        
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
    const universities = Object.keys(schoolData);
    universitySelect.innerHTML = '<option value="">-- 請選擇學校 --</option>'; // 清空並添加預設選項
    universities.forEach(uni => {
        const option = document.createElement('option');
        option.value = uni;
        option.textContent = uni;
        universitySelect.appendChild(option);
    });
    // 初始選擇第一個學校（如果有的話）
    if (universities.length > 0) {
        universitySelect.value = universities[0];
        populateDepartments(universities[0]);
    }
}

function populateDepartments(selectedUniversity) {
    departmentSelect.innerHTML = '<option value="">-- 請選擇科系 --</option>'; // 清空並添加預設選項
    departmentSelect.disabled = true;
    resultsDiv.innerHTML = `<p class="initial-prompt">請選擇校系以查詢資料。</p>`;

    if (selectedUniversity && schoolData[selectedUniversity]) {
        const departments = Object.keys(schoolData[selectedUniversity]);
        departments.forEach(dept => {
            const option = document.createElement('option');
            option.value = dept;
            option.textContent = dept;
            departmentSelect.appendChild(option);
        });
        departmentSelect.disabled = false;
        
        // 選擇第一個科系並顯示結果
        if (departments.length > 0) {
            departmentSelect.value = departments[0];
            displayResults();
        }
    }
}

// -----------------------------------------------------
// 3. 顯示結果
// -----------------------------------------------------

function displayResults() {
    const uni = universitySelect.value;
    const dept = departmentSelect.value;

    const data = schoolData[uni][dept];
    let html = `<h2>${uni} - ${dept}</h2>`;

    if (!data || Object.keys(data).length === 0) {
        html += `<p class="no-data">**${dept}** 尚未有資料。</p>`;
        resultsDiv.innerHTML = html;
        return;
    }


    const GSAT_stnd = new_standards[uni][dept]["學測標準"] || {};
    const AST_multiply = new_standards[uni][dept]["科目倍數"] || {};
    
    const GSAT_entries = Object.entries(GSAT_stnd);
    
    let criteriaHtml = '';

    if (GSAT_entries.length > 0) {
        GSAT_entries.forEach(([subject, standard]) => {
            criteriaHtml += `<span class="data-tag">${subject} <b>${standard}</b></span>`;
        });
    }

    let multiplierHtml = '';
    const AST_entries = Object.entries(AST_multiply);
    
    if (AST_entries.length > 0) {
        AST_entries.forEach(([subject, multiplier]) => {
            const formattedMultiplier = (parseFloat(multiplier) || 0).toFixed(2);
            multiplierHtml += `<span class="data-tag multiplier-tag">${subject} <b>${formattedMultiplier}</b></span>`;
        });
    }

    if (!uni || !dept) {
        resultsDiv.innerHTML = `<p class="initial-prompt">請選擇校系以查詢資料。</p>`;
        return; 
    }

    html += `
        <div class="current-criteria-box">
            <h4>115 學年度 篩選標準</h4>
            <div class="criteria-row-display">
                <p>${criteriaHtml}</p>
                <p>${multiplierHtml}</p>
            </div>
        </div>
    `

    const years = Object.keys(data)
                        .sort((a, b) => parseInt(b) - parseInt(a))
                        .slice(0, 3);

    years.forEach(year => {
        const yearData = data[year];
        const criteria = yearData["科目倍數"];
        const standard = yearData["一般考生錄取標準"];
        const spots = yearData["錄取人數"];
        const percentage = yearData["達標比例"]; // <--- 獲取達標比例

        const criteriaString = Object.entries(criteria)
            .map(([subject, multiplier]) => `${subject} ${multiplier}`)
            .join(', ');

        // 構建結果的 HTML 結構
        html += `
            <div class="data-entry">
                <h3 class="year-title">${year}年 篩選標準:</h3>
                
                <div class="entry-content">
                    <p class="criteria-text">
                        ${criteriaString} 
                    </p>

                    <div class="standard-details">
                        <span class="standard">
                            錄取人數: ${spots}
                        </span>
                        <span class="standard">
                            加權平均: ${standard}
                        </span>
                        ${percentage !== undefined ? 
                            `<span class="standard">
                                達標考生佔比: ${percentage}%
                            </span>` : ''
                        }
                    </div>
                </div>
            </div>
        `;
    });

    resultsDiv.innerHTML = html;
}

// -----------------------------------------------------
// 4. 事件監聽器
// -----------------------------------------------------

function addEventListeners() {
    // 監聽大學選單變化
    universitySelect.addEventListener('change', (e) => {
        const selectedUni = e.target.value;
        populateDepartments(selectedUni); // 根據大學更新科系選單
    });

    // 監聽科系選單變化
    departmentSelect.addEventListener('change', () => {
        displayResults(); // 顯示選定科系的資料
    });
}

// 啟動應用程式
// 確保 DOM 元素存在後才執行 loadData
document.addEventListener('DOMContentLoaded', loadData);