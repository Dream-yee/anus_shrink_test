import json
import math
from typing import Dict, List, Any, Optional

# --- 檔案路徑設定 ---
DIVISION_EXAM_FILE = 'division_exam_data.json'
SCORE_DISTRIBUTION_FILE = 'score_distribution.json'
OUTPUT_FILE = 'very_result_112.json'

# --- 函數定義：創建科目組合到組別代號的映射表 ---

def create_subject_group_map(score_data: Dict[str, Any]) -> Dict[frozenset, str]:
    """
    從分數分佈數據中創建科目組合到組別代號的映射表。
    使用 frozenset (不可變集合) 作為鍵，確保匹配不依賴順序。
    """
    subject_map = {}
    for group_id, data in score_data.items():
        subjects: List[str] = data.get("科目組合", [])
        subject_set = frozenset(subjects)
        if subject_set in subject_map:
            # 實際應用中，應確認是否真的有多個組別使用完全相同的科目組合
            pass 
        subject_map[subject_set] = group_id
    return subject_map

# --- 函數定義：計算達標比例 ---

def get_percentile_from_score(
    dept_data: Dict[str, Any], 
    group_id: str, 
    score_data: Dict[str, Any]
) -> Optional[float]:
    """
    根據科系的加權平均分數、科目數量和組別代號，從分數分佈數據中查找累積百分比。
    
    邏輯： (加權平均分數 * 科目數量) -> 向上取整 -> 查找百分比。
    
    Args:
        dept_data (Dict): 單一科系的數據，包含 "科目倍數" 和 "一般考生錄取標準"。
        group_id (str): 匹配到的組別代號 (e.g., "013")。
        score_data (Dict): score_distribution.json 的完整內容。
        
    Returns:
        Optional[float]: 找到的累積百分比，如果找不到則返回 None。
    """
    
    score_average = dept_data.get("一般考生錄取標準") # 這是加權平均分數
    multipliers = dept_data.get("科目倍數", {})
    
    if not isinstance(score_average, (int, float)):
        return None # 如果分數無效，則不處理

    # 1. 獲取科目數量 (N_subjects)
    # 科目數量是科目倍數字典中的鍵的數量
    num_subjects = len(multipliers) 
    
    if num_subjects == 0:
        return None

    # 2. 計算還原後的原始總分 (S_total)
    # 原始總分 = 加權平均分數 * 科目數量
    raw_total_score = score_average * num_subjects
    
    # 3. 向上取整
    # 使用 math.ceil() 函數
    ceil_score = math.ceil(raw_total_score)
    
    # 將分數轉換為字串鍵 (e.g., 258.0 -> "258")
    score_key = str(int(ceil_score)+1) 
    
    # 4. 查找數據
    group_data = score_data.get(group_id)
    if not group_data:
        return None
        
    percentiles: Dict[str, float] = group_data.get("累積百分比", {})
    
    # 5. 返回百分比
    # 這裡的百分比 p 表示 >= score_key 的考生所佔的比例
    return percentiles.get(score_key, 0)


# --- 函數定義：處理和匹配數據 ---

def process_and_match_data(
    exam_data: Dict[str, Any], 
    subject_map: Dict[frozenset, str], 
    score_distribution_data: Dict[str, Any]
) -> Dict[str, Any]:
    """
    處理分科測驗數據，匹配組別代號並計算達標比例。
    """
    matched_count = 0
    percentile_calculated_count = 0
    
    updated_exam_data = exam_data.copy()

    for university, departments in updated_exam_data.items():
        for department, dept_data in departments.items():
            
            # 1. 提取科目集合進行匹配
            multipliers = dept_data.get("科目倍數", {})
            required_subjects = frozenset(multipliers.keys())
            
            # 2. 查找匹配的組別代號
            group_id = subject_map.get(required_subjects)
            
            dept_data["組別代號"] = group_id
            dept_data["達標比例"] = None # 預設為 None

            if group_id:
                matched_count += 1
                
                # 3. 計算達標比例
                
                percentile = get_percentile_from_score(
                    dept_data=dept_data, 
                    group_id=group_id, 
                    score_data=score_distribution_data
                )
                    
                if percentile is not None:
                    # 將百分比保留小數點後兩位
                    dept_data["達標比例"] = round(percentile, 2)
                    percentile_calculated_count += 1

    print(f"\n--- 匹配結果摘要 ---")
    print(f"✅ 成功匹配到組別的校系數量: {matched_count}")
    print(f"📈 成功計算達標比例的校系數量: {percentile_calculated_count}")
    print("-" * 20)
    
    return updated_exam_data


def main():
    try:
        # 1. 載入數據
        with open(DIVISION_EXAM_FILE, 'r', encoding='utf-8') as f:
            division_exam_data = json.load(f)

        with open(SCORE_DISTRIBUTION_FILE, 'r', encoding='utf-8') as f:
            score_distribution_data = json.load(f)

        # 2. 創建科目組合到組別代號的映射表
        subject_group_map = create_subject_group_map(score_distribution_data)

        # 3. 處理並匹配分科測驗數據，計算達標比例
        updated_data = process_and_match_data(division_exam_data, subject_group_map, score_distribution_data)

        # 4. 儲存更新後的數據
        with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
            json.dump(updated_data, f, ensure_ascii=False, indent=4)
        
        print(f"\n✨ 數據整合完成！結果已儲存到 {OUTPUT_FILE}")

    except FileNotFoundError as e:
        print(f"錯誤: 找不到檔案。請確保兩個 JSON 檔案 ({DIVISION_EXAM_FILE} 和 {SCORE_DISTRIBUTION_FILE}) 都在當前目錄中。錯誤: {e}")
    except json.JSONDecodeError as e:
        print(f"錯誤: JSON 檔案解析失敗。請檢查檔案格式是否正確。錯誤: {e}")
    except Exception as e:
        print(f"發生未知錯誤: {e}")


if __name__ == "__main__":
    main()