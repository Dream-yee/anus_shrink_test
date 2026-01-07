

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
    "中字輩": ["國立中央大學", "國立中山大學", "國立中興大學", "國立中正大學"],
    "中字": ["國立中央大學", "國立中山大學", "國立中興大學", "國立中正大學"],
    "師北海": ["國立臺灣師範大學", "國立臺北大學", "國立臺灣海洋大學"]
};

const DEPT_ALIASES = {
    "資工": ["資訊工程", "資訊科學"],
    "化工": ["化學工程"],
    "電資": ["電機工程", "資訊工程", "資電", "電機資訊"],
    "資管": ["資訊管理"],
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

    const kws = trimmedQuery.toLowerCase().replaceAll("台", "臺").split(/\s+/).filter(k => k.length > 0);
    const results = [];
    
    flattenedSchoolData.forEach(item => {
        const uniLower = item.uni.replaceAll("台", "臺").toLowerCase();
        const deptLower = item.dept.replaceAll("台", "臺").toLowerCase();
        let score = 0;

        // --- 核心匹配邏輯 --
        let school_matched = 0;
        let dept_matched = 0;

        // 學校
        for(let k of kws) {
            if(uniLower.includes(k) || (SCHOOL_ALIASES[k] !== undefined && SCHOOL_ALIASES[k].includes(uniLower))) 
                school_matched++;
            if(deptLower.includes(k) || (DEPT_ALIASES[k] !== undefined && DEPT_ALIASES[k].some(dept => deptLower.includes(dept))))
                dept_matched++;
        }
        
        score = school_matched*67 + dept_matched * 2;
        if(score > 0)
            results.push({ item, score })
    });

    // 3. 排序結果
    results.sort((a, b) => b.score - a.score);

    return results
}

export { flattenData, get_result };