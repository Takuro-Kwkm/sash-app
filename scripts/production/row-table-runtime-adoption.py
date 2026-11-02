"""Row-table native gate worker; invoked by the existing private-adoption DAG.

No routing, scheduling, Human decisions, Drive writes or publication here.
"""
import argparse,importlib.util,json,subprocess,sys
from pathlib import Path
def execute(shared,contract,stage,work):
 sys.path.insert(0,str(shared))
 from harness.core import read_json,require,sha,validate_authorization
 from harness.resolvers import capture
 from harness.common_development import inspected_work,validate_original_decision
 from harness.local_qa import revalidate
 c=read_json(contract);n=Path(c['checkout']);p=read_json(c['profile']['path']);capture('/',c['profile'])
 check=lambda ok,msg:require(ok,'ROW_TABLE_RUNTIME_ADOPTION',msg,stage)
 scope=json.loads(capture('/',c['scope']));authorization=json.loads(capture('/',c['authorization']));validate_authorization(scope,authorization)
 check(p['format']=='ROW_TABLE_RUNTIME_V1'and p['product_id']==scope['product_id']and scope['target_gate']==p['target_gate']=='RUNTIME_UI_ADOPTED','Actual scope differs')
 for ref in c['inputs'].values():capture('/',ref)
 if stage not in ('PREVIEW_IDENTITY','PACKAGE_TRANSFORM'):
  check(c.get('native_spec_path')and Path(c['native_spec_path']).is_file(),'Main-bound native spec required')
  definition=importlib.util.spec_from_file_location('adoption_entry',n/'scripts/production/private-runtime-ui-adoption-work.py');entry=importlib.util.module_from_spec(definition);definition.loader.exec_module(entry)
  entry.validate_spec(shared,n,Path(c['profile']['path']),read_json(c['native_spec_path']))
 root=Path(c['package_root']);index=read_json(root/'runtime_index.json')
 if stage=='PREVIEW_IDENTITY':
  previous=c['review_work'];spec,state,_,_=inspected_work(previous,p['product_id']);validate_original_decision(previous,spec,'HUMAN_UI_REVIEW')
  for path,digest in p['approved_presentation'].items():check(sha((n/path).read_bytes())==digest,'Approved UI changed: '+path)
  check(sha((root/index['document']['path']).read_bytes())==p['candidate']['module_sha256']and index['master']['sha256']==p['formal_master']['sha256'],'Master/UI changed')
  result={'status':'PASS','gate':stage,'human_review':'REUSED_EXPLICIT_ORIGINAL_DECISION','product_master_mutations':0}
 elif stage=='PACKAGE_TRANSFORM':
  run=subprocess.run([c['node'],str(n/p['native_validator'])],cwd=n,capture_output=True,text=True,check=True);result=json.loads(run.stdout.strip().splitlines()[-1]);check(result['status']=='PASS','Normal loader validator failed')
 elif stage in ('STORAGE_READBACK','NATIVE_FORMAL_LOCATION_READBACK'):
  definition=importlib.util.spec_from_file_location('readback',n/'scripts/production/private-runtime-readback.py');verifier=importlib.util.module_from_spec(definition);definition.loader.exec_module(verifier)
  record=Path(c['staged_capture_path']if stage=='STORAGE_READBACK'else c['formal_capture_path']);check(record.is_file(),'Native Drive full-byte captures required')
  folder=c['working_folder_id']if stage=='STORAGE_READBACK'else c['formal_folder_id']
  proof=verifier.verify_capture(shared,read_json(record),read_json(c['inputs']['storage_expected']['path']),p['product_id'],p['product_id'],c['work_id'],folder)
  result={'status':'PASS','gate':stage,'actual_readback':proof}
 elif stage=='FORMAL_RUNTIME_QA':
  evidence=json.loads(capture('/',c['inputs']['local_qa']));revalidate(evidence)
  browser=json.loads(capture('/',c['inputs']['browser_report']));check(browser['status']=='PASS'and browser['product_id']==p['product_id']and browser['candidate_environment_variables']==[]and browser['normal_runtime']is True,'Actual normal application Browser QA required')
  execution=read_json(evidence['artifacts'][0]['path']);bound=False
  for command in execution['commands']:
   if command['exit_code']!=0:continue
   for line in Path(command['log']).read_text().splitlines():
    try:value=json.loads(line)
    except (ValueError,TypeError):continue
    if isinstance(value,dict)and value.get('status')=='PASS'and value.get('browser_report_sha256')==c['inputs']['browser_report']['sha256']:bound=True
  check(bound,'Browser report lacks exact successful local execution log binding')
  result={'status':'PASS','gate':stage,'browser_report':c['inputs']['browser_report'],'qa':c['inputs']['local_qa']}
 elif stage=='RUNTIME_UI_ADOPTION':
  for name in p['required_stages'][:-1]:check(read_json(Path(work)/(name+'.json'))['status']=='PASS','Incomplete native gate: '+name)
  result={'status':'PASS','state':'RUNTIME_UI_ADOPTED','product_id':p['product_id'],'work_id':c['work_id'],'package_index_sha256':sha((root/'runtime_index.json').read_bytes()),'product_master_mutations':0,'release':False,'main_readback':c['inputs']['native_main'],'formal_readback':{'path':str(Path(work)/'NATIVE_FORMAL_LOCATION_READBACK.json'),'sha256':sha((Path(work)/'NATIVE_FORMAL_LOCATION_READBACK.json').read_bytes())}}
 else:raise ValueError('Unknown native row-table stage')
 return result
if __name__=='__main__':
 a=argparse.ArgumentParser()
 for key in ('central','contract','stage','work','out'):a.add_argument('--'+key,required=True)
 x=a.parse_args();result=execute(Path(x.central),Path(x.contract),x.stage,Path(x.work));Path(x.out).write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps(result))
