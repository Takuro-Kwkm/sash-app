#!/usr/bin/env python3
"""Acquire the adopted immutable Shared Git carrier; never install another engine."""
import hashlib
import json
import subprocess
import sys
from pathlib import Path
root=Path(__file__).resolve().parents[2]
profile=json.loads((root/'contracts/production/release-profile.v1.json').read_bytes())
metadata=json.loads((root/'contracts/production/shared-release-authority.v1.json').read_bytes())
carrier=root/'contracts/production/shared-release-authority.v1.bundle'
assert hashlib.sha256(carrier.read_bytes()).hexdigest()==metadata['sha256']
assert metadata['repository']==profile['shared_contract']['repository']
assert metadata['source_commit']==profile['shared_contract']['ref']
destination=Path(sys.argv[1]).resolve()
assert not destination.exists()
destination.mkdir(parents=True)
def git(*args):return subprocess.check_output(['git',*args],cwd=destination,stderr=subprocess.PIPE)
git('init','-q');git('bundle','verify',str(carrier));git('fetch','--quiet',str(carrier),metadata['source_commit'])
git('checkout','--quiet','--detach',metadata['source_commit'])
git('remote','add','origin','https://github.com/'+metadata['repository']+'.git')
for name,digest in profile['shared_contract']['files'].items():
 assert hashlib.sha256((destination/name).read_bytes()).hexdigest()==digest,name
sys.path.insert(0,str(destination))
from harness.current_authority import compatibility
assert compatibility(destination,root)['status']=='PASS'
print(json.dumps({'status':'PASS','source_commit':metadata['source_commit'],'carrier_sha256':metadata['sha256'],
                  'scope':'IMMUTABLE_SHARED_DEPENDENCY_ACQUIRED; Current host acquisition remains separate'}))
