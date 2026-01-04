// 變數宣告
let schoolData = {};
let regionData = {};
let searchEngine;
const universitySelect = document.getElementById('university-select');
const departmentSelect = document.getElementById('department-select');
const resultsDisplay = document.getElementById('results-display');
const resultsDiv = document.querySelector('.results');

// -----------------------------------------------------
// 1. 資料載入與初始化
// -----------------------------------------------------

async function loadData() {
    try {
        // 載入 data.json 檔案
        const response = await fetch('datas/historical_result.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        schoolData = await response.json();
        console.log(schoolData);
        
        const response1 = await fetch('datas/schools_by_region.json'); // 🚨 請確認路徑是否正確
        if (!response1.ok) {
            throw new Error(`HTTP error! status: ${response1.status}`);
        }
        regionData = await response1.json();
        
        // 初始化大學選單
        populateUniversities();
        // 綁定事件監聽器
        addEventListeners();

        searchEngine = await import("./js_utils/search_engine.js");

        // 搜尋預備
        searchEngine.flattenData(schoolData)
        
    } catch (error) {
        resultsDiv.innerHTML = `<p class="error-message">載入資料失敗：${error.message}</p>`;
        console.error("載入資料時發生錯誤:", error);
    }
}

// -----------------------------------------------------
// 2. 填充選單
// -----------------------------------------------------
function populateUniversities() {const universities = Object.keys(schoolData);
    universitySelect.innerHTML = '<option value="">-- 請選擇學校 --</option>'; 

    // 1. 定義您的自定義區域順序
    const customRegionOrder = [
        "北北基", 
        "桃竹苗", 
        "中彰投", 
        "嘉南", 
        "高屏", 
        "宜花東", 
        "外島"
    ];
    
    const defaultRegion = "其他/未分類"; 

    // 2. 按區域分組學校
    const groupedSchools = {}; 
    
    universities.forEach(uni => {
        const region = regionData[uni] || defaultRegion;
        
        if (!groupedSchools[region]) {
            groupedSchools[region] = [];
        }
        groupedSchools[region].push(uni);
    });
    
    
    // 3. 確定最終的迭代順序
    let finalRegionOrder = [];
    let remainingRegions = []; // 儲存不在 customRegionOrder 裡的區域 (如 '其他/未分類')
    
    // a. 先按照 customRegionOrder 加入已定義的區域
    customRegionOrder.forEach(regionName => {
        if (groupedSchools[regionName]) {
            finalRegionOrder.push(regionName);
        }
    });
    
    // b. 將剩下的區域 (包含 '其他/未分類') 加入到列表的末尾
    Object.keys(groupedSchools).forEach(regionName => {
        if (!customRegionOrder.includes(regionName)) {
            remainingRegions.push(regionName);
        }
    });
    
    // 將剩下的區域（按字母排序）添加到隊列末尾
    remainingRegions.sort(); 
    finalRegionOrder = finalRegionOrder.concat(remainingRegions);


    // 4. 迭代分組並創建 <optgroup> (使用 finalRegionOrder)
    finalRegionOrder.forEach(region => {
        const schoolsInRegion = groupedSchools[region];
        
        // 創建 <optgroup label="區域名稱">
        const optgroup = document.createElement('optgroup');
        optgroup.label = region;

        // 對區域內的學校名稱進行排序（例如按筆劃或字母，確保區內順序整齊）
        
        schoolsInRegion.forEach(uni => {
            const option = document.createElement('option');
            option.value = uni;
            option.textContent = uni;
            optgroup.appendChild(option);
        });
        
        // 將完整的 optgroup 加入到 select 中
        universitySelect.appendChild(optgroup);
    });

    // 5. 初始載入第一個學校 (可選，保持載入第一個分組的第一個學校)
    if (universities.length > 0 && finalRegionOrder.length > 0) {
        let params = new URLSearchParams(document.location.search);
        let school = params.get("school");

        if(!school || !schoolData[school]) {
            const firstRegion = finalRegionOrder[0];
            const firstUniversity = groupedSchools[firstRegion][0];
            
            if (firstUniversity) {
                universitySelect.value = firstUniversity;
                populateDepartments(firstUniversity);
            }
        } else {
            universitySelect.value = school;
            populateDepartments(school);
        }
    }
}

function populateDepartments(selectedUniversity) {
    // ... (保持原有的載入科系邏輯) ...
    departmentSelect.innerHTML = '<option value="">-- 請選擇科系 --</option>';
    departmentSelect.disabled = true;
    // ⚠️ 移除這行，避免在選擇過程中閃爍提示：resultsDiv.innerHTML = `<p class="initial-prompt">請選擇校系以查詢資料。</p>`;

    let params = new URLSearchParams(document.location.search);
    let dept_param = params.get("dept");

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
            departmentSelect.value = (dept_param && schoolData[selectedUniversity][dept_param]) ? dept_param : departments[0];
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
 * fancy
 */
function displayAnimation(callback, params) {
// 1. 應用離開動畫 (Animate Out)
    // resultsDisplay.classList.add('animate-out');

    // 設置一個短暫的延遲（例如 300 毫秒），等待 'animate-out' 完成
    setTimeout(() => {
        // 2. 清除舊數據並更新新內容
        
        // 🚨 這裡應替換為您實際更新 resultsDisplay 內容的邏輯
        // 假設這個函數是您更新 HTML 內容的地方：
        callback.apply(this, params);
        
        // 確保移除離開動畫的類別
        // resultsDisplay.classList.remove('animate-out');
        
        // 3. 應用進入動畫 (Animate In)
        resultsDisplay.classList.add('animate-in');

        // 4. 清除動畫類別（動畫完成後），以便下次能再次觸發
        // 這裡等待 500 毫秒 (與 CSS 中的動畫時長一致)
        setTimeout(() => {
            resultsDisplay.classList.remove('animate-in');
        }, 100);

    }, 100); // 300ms 延遲讓淡出動畫有時間完成
}

/**
 * 根據極簡主義風格，渲染單一科系的歷年數據。
 * 將最新的 115 年數據和歷史數據整合並輸出。
 */
function displayResults() {
    // 假設 universitySelect, departmentSelect, schoolData, resultsDiv 已經在全局或父作用域中定義
    const uni = universitySelect.value;
    const dept = departmentSelect.value;


    const url = new URL(window.location);
    url.searchParams.set("school", uni);
    url.searchParams.set("dept", dept);
    history.pushState({}, "", url);

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

    // 學測分數
    let GSATScores = getGSATScore();

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

                // 扣掉學測
                let GSAT_modifier = record["一般考生錄取標準總分"]
                // console.log(GSAT_modifier); 
                
                let times_left = Object.values(criteria).reduce((a, b) => a+b, 0);
                for(const [k, v] of Object.entries(GSATScores)) {
                    if(criteria[k] !== undefined) {
                        GSAT_modifier -= criteria[k] * (v === "" ? 0 : v);
                        times_left -= criteria[k];
                    }
                }
                let htmlPersonalData = "";
                let GSAT_modifier_ave = Number.parseFloat(GSAT_modifier / times_left).toFixed(2);
                if(GSAT_modifier !== record["一般考生錄取標準總分"]) {
                    htmlPersonalData = `
                        <span class="detail-tag">
                            你分科所需: <b ${GSAT_modifier_ave > 60 ? `class="impossible"` : ""}>${GSAT_modifier_ave}</b>
                        </span>
                    `
                }

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
                                    加權平均: <b>${standard}</b>
                                </span>` : ''
                            }

                            ${percentage !== undefined ? 
                                `<span class="detail-tag">
                                    達標考生佔比: <b>${percentage}%</b>
                                </span>` : ''
                            }
                            ${htmlPersonalData}
                        </div>
                    </div>
                `;
            });
        });
    }

    // --- 4. 顯示結果 ---
    resultsDiv.innerHTML = html;
}

