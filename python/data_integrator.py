import json
import os
from typing import Dict, List, Any, Optional

# --- 設定常數 ---
DATA_DIR = 'datas'
CURRENT_YEAR = 115
TARGET_START_YEAR = 112 # 追溯到的最早年份 (例如：115, 114, 113, 112)
OUTPUT_FILE = 'datas/historical_result.json'

# --- 數據檔案路徑 ---
CURRENT_DATA_FILE = os.path.join(DATA_DIR, str(CURRENT_YEAR), 'all_department_criteria.json')
# 歷年數據檔案格式: data/114/result.json
# 歷年改名映射檔案格式: data/114/dept_renamed.json (此檔案定義了 114年的新系名 <- 113年的舊系名)


def load_json_file(filepath: str) -> Dict:
    """載入 JSON 檔案，如果檔案不存在則返回空字典。"""
    if not os.path.exists(filepath):
        print(f"警告：找不到檔案 {filepath}，視為無資料。")
        return {}
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    except json.JSONDecodeError:
        print(f"錯誤：檔案 {filepath} 格式錯誤。")
        return {}

def integrate_data(start_year: int, end_year: int) -> Dict:
    """
    整合多年度的校系數據，以最新年度 (end_year) 的系名為基準進行追溯。
    
    :param start_year: 最早的年份 (e.g., 112)
    :param end_year: 最新的年份 (e.g., 115)
    :return: 整合後的 JSON 結構
    """
    
    # 1. 載入最新一年的數據 (115)
    integrated_data = load_json_file(CURRENT_DATA_FILE)

    # 2. 建立所有年份的「舊系名 -> 新系名」正向追溯映射
    #    [115] 定義 114年的舊系名 -> 115年的新系名
    #    [114] 定義 113年的舊系名 -> 114年的新系名
    forward_maps: Dict[int, Dict[str, Dict[str, List[str]]]] = {}
    for year in range(end_year, start_year, -1):
        # 載入 data/115/dept_renamed.json (它定義了 114年舊系名 -> 115年新系名)
        renamed_file = os.path.join(DATA_DIR, str(year), 'dept_renamed.json')
        forward_maps[year] = load_json_file(renamed_file) # 結構: { 學校: { 舊系名: [新系名列表] } }

    # 3. 從最新年度開始，迭代每個學校和科系，並進行歷史數據追溯
    
    # 追溯過程需要一個總體集合來追蹤哪些舊系名已經被彙整過
    # 結構: { '國立臺灣大學': { '中國文學系': True, ... } }
    processed_old_depts: Dict[str, Dict[str, bool]] = {}

    final_integrated_data: Dict = {}

    # 初始化 final_integrated_data 的結構
    for uni, depts in integrated_data.items():
        if uni not in final_integrated_data:
            final_integrated_data[uni] = {}
        for dept in depts.keys():
             final_integrated_data[uni][dept] = {str(end_year): depts[dept]}
             processed_old_depts.setdefault(uni, {})

    for uni in integrated_data.keys():
        for dept_115 in integrated_data[uni].keys():
            
            # 從最新年 (end_year) 的系名開始追溯
            current_old_dept_name = dept_115 # 這一輪要找的「舊系名」在 history_data_year 的名稱
            
            # 迭代年份: 115 找 114 的數據，114 找 113 的數據
            for target_year in range(end_year, start_year - 1, -1):
                
                history_data_year = target_year - 1
                if history_data_year < start_year:
                    break
                
                # 載入當年的歷年數據
                history_data_path = os.path.join(DATA_DIR, str(history_data_year), 'result.json')
                history_data = load_json_file(history_data_path)
                
                # 獲取追溯映射 (例如：target_year=115，我們使用 115 的映射來找 114 年的舊系名)
                # target_map 結構: { 舊系名: [新系名列表] }
                # 這裡的 target_map 定義了 history_data_year 的舊系名會變成什麼
                forward_map_for_uni = forward_maps.get(target_year, {}).get(uni, {})
                
                
                # --- 核心查找邏輯 ---
                
                # 1. 找出 history_data_year 中，**名稱**為 current_old_dept_name 的系，
                #    它在 history_data_year-1 年是什麼名字 (old_dept_names_in_history)。
                
                # 這裡我們需要判斷 history_data_year 的哪個系名 (history_dept_name) 
                # 是由 history_data_year-1 的哪個系名變過來的。
                
                
                # 2. **更簡單的邏輯**：我們只需要知道 current_old_dept_name 在 history_data_year-1 年的名稱是什麼。
                #    但因為您的結構是以 115 年的系名為基準，我們只需要檢查 history_data_year 的系名是否包含在 115 年的列表裡。
                
                
                # 🌟 重新定義追溯邏輯 🌟
                # 我們要找的是 history_data_year 的哪個系名(key) 變成了 current_old_dept_name (在 target_year)
                
                
                # 找出所有在 history_data_year 中，其新系名包含在 current_old_dept_name 追溯鏈上的 "舊系名"
                old_dept_names_to_lookup: List[str] = []
                
                # 遍歷歷史數據年份 (history_data_year) 的系名 (old_dept_name)
                for old_dept_name, new_dept_names in forward_map_for_uni.items():
                    # 檢查這個舊系名 (old_dept_name) 變成的 "新系名" 列表
                    # 是否包含我們目前正在追溯的系名 (current_old_dept_name)
                    if current_old_dept_name in new_dept_names:
                        old_dept_names_to_lookup.append(old_dept_name)
                        
                # 如果找不到映射，假設名稱沒有變動
                if not old_dept_names_to_lookup:
                    old_dept_names_to_lookup = [current_old_dept_name] 

                # --- 獲取並儲存歷史數據 ---
                history_list: List[Dict] = []

                for dept_name_in_history in old_dept_names_to_lookup:
                    
                    # 檢查是否已處理
                    if processed_old_depts[uni].get(dept_name_in_history) == history_data_year:
                        continue
                    
                    if dept_name_in_history in history_data.get(uni, {}):
                        history_item = history_data[uni][dept_name_in_history].copy()
                        history_item["校系名稱"] = dept_name_in_history
                        history_list.append(history_item)
                        processed_old_depts[uni][dept_name_in_history] = history_data_year

                if history_list:
                    final_integrated_data[uni][dept_115][str(history_data_year)] = history_list
                
                # --- 準備下一輪追溯 (DFS) ---
                
                # 如果是多對一 (合併) 或一對一 (改名)，下一輪的追溯名稱是列表中的第一個名稱。
                if old_dept_names_to_lookup:
                    current_old_dept_name = old_dept_names_to_lookup[0]
                # 如果是今年系名沒有變動的情況，current_old_dept_name 保持不變。

    return final_integrated_data


