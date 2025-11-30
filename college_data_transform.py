from bs4 import BeautifulSoup
import json
import re
from typing import Dict, Any

# 假定 HTML 檔案路徑
HTML_FILE = '115學年度校系分則查詢系統.html'
# 輸出 JSON 檔案路徑
OUTPUT_JSON_FILE = 'extracted_dept_info.json'

# 科目名稱簡寫對應
SUBJECT_ABBR_MAP = {
    "數學甲": "數甲", "數學 A": "數A", "數學B": "數B",
    "國文": "國文", "英文": "英文", "物　理": "物理", 
    "化　學": "化學", "生　物": "生物", "歷史": "歷史", 
    "地理": "地理", "公民與社會": "公民", "英　聽": "英聽"
}

def clean_subject_name(name: str) -> str:
    """清理科目名稱，移除括號內的內容並轉換為簡寫。"""
    # 1. 移除括號內容 (學測/分科)
    name = re.sub(r'\s*\(.*?\)', '', name).strip()
    # 2. 轉換為簡寫，並移除中文全形空格
    name = name.replace('　', '').strip()
    return SUBJECT_ABBR_MAP.get(name, name)

def parse_criteria(criteria_html: str) -> Dict[str, str]:
    """解析學測檢定標準 (e.g., '數學 A (均標)')."""
    criteria = {}
    
    # 查找所有 <li> 標籤
    soup = BeautifulSoup(criteria_html, 'html.parser')
    list_items = soup.find_all(['li', 'div']) # 考慮可能是 div 或 li

    if not list_items:
        # 如果沒有 <li>，嘗試直接從文本解析
        text = soup.get_text(separator=' ', strip=True)
        items = text.split('<br>')
    else:
        # 從 ol/ul/li 結構中提取文本
        items = [item.get_text(separator=' ', strip=True) for item in list_items]

    for item in items:
        item = item.strip()
        if not item:
            continue
            
        # 尋找 科目 (標準) 的模式
        match = re.search(r'(.+?)\s*\((\S+)\)', item)
        if match:
            subject_raw = match.group(1).strip()
            standard = match.group(2).strip()
            
            subject_name = clean_subject_name(subject_raw)
            
            if subject_name and standard:
                criteria[subject_name] = standard
                
    return criteria

def parse_multiplier(multiplier_text: str) -> Dict[str, float]:
    """解析科目倍數及加權 (e.g., '數學甲(分科) x 1.00')."""
    multipliers = {}
    
    # 查找 科目 (括號內容可有可無) x 數字 的模式
    match = re.search(r'(.+?)x\s*(\d+\.?\d*)', multiplier_text)
    
    if match:
        subject_raw = match.group(1).strip()
        multiplier_str = match.group(2).strip()
        
        subject_name = clean_subject_name(subject_raw)
        
        try:
            multiplier = float(multiplier_str)
            if subject_name:
                multipliers[subject_name] = multiplier
        except ValueError:
            pass
            
    return multipliers

def extract_university_name(soup: BeautifulSoup) -> str:
    """從查詢條件中提取學校名稱。"""
    # 查找包含查詢條件文本的 div
    search_div = soup.find('div', id='search')
    if not search_div:
        return "未知學校"
    
    # 查詢條件文本在第一個 <p class="title"> 之後的 div 中
    target_div = search_div.find('p', class_='title').find_next('div')
    
    if target_div:
        text = target_div.get_text(strip=True)
        # 假設格式是 "學校名稱-學系名稱..."
        if '-' in text:
            return text.split('-')[0].strip()
            
    return "未知學校"


