#!/usr/bin/env python3
"""Native UI provenance/coverage validator; the existing v2 engine owns execution."""
import argparse,hashlib,json,sys
from pathlib import Path

def digest(data):return hashlib.sha256(data).hexdigest()
def checked(ref):
 p=Path(ref['path'])
 if not p.is_absolute() or not p.is_file() or p.is_symlink() or digest(p.read_bytes())!=ref['sha256']:raise ValueError('NATIVE_UI_INPUT_CHANGED: '+str(p))
 return json.loads(p.read_bytes())
def fingerprint(value):return digest(json.dumps(value,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode())
def validate(contract):
 if contract['schema']!='NATIVE_ROW_TABLE_UI_INPUT_V1':raise ValueError('NATIVE_UI_SCOPE')
 sys.path.insert(0,contract['shared_root'])
 from harness.local_qa import revalidate
 from harness.common_development import inspected_work,work_repository
 evidence=checked(contract['local_qa']);revalidate(evidence)
 for artifact in evidence['artifacts']:
  if digest(Path(artifact['path']).read_bytes())!=artifact['sha256']:raise ValueError('LOCAL_QA_ARTIFACT_CHANGED')
 qa_result=json.loads(Path(evidence['artifacts'][0]['path']).read_bytes())
 browser_proof=False
 for command in qa_result['commands']:
  if contract['browser_qa_command'] not in command['argv'] or command['exit_code']!=0:continue
  for line in Path(command['log']).read_text().splitlines():
   try:result=json.loads(line)
   except (ValueError,TypeError):continue
   if result.get('browser_report_sha256')==contract['browser_report']['sha256'] and result.get('status')=='PASS':browser_proof=True
 if not browser_proof:raise ValueError('BROWSER_REPORT_EXECUTION_BINDING')
 master=checked(contract['master']);master_spec,master_state,_,_=inspected_work(contract['master_work'],contract['product_id'])
 if work_repository(master_spec)!=contract['repository'] or master_state['state']!='COMPLETED':raise ValueError('EXISTING_MASTER_WORK_REQUIRED')
 receipt=checked(contract['master_receipt'])
 if receipt['master_sha256']!=contract['master']['sha256'] or receipt['written_files']!=0 or receipt['new_human_decisions']!=0:raise ValueError('FORMAL_CARRY_SCOPE')
 expected=checked(contract['expected_inventory']);mapping=checked(contract['mapping']);browser=checked(contract['browser_report']);projection=checked(contract['master_projection'])
 for name in ['flow','preview','image_inventory']:checked(contract[name])
 for item in contract['ui_files']:checked_bytes=Path(item['path']).read_bytes();assert digest(checked_bytes)==item['sha256'],item['native_path']
 scope={'repository':contract['repository'],'product_id':contract['product_id'],'master_sha256':contract['master']['sha256'],'flow_sha256':contract['flow']['sha256']}
 if any(any(doc.get(k)!=v for k,v in scope.items()) for doc in [expected,mapping,browser,projection]):raise ValueError('NATIVE_UI_CROSS_PRODUCT_OR_SOURCE')
 if browser['status']!='PASS' or browser['execution_surface']!='BROWSER' or browser['transitions']['status']!='PASS' or browser['transitions']['cases']<=0:raise ValueError('ACTUAL_BROWSER_REQUIRED')
 source_fields={f['field_name'] for f in master['field_master']}
 if source_fields!={f['field_id'] for f in projection['fields']} or source_fields!={f['master_field_id'] for f in mapping['fields'] if f.get('master_field_id')}:raise ValueError('NATIVE_MASTER_FIELDS')
 selectors=[f for f in expected['fields'] if f['role'] in ['SELECTOR','DERIVED']]
 if [f['field_id'] for f in selectors]!=[f['field_id'] for f in browser['fields']]:raise ValueError('NATIVE_UI_INVENTORY_ORDER')
 for wanted,actual in zip(selectors,browser['fields']):
  for k in ['stage','role','visible','required','control','candidate_values','label']:
   if wanted[k]!=actual[k]:raise ValueError('NATIVE_UI_FIELD:'+wanted['field_id']+':'+k)
 for name in ['MASTER_PROJECTION','FLOW_ORDER','CONTROL_AND_VALUES','BRANCH_VISIBILITY','KEEP_VALID','CLEAR_INVALID','RESTORE','HANDOFF']:
  if browser['checks'][name]['status']!='PASS' or browser['checks'][name]['executed_cases']<=0:raise ValueError('UNEXECUTED_NATIVE_UI_CHECK:'+name)
 for key in ['console_errors','page_errors','http_errors']:
  if browser[key]:raise ValueError('BROWSER_ERRORS:'+key)
 registry=checked(contract['native_registry']);entry=registry['products'][contract['product_id']]
 ui_hash=fingerprint(sorted(r['sha256'] for r in contract['ui_files']))
 bindings={**scope,**{k+'_sha256':contract[k]['sha256'] for k in ['mapping','expected_inventory','master_projection','preview']},'browser_sha256':contract['browser_report']['sha256'],'ui_files_sha256':ui_hash}
 if any(browser.get(k)!=v for k,v in {'mapping_sha256':bindings['mapping_sha256'],'preview_sha256':bindings['preview_sha256'],'ui_files_sha256':ui_hash}.items()):raise ValueError('STALE_BROWSER_BINDING')
 return {'status':'PASS',**bindings,'native_registry_entry_sha256':fingerprint(entry),'validator_results':dict.fromkeys(entry['validators'],'PASS'),'checks':browser['checks'],
  'connection_projection':{'master_identity':{'formal_sha256':contract['master']['sha256']},'master_fields':[{'field_id':f['field_name']} for f in master['field_master']]},
  'flow_stages':checked(contract['flow'])['ordered_semantic_stages'],'execution_scope':'NATIVE_ROW_TABLE_UI_WITH_REAL_BROWSER_AND_VERIFIED_LOCAL_QA',
  'product_qa_ready':False,'formal_adoption':False,'human_decisions_created':0,'release':False}
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--input',required=True);p.add_argument('--out',required=True);a=p.parse_args()
 result=validate(json.loads(Path(a.input).read_text()));Path(a.out).parent.mkdir(parents=True,exist_ok=True);Path(a.out).write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'status':result['status'],'scope':result['execution_scope']}))
