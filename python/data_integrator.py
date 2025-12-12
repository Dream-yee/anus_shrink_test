import json
import os
from typing import Dict, List, Any, Optional
import re

# --- 設定常數 (保持不變) ---
DATA_DIR = 'datas'
CURRENT_YEAR = 115
TARGET_START_YEAR = 112 
OUTPUT_FILE = 'datas/historical_result.json'

# --- 輔助函數 (保持不變) ---
def load_json_file(filepath: str) -> Dict:
    """載入 JSON 檔案，如果檔案不存在則返回空字典。"""
    if not os.path.exists(filepath):
        # print(f"警告：找不到檔案 {filepath}，視為無資料。") # 關閉警告避免輸出過多
        return {}
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    except json.JSONDecodeError:
        print(f"錯誤：檔案 {filepath} 格式錯誤。")
        return {}
# -----------------------------

def get_department_sort_key(dept_name: str) -> float:
    """
    為校系名稱生成一個排序權重，確保甲、乙、丙組等能按邏輯順序排列。
    數字權重越低，排序越靠前。
    """
    # 預設權重為高，確保未包含關鍵字的排在後面（如果需要）
    base_weight = 1000.0

    # 1. 天干地支 (甲 < 乙 < 丙...)
    # 這裡賦予數字權重，確保甲組 (1) 在乙組 (2) 之前
    mapping = {
        '甲': 1, '乙': 2, '丙': 3, '丁': 4, '戊': 5,
        'A': 1, 'B': 2, 'C': 3,
        '一': 1, '二': 2, '三': 3, # 針對組別為數字的情況 (如果存在)
    }

    # 檢查並應用權重
    for char, weight in mapping.items():
        if char in dept_name:
            # 找到關鍵字後，權重越低越靠前
            return base_weight + weight # 確保所有組別都在基礎名稱之後排序

    # 2. 處理數字組別 (例如 組1, 組2)
    match = re.search(r'組(\d+)|班(\d+)', dept_name)
    if match:
        num = int(match.group(1) or match.group(2))
        return base_weight + num * 0.1
        
    # 如果沒有找到任何組別標識符，則保持原始字串排序（作為最後的保險）
    return 1000

