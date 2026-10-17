"""Use the pinned common checker; retain the native predecessor CI chain."""
import argparse,importlib.util,json,subprocess,sys,tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
def load(name,path):
 s=importlib.util.spec_from_file_location(name,path);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
def validate(root=ROOT):
 root=Path(root).resolve()
 try:
  with tempfile.TemporaryDirectory(prefix='native-ui-scope-') as d:
   central=Path(d)/'shared';load('ui_unpack',root/'scripts/production/unpack-product-master-conditions.py').unpack(root,central)
   sys.path.insert(0,str(central))
   from harness.current_authority import compatibility,native_ui_scope
   compatibility(central,root)
   selection=json.loads((root/'contracts/production/current-authority-successor.json').read_text())
   record=json.loads((root/selection['path']).read_text());scope=json.loads((root/record['native_scope']['path']).read_text())
   result=native_ui_scope(central,root,record)
   return dict(result,scope_id=scope['schema'],authorized_paths=scope['allowed_paths'],verified_unchanged_sha256=scope['protected_sha256'],deployment='NOT_EXECUTED')
 except Exception as e:return {'status':'FAIL_CLOSED','errors':[str(e)],'authorized_paths':[],'verified_unchanged_sha256':{},'deployment':'NOT_EXECUTED'}
def main():
 p=argparse.ArgumentParser();p.add_argument('--predecessor');p.add_argument('--parent');p.add_argument('--transport-predecessor');a=p.parse_args();r=validate()
 if r['status']=='PASS' and (a.predecessor or a.parent or a.transport_predecessor):
  flag,value=next((k,v) for k,v in vars(a).items() if v);dest=Path(value).resolve();assert not dest.exists() and not dest.is_relative_to(ROOT)
  base=json.loads((ROOT/'contracts/production/native-ui-successor-scope.v1.json').read_text())['starting_main']
  with tempfile.TemporaryDirectory(prefix='native-ui-predecessor-') as tmp:
   prior=Path(tmp)/'native';subprocess.run(['git','clone','--quiet','--shared','--dissociate',str(ROOT),str(prior)],check=True)
   subprocess.run(['git','checkout','--quiet','--detach',base],cwd=prior,check=True)
   subprocess.run([sys.executable,'-B',str(prior/'scripts/production/product-conditions-scope.py'),'--'+flag.replace('_','-'),str(dest)],cwd=prior,check=True)
  r['predecessor']=str(dest)
 print(json.dumps({k:v for k,v in r.items() if k not in ('authorized_paths','verified_unchanged_sha256')}));return 0 if r['status']=='PASS' else 2
if __name__=='__main__':raise SystemExit(main())
