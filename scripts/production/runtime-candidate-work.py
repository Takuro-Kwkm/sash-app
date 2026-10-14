"""Native wrapper: use the sole Current router; no legacy or local fallback."""
import argparse,json,subprocess,sys
from pathlib import Path
p=argparse.ArgumentParser()
p.add_argument('--profile',required=True);p.add_argument('--spec');p.add_argument('--work');p.add_argument('--live-state');p.add_argument('--resume',action='store_true');p.add_argument('--root');
p.add_argument('--harness-root',required=True);p.add_argument('--checkout',required=True);p.add_argument('--repositories',required=True);p.add_argument('--instruction',required=True)
a=p.parse_args();root=Path(a.harness_root).resolve();profile_path=Path(a.profile).resolve();profile=json.loads(profile_path.read_bytes())
command=[sys.executable,str(root/'scripts/architecture-work.py'),'route','--repositories',a.repositories,'--selected-product',profile['product_id'],'--instruction',a.instruction]
r=subprocess.run(command,text=True,capture_output=True)
# Preserve the exact typed refusal and exit code. Candidate preview never admits Work.
print(r.stdout,end='');print(r.stderr,end='',file=sys.stderr)
if r.returncode:sys.exit(r.returncode)
route=json.loads(r.stdout)
try:
 import hashlib
 assert profile['schema']=='NATIVE_RUNTIME_UI_CANDIDATE_PROFILE_V1'
 assert route['product_id']==profile['product_id']
 assert all(getattr(a,k) for k in ('spec','work','live_state','root'))
 spec=json.loads(Path(a.spec).read_bytes())
 assert spec['target']==profile['product_id'] and spec['target_gate']=='RUNTIME_UI_CANDIDATE_QA_REVIEW'
 refs=spec['runtime_refs']
 assert any(Path(r['path']).resolve()==profile_path and r['sha256']==hashlib.sha256(profile_path.read_bytes()).hexdigest() for r in refs)
 assert not profile['formal_adoption'] and not profile['source_adoption'] and not profile['release']
except (AssertionError,KeyError,TypeError) as error:
 print(json.dumps({'state':'FAIL_CLOSED','code':'NATIVE_CANDIDATE_INPUT_NOT_BOUND','writes':0,'workers':0,'fallback':False}))
 sys.exit(2)
# Admission, DAG, persistence and resume are owned only by the existing Shared engine.
engine=[sys.executable,str(root/'scripts/production-work.py'),'resume' if a.resume else 'run','--root',a.root,'--work',a.work,'--spec',a.spec,'--live-state',a.live_state]
sys.exit(subprocess.call(engine))
