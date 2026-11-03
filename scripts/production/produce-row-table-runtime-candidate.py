#!/usr/bin/env python3
"""Native candidate producer. No router, journal, Formal adoption or storage engine."""
import argparse
import csv
import hashlib
import io
import json
import subprocess
from pathlib import Path


def checked(ref):
    path=Path(ref['path'])
    if not path.is_absolute() or not path.is_file() or path.is_symlink():
        raise ValueError('NATIVE_INPUT_PATH')
    data=path.read_bytes()
    if hashlib.sha256(data).hexdigest()!=ref['sha256']:
        raise ValueError('NATIVE_INPUT_CHANGED: '+str(path))
    return data


def produce(contract, destination, stage='projection'):
    if contract['schema']!='NATIVE_ROW_TABLE_PRODUCER_CANDIDATE_V1':
        raise ValueError('NATIVE_CANDIDATE_SCOPE')
    destination=Path(destination).resolve()
    if destination.exists():
        raise ValueError('OUTPUT_EXISTS: preserve candidate outputs')
    inputs={key:checked(ref) for key,ref in contract['inputs'].items()}
    response=json.loads(inputs['registry'])
    if response.get('isError'):
        raise ValueError('REGISTRY_ACQUISITION_FAILED')
    registry=response['structuredContent']
    if registry['id']!=contract['registry_id']:
        raise ValueError('REGISTRY_IDENTITY')
    expected=contract['identity']
    rows=[r for r in csv.DictReader(io.StringIO(registry['content']))
          if r['manufacturer']==expected['manufacturer'] and r['series']==expected['series']]
    if len(rows)!=1 or rows[0]['master_status']!='FORMAL_PASS' or rows[0]['package_version']!=expected['revision']:
        raise ValueError('EXISTING_FORMAL_REQUIRED')
    row=rows[0]
    if any(row[key]!=expected[key] for key in ['authoring_file_id','runtime_manifest_id','canonical_folder_id']):
        raise ValueError('FORMAL_NATIVE_IDENTITY_CHANGED')
    master=json.loads(inputs['master']);policy=json.loads(inputs['policy']);series=master['series_master']
    if len(series)!=1 or series[0]['manufacturer']!=row['manufacturer'] or series[0]['product_series']!=row['series']:
        raise ValueError('FORMAL_MASTER_SCOPE')
    if master['release_manifest'][0]['release_version']!=row['package_version'] or policy['native_product_id']!=expected['product_id']:
        raise ValueError('FORMAL_MASTER_REVISION')
    root=Path(__file__).resolve().parents[2]
    if Path(contract['exporter']['path']).resolve()!=root/'scripts/production/export-row-table-runtime.mjs' or Path(contract['projection']['path']).resolve()!=root/'src/catalog/runtime-master/row-table-runtime-projection.mjs':
        raise ValueError('NATIVE_IMPLEMENTATION_SCOPE')
    checked(contract['node']);checked(contract['exporter']);checked(contract['projection'])
    for ref in contract['runtime_refs']:
        if not Path(ref['path']).resolve().is_relative_to(root):
            raise ValueError('NATIVE_RUNTIME_SCOPE')
        checked(ref)
    # input_refs is a bound native input, not a generated PASS or fake Work.
    refs=json.loads(inputs['input_refs'])
    if refs!={k:contract['inputs'][k] for k in ('master','policy')}:
        raise ValueError('NATIVE_REF_SCOPE')
    if stage=='qa':
        import sys
        sys.path.insert(0,contract['shared_root'])
        from harness.local_qa import revalidate
        evidence=json.loads(checked(contract['qa_evidence']))
        revalidate(evidence)
        destination.mkdir(parents=True)
        result={'status':'PASS','scope':'EXACT_LOCAL_QA_PROVENANCE_CARRIED','qa_evidence':contract['qa_evidence'],
            'tests_reexecuted':0,'product_qa_ready':False,'human_decisions_created':0}
        (destination/'qa-carry.json').write_text(json.dumps(result,indent=2)+'\n')
        return result
    if stage=='formal':
        destination.mkdir(parents=True)
        # Inspect and preserve the already registered Formal. This does not
        # adopt a candidate or replace its absent historical Work/journal.
        original=destination/'formal-preserved.json';original.write_bytes(inputs['master'])
        receipt={'status':'PASS','role':'PRODUCT_MASTER','mode':'EXISTING_FORMAL_CARRY_FORWARD',
            'product_id':expected['product_id'],'master_sha256':contract['inputs']['master']['sha256'],
            'current':{'product_id':expected['product_id'],'lifecycle_state':'FORMAL','revision':row['package_version']},
            'registry_ref':contract['inputs']['registry'],'registry_row':row,
            'written_files':0,'new_human_decisions':0,'source_adoption_operations':0,
            'verification_scope':'CURRENT_REGISTERED_FORMAL_EXACT_BYTES_ONLY',
            'preserved_local_copy_sha256':hashlib.sha256(original.read_bytes()).hexdigest(),
            'candidate_formal_adoption':False,'runtime_ui_adopted':False}
        (destination/'formal-inspection-receipt.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n')
        return receipt
    if stage!='projection':
        raise ValueError('UNSUPPORTED_NATIVE_STAGE')
    process=subprocess.run([contract['node']['path'],contract['exporter']['path'],
        contract['inputs']['input_refs']['path'],str(destination)],text=True,capture_output=True,timeout=120)
    if process.returncode:
        raise ValueError('NATIVE_PROJECTION_FAILED: '+process.stderr[-1500:])
    package=destination/'runtime-package.candidate.json';qa=destination/'native-constraint-qa.json'
    report=json.loads(qa.read_text())
    if report['status']!='PASS' or report['checks']!=len(master['golden_test_master']):
        raise ValueError('NATIVE_CONSTRAINT_CASE_COVERAGE')
    receipt={'schema':'NATIVE_EXISTING_INPUT_PRESERVATION_V1','status':'VERIFIED_EXISTING_INPUT',
        'role':'EXISTING_FORMAL_INPUT_INSPECTION_ONLY','product_id':expected['product_id'],
        'source_master_sha256':contract['inputs']['master']['sha256'],'source_revision':row['package_version'],
        'registry_ref':contract['inputs']['registry'],'registry_row':row,
        'runtime_candidate_sha256':hashlib.sha256(package.read_bytes()).hexdigest(),
        'executed_constraint_qa_sha256':hashlib.sha256(qa.read_bytes()).hexdigest(),
        'formal_files_written':0,'new_human_decisions':0,'product_qa_ready':False,
        'current_native_connection':'ADAPTER_PENDING','execution_mode':'LOCAL_CANDIDATE',
        'common_master_receipt':'NOT_ISSUED; requires admitted native provenance contract',
        'shared_common_work':'NOT_CREATED','ui_adopted':False,'automatic_orderability':False}
    (destination/'source-preservation-receipt.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n')
    if any(checked(ref)!=inputs[key] for key,ref in contract['inputs'].items()):
        raise ValueError('NATIVE_INPUT_MUTATED')
    return receipt


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('stage',nargs='?',choices=['qa','formal','projection'],default='projection')
    parser.add_argument('--contract',required=True);parser.add_argument('--out-dir',required=True)
    args=parser.parse_args()
    print(json.dumps(produce(json.loads(Path(args.contract).read_text()),args.out_dir,args.stage),ensure_ascii=False,indent=2))
