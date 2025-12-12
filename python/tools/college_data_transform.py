import csv
import json
import re
from collections import defaultdict
from typing import Dict, Any

def convert_division_exam_data(csv_filepath):
    """
    讀取分科測驗 CSV 數據，將其轉換為按學校分組的 JSON 格式。
    在轉換過程中，將錄取標準由加權總分轉換為加權平均分數。
    
    Args:
        csv_filepath (str): 輸入 CSV 檔案的路徑。
        json_filepath (str): 輸出 JSON 檔案的路徑。
    """
    
    # 科目名稱簡寫與全名的對應字典
    SUBJECT_MAP = {
        "國": "國文", "英": "英文", "自": "自然", "社": "社會", 
        "物": "物理", "化": "化學", "生": "生物", "歷": "歷史", 
        "地": "地理", "公": "公民", "數甲": "數甲", "數乙": "數乙", 
        "數A": "數A", "數B": "數B"
    }

    # 最終儲存結果的字典結構：{學校: {科系: {資料}}}
    output_data = defaultdict(lambda: defaultdict(dict))
    processed_rows = 0

    try:
        # 關鍵變更：將 delimiter 設定為 ',' (逗號)
        with open(csv_filepath, 'r', encoding='utf-8', newline='') as csvfile:
            reader = csv.reader(csvfile, delimiter=',')
            
            for i, row in enumerate(reader):
                
                if not row:
                    continue
                    
                dept_code_raw = row[0].strip()
                if not re.match(r'^\d+$', dept_code_raw):
                    continue

                cleaned_row = [item.strip() for item in row]
                
                if len(cleaned_row) < 6:
                    print(f"警告：跳過行 {i+1}，數據欄位不足，僅找到 {len(cleaned_row)} 個欄位。")
                    continue


                try:
                    university = cleaned_row[1]
                    department = cleaned_row[2].replace("\n", "").replace("\r", "")
                    criteria_str = cleaned_row[3]
                    admitted_count = int(cleaned_row[4])
                    
                    # --- 處理一般考生錄取分數 (索引 5) ---
                    standard_general = None
                    general_raw = cleaned_row[5].strip()
                    
                    if general_raw != '------' and general_raw.replace('.', '', 1).isdigit():
                        standard_general = float(general_raw)
                    
                    if standard_general is None:
                         # 如果一般生錄取分數無效，則跳過此行
                         continue

                    # --- 處理原住民考生錄取分數 (索引 6) ---
                    standard_indigenous = None
                    if len(cleaned_row) > 6 and cleaned_row[6]:
                        indigenous_raw = cleaned_row[6].strip()
                        
                        if indigenous_raw != '------' and indigenous_raw.replace('.', '', 1).isdigit():
                            standard_indigenous = float(indigenous_raw)
                        
                except (IndexError, ValueError) as e:
                    print(f"警告：跳過行 {i+1}，數據解析錯誤: {e}，原始數據: {cleaned_row}")
                    continue

                # --- 3. 解析科目倍數 (Criteria Parsing) ---
                
                subject_multipliers: Dict[str, float] = {}
                weighted_sum: float = 0.0  # 用於計算加權總倍數 (W_total)
                
                criteria_items = criteria_str.split()
                
                for item in criteria_items:
                    if 'x' in item:
                        parts = item.split('x')
                        if len(parts) == 2:
                            abbr = parts[0].strip()
                            multiplier_str = parts[1].strip()
                            
                            full_name = SUBJECT_MAP.get(abbr, abbr)
                            
                            try:
                                multiplier = float(multiplier_str)
                                subject_multipliers[full_name] = multiplier
                                weighted_sum += multiplier  # 累計加權總倍數
                            except ValueError:
                                print(f"警告：科系 {university}-{department} 的倍數 '{multiplier_str}' 無法轉換為數字。")
                                continue

                # --- 4. 執行分數轉換：總分 -> 平均分數 ---
                
                new_general_average = None
                new_indigenous_average = None
                
                if weighted_sum > 0:
                    # 一般考生：總分 / 加權總倍數
                    new_general_average = round(standard_general / weighted_sum, 2)
                    
                    if standard_indigenous is not None:
                        # 原住民考生：(總分 / 1.35) / 加權總倍數
                        # 1.35 代表 35% 加分
                        adjusted_score = standard_indigenous / 1.35 
                        new_indigenous_average = round(adjusted_score / weighted_sum, 2)
                else:
                    print(f"警告：科系 {university}-{department} 的加權總倍數為 0，無法計算平均分數。")
                    # 如果無法計算平均分，則保留原始總分
                    new_general_average = standard_general
                    new_indigenous_average = standard_indigenous


                # --- 5. 構建輸出結構 ---
                
                department_data: Dict[str, Any] = {
                    "科目倍數": subject_multipliers,
                    "錄取人數": admitted_count,
                    # 替換為計算後的平均分數
                    "一般考生錄取標準": new_general_average, 
                }
                
                if new_indigenous_average is not None:
                    # 替換為計算後的平均分數
                    department_data["原住民考生錄取標準"] = new_indigenous_average
                
                output_data[university][department] = department_data
                processed_rows += 1

        # --- 6. 輸出 JSON 檔案 ---
        final_output = dict(output_data)

        print(f"✅ 成功將數據轉換並從college_data_transfrom轉出")
        print(f"總共處理了 {processed_rows} 條有效的校系數據。")
        return final_output

    except FileNotFoundError:
        print(f"錯誤：找不到檔案 {csv_filepath}。請確認檔案路徑是否正確。")
    except Exception as e:
        print(f"發生未知錯誤: {e}")


# =======================================================
# 執行腳本
# =======================================================

# INPUT_CSV = '114_04.csv' # 改檔名的地方
# OUTPUT_JSON = 'division_exam_data.json'

# convert_division_exam_data(INPUT_CSV, OUTPUT_JSON)