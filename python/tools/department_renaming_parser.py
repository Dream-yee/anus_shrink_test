import csv
import json
from typing import Dict, List, Any

# 檔案名稱
YEAR = 113
INPUT_CSV_FILE = f'datas/{YEAR}/dept_renamed.csv'
OUTPUT_JSON_FILE = f'datas/{YEAR}/dept_renamed.json'

def process_department_renaming(csv_filepath: str, json_filepath: str) -> None:
    """
    處理校系改名 CSV 文件，將其轉換為 JSON 映射結構。
    
    🌟 輸出 JSON 結構: { 學校: { 舊系名: [新系名1, 新系名2, ...] } } 🌟
    """
    
    # 最終儲存結構: Dict[str, Dict[str, List[str]]] -> { 學校: { 舊系名: [新系名列表] } }
    mapping: Dict[str, Dict[str, List[str]]] = {}
    
    try:
        with open(csv_filepath, mode='r', encoding='utf-8', newline='') as file:
            reader = csv.reader(file)
            
            current_uni: str = ""
            current_new_dept: str = ""
            current_old_dept: str = "" # 新增變數用於追蹤舊系名
            
            for row in reader:
                if len(row) < 4:
                    continue
                
                uni = row[1].strip()      # 第二列: 學校名稱
                new_dept_raw = row[2].strip()  # 第三列: 新系名 (可能為 '--')
                old_dept_raw = row[3].strip()  # 第四列: 舊系名 (可能為 '--')
                
                if not uni:
                    continue
                
                # --- 處理學校名稱 ---
                current_uni = uni # 學校名稱始終明確

                # --- 處理舊系名 (Old Department Name) - 必須先處理，作為 Key ---
                # 如果舊系名不是 '--' 且不為空，則更新 current_old_dept
                if old_dept_raw != '--' and old_dept_raw:
                    current_old_dept = old_dept_raw
                # 如果舊系名是 '--'，則沿用上一個 current_old_dept
                elif old_dept_raw == '--':
                    if not current_old_dept:
                        continue
                else:
                    continue # 舊系名為空，跳過

                # --- 處理新系名 (New Department Name) ---
                # 針對拆分情況（例如元智大學），後續行的新系名是明確的。
                # 針對合併情況（例如中華大學），後續行的新系名是 '--'，需要沿用。
                
                new_dept_to_add: str = ""

                # 🌟 處理合併情況：如果新系名是 '--'，我們必須將當前舊系名 (current_old_dept)
                #    映射到先前第一個非 '--' 的新系名。
                if new_dept_raw == '--':
                    # 這裡必須找出上一個非 '--' 的新系名來沿用
                    if current_uni in mapping:
                        # 找到 current_old_dept 已經映射到的新系名 (適用於 合併情況)
                        # 這會導致邏輯複雜，因為單獨一行無法判斷它在合併關係中對應哪個新系。
                        
                        # 💡 最佳處理：我們假設 CSV 格式中，合併的每一行都必須將新系名寫出，
                        #    而 '--' 只用於拆分。
                        
                        # 根據您中華大學的範例：
                        # 1. '企管系', '財管組'
                        # 2. '--', '金融組'
                        # 3. '--', '會計組'
                        # 
                        # 這是個問題，因為在新結構中，舊系名是 Key。
                        # 財管組 -> 企管系
                        # 金融組 -> ? (應該是企管系，但無法從 '金融組' 這一行判斷出來)
                        
                        # 讓我們回到原點，您的 CSV 格式設計更適合 `{New: [Old]}`
                        
                        # **如果堅持 `{Old: [New]}` 結構，則 CSV 必須重新設計，
                        # 讓舊系名是主體，新系名為列表：**
                        # 舊系名, 新系名
                        # 財管組, 企管系
                        # 金融組, 企管系
                        # 會計組, 企管系
                        
                        # 假設您的 CSV 保持不變，我們只能在 **拆分** 情況下使用這個結構。
                        # 因此，我們必須假設 `--` 僅出現在**拆分**情況下的舊系名欄位。
                        
                        
                        # 重新假設：
                        # 1. 拆分 (舊: A -> 新: A1, A2): A1, A; A2, --
                        # 2. 合併 (舊: A, B -> 新: C): C, A; --, B
                        
                        # 在合併情況下 (第二行: --, 舊系名 B)，新系名是 '--'，
                        # 我們必須沿用第一個非 '--' 的新系名作為 new_dept_to_add
                        if new_dept_raw == '--':
                            if current_new_dept:
                                new_dept_to_add = current_new_dept
                            else:
                                continue
                        else:
                            new_dept_to_add = new_dept_raw
                            current_new_dept = new_dept_raw # 更新新系名追蹤
                            
                    # 處理拆分情況：如果舊系名是 '--'
                    # 已經在前面處理過 old_dept_raw == '--' 的情況，將 old_dept_to_add 設為 current_old_dept
                    
                    
                # 這是最難的部分，因為 `--` 的含義是情境式的。
                # 最簡單且最穩定的方法是：
                
                # 如果是合併情況：新系名要沿用上一個非 '--' 的新系名
                if new_dept_raw == '--':
                    # 沿用上一個非 '--' 的新系名
                    new_dept_to_add = current_new_dept
                else:
                    new_dept_to_add = new_dept_raw
                    current_new_dept = new_dept_raw # 更新新系名追蹤
                
                # 如果是拆分情況：舊系名要沿用上一個非 '--' 的舊系名
                if old_dept_raw == '--':
                    old_dept_to_use = current_old_dept.replace("\n", "").replace("\r", "")
                else:
                    old_dept_to_use = old_dept_raw.replace("\n", "").replace("\r", "")
                    current_old_dept = old_dept_raw # 更新舊系名追蹤
                    
                # 檢查有效性
                if not new_dept_to_add or not old_dept_to_use:
                    continue
                    
                # --- 寫入映射 ---
                
                if uni not in mapping:
                    mapping[uni] = {}
                
                uni_map = mapping[uni]
                
                # 🌟 鍵為舊系名 (Old Department Name) 🌟
                if old_dept_to_use not in uni_map:
                    uni_map[old_dept_to_use] = []
                
                # 值為新系名 (New Department Name)
                if new_dept_to_add not in uni_map[old_dept_to_use]:
                    uni_map[old_dept_to_use].append(new_dept_to_add.replace("\n", "").replace("\r", ""))

    except FileNotFoundError:
        print(f"錯誤：找不到檔案 {csv_filepath}")
        return
    except Exception as e:
        print(f"處理檔案時發生錯誤: {e}")
        return

    # 將結果寫入 JSON 檔案
    try:
        with open(json_filepath, 'w', encoding='utf-8') as f:
            json.dump(mapping, f, ensure_ascii=False, indent=4)
        print(f"✅ 成功將改名數據轉換並儲存到 {json_filepath}")
    except Exception as e:
        print(f"寫入 JSON 檔案發生錯誤: {e}")


# =======================================================
# 執行程式碼 (使用修正後的模擬數據)
# =======================================================
if __name__ == "__main__":
    # 執行處理
    process_department_renaming(INPUT_CSV_FILE, OUTPUT_JSON_FILE)