def integrate_data(start_year: int, end_year: int) -> Dict:
    """
    整合多年度的校系數據，修復合併案例追溯不完整的錯誤，並使用緩存避免重複 IO。
    
    :param start_year: 最早的年份 (e.g., 112)
    :param end_year: 最新的年份 (e.g., 115)
    :return: 整合後的 JSON 結構
    """
    
    # ----------------------------------------------------
    # I. 數據緩存與初始化 (解決 IO 性能問題)
    # ----------------------------------------------------
    
    data_cache: Dict[str, Dict] = {}
    
    # 載入所有年份的歷史數據 (result.json)
    for year in range(start_year, end_year): # e.g., 112, 113, 114
        path = os.path.join(DATA_DIR, str(year), 'result.json')
        data_cache[f'result_{year}'] = load_json_file(path)

    # 載入所有年份的改名映射 (dept_renamed.json)
    # 這裡的映射是 target_year 的映射，定義了 target_year-1 的舊名 -> target_year 的新名
    # 我們需要逆向映射： 新名 -> 舊名列表
    reverse_maps: Dict[int, Dict[str, Dict[str, List[str]]]] = {} 
    
    for year in range(start_year + 1, end_year + 1): # e.g., 113, 114, 115
        path = os.path.join(DATA_DIR, str(year), 'dept_renamed.json')
        forward_map_for_year = load_json_file(path) # 結構: { 學校: { 舊名: [新名列表] } }
        
        # 建立逆向映射: { 學校: { 新名: [舊名列表] } }
        reverse_maps[year] = {}
        
        for uni, forward_map_for_uni in forward_map_for_year.items():
            reverse_maps[year][uni] = {}
            for old_dept_name, new_dept_names in forward_map_for_uni.items():
                for new_dept_name in new_dept_names:
                    # 如果新系名是 key, 舊系名是 value
                    reverse_maps[year][uni].setdefault(new_dept_name, []).append(old_dept_name)

    # 載入最新一年的數據 (115) 作為基準
    current_data_path = os.path.join(DATA_DIR, str(end_year), 'all_department_criteria.json')
    integrated_data = load_json_file(current_data_path)
    
    final_integrated_data: Dict = {}
    
    # ----------------------------------------------------
    # II. 核心數據追溯 (修正合併追溯問題)
    # ----------------------------------------------------

    for uni, depts_115 in integrated_data.items():
        if uni not in final_integrated_data:
            final_integrated_data[uni] = {}
            
        for dept_115 in depts_115.keys():
            
            # 初始化 115 年數據
            final_integrated_data[uni][dept_115] = {str(end_year): depts_115[dept_115]}
            
            # current_dept_names 存儲的是目標年份 (target_year) 的系名列表
            # 我們從 end_year (115) 的單個系名開始
            current_dept_names: List[str] = [dept_115]
            
            # 迭代年份: 從 end_year (115) 開始追溯到 start_year (112)
            # target_year 表示當前迭代目標是哪個年份的映射
            for target_year in range(end_year, start_year, -1): # e.g., 115, 114, 113
                
                history_data_year = target_year - 1 # e.g., 114, 113, 112
                
                # 獲取逆向映射表: { 新名: [舊名列表] }
                reverse_map_for_uni = reverse_maps.get(target_year, {}).get(uni, {})
                
                # 獲取歷史數據緩存
                history_data = data_cache.get(f'result_{history_data_year}', {})
                history_data_for_uni = history_data.get(uni, {})
                
                next_old_dept_names: List[str] = []
                history_records_for_current_dept: List[Dict] = []
                
                # 追溯所有可能的 "當前系名" (current_dept_names) 在歷史數據年 (history_data_year) 的"舊系名"
                for dept_name_at_target_year in current_dept_names:
                    
                    # 1. 檢查是否有明確的逆向映射 (例如：114甲組+乙組 -> 115學士班)
                    if dept_name_at_target_year in reverse_map_for_uni:
                        # 找到了多個舊系名 (例如：甲組和乙組)
                        old_names = reverse_map_for_uni[dept_name_at_target_year]
                    else:
                        # 假設沒有改名或合併
                        old_names = [dept_name_at_target_year] 
                    
                    
                    # 2. 獲取這些舊系名在歷史年份的數據，並準備下一輪追溯
                    for old_name in old_names:
                        
                        if old_name in history_data_for_uni:
                            # 找到歷史數據，加入列表
                            history_item = history_data_for_uni[old_name].copy()
                            history_item["校系名稱"] = old_name # 記錄當時的系名
                            history_records_for_current_dept.append(history_item)
                            
                        # 無論是否有數據，這個舊名都會成為下一輪追溯的目標
                        next_old_dept_names.append(old_name)

                
                # 3. 儲存歷史紀錄到 final_integrated_data
                if history_records_for_current_dept:
                    # 使用自定義函數作為 Key 進行排序
                    history_records_for_current_dept.sort(
                        key=lambda x: get_department_sort_key(x["校系名稱"])
                    )
                    # 歷史紀錄可能有多筆 (例如：甲組和乙組的數據)
                    final_integrated_data[uni][dept_115][str(history_data_year)] = history_records_for_current_dept
                
                # 4. 準備下一輪迭代 (將所有找到的舊系名作為下一輪要追溯的目標)
                # 確保列表是唯一的
                current_dept_names = list(set(next_old_dept_names)) 
                
                # 如果找不到任何舊系名，則停止追溯
                if not current_dept_names:
                    break

    return final_integrated_data


# =======================================================
# 執行程式碼 (保持不變)
# =======================================================
if __name__ == "__main__":
    
    # 💡 確保您在此處取消註釋並運行了模擬數據，特別是 114年/113年 的映射，以測試追溯邏輯。
    
    final_result = integrate_data(TARGET_START_YEAR, CURRENT_YEAR)

    # 寫入最終結果
    # 確保 datas 資料夾存在，否則會報錯
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True) 
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(final_result, f, ensure_ascii=False, indent=4)
    
    print(f"\n✅ 數據整合完成！結果已儲存至 {OUTPUT_FILE}")