#!/usr/bin/env python3
"""Read-only native admission bridge; existing Shared DAG owns execution."""
import argparse,json,hashlib,subprocess,sys,zipfile
from pathlib import Path
def main():
 p=argparse.ArgumentParser();p.add_argument('--phase',choices=['formal','flow'],required=True);p.add_argument('--shared',required=True);p.add_argument('--contract',required=True);p.add_argument('--out',required=True);a=p.parse_args()
 shared=Path(a.shared).resolve();sys.path.insert(0,str(shared))
 from harness.core import read_json,write_json,require,sha,fingerprint,journal,validate_binding
 from harness.workflow import inspect
 from harness.resolvers import capture
 c=read_json(a.contract);native=Path(c['native_checkout']).resolve()
 require(c['repository']=='Takuro-Kwkm/sash-app','COMPOSED_INSPECT_SCOPE','Native repository differs')
 def doc(r):return json.loads(capture('/',r))
 master=doc(c['formal']);original=c['original_builder'];oldspec=doc(original['spec'])
 require(oldspec['target']==original['target']==master['product']['product_id'],'COMPOSED_ORIGINAL_IDENTITY','Original builder identity differs')
 state,_,_=inspect(original['root'],original['work'],oldspec)
 require(state['state']=='COMPLETED' and 'NATIVE_QA'in state['completed_gates'],'COMPOSED_ORIGINAL_QA','Original builder must be complete')
 require(sha((Path(original['work'])/'candidate/product-master.json').read_bytes())==c['formal']['sha256'],'COMPOSED_MASTER_CHANGED','Keep original master bytes')
 formal=c['formal_work'];spec=doc(formal['spec']);completion=doc(formal['completion']);events=journal(formal['work'])
 validate_binding(formal['work'],spec);capture('/',formal['package'])
 require(completion['status']=='POST_SAVE_VERIFIED' and [e['stage']for e in events]==['QA_PASS','PACKAGE_SAVED','REGISTRY_UPDATED','POST_SAVE_VERIFIED'],'COMPOSED_FORMAL_STORAGE','Real completed Formal transaction required')
 require(spec['product_id']==c['product_id'] and spec['expected']['package_sha256']==formal['package']['sha256'],'COMPOSED_FORMAL_IDENTITY','Formal alias differs')
 with zipfile.ZipFile(Path(formal['package']['path']))as z:
  require(z.read('PRODUCT_MASTER.json')==capture('/',c['formal']),'COMPOSED_MASTER_CHANGED','Saved package master differs')
 require(events[-1]['evidence']['hash_kind']=='DOWNLOADED_BYTES_SHA256' and events[-1]['evidence']['package']['sha256']==formal['package']['sha256'],'COMPOSED_READBACK','Fresh downloaded bytes required')
 index=doc(c['preview']);candidate=doc(c['candidate_index']);row=index['products'][0];old=candidate['products'][0]
 require(row['id']==c['product_id'] and row['candidate'] is False and row['uiFlowContract']==old['uiFlowContract'],'COMPOSED_UI_CHANGED','Keep reviewed UI meaning')
 module=doc(c['module']);proposed=json.loads(capture('/',c['candidate_module']).decode().replace(old['id'],row['id']))
 proposed.update(schema='FORMAL_COMPOSED_PRODUCT_MODULE_V1',formal_adoption=True,source_adoption=False)
 require(module==proposed,'COMPOSED_UI_CHANGED','Only declared identity/lifecycle may differ')
 human=doc(c['human_review']);require(human['decision']=='ACCEPTED_COMPLETE_GLAZING_UI_SCOPE' and human['master_sha256']==c['formal']['sha256'] and human['module_sha256']==c['candidate_module']['sha256'] and human['index_sha256']==c['candidate_index']['sha256'],'COMPOSED_HUMAN_SCOPE','Actual approved R7 candidate differs')
 if a.phase=='formal':
  result={'status':'PASS','role':'PRODUCT_MASTER','mode':'EXISTING_FORMAL_CARRY_FORWARD','repository':c['repository'],'product_id':c['product_id'],'master_sha256':c['formal']['sha256'],'written_files':0,'new_human_decisions':0,'current':{'product_id':c['product_id'],'lifecycle_state':'FORMAL'},'original_builder':original,'formal_readback':formal,'candidate_to_formal_transform':'PRODUCT_ID_AND_LIFECYCLE_ONLY','catalogue_acquisitions':0}
 else:
  entry=doc(c['native_registry'])['products'][c['product_id']]
  require('scripts/production/inspect-adopted-composed.py'in entry['validators'],'COMPOSED_INSPECT_PRODUCER','Register actual inspector')
  probe_input=doc(c['probe_input']);require(probe_input['formal']==c['formal'] and probe_input['product_id']==c['product_id'],'COMPOSED_PROBE_SCOPE','Wrong native probe')
  run=subprocess.run(['node',str(native/'scripts/production/export-adopted-composed.mjs'),c['probe_input']['path']],cwd=native,text=True,capture_output=True,timeout=120)
  require(run.returncode==0,'COMPOSED_NATIVE_PROBE',(run.stdout+run.stderr)[-1500:]);projection=json.loads(run.stdout)
  expected=doc(c['expected_inventory']);mapping=doc(c['mapping']);browser=doc(c['browser_report']);master_projection=doc(c['master_projection'])
  require(expected['origin']=='REVIEWED_FLOW_AND_OFFICIAL_SOURCE' and expected['review_ref'],'COMPOSED_EXPECTATION_SOURCE','Independent source-based inventory required')
  for source in expected['source_refs']:capture('/',source)
  expected_ui=[f for f in expected['fields']if f['role']in ('SELECTOR','DERIVED')]
  attrs=['field_id','stage','role','control','candidate_values','visible','required','label']
  require([{k:f[k]for k in attrs}for f in expected_ui]==projection['fields']==browser['fields'],'COMPOSED_UI_INVENTORY','Master/mapping/actual DOM controls differ')
  require({f['field_id']for f in master_projection['fields']}=={f['field_id']for f in master['fields']},'COMPOSED_MASTER_INVENTORY','Master field missing')
  require(browser['status']=='PASS' and browser['execution_surface']=='BROWSER' and browser['transitions']['cases']>0,'COMPOSED_BROWSER','Actual Browser evidence required')
  raw=doc(c['hosted_browser_report']);require(raw['status']=='PASS' and raw['errors']==[] and raw['consoleErrors']==[] and raw['failedResponses']==[] and len(raw['viewports'])==3,'COMPOSED_BROWSER','Keep successful hosted report')
  for file in c['ui_files']:capture('/',file)
  result={'status':'PASS','repository':c['repository'],'product_id':c['product_id'],'master_sha256':c['formal']['sha256'],'flow_sha256':c['flow']['sha256'],'native_registry_entry_sha256':fingerprint(entry),'validator_results':{name:'PASS'for name in entry['validators']},'checks':projection['checks'],'flow_stages':projection['flow_stages'],**{name+'_sha256':c[name]['sha256']for name in ['mapping','expected_inventory','master_projection','preview']},'browser_sha256':c['browser_report']['sha256'],'ui_files_sha256':fingerprint(sorted(r['sha256']for r in c['ui_files'])),'execution_scope':'ADOPTED_COMPOSED_READ_ONLY_NATIVE_INSPECTION','native_projection':projection,'original_builder':original,'formal_readback':formal,'same_ui_implementation':True}
 write_json(a.out,result);print(json.dumps({'status':'PASS','phase':a.phase,'output':a.out,'canonical_writes':0,'new_human_decisions':0}))
if __name__=='__main__':main()
