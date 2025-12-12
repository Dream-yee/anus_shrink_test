from tools.college_data_transform import convert_division_exam_data
from tools.score_distribution_csv_2_json import convert_score_distribution
from tools.match_groups import match_them
import json

YEAR = 112

def main():
    dept_cri = convert_division_exam_data(f"datas/{YEAR}/dept_criteria.csv")

    sub_comb = convert_score_distribution(f"datas/{YEAR}/subjects_combinations.csv")

    result = match_them(dept_cri, sub_comb)

    with open(f"datas/{YEAR}/result.json", 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=4)

if __name__ == "__main__":
    main()