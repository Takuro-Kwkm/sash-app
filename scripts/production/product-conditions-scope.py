"""Use the existing shared scope verifier and inspect sealed predecessor only."""
import argparse,importlib.util,json,subprocess,sys,tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
def load(name,path):
 s=importlib.util.spec_from_file_location(name,path);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
def validate(root=ROOT):
 root=Path(root).resolve()
 try:
  with tempfile.TemporaryDirectory(prefix='product-conditions-scope-') as d:
   central=Path(d)/'shared';load('conditions_unpack',root/'scripts/production/unpack-product-master-conditions.py').unpack(root,central)
   return load('conditions_scope_guard',central/'scripts/verify-product-master-conditions-native-scope.py').validate(root)
 except Exception as e:return {'status':'FAIL_CLOSED','errors':[str(e)],'authorized_paths':[],'verified_unchanged_sha256':{},'deployment':'NOT_EXECUTED'}
def main():
 p=argparse.ArgumentParser();p.add_argument('--predecessor');p.add_argument('--parent');a=p.parse_args();r=validate()
 if r['status']=='PASS' and (a.predecessor or a.parent):
  dest=Path(a.predecessor or a.parent).resolve();assert not dest.exists() and not dest.is_relative_to(ROOT)
  base=json.loads((ROOT/'contracts/production/product-master-conditions-scope.v1.json').read_text())['starting_main']
  subprocess.check_call(['git','clone','--quiet','--shared','--dissociate',str(ROOT),str(dest)])
  subprocess.check_call(['git','checkout','--quiet','--detach',base],cwd=dest);r['predecessor']=str(dest)
 print(json.dumps({k:v for k,v in r.items() if k not in ('authorized_paths','verified_unchanged_sha256')}));return 0 if r['status']=='PASS' else 2
if __name__=='__main__':raise SystemExit(main())