// ---- 搜尋系統 -----
const spotlightOverlay = document.getElementById('spotlight-overlay');
const spotlightInput = document.getElementById('spotlight-input');
const spotlightSuggestions = document.getElementById('spotlight-suggestions');

/**
 * 2. 核心搜尋邏輯：分級匹配
 * @param {string} query - 使用者輸入的搜尋字詞
 */
function searchDepartments(query) {
    // 4. 顯示建議
    displaySuggestions(searchEngine.get_result(query).slice(0, 1000));
}


/**
 * 3. 顯示結果到 HTML
 * @param {Array<Object>} results - 排序後的搜尋結果
 */
function displaySuggestions(results) {
    spotlightSuggestions.innerHTML = '';
    
    
    if (results.length === 0) {
        spotlightSuggestions.innerHTML = '<div class="suggestion-item">找不到相關校系。</div>';
        return;
    }

    let lastUni = "";

    results.forEach((result) => {
        const item = result.item;
        const div = document.createElement('div');
        div.classList.add('suggestion-item');

        if (item.uni !== lastUni) {
            const headerDiv = document.createElement('div');
            headerDiv.classList.add('uni-section-header');
            headerDiv.textContent = item.uni;
            spotlightSuggestions.appendChild(headerDiv);
            lastUni = item.uni;
        }

        // 點擊事件：跳轉到該校系
        div.addEventListener('click', () => {
            // 這裡您可以觸發您原本選單的 change event，或直接導向該校系的頁面
            console.log(`選擇了: ${item.uni} - ${item.dept}`);
            universitySelect.value = item.uni;
            const url = new URL(window.location);
            url.searchParams.set("school", item.uni);
            url.searchParams.set("dept", item.dept);
            history.pushState({}, "", url);
            displayAnimation(populateDepartments, [item.uni]);
            closeSpotlight();
        });

        div.innerHTML = `
            <span class="dept-name">${item.dept}</span>
            <!-- <span class="uni-name">${item.uni}</span> -->
        `;
        spotlightSuggestions.appendChild(div);
    });
}

