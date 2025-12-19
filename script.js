// 變數宣告
let schoolData = {};
let regionData = {};
let newStandards = {};
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
        // 搜尋預備
        flattenData(schoolData)
        
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

// ---- 搜尋系統 -----
const spotlightOverlay = document.getElementById('spotlight-overlay');
const spotlightInput = document.getElementById('spotlight-input');
const spotlightSuggestions = document.getElementById('spotlight-suggestions');

let flattenedSchoolData = []; // 扁平化後的 [{uni: '...', dept: '...'}] 結構

// --- 1. 定義別名對照表 ---
const SCHOOL_ALIASES = {
    "台大": ["國立臺灣大學"], "臺大": ["國立臺灣大學"], "ntu": ["國立臺灣大學"],
    "成大": ["國立成功大學"], "ncku": ["國立成功大學"],
    "清大": ["國立清華大學"], "nthu": ["國立清華大學"],
    "交大": ["國立陽明交通大學"], "陽明交大": ["國立陽明交通大學"], "nycu": ["國立陽明交通大學"],
    "政大": ["國立政治大學"], "nccu": ["國立政治大學"],
    "中大": ["國立中央大學"], "中央": ["國立中央大學"], "ncu": ["國立中央大學"],
    "中山": ["國立中山大學"], "nsysu": ["國立中山大學"],
    "中興": ["國立中興大學"], "興大": ["國立中興大學"], "nchu": ["國立中興大學"],
    "中正": ["國立中正大學"], "ccu": ["國立中正大學"],
    "台師大": ["國立臺灣師範大學"], "臺師大": ["國立臺灣師範大學"], "師大": ["國立臺灣師範大學"], "ntnu": ["國立臺灣師範大學"],
    "北大": ["國立臺北大學"], 
    "海大": ["國立臺灣海洋大學"], "台海大": ["國立臺灣海洋大學"], "臺海大": ["國立臺灣海洋大學"],
    "彰師大": ["國立彰化師範大學"], "彰師": ["國立彰化師範大學"],
    "高師大": ["國立高雄師範大學"], "高師": ["國立高雄師範大學"],
    "頂大": ["國立臺灣大學", "國立陽明交通大學", "國立清華大學", "國立成功大學", "國立政治大學"],
    "四大": ["國立臺灣大學", "國立陽明交通大學", "國立清華大學", "國立成功大學"],
    "四中": ["國立中央大學", "國立中山大學", "國立中興大學", "國立中正大學"],
    "師北海": ["國立台灣師範大學", "國立臺北大學", "國立臺灣海洋大學"]
};

const DEPT_ALIASES = {
    "資工": ["資訊工程", "資訊科學"],
    "化工": ["化學工程"],
    "電資": ["電機工程", "資訊工程", "資電", "電機資訊"],
    "企管": ["企業管理"],
    "中文": ["中國文學"],
    "外文": ["外國語文"],
    "財金": ["財務金融"],
    "法律": ["法律"],
    "物治": ["物理治療"],
    "職治": ["職能治療"],
    "應數": ["應用數學"],
    "應化": ["應用化學"],
};

/**
 * 1. 扁平化數據：將巢狀的 schoolData 轉為單一陣列，方便搜尋。
 * @param {Object} data - historical_result.json 內容
 */
function flattenData(data) {
    if (!data) return;
    flattenedSchoolData = [];
    for (const university in data) {
        for (const department in data[university]) {
            flattenedSchoolData.push({
                uni: university,
                dept: department
                // 如果需要，可以在這裡加入代號等其他資訊
            });
        }
    }
    console.log(`已扁平化 ${flattenedSchoolData.length} 個校系記錄，準備搜尋。`);
}

/**
 * 2. 核心搜尋邏輯：分級匹配
 * @param {string} query - 使用者輸入的搜尋字詞
 */
function searchDepartments(query) {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length === 0) {
        spotlightSuggestions.innerHTML = '';
        return;
    }

    const keywords = trimmedQuery.toLowerCase().split(/\s+/).filter(k => k.length > 0);
    
    const results = [];

    let main_unis = [];
    const dept_keywords = [];
    for(let k_origin of keywords) {
        k = k_origin.replaceAll("台", "臺") // 可不可以規範一下，求求了
        if(schoolData[k])
            main_unis.push(k);
        else if (SCHOOL_ALIASES[k]) {
            main_unis = main_unis.concat(SCHOOL_ALIASES[k]);
        } else {
            dept_keywords.push(k);
            if(k_origin.includes("台"))
                dept_keywords.push(k_origin);
        }
    }
    
    flattenedSchoolData.forEach(item => {
        const uniLower = item.uni.toLowerCase();
        const deptLower = item.dept.toLowerCase();
        const fullText = (uniLower + deptLower).toLowerCase();
        let score = 0;

        // --- 核心匹配邏輯 ---

        // 1. 檢查每個關鍵字
        const keywordMatches = dept_keywords.map(k => {
            let matchType = null; // null, 'partial', 'uni_alias', 'dept_alias', 'exact'

            // A. 直接包含
            if (fullText.includes(k)) {
                matchType = 'partial';
            }

            // C. 科系別名檢查 (例如輸入 "資工")
            if (DEPT_ALIASES[k]) {
                const requirements = DEPT_ALIASES[k];
                // 如果科系名稱包含了縮寫所代表的所有字元
                if (requirements.some(req => deptLower.includes(req))) {
                    matchType = 'dept_alias';
                }
            }

            return matchType;
        });

        // --- 計分系統 ---

        // 如果所有關鍵字都有匹配到 (不論是直接匹配還是別名)
        if (keywordMatches.every(m => m !== null) && (main_unis.length === 0 || main_unis.includes(uniLower))) {
            
            // 基礎分：所有關鍵字都符合 (AND 條件)
            if(keywordMatches.length !== 0)
                score += 50;

            // 獎勵：如果在科系名稱內完全符合所有關鍵字
            const allInDept = keywords.every(k => {
                const isAliasMatch = DEPT_ALIASES[k] && DEPT_ALIASES[k].every(req => deptLower.includes(req));
                return deptLower.includes(k) || isAliasMatch;
            });
            if (allInDept) score += 50;

            // 對鎖定校系的匹配
            if (main_unis.includes(uniLower)){
                score += 50;
            }

            // 獎勵：沒有對學校鎖定的匹配別名 (給予跟直接符合差不多的高分)
            if (keywordMatches.includes('dept_alias')) score += 30;

            // 獎勵：字串開頭符合
            // if (deptLower.startsWith(keywords[0]) || uniLower.startsWith(keywords[0])) {
            //     score += 20;
            // }
        } 
        // 寬鬆搜尋：如果只有部分關鍵字符合 (OR 條件)
        else if (dept_keywords.some((k, idx) => (keywordMatches[idx] !== null))) {
            if (main_unis.length === 0)
                score += 10;
            else if (main_unis.includes(uniLower)){
                score += 50;
            }
        }

        if (score > 0) {
            results.push({ item, score });
        }
    });

    // 3. 排序結果
    results.sort((a, b) => b.score - a.score);

    // 4. 顯示建議
    displaySuggestions(results.slice(0, 1000));
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

    results.forEach((result) => {
        const item = result.item;
        const div = document.createElement('div');
        div.classList.add('suggestion-item');

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
            <span class="uni-name">${item.uni}</span>
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
    if (e.key === 's' || e.key === 'S' || e.key === 'ㄋ') {
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