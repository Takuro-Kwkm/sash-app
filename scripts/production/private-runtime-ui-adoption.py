"""Native private Runtime/UI gate validators, executed only by Shared v2."""
import argparse,json,hashlib,subprocess,sys
from pathlib import Path

def execute(shared,contract,stage,work):
 sys.path.insert(0,str(shared));from harness.core import require,read_json,sha,validate_authorization
 from harness.resolvers import capture
 c=read_json(contract);n=Path(c['checkout']);p=read_json(c['profile']['path']);capture(Path('/'),c['profile']);scope=read_json(c['scope']['path']);auth=read_json(c['authorization']['path']);capture(Path('/'),c['scope']);capture(Path('/'),c['authorization']);validate_authorization(scope,auth)
 for ref in c['inputs'].values():capture(Path('/'),ref)
 require(p['product_id']==scope['product_id']and p['target_gate']==scope['target_gate']=='RUNTIME_UI_ADOPTED'and p['release']is False,'ADOPTION_SCOPE_CHANGED','Profile and actual user scope must agree',stage)
 root=Path(c['package_root']);candidate=Path(c['candidate_root'])
 if stage not in ('PREVIEW_IDENTITY','PACKAGE_TRANSFORM'):
  require(c.get('native_spec_path')and Path(c['native_spec_path']).is_file(),'NATIVE_DAG_ADMISSION_REQUIRED','Immutable native Main-bound DAG is required',stage)
  import importlib.util
  definition=importlib.util.spec_from_file_location('native_admission',n/'scripts/production/private-runtime-ui-adoption-work.py');admission=importlib.util.module_from_spec(definition);definition.loader.exec_module(admission);admission.validate_spec(shared,n,Path(c['profile']['path']),read_json(c['native_spec_path']))
 if stage=='PREVIEW_IDENTITY':
  for name,h in p['candidate_files'].items():require(sha((candidate/name).read_bytes())==h,'PREVIEW_CHANGED',name,stage)
  for name,h in p['approved_presentation'].items():require(sha((n/name).read_bytes())==h,'APPROVED_PRESENTATION_CHANGED',name,stage)
  prior=read_json(c['inputs']['preview_completion']['path']);review=read_json(c['inputs']['preview_review']['path'])
  require(prior['state']=='COMPLETED'and review['status']=='PASS'and review['unverified']==[],'PREVIEW_QA_REQUIRED','Keep completed and independently reviewed preview',stage)
  master=read_json(candidate/'sources/PRODUCT_MASTER.json');require(sha((candidate/'sources/PRODUCT_MASTER.json').read_bytes())==p['formal_master']['sha256']and len(master['gaps'])==p['formal_master']['unresolved_count'],'MASTER_CHANGED','Retain current Formal and every unresolved field',stage)
  result={'status':'PASS','gate':stage,'controlled_unresolved':len(master['gaps']),'product_master_mutations':0}
 elif stage=='PACKAGE_TRANSFORM':
  run=subprocess.run([c['node'],str(n/p['native_validator']),str(root/'runtime_index.json'),str(candidate/'index.json'),c['profile']['path']],capture_output=True,text=True,check=True);result=json.loads(run.stdout)
 elif stage in ('STORAGE_READBACK','NATIVE_FORMAL_LOCATION_READBACK'):
  import importlib.util
  definition=importlib.util.spec_from_file_location('private_readback',n/'scripts/production/private-runtime-readback.py');verifier=importlib.util.module_from_spec(definition);definition.loader.exec_module(verifier)
  expected=read_json(c['inputs']['storage_expected']['path']);record_path=Path(c['staged_capture_path']if stage=='STORAGE_READBACK'else c['formal_capture_path'])
  require(record_path.is_file(),'FORMAL_RUNTIME_READBACK_REQUIRED','Actual native Drive captures are required',stage)
  record=read_json(record_path);folder=c['working_folder_id']if stage=='STORAGE_READBACK'else c['formal_folder_id']
  proof=verifier.verify_capture(shared,record,expected,p['product_id'],p['formal_product_id'],c['work_id'],folder)
  binding_path=Path(c['staged_binding_path']if stage=='STORAGE_READBACK'else c['formal_binding_path']);require(binding_path.is_file(),'FORMAL_RUNTIME_READBACK_REQUIRED','Content-bound private binding is required',stage)
  ref={'path':str(binding_path),'sha256':sha(binding_path.read_bytes())};binding=read_json(binding_path)
  require(Path(binding['root']).resolve()==root.resolve()and len(binding['indexes'])==1,'FORMAL_RUNTIME_READBACK_REQUIRED','Binding points to another package',stage)
  row=binding['indexes'][0];require(row['manifestFileId']==proof['index']['file_id']and row['packageFileId']==proof['package']['file_id']and row['sha256']==expected['index']['sha256'],'FORMAL_RUNTIME_READBACK_REQUIRED','Wrong registered saved identity',stage)
  receipt=root/row['readbackReceiptPath'];require(sha(receipt.read_bytes())==row['readbackReceiptSha256']and read_json(receipt)==proof,'FORMAL_RUNTIME_READBACK_REQUIRED','Binding receipt differs from actual captured native bytes',stage)
  env=dict(__import__('os').environ,SASH_PRIVATE_FORMAL_RUNTIME_MANIFEST=ref['path'],SASH_PRIVATE_FORMAL_RUNTIME_SHA256=ref['sha256'])
  probe=subprocess.run([c['node'],'--input-type=module','-e',"import {privateFormalRuntimeIndexes} from './src/catalog/runtime-master/private-formal-runtime-binding.mjs';console.log(JSON.stringify({count:privateFormalRuntimeIndexes().length}));"],cwd=n,env=env,capture_output=True,text=True,check=True)
  require(json.loads(probe.stdout)['count']==1,'FORMAL_RUNTIME_READBACK_REQUIRED','Exactly the approved private index is required',stage)
  result={'status':'PASS','gate':stage,'formal_binding':ref,'actual_readback':proof,'product_master_mutations':0}
 elif stage=='FORMAL_RUNTIME_QA':
  ref=read_json(Path(work)/'STORAGE_READBACK.json')['formal_binding'];capture(Path('/'),ref)
  env=dict(__import__('os').environ,SASH_PRIVATE_FORMAL_RUNTIME_MANIFEST=ref['path'],SASH_PRIVATE_FORMAL_RUNTIME_SHA256=ref['sha256'],QA_ADOPTION_CONTRACT=str(contract),QA_OUTPUT_DIR=str(Path(work)/'formal-browser'))
  require(not any(env.get(x)for x in ['VERCEL','SASH_CANDIDATE_MODE','SASH_CANDIDATE_RUNTIME_INDEX','SASH_WORKING_PREVIEW_MANIFEST']),'NORMAL_FORMAL_RUNTIME_REQUIRED','Normal application only',stage)
  run=subprocess.run([c['node'],str(n/'scripts/production/verify-private-formal-runtime.mjs')],cwd=n,env=env,capture_output=True,text=True,check=True,timeout=600);result=json.loads(run.stdout.strip().splitlines()[-1]);require(result['status']=='PASS','FORMAL_RUNTIME_QA_FAILED','Normal runtime parity and Browser/storage/output QA required',stage)

 elif stage=='RUNTIME_UI_ADOPTION':
  for name in ('PREVIEW_IDENTITY','PACKAGE_TRANSFORM','STORAGE_READBACK','FORMAL_RUNTIME_QA','NATIVE_FORMAL_LOCATION_READBACK'):
   require(read_json(Path(work)/(name+'.json'))['status']=='PASS','ADOPTION_QA_REQUIRED',name,stage)
  capture(Path('/'),read_json(Path(work)/'STORAGE_READBACK.json')['formal_binding'])
  capture(Path('/'),read_json(Path(work)/'NATIVE_FORMAL_LOCATION_READBACK.json')['formal_binding'])
  result={'status':'PASS','state':'RUNTIME_UI_ADOPTED','product_id':p['product_id'],'formal_product_id':p['formal_product_id'],'human_decision':'IMPORTED_EXPLICIT_USER_SCOPE','product_master_mutations':0,'release':False,'actions_executed':False}
 else:raise ValueError('Unknown native gate '+stage)
 return result
if __name__=='__main__':
 a=argparse.ArgumentParser()
 for key in ('central','contract','stage','work','out'):a.add_argument('--'+key,required=True)
 x=a.parse_args();out=execute(Path(x.central),Path(x.contract),x.stage,Path(x.work));Path(x.out).write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n');print(json.dumps(out))
