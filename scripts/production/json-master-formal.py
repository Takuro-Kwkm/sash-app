"""Native JSON-master successor checks; shared v2 still owns lifecycle and saves."""
import copy
import json
import subprocess
from pathlib import Path


def setup(shared):
    import sys
    sys.path.insert(0, str(Path(shared).resolve()))
    global read_json, require, sha, checked_bytes, fingerprint
    from harness.core import read_json, require, sha, fingerprint
    from harness.changed_path import checked_bytes


def doc(ref):
    return json.loads(checked_bytes(ref))


def native_row(raw, manufacturer, series, allowed_states):
    from harness.production import native_registry
    require(allowed_states == ['FORMAL_PASS'], 'NATIVE_JSON_BASELINE', 'Existing Formal required', 'CURRENT_FORMAL_RESOLUTION')
    return native_registry(raw, manufacturer, series)


def changed_sections(before, after):
    """Exact semantic delta, including missing versus present-null distinctions."""
    result = []
    def walk(a, b, path):
        if a == b and type(a) is type(b): return
        if isinstance(a, dict) and isinstance(b, dict):
            for key in sorted(a.keys() | b.keys()):
                child = path+'/'+key.replace('~','~0').replace('/','~1')
                if key not in a or key not in b:
                    result.append({'path':child,'before_present':key in a,'after_present':key in b,
                                   'before_sha256':fingerprint(a[key]) if key in a else None,
                                   'after_sha256':fingerprint(b[key]) if key in b else None})
                else: walk(a[key], b[key], child)
        else:
            result.append({'path':path,'before_present':True,'after_present':True,
                           'before_sha256':fingerprint(a),'after_sha256':fingerprint(b)})
    walk(before, after, '')
    return result


def validate_change(before, candidate, review):
    require(before['metadata']['formal_pass'] is True and before['metadata']['status']=='FORMAL_PASS',
            'NATIVE_JSON_BASELINE', 'A real adopted baseline is required', 'CARRY_FORWARD_QA')
    require(candidate['metadata']['canonical_product_id']==before['metadata']['canonical_product_id']
            and candidate['metadata']['formal_pass'] is False and candidate['metadata']['status'] in ('DRAFT','QA_READY'),
            'NATIVE_JSON_CANDIDATE', 'Unadopted same-product candidate required', 'CARRY_FORWARD_QA')
    require(review['status']=='COMPLETE_REVIEWED' and review['review_ref']
            and review['baseline_sha256']==fingerprint(before) and review['candidate_sha256']==fingerprint(candidate)
            and review['delta']==changed_sections(before,candidate) and review['delta']
            and review['blockers']==[], 'JSON_REVIEW_BINDING', 'Exact complete reviewed delta required', 'CARRY_FORWARD_QA')
    require(candidate['confirmations']==before['confirmations'] and candidate['commercial_policy']==before['commercial_policy']
            and candidate.get('unchanged_baseline')==before.get('unchanged_baseline'),
            'CONTROLLED_UNRESOLVED_CHANGED', 'Retain all confirmation and commercial boundaries', 'CARRY_FORWARD_QA')
    # Existing evidence and rows survive. Reviewed edits to old rows require a
    # separate future extension; this successor is strictly additive.
    for group in ('masters','maps'):
        require(set(before[group])<=set(candidate[group]), 'EXISTING_TABLE_REMOVED', group, 'CARRY_FORWARD_QA')
        for table,rows in before[group].items():
            require(candidate[group][table][:len(rows)]==rows, 'EXISTING_ROW_CHANGED', table, 'CARRY_FORWARD_QA')
    for group in ('evidence_registry','source_registry','reviewed_rules'):
        require(candidate[group][:len(before[group])]==before[group], 'EXISTING_EVIDENCE_CHANGED', group, 'CARRY_FORWARD_QA')
    evidence={r['evidence_id'] for r in candidate['evidence_registry']}
    for row in review['claims']:
        require(row['evidence_id'] in evidence and row['source_sha256'] and row['locator'] and row['verified_visual'] is True,
                'SOURCE_EVIDENCE_REQUIRED', 'Review each new claim and relevant figure', 'CARRY_FORWARD_QA')
    require(review['claims'] and review['qa_input_sha256'], 'SOURCE_EVIDENCE_REQUIRED', 'Claims and native QA required', 'CARRY_FORWARD_QA')
    return {'changed_sections':len(review['delta']),'controlled_unresolved':len(candidate['confirmations'])}


def baseline(c, profile):
    from harness.production import native_registry, connector_document
    row=native_registry(doc(c['registry_response']),profile['manufacturer'],profile['series'])
    master=doc(c['baseline_master']);manifest=doc(c['baseline_live_manifest'])
    require(row==c['registry_before'] and row['package_version']==profile['baseline_revision']==master['metadata']['package_version']
            and master['metadata']['canonical_product_id']==profile['canonical_product_id']
            and master['metadata']['formal_pass'] is True, 'NATIVE_FORMAL_DRIFT','Exact JSON Formal baseline required','CURRENT_FORMAL_RESOLUTION')
    meta=connector_document(doc(c['baseline_authoring_metadata']))
    require(meta['id']==row['authoring_file_id'] and meta['mime_type']=='application/json'
            and meta['parent_ids']==[profile['canonical_folder_id']], 'NATIVE_JSON_IDENTITY','Wrong live JSON identity','CURRENT_FORMAL_RESOLUTION')
    require(checked_bytes(c['baseline_master'])==checked_bytes(c['baseline_live_master'])
            and manifest['package_version']==profile['baseline_revision'], 'NATIVE_FORMAL_DRIFT','Live JSON/manifest bytes differ','CURRENT_FORMAL_RESOLUTION')
    for key in ('canonical_folder_id','old_folder_id','working_folder_id'):
        require(row[key]==profile[key],'NATIVE_FOLDER_DRIFT',key,'CURRENT_FORMAL_RESOLUTION')
    return row


