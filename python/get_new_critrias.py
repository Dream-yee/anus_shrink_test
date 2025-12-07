from tools.get_data_eid import extract_department_eids
from tools.get_all_details import get_department_html_responses
import json

YEAR = 115

result = get_department_html_responses(extract_department_eids(f"data/{YEAR}/AST_school.html"))

with open(f"data/{YEAR}/AST_school.html", 'w', encoding='utf-8') as f:
    json.dump(result, f, ensure_ascii=False, indent=4)
    print(f"✅ 成功提取數據並儲存")