// 取得新增的按鈕元素
const searchIconButton = document.getElementById('search-icon-button');

// 🌟 新增按鈕點擊事件監聽器 🌟
if (searchIconButton) {
    searchIconButton.addEventListener('click', () => {
        // 呼叫開啟 Spotlight 搜尋的函數
        openSpotlight();
    });
}


/**
 * 4. 控制 Spotlight 開啟/關閉
 */
function openSpotlight() {
    spotlightOverlay.style.display = 'flex';
    spotlightInput.focus();
    // spotlightInput.value = '';
    // spotlightSuggestions.innerHTML = '';
    document.body.style.overflow = 'hidden'; // 鎖定背景捲動
}

function closeSpotlight() {
    spotlightOverlay.style.display = 'none';
    document.body.style.overflow = 'auto'; // 恢復背景捲動
}


/**
 * 5. 事件監聽器：F 鍵觸發、Esc 鍵關閉、Input 變化
 */
document.addEventListener('keydown', (e) => {
    // 檢查是否是 F 鍵 (不論大小寫)
    if (e.key === 'f' || e.key === 'F' || e.key === 'ㄑ') {
        // 避免在 input 欄位中按 F 時重複觸發
        const activeElement = document.activeElement.tagName;
        if (activeElement !== 'INPUT' && activeElement !== 'TEXTAREA') {
            e.preventDefault(); // 阻止瀏覽器預設的 'F' 搜尋功能
            openSpotlight();
        }
    }
});

let mouseOnSpotlight = false

spotlightOverlay.addEventListener('click', (e) => {
    if(!mouseOnSpotlight) {
        closeSpotlight();
        mouseOnSpotlight = false;
    }
})

// 輸入框內容變更時即時搜尋
spotlightInput.addEventListener('input', (e) => {
    searchDepartments(e.target.value);
});

spotlightInput.addEventListener('mouseover', (e) => {
    mouseOnSpotlight = true;
});

