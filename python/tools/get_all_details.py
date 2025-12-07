import requests
import json
from typing import Dict, List, Any, Tuple
import time
from extract_department_details import extract_table_data

# --- 設定常數 ---
EID_FILE = 'department_eids.json'
ALL_DETAILS_FILE = 'all_department_criteria.json'
POST_URL = 'https://uac2.ncku.edu.tw/cross_search/index.php?c=search&m=detail'

def get_department_html_responses(eids_data) -> List[Tuple[str, str, str, str]]:
    """
    遍歷所有 EID，發送 POST 請求，並返回包含所有 HTML 響應的列表。
    
    返回: [ (學校名稱, 科系名稱, EID, HTML內容), ... ]
    """
    # 展開 EID 列表，以 university/department 為單位
    eids_list = []
    for uni, depts in eids_data.items():
        for dept, eid in depts.items():
            eids_list.append((uni, dept, eid))

    total_eids = len(eids_list)
    print(f"總共找到 {total_eids} 個 EID 準備發送請求。")
    
    # 設定會話以重用連線
    session = requests.Session()
    
    # Headers 模擬瀏覽器
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Content-Type': 'application/x-www-form-urlencoded',
    }

    result = {}

    for index, (expected_uni, expected_dept, eid) in enumerate(eids_list):
        
        post_data = {
            'dep_id': eid
        }

        if(result.get(expected_uni, None) == None):
            result[expected_uni] = {}
        
        try:
            # 執行 POST 請求
            response = session.post(POST_URL, data=post_data, headers=headers, timeout=10)
            response.raise_for_status() # 對 HTTP 錯誤碼拋出異常
            
            # 設置正確的編碼，確保中文不亂碼
            response.encoding = 'utf-8' 
            html_content = response.text
            result[expected_uni][expected_dept] = extract_table_data(html_content, expected_uni, expected_dept)
                    
            print(f"進度：({index + 1}/{total_eids}) 成功獲取 EID {eid} ({expected_uni} - {expected_dept}) ")
            
        except requests.exceptions.RequestException as e:
            print(f"錯誤：EID {eid} 請求失敗 ({expected_uni} - {expected_dept})：{e}")
        except Exception as e:
            print(f"一般錯誤：EID {eid} 處理失敗 ({expected_uni} - {expected_dept})：{e}")
            
        # 設置延遲以避免被伺服器封鎖 (建議 0.5 到 1 秒)
        time.sleep(0.5) 

    print(f"\n✅ 完成所有 {total_eids} 個請求。")

    return result

# =======================================================
# 執行腳本
# =======================================================
# if __name__ == "__main__":
    # 執行爬取
    # get_department_html_responses()