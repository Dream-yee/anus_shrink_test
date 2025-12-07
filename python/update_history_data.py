import json
from typing import Dict, Any, List

# --- 設定常數 ---
# 歷史數據檔案名 (如果不存在，會自動創建)
HISTORICAL_FILE = 'historical_results.json'
# 當前年度的數據檔案名
NEW_DATA_FILE = 'very_result_112.json' # 記得改 記得改 記得改 拜託你了
# 確保保留的資料年份數量 (例如：保留 114, 113, 112 三個年份)
YEARS_TO_KEEP = 3 
# 當前要新增的年份 (請手動修改此處，例如今年是 114)
CURRENT_YEAR = 112


def load_json(filepath: str) -> Dict[str, Any]:
    """安全地載入 JSON 檔案，如果檔案不存在則返回空字典。"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"提示: 找不到檔案 {filepath}，將使用空數據初始化。")
        return {}
    except json.JSONDecodeError:
        print(f"錯誤: 檔案 {filepath} 格式錯誤。請檢查。")
        return {}

def save_json(data: Dict[str, Any], filepath: str):
    """將數據寫入 JSON 檔案。"""
    try:
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=4)
        print(f"✅ 歷史數據已成功更新並儲存到 {filepath}")
    except Exception as e:
        print(f"寫入檔案 {filepath} 發生錯誤: {e}")

def get_years_to_remove(current_year: int, years_to_keep: int) -> List[str]:
    """計算並返回需要被刪除的舊年份列表 (字串格式)。"""
    # 假設年份是連續的，我們只需要刪除 current_year - years_to_keep 以前的年份
    # 例如: 114, keep 3 -> 刪除 110, 109, ...
    
    years_to_remove = []
    # 假設我們從 100 年開始追蹤
    for year in range(100, current_year - years_to_keep + 1):
        if year < current_year: # 確保不會刪除當前年或未來年
            years_to_remove.append(str(year))
    
    # 為了更安全，只刪除比 "current_year - years_to_keep" 舊的年份
    # 實際刪除的年份應該是: 最小保留年份 - 1
    min_year_to_keep = current_year - years_to_keep + 1
    
    years_to_remove_final = [str(y) for y in range(100, min_year_to_keep) if y > 0]
    
    # 這裡只刪除 "四年以前" 的數據，所以刪除的目標是 (current_year - 3) 及更早的年份
    # e.g., current_year=114, keep=3. 保留 114, 113, 112. 刪除 111, 110, ...
    year_to_delete_from = current_year - years_to_keep
    
    # 更正：我們只需要找出所有可能存在的、比最小保留年份還小的年份
    years_to_remove = [str(y) for y in range(100, year_to_delete_from + 1)]

    return years_to_remove


def update_and_clean_historical_data():
    """主要功能：將新數據併入歷史數據並清理舊數據。"""
    
    # 1. 載入數據
    historical_data = load_json(HISTORICAL_FILE)
    new_data = load_json(NEW_DATA_FILE)
    
    if not new_data:
        print("操作終止: 未能載入最新的年度數據。")
        return

    # 2. 將新數據併入歷史數據
    # 歷史數據的結構: {學校: {科系: {年份: {數據}}}}
    
    departments_updated_count = 0
    
    for university, departments in new_data.items():
        if university not in historical_data:
            historical_data[university] = {}
            
        for department, dept_data in departments.items():
            
            # 初始化科系的歷史記錄
            if department not in historical_data[university]:
                # 複製新的數據，因為我們不希望原始數據被修改
                historical_data[university][department] = {}
            
            # 確保 "科目倍數" 和 "錄取人數" 等基本欄位存在於科系層級 (如果需要)
            # 這裡我們只將年度數據存入年份字典
            
            # 將當前年份的數據存入科系字典中
            # 避免覆蓋，先準備好要存的年度數據
            
            # 刪除新數據中的科目倍數和錄取人數，因為這些應該是相對靜態的，
            # 且您上一步的 JSON 格式中，這些欄位是科系層級的屬性。
            # 但如果您要保留原始 very_result_114.json 的所有內容，則保留。
            # 為了簡單起見，我們保留所有內容，但將其存入年份字典。
            
            # 備份一份當前科系的數據，以便存入年份鍵中
            annual_data_to_store = dept_data.copy()
            
            historical_data[university][department][str(CURRENT_YEAR)] = annual_data_to_store
            departments_updated_count += 1

    print(f"成功合併 {str(CURRENT_YEAR)} 年的數據。共更新 {departments_updated_count} 個科系。")


    # 3. 滾動刪除舊數據 (僅保留最近 {YEARS_TO_KEEP} 年)
    
    years_to_remove = get_years_to_remove(CURRENT_YEAR, YEARS_TO_KEEP)
    years_removed_count = 0

    if not years_to_remove:
        print("無需刪除舊年份數據。")
    else:
        for university in list(historical_data.keys()):
            for department in list(historical_data[university].keys()):
                
                dept_history = historical_data[university][department]
                
                # 遍歷需要刪除的年份，並從科系歷史記錄中移除
                for year in years_to_remove:
                    if year in dept_history:
                        del dept_history[year]
                        years_removed_count += 1
                        
                # 清理：如果科系歷史記錄變成空字典，可以考慮刪除該科系（但為了簡單，這裡不刪除空科系）

        print(f"已清理舊數據。總共刪除了 {years_removed_count} 條舊年度記錄。")


    # 4. 儲存更新後的歷史數據
    save_json(historical_data, HISTORICAL_FILE)


# =======================================================
# 執行腳本
# =======================================================
if __name__ == "__main__":
    update_and_clean_historical_data()