#!/usr/bin/env python3
"""Acquire/reuse one exact Shared dependency; legacy sealed carriers remain supported."""
import hashlib
import json
import subprocess
import sys
from pathlib import Path
root=Path(__file__).resolve().parents[2]
profile=json.loads((root/'contracts/production/release-profile.v1.json').read_bytes())
metadata=json.loads((root/'contracts/production/shared-release-authority.v1.json').read_bytes())
carrier=root/'contracts/production/shared-release-authority.v1.bundle'
assert metadata['repository']==profile['shared_contract']['repository']
assert metadata['source_commit']==profile['shared_contract']['ref']
destination=Path(sys.argv[1]).resolve()
def git(*args):return subprocess.check_output(['git',*args],cwd=destination,stderr=subprocess.PIPE)
reused=destination.exists()
if reused:
 assert git('rev-parse','HEAD').decode().strip()==metadata['source_commit'],'EXISTING_SHARED_CHECKOUT_MISMATCH'
else:
 destination.mkdir(parents=True);git('init','-q')
 if metadata['schema']=='IMMUTABLE_SHARED_GIT_REFERENCE_V1':
  assert metadata['repository']=='Takuro-Kwkm/product-ui-contracts'
  bridge=metadata['offline_bridge']
  # Private cross-repository CI has no credential; reuse sealed Git bytes.
  raw=subprocess.check_output(['git','show',bridge['predecessor_commit']+':'+bridge['predecessor_path']],cwd=root)
  assert hashlib.sha256(raw).hexdigest()==bridge['predecessor_sha256']
  ancestor=destination.parent/(destination.name+'-ancestor.bundle');ancestor.write_bytes(raw)
  git('bundle','verify',str(ancestor));git('fetch','--quiet',str(ancestor),bridge['predecessor_source_commit'])
  ancestor.unlink()
  delta=root/bridge['delta_path'];assert hashlib.sha256(delta.read_bytes()).hexdigest()==bridge['delta_sha256']
  git('bundle','verify',str(delta));git('fetch','--quiet',str(delta),metadata['source_commit'])
  git('remote','add','origin','https://github.com/'+metadata['repository']+'.git')
 else:
  assert metadata['schema']=='IMMUTABLE_SHARED_RELEASE_GIT_CARRIER_V1'
  assert hashlib.sha256(carrier.read_bytes()).hexdigest()==metadata['sha256']
  git('bundle','verify',str(carrier));git('fetch','--quiet',str(carrier),metadata['source_commit'])
  git('remote','add','origin','https://github.com/'+metadata['repository']+'.git')
 git('checkout','--quiet','--detach',metadata['source_commit'])
# Acquire only the immutable predecessor revisions required by compatibility.
references={metadata['source_commit']}
references.add(json.loads((root/'contracts/production/current-architecture.json').read_bytes())['architecture_authority']['ref'])
selection=json.loads((root/'contracts/production/current-authority-successor.json').read_bytes())
record=json.loads((root/selection['path']).read_bytes())
prior=json.loads((root/record['predecessor_selection']['path']).read_bytes())
references.add(prior['implementation_sha'])
for ref in sorted(references):
 try:git('cat-file','-e',ref+'^{commit}')
 except subprocess.CalledProcessError:git('fetch','--quiet','--depth=1','origin',ref)
for name,digest in profile['shared_contract']['files'].items():
 assert hashlib.sha256((destination/name).read_bytes()).hexdigest()==digest,name
sys.path.insert(0,str(destination))
from harness.current_authority import compatibility
assert compatibility(destination,root)['status']=='PASS'
print(json.dumps({'status':'PASS','source_commit':metadata['source_commit'],'carrier_sha256':metadata.get('sha256'),
                  'reused_exact_checkout':reused,
                  'scope':'IMMUTABLE_SHARED_DEPENDENCY_ACQUIRED; Current host acquisition remains separate'}))