spotlightInput.addEventListener('mouseout', (e) => {
    mouseOnSpotlight = false;
});

// 取得新增的按鈕元素
const GSATInputButton = document.getElementById('gsat-button');

// 🌟 新增按鈕點擊事件監聽器 🌟
if (GSATInputButton) {
    GSATInputButton.addEventListener('click', () => {
        // 呼叫開啟 Spotlight 搜尋的函數
        toggleScoreIsland();
    });
}

const scoreIsland = document.getElementById('score-island-container');
const scoreInputs = document.querySelectorAll('.input-unit input');

// 1. 切換顯示/隱藏
function toggleScoreIsland() {
    scoreIsland.classList.toggle('island-visible');
    if (scoreIsland.classList.contains('island-visible')) {
        // auto focus after turn on the island.
        // set timeout is necessary, stupid js.
        setTimeout(() => document.getElementById("score-chi").focus(), 100);
    }
}

// 2. 自動跳轉邏輯
scoreInputs.forEach((input, index) => {

    input.addEventListener('focus', (e) => {
        // 🌟 確保輸入框在手機鍵盤彈出時不會被遮擋
        if (window.innerWidth < 600) {
            e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    });

    input.addEventListener('input', (e) => {
        const value = e.target.value;

        // 如果輸入超過 60 (級分上限)，自動修正為 60
        if (parseInt(value) > 60) {
            e.target.value = "60";
        }

        // 🌟 自動跳轉：如果輸入兩位數，或者輸入的是 7-9 之間的個位數 (因為級分不超過 60)
        if (value.length >= 2 || (parseInt(value) >= 7 && parseInt(value) <= 9)) {
            if (index < scoreInputs.length - 1) {
                scoreInputs[index + 1].focus();
            }
        }
        displayResults();
    });

    // 支援 Backspace 刪除後跳回前一格
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && e.target.value === '') {
            if (index > 0) {
                scoreInputs[index - 1].focus();
            }
            displayResults();
        }
    });
});

// 3. 鍵盤 G 觸發
document.addEventListener('keydown', (e) => {
    const activeElement = document.activeElement.tagName;
    if (activeElement !== 'INPUT' && activeElement !== 'TEXTAREA') {
        if (e.key === 'g' || e.key === 'G' || e.key === 'ㄕ') {
            e.preventDefault();
            toggleScoreIsland();
        }
    }
    
    if (e.key === 'Escape') {
        scoreIsland.classList.remove('island-visible');
    }
});

// 關閉按鈕
document.getElementById('island-close-btn').addEventListener('click', () => {
    scoreIsland.classList.remove('island-visible');
});

function getGSATScore() {
    return {
        "國文": scoreInputs[0].value,
        "英文": scoreInputs[1].value,
        "數A": scoreInputs[2].value,
        "數B": scoreInputs[3].value,
        "自然": scoreInputs[4].value,
        "社會": scoreInputs[5].value,
    }
}

const leftTrigger = document.getElementById('left-hand-trigger');

if (leftTrigger) {
    leftTrigger.addEventListener('click', () => {
        // 切換左撇子類別
        document.body.classList.toggle('left-handed');
        leftTrigger.style.display = "none";
    });
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

// 取得懸浮按鈕元素
const fabSpotlight = document.getElementById('fab-spotlight');
const fabGsat = document.getElementById('fab-gsat');

// 1. 點擊開啟搜尋系統 (Spotlight)
if (fabSpotlight) {
    fabSpotlight.addEventListener('click', (e) => {
        e.stopPropagation(); // 防止事件冒泡
        openSpotlight(); // 執行之前定義好的開啟函數
    });
}

// 2. 點擊開啟成績輸入 (Dynamic Island)
if (fabGsat) {
    fabGsat.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleScoreIsland(); // 執行之前定義好的切換函數
    });
}

// 啟動應用程式
// 確保 DOM 元素存在後才執行 loadData
document.addEventListener('DOMContentLoaded', loadData);