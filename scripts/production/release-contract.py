#!/usr/bin/env python3
"""Native acquisition/preflight and delegation; no second release engine."""
import argparse, hashlib, json, re, subprocess, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
p=argparse.ArgumentParser()
p.add_argument('--central')
p.add_argument('--check',action='store_true')
p.add_argument('args',nargs=argparse.REMAINDER)
a=p.parse_args()
doc=json.loads((ROOT/'contracts/production/release-profile.v1.json').read_text())
assert doc['status']=='CURRENT' and doc['schema']=='NATIVE_RELEASE_PROFILE_V1'
assert doc['repository']=='Takuro-Kwkm/sash-app'
assert re.fullmatch('[0-9a-f]{40}',doc['shared_contract']['ref'])
assert doc['terminal_policy'].startswith('INSPECT_ONLY')
assert all((ROOT/path).is_file() for path in doc['native_paths'])
assert set(doc['native_files'])==set(doc['native_paths'])
for name,digest in doc['native_files'].items():
 assert hashlib.sha256((ROOT/name).read_bytes()).hexdigest()==digest,name
assert doc['minimum_qa'] and doc['mandatory_approvals']==['Release']
assert doc['shared_contract']['files']
if a.central:
 central=Path(a.central).resolve()
 actual=subprocess.check_output(['git','rev-parse','HEAD'],cwd=central,text=True).strip()
 assert actual==doc['shared_contract']['ref'],'SHARED_IMPLEMENTATION_SHA_MISMATCH'
 for path,digest in doc['shared_contract']['files'].items():
  assert hashlib.sha256((central/path).read_bytes()).hexdigest()==digest,path
 if not a.check:
  assert a.args,'Pass --check or release arguments after --'
  arguments=a.args[1:] if a.args[0]=='--' else a.args
  raise SystemExit(subprocess.call([sys.executable,'-B',str(central/doc['shared_contract']['entry']),*arguments],cwd=ROOT))
else:
 assert a.check,'AUTHORITY_ACQUISITION_REQUIRED: pass --central exact pinned checkout'
print(json.dumps({'status':'PASS','repository':doc['repository'],'scope':'NATIVE_CONNECTION' if a.central else 'NATIVE_DECLARATION_ONLY','shared_ref':doc['shared_contract']['ref'],'deployment':'NOT_EXECUTED'}))
