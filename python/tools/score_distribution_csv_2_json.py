import csv
import json
from collections import defaultdict
import re

def convert_score_distribution(csv_filepath):
    """
    讀取分科測驗分數分布 CSV，將其轉換為按組別分組的 JSON 格式。

    Args:
        csv_filepath (str): 輸入 CSV 檔案的路徑。
        json_filepath (str): 輸出 JSON 檔案的路徑。
    """
    
    # 科目名稱全名與簡稱的對應字典
    # 這裡只包含需要修正的名稱
    SUBJECT_REPLACEMENT_MAP = {
        "公民與社會": "公民",
        "數學A": "數A",
        "數學B": "數B",
        "數學甲": "數甲",
        "數學乙": "數乙",
        "國文": "國文",
        "英文": "英文",
        "物理": "物理",
        "化學": "化學",
        "生物": "生物",
        "歷史": "歷史",
        "地理": "地理",
    }
    
    # 最終儲存結果的字典結構：{組別: {科目組合, 累積百分比}}
    output_data = defaultdict(lambda: {"科目組合": [], "累積百分比": {}})
    processed_rows = 0

    try:
        # 使用 'utf-8' 編碼讀取檔案，並設定 newline=''
        # 假設您的 CSV 檔案是逗號分隔 (delimiter=',')
        with open(csv_filepath, 'r', encoding='utf-8', newline='') as csvfile:
            # 假設沒有標頭行，或者如果有的話，您已經手動刪除
            reader = csv.reader(csvfile, delimiter=',')
            
            for i, row in enumerate(reader):
                # 確保行是有效的數據行
                if len(row) < 4:
                    continue
                
                # --- 1. 提取並清理欄位 ---
                
                try:
                    group_id = row[0].strip()          # 組別 (e.g., "001")
                    subjects_raw = row[1].strip()      # 科目組合 (e.g., "公民與社會、英文、數學B")
                    score_range = row[2].strip()       # 分數區間 (e.g., "179.01-180")
                    percentage_str = row[3].strip()    # 百分比 (e.g., "0.0")
                    
                    # 轉換百分比為浮點數
                    percentage = float(percentage_str)
                    
                except (IndexError, ValueError) as e:
                    print(f"警告：跳過行 {i+1}，數據解析錯誤: {e}，原始數據: {row}")
                    continue

                # --- 2. 解析分數區間 (提取 Y 值) ---
                
                # 分數區間格式為 X-Y (或 X.XX-Y)
                if '-' in score_range:
                    # 提取第二個分數 (Y 值)
                    y_str = score_range.split('-')[-1]
                    
                    try:
                        # 將 Y 值轉換為整數作為 JSON 鍵
                        score_key = str(int(float(y_str)))
                    except ValueError:
                        print(f"警告：跳過行 {i+1}，無法解析分數區間的 Y 值: {score_range}")
                        continue
                else:
                    continue # 無效的分數區間格式

                # --- 3. 處理科目組合名稱 ---
                
                if not output_data[group_id]["科目組合"]:
                    # 僅在第一次遇到該組別時，解析並儲存科目組合
                    
                    # 將科目名稱分開
                    subjects_list = [s.strip() for s in subjects_raw.split('、')]
                    
                    # 替換科目名稱為簡稱
                    processed_subjects = []
                    for subject in subjects_list:
                        found_replacement = False
                        # 檢查 SUBJECT_REPLACEMENT_MAP 中的所有替換規則
                        for full, abbr in SUBJECT_REPLACEMENT_MAP.items():
                            if full in subject:
                                processed_subjects.append(abbr)
                                found_replacement = True
                                break
                        # 如果沒有找到特定的替換規則，則使用原始名稱
                        if not found_replacement:
                            processed_subjects.append(subject)

                    output_data[group_id]["科目組合"] = processed_subjects

                # --- 4. 儲存累積百分比 ---
                
                # 將 "y": p 的格式寫入累積百分比字典
                output_data[group_id]["累積百分比"][score_key] = percentage
                processed_rows += 1
                
        # 5. 輸出 JSON 檔案
        # 將 defaultdict 轉為標準 dict
        final_output = dict(output_data)

        print(f"✅ 成功將分數分布數據從score_dis三小的_json.py轉換")
        print(f"總共處理了 {processed_rows} 條數據行，產生了 {len(final_output)} 個組別的數據。")

        return final_output

    except FileNotFoundError:
        print(f"錯誤：找不到檔案 {csv_filepath}。請確認檔案路徑是否正確。")
    except Exception as e:
        print(f"發生未知錯誤: {e}")


# =======================================================
# 執行腳本
# =======================================================

# INPUT_CSV = '114_score_distribution.csv' # 改檔名的地方
# OUTPUT_JSON = 'score_distribution.json'

# convert_score_distribution(INPUT_CSV, OUTPUT_JSON)