def carry_forward(c):
    from harness.core import package_members, inspect_package
    from jsonschema import Draft202012Validator
    before=doc(c['baseline_master']);candidate=doc(c['candidate_master']);review=doc(c['review'])
    old_info=inspect_package(checked_bytes(c['baseline_package']))
    _,old_files=package_members(checked_bytes(c['baseline_package']))
    require(old_info['revision']==before['metadata']['package_version']
            and old_files['PRODUCT_MASTER.json']==checked_bytes(c['baseline_master'])
            and old_files['CARRIED_CONTENT_QA.json']==checked_bytes(c['carried_content_qa'])
            and old_files['FORMAL_CONTENT_QA.json']==checked_bytes(c['carried_formal_qa']),
            'CARRY_FORWARD_QA_CHANGED','Bind retained QA to actual adopted package','CARRY_FORWARD_QA')
    proof=validate_change(before,candidate,review)
    sources={r['sha256'] for r in c['sources']}
    for source in c['sources']:checked_bytes(source)
    require(all(r['source_sha256'] in sources for r in review['claims']), 'SOURCE_EVIDENCE_REQUIRED','Claims must bind acquired source bytes','CARRY_FORWARD_QA')
    qa_input=doc(c['qa_input'])
    require(c['qa_input']['sha256']==review['qa_input_sha256'] and qa_input['candidate']==c['candidate_master'],
            'NATIVE_QA_BINDING','Native QA must test the exact candidate','CARRY_FORWARD_QA')
    require(qa_input['assertions'] and qa_input['business_cases'], 'NATIVE_QA_EMPTY','Content and business scenarios required','CARRY_FORWARD_QA')
    qa_path=Path(c['qa_output'])
    run=subprocess.run([c['node'],str(Path(c['checkout'])/'scripts/production/sheet-candidate-qa.mjs'),
                        '--input',c['qa_input']['path'],'--out',str(qa_path)],capture_output=True,text=True,timeout=300)
    require(run.returncode==0,'NATIVE_QA_FAILED',(run.stdout+run.stderr)[-1500:],'CARRY_FORWARD_QA')
    qa=read_json(qa_path)
    require(qa['status']=='PASS' and qa['executed'] is True and qa['failed']==0
            and qa['passed']==len(qa['tests']) and qa['product_master_sha256']==c['candidate_master']['sha256'],
            'NATIVE_QA_BINDING','Executed exact-candidate checks required','CARRY_FORWARD_QA')
    package=checked_bytes(c['package']);info=inspect_package(package);_,files=package_members(package)
    formal=json.loads(files['PRODUCT_MASTER.json']);expected=copy.deepcopy(candidate)
    require(set(c['lifecycle_metadata_after'])=={'package_version','status','formal_pass','canonical_mutation','registry_mutation','adoption_effective'},
            'UNREVIEWED_METADATA','Only native lifecycle fields may be proposed','CARRY_FORWARD_QA')
    expected['metadata'].update(c['lifecycle_metadata_after'])
    require(formal==expected and formal['metadata']['package_version']==c['revision']==info['revision']
            and formal['metadata']['status']=='FORMAL_PASS' and formal['metadata']['formal_pass'] is True
            and formal['metadata']['canonical_mutation'] is True and formal['metadata']['registry_mutation'] is True,
            'FACT_CHANGED','Formal bytes must equal tested candidate plus fixed lifecycle','CARRY_FORWARD_QA')
    require(not list(Draft202012Validator(json.loads(files['PRODUCT_MASTER.schema.json'])).iter_errors(formal)),
            'FORMAL_SCHEMA','Proposed JSON does not match fixed schema','CARRY_FORWARD_QA')
    for member,key in [('CARRIED_CONTENT_QA.json','carried_content_qa'),('PREVIOUS_FORMAL_CONTENT_QA.json','carried_formal_qa')]:
        require(files[member]==checked_bytes(c[key]),'CARRY_FORWARD_QA_CHANGED',member,'CARRY_FORWARD_QA')
    require(files['CANDIDATE_MASTER.json']==checked_bytes(c['candidate_master'])
            and files['SOURCE_REVIEW.json']==checked_bytes(c['review'])
            and json.loads(files['NATIVE_CONTENT_QA.json'])==qa
            and files['PRODUCT_MASTER.json']==checked_bytes(c['master']),
            'PACKAGE_PARITY','Package must contain the exact tested inputs/results','CARRY_FORWARD_QA')
    require(doc(c['formal_scope_qa'])==json.loads(files['FORMAL_CONTENT_QA.json'])
            and doc(c['scope'])['runtime_scope']=='NOT_INCLUDED_IN_PRODUCT_MASTER_FORMAL',
            'FORMAL_SCOPE_EXPANDED','Master-only scope and fixed QA required','CARRY_FORWARD_QA')
    return {**proof,'new_content_checks':qa['passed'],'carried_content_checks':len(doc(c['carried_content_qa']).get('tests',[])),
            'formal_scope_checks':len(doc(c['formal_scope_qa'])['checks']),'package':info,'predecessor':'INSPECT_ONLY'}
