#!/usr/bin/env python3
"""Verify an existing Working workbook without promoting or replacing it.

The retained canonical-workbook intake owns lossless cell extraction. This
adapter adds the distinct Registry/Working-folder identity boundary; the
existing shared builder, business QA and v2 workflow remain unchanged.
"""
import argparse
import csv
import importlib.util
import io
import json
import sys
from pathlib import Path


def reader():
    path=Path(__file__).with_name('native-workbook-intake.py')
    spec=importlib.util.spec_from_file_location('canonical_workbook_reader',path)
    module=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def verify_inputs(contract,profile,shared):
    sys.path.insert(0,str(Path(shared).resolve()))
    from harness.core import require,read_json,sha
    from harness.resolvers import capture
    require(profile.get('authoring_location')=='WORKING',
            'NATIVE_WORKING_LOCATION','An explicit Working intake profile is required','INTAKE')
    for ref in contract['inputs'].values():capture(Path('/'),ref)
    raw=read_json(contract['inputs']['registry']['path'])
    require(not raw.get('isError'),'NATIVE_REGISTRY_ACQUISITION','Registry acquisition failed','INTAKE')
    data=raw.get('structuredContent',raw)
    require(data['id']==profile['registry_id'],'NATIVE_REGISTRY_IDENTITY','Wrong Registry','INTAKE')
    rows=list(csv.DictReader(io.StringIO(data['content'])))
    matches=[row for row in rows if row.get('manufacturer')==profile['manufacturer']
             and row.get('series')==profile['registry_series']]
    require(len(matches)==1,'NATIVE_EXISTING_AUTHORING_REQUIRED','One existing Working row required','INTAKE')
    row=matches[0]
    require(row['master_status'] in profile['baseline_states']
            and 'WORKING' in row['master_status']
            and row['authoring_file_id']==profile['authoring_file_id']
            and row['package_version']==profile['baseline_revision'],
            'NATIVE_EXISTING_AUTHORING_REQUIRED','Existing Working identity changed','INTAKE')
    require(all(row[key]==profile[key] for key in ('canonical_folder_id','working_folder_id','old_folder_id')),
            'NATIVE_FOLDER_DRIFT','Actual registered folders required','INTAKE')
    for key in ('authoring_metadata','authoring_readback_metadata'):
        raw=read_json(contract['inputs'][key]['path']);meta=raw.get('structuredContent',raw)
        require(not raw.get('isError') and meta.get('id')==profile['authoring_file_id']
                and meta.get('mime_type')=='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                and meta.get('parent_ids')==[profile['working_folder_id']],
                'NATIVE_AUTHORING_LOCATION','Original Working workbook location differs','INTAKE')
    original=capture(Path('/'),contract['inputs']['authoring'])
    require(original==capture(Path('/'),contract['inputs']['authoring_readback'])
            and sha(original)==profile['authoring_sha256'],
            'NATIVE_AUTHORING_BYTE_PARITY','Exact acquired original and readback required','INTAKE')
    restored=reader().inspect_workbook(contract['inputs']['authoring']['path'],profile)
    require(read_json(contract['inputs']['original']['path'])==restored,
            'NATIVE_AUTHORING_CELL_PARITY','Preserve every original Working cell and formula','INTAKE')
    return restored


def execute(shared,contract_path,work,out):
    sys.path.insert(0,str(Path(shared).resolve()))
    from harness.core import read_json,write_json,require
    from harness.resolvers import capture
    contract=read_json(contract_path);profile=json.loads(capture(Path('/'),contract['profile']))
    work,out=Path(work).resolve(),Path(out).resolve()
    require(out.is_relative_to(work) and not out.is_symlink(),
            'OUTPUT_PATH','Regular Work-owned output required','INTAKE')
    snapshot=verify_inputs(contract,profile,shared)
    result={'status':'PASS','scope':'LOSSLESS_WORKING_INPUT_RECOVERY_ONLY',
            'sheets':len(snapshot['tables']),
            'cells':sum(len(table['cells']) for table in snapshot['tables'].values()),
            'qa_ready':False,'formal':False}
    write_json(out,result)
    return result


if __name__=='__main__':
    parser=argparse.ArgumentParser()
    for key in ('harness-root','contract','work','out'):parser.add_argument('--'+key,required=True)
    args=parser.parse_args()
    try:result=execute(args.harness_root,args.contract,args.work,args.out)
    except Exception as error:
        result={'status':'FAIL','blocking_reason':getattr(error,'data',{'reason':str(error)})}
        Path(args.out).write_text(json.dumps(result,ensure_ascii=False,indent=2))
    raise SystemExit(0 if result['status']=='PASS' else 2)