# =======================================================
# 執行程式碼
# =======================================================
if __name__ == "__main__":
    
    # 💡 模擬資料夾結構和檔案內容 (確保程式碼可以運行和驗證邏輯)
    
    # # 創建資料夾
    # for year in range(TARGET_START_YEAR, CURRENT_YEAR + 1):
    #     os.makedirs(os.path.join(DATA_DIR, str(year)), exist_ok=True)
    
    # # --- 115 年數據 (最新年，作為基準) ---
    # data_115 = {
    #     "國立臺灣大學": {
    #         "中國文學系": {"核定人數": 20, "學測標準": {"數A": "均標"}, "科目倍數": {"國文": 1.5}},
    #         "外國語文學系": {"核定人數": 48, "學測標準": {"英聽": "A級"}, "科目倍數": {"英文": 2.0}},
    #     },
    #     "國立清華大學": {
    #          "電機資訊學院學士班": {"核定人數": 100, "學測標準": {"數A": "頂標"}, "科目倍數": {"數甲": 1.5}} # 114年是甲乙組合併
    #     }
    # }
    # with open(CURRENT_DATA_FILE, 'w', encoding='utf-8') as f:
    #     json.dump(data_115, f, ensure_ascii=False, indent=4)
        
    # # --- 115年/114年的改名映射 (定義 115 <- 114 關係) ---
    # renamed_115 = {
    #     "國立清華大學": {
    #         "電機資訊學院學士班": ["電機資訊學院學士班甲組", "電機資訊學院學士班乙組"] # 合併案例
    #     },
    #     "國立臺灣大學": {
    #         "中國文學系": ["中國文學系"] # 沒改名，但寫入映射
    #     }
    # }
    # with open(os.path.join(DATA_DIR, '115', 'dept_renamed.json'), 'w', encoding='utf-8') as f:
    #     json.dump(renamed_115, f, ensure_ascii=False, indent=4)


    # # --- 114 年數據 (歷史數據) ---
    # data_114 = {
    #     "國立臺灣大學": {
    #         "中國文學系": {"科目倍數": {"國文": 1.5}, "一般考生錄取標準": 52.8, "達標比例": 2.82}, # 114 年名
    #         "外國語文學系": {"科目倍數": {"英文": 2.0}, "一般考生錄取標準": 52.12, "達標比例": 3.8},
    #     },
    #     "國立清華大學": {
    #         "電機資訊學院學士班甲組": {"科目倍數": {"數甲": 1.5}, "錄取人數": 60, "一般考生錄取標準": 65.0}, 
    #         "電機資訊學院學士班乙組": {"科目倍數": {"數甲": 1.5}, "錄取人數": 40, "一般考生錄取標準": 60.0},
    #     }
    # }
    # with open(os.path.join(DATA_DIR, '114', 'result.json'), 'w', encoding='utf-8') as f:
    #     json.dump(data_114, f, ensure_ascii=False, indent=4)


    # # --- 114年/113年的改名映射 (定義 114 <- 113 關係) ---
    # renamed_114 = {
    #     "國立臺灣大學": {
    #          "中國文學系": ["國文系"] # 模擬改名：114年叫中國文學系 <- 113年叫國文系
    #     }
    # }
    # with open(os.path.join(DATA_DIR, '114', 'dept_renamed.json'), 'w', encoding='utf-8') as f:
    #     json.dump(renamed_114, f, ensure_ascii=False, indent=4)
        
        
    # # --- 113 年數據 (歷史數據) ---
    # data_113 = {
    #     "國立臺灣大學": {
    #         "國文系": {"科目倍數": {"國文": 1.5}, "一般考生錄取標準": 51.8, "達標比例": 4.64}, # 113 年名
    #         "外國語文學系": {"科目倍數": {"英文": 2.0}, "一般考生錄取標準": 50.0, "達標比例": 4.0},
    #     }
    # }
    # with open(os.path.join(DATA_DIR, '113', 'result.json'), 'w', encoding='utf-8') as f:
    #     json.dump(data_113, f, ensure_ascii=False, indent=4)

    # 執行整合
    final_result = integrate_data(TARGET_START_YEAR, CURRENT_YEAR)

    # 寫入最終結果
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(final_result, f, ensure_ascii=False, indent=4)
    
    print(f"\n✅ 數據整合完成！結果已儲存至 {OUTPUT_FILE}")