#!/usr/bin/env python3
"""Native declaration check; full compatibility stays in the acquired central checker."""
import argparse, hashlib, json, re, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
p=argparse.ArgumentParser();p.add_argument('--central');a=p.parse_args()
def read(name):return json.loads((ROOT/name).read_text())
def bound(ref):
 path=ROOT/ref['path'];assert not path.is_symlink() and path.resolve().is_relative_to(ROOT)
 assert hashlib.sha256(path.read_bytes()).hexdigest()==ref['sha256'],ref['path']
 return json.loads(path.read_text())
s=read('contracts/production/current-authority-successor.json')
assert s['schema']=='CURRENT_AUTHORITY_SUCCESSOR_SELECTION_V1'
assert s['path'].startswith('contracts/production/authority-successors/')
d=bound(s);assert d['schema']=='CURRENT_AUTHORITY_RELEASE_SUCCESSOR_V1'
assert re.fullmatch('[0-9a-f]{40}',s['implementation_sha'])
assert d['compatibility_implementation']=={'repository':'Takuro-Kwkm/product-ui-contracts','ref':s['implementation_sha']}
assert d['baseline']['path']=='contracts/production/current-authority-adoption.json'
before=bound(d['baseline']);profile=bound(d['release_profile'])
assert d['baseline']['implementation_sha']==read('contracts/production/current-architecture.json')['architecture_authority']['ref']
assert set(d['semantic_delta']['added'])=={'harness/release.py','schemas/common-release.v1.schema.json'}
assert set(d['semantic_delta']['replaced'])<= {'harness/current_authority.py','scripts/verify-ga-index.py'}
assert d['adoption']['frozen_engine']==before['frozen_engine']
assert all(profile['shared_contract']['files'][k]==v for k,v in d['semantic_delta']['added'].items())
if a.central:
 sys.path.insert(0,str(Path(a.central).resolve()))
 from harness.current_authority import compatibility
 result=compatibility(a.central,ROOT)
else:result={'status':'PASS','scope':'NATIVE_DECLARATION_ONLY; acquired Central Git/bytes verification remains host responsibility'}
print(json.dumps(result))
