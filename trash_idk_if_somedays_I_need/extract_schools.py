import json
from typing import Dict
from bs4 import BeautifulSoup
import os
import re

# --- 設定常數 ---
REGION_NAME = "嘉南"
HTML_FILE_NAME = "嘉南.html"
OUTPUT_FILE_NAME = "schools_by_region.json"

def extract_schools_from_html(html_path: str, region: str) -> Dict[str, str]:
    """
    從 HTML 檔案中提取所有學校名稱，並將其映射到指定區域。
    
    :param html_path: 嘉南.html 檔案路徑
    :param region: 區域名稱 (e.g., "嘉南")
    :return: 提取的學校字典 {學校名稱: 區域名稱}
    """
    if not os.path.exists(html_path):
        print(f"錯誤：找不到檔案 {html_path}。請確保檔案路徑正確。")
        return {}

    with open(html_path, 'r', encoding='utf-8') as f:
        html_content = f.read()

    soup = BeautifulSoup(html_content, 'html.parser')
    
    # 找到所有包含學校名稱的按鈕。
    # 這些按鈕有一個共同的 CSS 類別： 'btn-school'
    school_buttons = soup.find_all('button', class_='btn-school')
    
    school_map: Dict[str, str] = {}
    
    for button in school_buttons:
        # 學校名稱位於 <button> 內的 <span class="span-search"> 標籤中
        span_tag = button.find('span', class_='span-search')
        
        if span_tag:
            full_text = span_tag.text.strip()
            
            # 學校名稱格式是 "004-國立成功大學"
            # 使用正則表達式或簡單分割來去除前面的編號 (e.g., "004-")
            
            # 使用正則表達式：找到 '-' 後面的所有內容
            match = re.search(r'^\d+-(.+)', full_text)
            
            if match:
                school_name = match.group(1).strip()
            else:
                # 如果沒有編號，就直接使用全文
                school_name = full_text
            
            # 將學校名稱及其區域加入結果字典
            # 由於您可能有多個檔案要合併，這裡的邏輯是覆蓋（如果同一學校出現在不同區域，以最後一個為準）
            school_map[school_name] = region
            
    return school_map

def main():
    """主函數：提取、合併並輸出 JSON。"""
    
    # 假設您有多個檔案，您可以將其整理成一個列表
    # 🚨 請將此處替換為您所有的檔案列表，例如：
    files_to_process = [
        {"file": "嘉南.html", "region": "嘉南"},
        {"file": "北北基.html", "region": "北北基"}, 
        {"file": "桃竹苗.html", "region": "桃竹苗"},
        {"file": "中彰投.html", "region": "中彰投"},
        {"file": "宜花東.html", "region": "宜花東"},
        {"file": "金門.html", "region": "外島"},
        {"file": "高屏.html", "region": "高屏"},
    ]
    
    all_schools: Dict[str, str] = {}

    for item in files_to_process:
        print(f"-> 正在處理檔案: {item['file']}，區域: {item['region']}...")
        
        # 呼叫提取函數
        current_schools = extract_schools_from_html(item['file'], item['region'])
        
        # 合併結果：使用字典的 update 方法進行合併
        all_schools.update(current_schools)
        print(f"   提取到 {len(current_schools)} 個學校。當前總計 {len(all_schools)} 個學校。")


    # 寫入 JSON 檔案
    with open(OUTPUT_FILE_NAME, 'w', encoding='utf-8') as f:
        json.dump(all_schools, f, ensure_ascii=False, indent=4)
    
    print(f"\n✅ 學校區域數據提取完成！")
    print(f"結果已儲存至 {OUTPUT_FILE_NAME}")

if __name__ == "__main__":
    main()