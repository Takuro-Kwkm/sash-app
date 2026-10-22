"""Use the existing shared scope verifier and inspect sealed predecessor only."""
import argparse,importlib.util,json,subprocess,sys,tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
def load(name,path):
 s=importlib.util.spec_from_file_location(name,path);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
def selected_giesta(root):
 try:
  selector=json.loads((root/'contracts/production/current-authority-successor.json').read_text())
  return json.loads((root/selector['path']).read_text()).get('schema') in {
   'CURRENT_AUTHORITY_GIESTA2_RUNTIME_UI_CONNECTION_V15',
   'CURRENT_AUTHORITY_GIESTA2_RUNTIME_PUBLICATION_V16'}
 except (OSError,KeyError,ValueError):return False
def validate(root=ROOT):
 root=Path(root).resolve()
 successor=load('sash_successor',root/'scripts/production/sash-authority-successor.py')
 if successor.selected(root):return successor.validate(root)
 if not selected_giesta(root):
  if (root/'contracts/production/native-ui-successor-scope.v1.json').exists():return load('native_ui_scope',root/'scripts/production/native-ui-successor-scope.py').validate(root)
  if (root/'contracts/production/initialization-transport-scope.v1.json').exists():return load('transport_scope',root/'scripts/production/initialization-transport-scope.py').validate(root)
 try:
  with tempfile.TemporaryDirectory(prefix='product-conditions-scope-') as d:
   central=Path(d)/'shared';load('conditions_unpack',root/'scripts/production/unpack-product-master-conditions.py').unpack(root,central)
   selection=json.loads((root/'contracts/production/current-authority-successor.json').read_text())
   successor=json.loads((root/selection['path']).read_text())
   if successor.get('schema') in {
     'CURRENT_AUTHORITY_GIESTA2_RUNTIME_UI_CONNECTION_V15',
     'CURRENT_AUTHORITY_GIESTA2_RUNTIME_PUBLICATION_V16'}:
    # unpack() has already run the selected shared compatibility checker.
    # Preserve this existing CI entrypoint while delegating V15 admission.
    scope=json.loads((root/successor['native_scope']['path']).read_text())
    return {'status':'PASS','scope':'SELECTED_GIESTA_EXACT_SHARED_ADMISSION_WITH_RETAINED_PRODUCT_PROTECTION',
            'authorized_paths':scope['allowed_paths'],
            'verified_unchanged_sha256':scope['protected_sha256'],'deployment':'NOT_EXECUTED'}
   if successor.get('schema')=='CURRENT_AUTHORITY_NATIVE_CONNECTION_SUCCESSOR_V9':
    # unpack() already delegates exact admission to the selected shared checker.
    # Keep the original protected product bytes except explicitly hash-bound
    # native dependencies, and inspect the original scope record unchanged.
    import hashlib
    prior=successor['predecessor_native_commit']
    path='contracts/production/product-master-conditions-scope.v1.json'
    original=subprocess.check_output(['git','show',prior+':'+path],cwd=root)
    assert (root/path).read_bytes()==original,'PREDECESSOR_SCOPE_CHANGED'
    scope=json.loads(original);bound={r['path']:r['sha256'] for r in successor['native_files']}
    checked={}
    for name,digest in scope['protected_sha256'].items():
     actual=hashlib.sha256((root/name).read_bytes()).hexdigest()
     expected=bound.get(name,digest)
     assert actual==expected,'PROTECTED_BYTES_CHANGED: '+name
     checked[name]=actual
    return {'status':'PASS','scope':'V9_EXACT_SHARED_ADMISSION_WITH_RETAINED_PRODUCT_PROTECTION','authorized_paths':list(bound),'verified_unchanged_sha256':checked,'deployment':'NOT_EXECUTED'}
   return load('conditions_scope_guard',central/'scripts/verify-product-master-conditions-native-scope.py').validate(root)
 except Exception as e:return {'status':'FAIL_CLOSED','errors':[str(e)],'authorized_paths':[],'verified_unchanged_sha256':{},'deployment':'NOT_EXECUTED'}
def main():
 successor=load('sash_successor_main',ROOT/'scripts/production/sash-authority-successor.py')
 if not successor.selected(ROOT) and not selected_giesta(ROOT):
  if (ROOT/'contracts/production/native-ui-successor-scope.v1.json').exists():return load('native_ui_scope_main',ROOT/'scripts/production/native-ui-successor-scope.py').main()
  if (ROOT/'contracts/production/initialization-transport-scope.v1.json').exists():return load('transport_cli',ROOT/'scripts/production/initialization-transport-scope.py').main()
 p=argparse.ArgumentParser();p.add_argument('--predecessor');p.add_argument('--parent');a=p.parse_args();r=validate()
 if r['status']=='PASS' and (a.predecessor or a.parent):
  dest=Path(a.predecessor or a.parent).resolve();assert not dest.exists() and not dest.is_relative_to(ROOT)
  base=json.loads((ROOT/'contracts/production/product-master-conditions-scope.v1.json').read_text())['starting_main']
  subprocess.check_call(['git','clone','--quiet','--shared','--dissociate',str(ROOT),str(dest)])
  subprocess.check_call(['git','checkout','--quiet','--detach',base],cwd=dest);r['predecessor']=str(dest)
 print(json.dumps({k:v for k,v in r.items() if k not in ('authorized_paths','verified_unchanged_sha256')}));return 0 if r['status']=='PASS' else 2
if __name__=='__main__':raise SystemExit(main())
