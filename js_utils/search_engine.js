

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
    "地科": ["地球科學"],
    "工科": ["工程科學", "工程與系統科學"]
};

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

function get_result(query) {

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
        let k = k_origin.replaceAll("台", "臺") // 可不可以規範一下，求求了
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

            // 校系
            if(uniLower.includes(k)) {
                matchType = "school_partial"
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

            // 學校有要先出
            if (keywordMatches.includes('school_partial')) score += 60;

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

    return results
}

export { flattenData, get_result };