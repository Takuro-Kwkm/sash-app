#!/usr/bin/env python3
"""Native selection only; delegate all release execution to the immutable Shared CLI."""
import argparse,json,hashlib,subprocess,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
p=argparse.ArgumentParser();p.add_argument('--central',required=True);p.add_argument('--product',required=True);p.add_argument('--check',action='store_true');p.add_argument('args',nargs=argparse.REMAINDER);a=p.parse_args()
try:
 reg=json.loads((ROOT/'contracts/production/release-profiles.v1.json').read_bytes());entries=[e for e in reg['profiles'] if e['product_id']==a.product];assert len(entries)==1,'NATIVE_PRODUCT_NOT_SELECTED'
 profile=ROOT/entries[0]['path'];doc=json.loads(profile.read_bytes());central=Path(a.central).resolve();assert subprocess.check_output(['git','rev-parse','HEAD'],cwd=central,text=True).strip()==doc['shared_contract']['ref'],'SHARED_IMPLEMENTATION_SHA_MISMATCH'
 sys.path.insert(0,str(central));from harness.release_admission import adopted_profile
 adopted_profile(profile,doc,{'repository':doc['repository'],'product_id':a.product,'scope':entries[0]['scope'],'execution_mode':'REAL'})
 from importlib.util import spec_from_file_location,module_from_spec
 s=spec_from_file_location('scope',ROOT/'scripts/production/order5-batch4-scope.py');m=module_from_spec(s);s.loader.exec_module(m);result=m.validate(ROOT);assert result['status']=='PASS',result['errors']
 if a.check:print(json.dumps({'status':'PASS','product_id':a.product,'scope':entries[0]['scope'],'deployment':'NOT_EXECUTED'}))
 else:
  args=a.args[1:] if a.args and a.args[0]=='--' else a.args;assert args,'RELEASE_ARGS_REQUIRED'
  if '--profile' in args:assert Path(args[args.index('--profile')+1]).resolve()==profile.resolve(),'NATIVE_PROFILE_NOT_SELECTED'
  else:
   assert '--spec' in args,'NATIVE_SPEC_REQUIRED';specdoc=json.loads(Path(args[args.index('--spec')+1]).read_bytes());refs=[x for x in specdoc['runtime_refs'] if x.get('role')=='RELEASE_PROFILE'];assert len(refs)==1 and Path(refs[0]['path']).resolve()==profile.resolve(),'NATIVE_PROFILE_NOT_SELECTED'
   bind=json.loads(Path(specdoc['input']['path']).read_bytes());assert (bind['repository'],bind['product_id'],bind['scope'])==(doc['repository'],a.product,entries[0]['scope']),'NATIVE_SPEC_PRODUCT_SCOPE_MISMATCH'
  raise SystemExit(subprocess.call([sys.executable,'-B',str(central/doc['shared_contract']['entry']),*args],cwd=ROOT))
except (AssertionError,OSError,ValueError,KeyError) as e:
 print(json.dumps({'status':'FAIL_CLOSED','error':str(e),'deployment':'NOT_EXECUTED'}));raise SystemExit(2)
