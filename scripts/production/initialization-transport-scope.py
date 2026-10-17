"""Delegate bounded initialization transport admission to its pinned shared carrier."""
import argparse,importlib.util,json,subprocess,sys,tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
def load(name,path):
 s=importlib.util.spec_from_file_location(name,path);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
def validate(root=ROOT):
 root=Path(root).resolve()
 if (root/'contracts/production/native-ui-successor-scope.v1.json').exists():return load('native_ui_scope',root/'scripts/production/native-ui-successor-scope.py').validate(root)
 try:
  with tempfile.TemporaryDirectory(prefix='transport-scope-') as d:
   central=Path(d)/'shared';load('transport_unpack',root/'scripts/production/unpack-product-master-conditions.py').unpack(root,central)
   return load('transport_guard',central/'scripts/verify-initialization-transport-native-scope.py').validate(root)
 except Exception as e:return {'status':'FAIL_CLOSED','errors':[str(e)],'authorized_paths':[],'verified_unchanged_sha256':{},'deployment':'NOT_EXECUTED'}
def main():
 if (ROOT/'contracts/production/native-ui-successor-scope.v1.json').exists():return load('native_ui_scope_main',ROOT/'scripts/production/native-ui-successor-scope.py').main()
 p=argparse.ArgumentParser();p.add_argument('--predecessor');p.add_argument('--parent');p.add_argument('--transport-predecessor');a=p.parse_args();r=validate()
 if r['status']=='PASS' and (a.predecessor or a.parent or a.transport_predecessor):
  dest=Path(a.predecessor or a.parent or a.transport_predecessor).resolve();assert not dest.exists() and not dest.is_relative_to(ROOT)
  base=json.loads((ROOT/'contracts/production/initialization-transport-scope.v1.json').read_text())['starting_main']
  with tempfile.TemporaryDirectory(prefix='transport-predecessor-') as tmp:
   prior=Path(tmp)/'native';subprocess.run(['git','clone','--quiet','--shared',str(ROOT),str(prior)],check=True)
   subprocess.run(['git','checkout','--quiet','--detach',base],cwd=prior,check=True)
   if a.transport_predecessor:
    subprocess.run(['git','clone','--quiet','--shared','--dissociate',str(prior),str(dest)],check=True)
   else:subprocess.run([sys.executable,'-B',str(prior/'scripts/production/product-conditions-scope.py'),'--predecessor',str(dest)],cwd=prior,check=True)
  r['predecessor']=str(dest)
 print(json.dumps({k:v for k,v in r.items() if k not in ('authorized_paths','verified_unchanged_sha256')}));return 0 if r['status']=='PASS' else 2
if __name__=='__main__':raise SystemExit(main())
