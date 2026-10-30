"""Admit a private Runtime/UI profile; the existing Shared v2 DAG owns execution."""
import argparse,hashlib,json,subprocess,sys
from pathlib import Path

def validate_spec(central,checkout,profile_path,spec):
 sys.path.insert(0,str(central));from harness.core import read_json,require,sha
 from harness.verification_scope import tree
 from harness.resolvers import capture
 def check(ok,reason):require(ok,'PRIVATE_UI_ADOPTION_DAG_INVALID',reason,'NATIVE_ADMISSION')
 profile=read_json(profile_path);workflow=json.loads(capture(Path('/'),spec['workflow']));contract=json.loads(capture(Path('/'),spec['input']))
 check(contract['checkout']==str(checkout)and contract['profile']=={'path':str(profile_path),'sha256':sha(profile_path.read_bytes())},'Contract/profile differs')
 check(contract['work_id']==spec['workflow_id']and profile['target_gate']==spec['target_gate'],'Wrong Work target')
 stages=profile['required_stages'];steps=workflow['steps'];check(len(steps)==len(stages)+1,'Mandatory stage set differs')
 worker=checkout/profile['native_worker'];worker_ref={'path':str(worker),'sha256':sha(worker.read_bytes())}
 for i,name in enumerate(stages):
  step=steps[i];check(step['id']==name and step['kind']=='validator'and step['needs']==([stages[i-1]]if i else[])and step['script']==worker_ref,'Stage order/worker changed')
  check(step['args']==['--central',str(central),'--contract','{input}','--stage',name,'--work','{work}','--out','{work}/'+name+'.json']and step['output']=='{work}/'+name+'.json'and step['result_path']==['status']and step['expected_result']=='PASS','Stage inputs/outputs changed')
 check(steps[-1]=={'id':'SAVE_ADOPTION_RESULT','kind':'storage','needs':[stages[-1]],'source':'{work}/RUNTIME_UI_ADOPTION.json','destination':'RUNTIME_UI_ADOPTION.json'}and workflow['targets']=={'RUNTIME_UI_ADOPTED':['SAVE_ADOPTION_RESULT']},'Adoption/save target omitted')
 binding=json.loads(capture(Path('/'),spec['production_binding']));head=subprocess.check_output(['git','rev-parse','HEAD'],cwd=checkout,text=True).strip()
 check(binding['checkout']==str(checkout)and binding['head_sha']==head,'Production binding differs from actual native Main')
 for ref in contract['inputs'].values():capture(Path('/'),ref)
 for key,repository,root in [('central_main','Takuro-Kwkm/product-ui-contracts',central),('native_main','Takuro-Kwkm/sash-app',checkout)]:
  main=json.loads(capture(Path('/'),contract['inputs'][key]));receipt=main['receipt'];actual=subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip()
  check(receipt['status']=='MERGE_CLOSED'and receipt['repository']==repository and receipt['merge_sha']==actual and main['main']['commit']['sha']==actual and main['pr']['merged']is True,'Actual Main adoption/readback missing')
  actual_files={name:value['sha256']for name,value in tree(root,actual).items()};check(main['files_verified']==len(actual_files)>0 and main.get('expected_files')==main.get('actual_files')==actual_files and receipt.get('tree_sha')==subprocess.check_output(['git','rev-parse','HEAD^{tree}'],cwd=root,text=True).strip(),'Source Main full tree differs')
  check(set(main['runs'])=={receipt['tested_head'],receipt['merge_sha']}and all(row['total_count']==0 and row['workflow_runs']==[]for row in main['runs'].values()),'Exact source and Main Actions observations missing')
 return contract

def main():
 p=argparse.ArgumentParser()
 for key in ('central','checkout','profile','repositories','instruction','spec','work','live-state','root'):p.add_argument('--'+key,required=True)
 p.add_argument('--resume',action='store_true');a=p.parse_args();c=Path(a.central).resolve();n=Path(a.checkout).resolve();f=Path(a.profile).resolve();profile=json.loads(f.read_bytes());spec=json.loads(Path(a.spec).read_bytes())
 route=subprocess.run([sys.executable,'-B',str(c/'scripts/architecture-work.py'),'route','--repositories',a.repositories,'--selected-product',profile['product_id'],'--instruction',a.instruction],capture_output=True,text=True);print(route.stdout,end='');print(route.stderr,end='',file=sys.stderr)
 if route.returncode:return route.returncode
 try:
  r=json.loads(route.stdout);ref={'path':f.relative_to(n).as_posix(),'sha256':hashlib.sha256(f.read_bytes()).hexdigest()}
  assert r['native_ui_adoption_profile']==ref and r['target_gate']==spec['target_gate']==profile['target_gate']=='RUNTIME_UI_ADOPTED'
  assert profile['schema']=='NATIVE_RUNTIME_UI_ADOPTION_PROFILE_V1' and profile['product_fact_mutation_allowed'] is False and profile['release'] is False
  assert r['native_adapter']==profile['native_preparer'] and spec['target']==profile['product_id']
  assert any(Path(v['path']).resolve()==f and v['sha256']==ref['sha256']for v in spec['runtime_refs'])
  validate_spec(c,n,f,spec)
 except (AssertionError,KeyError,ValueError,TypeError):
  print(json.dumps({'state':'FAIL_CLOSED','code':'PRIVATE_UI_ADOPTION_INPUT_NOT_BOUND','writes':0}));return 2
 return subprocess.call([sys.executable,'-B',str(c/'scripts/production-work.py'),'resume'if a.resume else'run','--root',a.root,'--work',a.work,'--spec',a.spec,'--live-state',a.live_state])
if __name__=='__main__':raise SystemExit(main())
