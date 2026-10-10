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
  git('remote','add','origin','https://github.com/'+metadata['repository']+'.git')
  git('fetch','--quiet','--depth=1','origin',metadata['source_commit'])
 else:
  assert metadata['schema']=='IMMUTABLE_SHARED_RELEASE_GIT_CARRIER_V1'
  assert hashlib.sha256(carrier.read_bytes()).hexdigest()==metadata['sha256']
  git('bundle','verify',str(carrier));git('fetch','--quiet',str(carrier),metadata['source_commit'])
  git('remote','add','origin','https://github.com/'+metadata['repository']+'.git')
 git('checkout','--quiet','--detach',metadata['source_commit'])
for name,digest in profile['shared_contract']['files'].items():
 assert hashlib.sha256((destination/name).read_bytes()).hexdigest()==digest,name
sys.path.insert(0,str(destination))
from harness.current_authority import compatibility
assert compatibility(destination,root)['status']=='PASS'
print(json.dumps({'status':'PASS','source_commit':metadata['source_commit'],'carrier_sha256':metadata.get('sha256'),
                  'reused_exact_checkout':reused,
                  'scope':'IMMUTABLE_SHARED_DEPENDENCY_ACQUIRED; Current host acquisition remains separate'}))
