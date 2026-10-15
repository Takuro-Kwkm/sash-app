#!/usr/bin/env python3
"""Serialize only baseline-declared table ranges plus exact native cell patches."""
import argparse
import copy
import hashlib
import json
from pathlib import Path
import openpyxl
from openpyxl.utils.cell import range_boundaries, coordinate_from_string, column_index_from_string, get_column_letter


def export(plan, baseline, authoring):
    data = copy.deepcopy(baseline)
    workbook = openpyxl.load_workbook(authoring, data_only=True)
    try:
        for name,table in data['tables'].items():
            left,top,right,bottom = range_boundaries(table['address'])
            for patch in plan['patches']:
                if patch['sheet'] != name:
                    continue
                column,row = coordinate_from_string(patch['address'])
                right = max(right,column_index_from_string(column))
                bottom = max(bottom,row)
            table['address'] = f'{get_column_letter(left)}{top}:{get_column_letter(right)}{bottom}'
            table['values'] = [[workbook[name].cell(row,col).value for col in range(left,right+1)] for row in range(top,bottom+1)]
    finally:
        workbook.close()
    data.update(package_version=plan['candidate_package_version'], component_version=plan['candidate_component_version'],
                runtime_status='CANDIDATE_BLOCKED', candidate_id=plan['candidate_id'], formal_adopted=False,
                automatic_orderability=False, source_review_status='FULL_BYTES_REVIEW_REQUIRED')
    data['authoring_source'] = {'file_name':Path(authoring).name,'file_id':None,'base_file_id':plan['base_authoring_id'],
                                'sha256':hashlib.sha256(Path(authoring).read_bytes()).hexdigest()}
    return data


if __name__ == '__main__':
    p=argparse.ArgumentParser()
    for key in ('plan','baseline','authoring','out'):p.add_argument('--'+key,required=True)
    a=p.parse_args()
    if Path(a.out).exists():raise SystemExit('IMMUTABLE_CANDIDATE_EXISTS')
    plan=json.loads(Path(a.plan).read_text());baseline_bytes=Path(a.baseline).read_bytes()
    if hashlib.sha256(baseline_bytes).hexdigest()!=plan['base_runtime_sha256']:raise SystemExit('NATIVE_BASELINE_CHANGED')
    result=export(plan,json.loads(baseline_bytes),a.authoring)
    Path(a.out).write_text(json.dumps(result,ensure_ascii=False,indent=2,default=str)+'\n')
