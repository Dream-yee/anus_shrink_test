from bs4 import BeautifulSoup
import json
from collections import defaultdict
import re

# 假設您的 HTML 檔案名為 'input_page.html'
HTML_FILE = '115_AST_school.html'
# 輸出 JSON 檔案名
OUTPUT_JSON_FILE = 'department_eids.json'

def extract_department_eids(html_filepath: str):
    """
    從 HTML 檔案中提取所有校系名稱和對應的 data-eid，並保存為 JSON 格式。
    
    Args:
        html_filepath (str): 輸入 HTML 檔案的路徑。
        json_filepath (str): 輸出 JSON 檔案的路徑。
    """
    try:
        with open(html_filepath, 'r', encoding='utf-8') as f:
            html_content = f.read()
    except FileNotFoundError:
        print(f"錯誤：找不到檔案 {html_filepath}。請檢查檔案路徑。")
        return
    except Exception as e:
        print(f"讀取檔案發生錯誤: {e}")
        return

    # 使用 BeautifulSoup 解析 HTML
    soup = BeautifulSoup(html_content, 'html.parser')

    # 最終儲存結果的字典結構：{學校: {科系: data-eid}}
    # 使用 defaultdict 以便於自動創建內層字典
    output_data = defaultdict(dict)
    
    # 查找所有 class 包含 'btn-detail' 的 <button> 標籤
    buttons = soup.find_all('button', class_='btn-detail')
    
    processed_count = 0
    
    for button in buttons:
        eid = button.get('data-eid')
        
        # 確保 data-eid 存在
        if not eid:
            continue
        
        # 提取學校名稱和科系名稱
        # 由於您提供的 HTML 片段中，名稱位於 <span class="span-search"> 內，
        # 但結構可能因為格式化而有所不同，我們考慮兩種常見的提取方式：
        
        # 方式 1: 查找 span 標籤
        spans = button.find_all('span', class_='span-search')
        
        if len(spans) >= 2:
            # 假設第一個 span 是學校，第二個是科系
            university = spans[0].text.strip()
            department = spans[1].text.strip()
            
        else:
            # 方式 2: 如果沒有 span-search (例如您的第二個片段)，直接從 button 文本中提取
            # 這需要更複雜的解析，因為數據是分行且可能被 <br> 分隔
            
            # 使用 button.get_text() 獲取所有文本內容，並用換行或 <br> 分割
            text_parts = [p.strip() for p in button.stripped_strings if p.strip()]
            
            if len(text_parts) >= 2:
                 # 假設按順序是學校和科系
                university = text_parts[0]
                department = text_parts[1]
            else:
                # 無法解析的情況，跳過
                print(f"警告：無法解析 data-eid={eid} 的校系名稱。跳過。")
                continue
        
        # 儲存數據
        # 由於 data-eid 在 HTML 屬性中通常是字串，我們保留它為字串格式
        output_data[university][department] = eid
        processed_count += 1

    # 將 defaultdict 轉換為標準 dict
    final_output = dict(output_data)

    return final_output
    # 寫入 JSON 檔案
    # try:
    #     with open(json_filepath, 'w', encoding='utf-8') as f:
    #         # 使用 ensure_ascii=False 確保中文正常顯示，並使用 indent=4 格式化
    #         json.dump(final_output, f, ensure_ascii=False, indent=4)
    #     print(f"✅ 成功提取 {processed_count} 個校系的 data-eid，並儲存到 {json_filepath}")
    # except Exception as e:
    #     print(f"寫入 JSON 檔案發生錯誤: {e}")


# =======================================================
# 執行腳本
# =======================================================
if __name__ == "__main__":
    extract_department_eids(HTML_FILE)