def extract_table_data(html_filepath: str, json_filepath: str):
    """主函數：提取 HTML 表格中的科系數據。"""
    try:
        with open(html_filepath, 'r', encoding='utf-8') as f:
            html_content = f.read()
    except Exception as e:
        print(f"讀取檔案發生錯誤: {e}")
        return

    soup = BeautifulSoup(html_content, 'html.parser')
    
    # 1. 提取學校名稱
    university_name = extract_university_name(soup)
    print(f"解析到的學校名稱：{university_name}")
    
    # 2. 找到主表格
    table = soup.find('table')
    if not table:
        print("錯誤：未找到表格。")
        return

    # 最終輸出的數據結構
    output_data = {university_name: {}}
    
    rows = table.find('tbody').find_all('tr')
    data_rows = rows[1:] # 跳過標題行
    
    current_dept_info: Dict[str, Any] = {} # 用於儲存 rowspan 資訊

    # 3. 遍歷數據行
    for i, row in enumerate(data_rows):
        
        cells = row.find_all(['td', 'th'])
        
        # 檢查是否為新科系的起點 (即第一個 cell 有 rowspan 屬性)
        # 這裡檢查 cells[0] 是否有 rowspan 屬性，或是否為第一行（i=0）
        is_new_department = i == 0 or 'rowspan' in cells[0].attrs
        
        # 科目倍數及加權（位於第 7 個 td，索引 6）
        # 我們將科目倍數儲存格的索引設為固定的
        MULTIPLIER_CELL_INDEX_START = 6
        
        if is_new_department:
            # --- 處理新科系 ---
            
            # 科系名稱在 cells[0]
            dept_cell = cells[0]
            dept_name = dept_cell.get_text(separator=' ', strip=True).strip()
            
            if not dept_name:
                continue

            rowspan_val = int(dept_cell.get('rowspan', 1))
            
            # 學測檢定標準在 cells[5]
            criteria_cell = cells[5]
            
            # 提取並解析學測檢定標準
            criteria_html = str(criteria_cell.contents)
            parsed_criteria = parse_criteria(criteria_html)
            
            # 初始化科系數據
            current_dept_info = {
                "學測參採": parsed_criteria,
                "科目倍數": {},
                "__dept_name__": dept_name,
                "__rowspan__": rowspan_val # 追蹤剩下的行數
            }
            
            # 將新的科系數據加入輸出
            output_data[university_name][dept_name] = current_dept_info
            
            # 科目倍數及加權 cell (索引 6)
            multiplier_cell = cells[MULTIPLIER_CELL_INDEX_START]
            
        elif current_dept_info and current_dept_info.get("__rowspan__", 0) > 0:
            # --- 處理連續的科目倍數行 ---
            
            # 科目倍數及加權 cell 在非起始行中通常是索引 0
            multiplier_cell = cells[0]
            
        else:
             # 追蹤失敗或無效行
             continue
        
        # --- 解析科目倍數及加權 ---
        multiplier_text = multiplier_cell.get_text(strip=True)
        
        # 如果內容是 '--' 則跳過
        if multiplier_text.replace('-', '').strip() == '':
            pass
        else:
            parsed_multipliers = parse_multiplier(multiplier_text)
            current_dept_info["科目倍數"].update(parsed_multipliers)

        # 追蹤 rowspan
        if '__rowspan__' in current_dept_info:
            current_dept_info["__rowspan__"] -= 1

        # 如果 rowspan 結束，重置 current_dept_info
        if current_dept_info.get("__rowspan__", 0) <= 0:
            del current_dept_info["__rowspan__"]
            del current_dept_info["__dept_name__"]
            current_dept_info = {}

    # 清理所有追蹤用的臨時鍵
    for dept_data in output_data[university_name].values():
        dept_data.pop('__rowspan__', None)
        dept_data.pop('__dept_name__', None)

    # 寫入 JSON 檔案
    try:
        with open(json_filepath, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, ensure_ascii=False, indent=4)
        print(f"✅ 成功提取數據並儲存到 {json_filepath}")
    except Exception as e:
        print(f"寫入 JSON 檔案發生錯誤: {e}")

# =======================================================
# 執行腳本
# =======================================================
if __name__ == "__main__":
    # 注意：請將您完整的 HTML 內容保存為 'input_table.html'
    extract_table_data(HTML_FILE, OUTPUT_JSON_FILE)