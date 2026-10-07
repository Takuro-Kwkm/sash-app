#!/usr/bin/env python3
"""Native CI checks pointer/adapter declarations; live shared acquisition is host QA."""
import json,hashlib,re
from pathlib import Path
root=Path(__file__).resolve().parents[2]
read=lambda path:json.loads((root/path).read_text())
pointer=read('contracts/production/current-architecture.json');config=read(pointer['adapter_registry'])
assert pointer['current_architecture']=='APP_DEVELOPMENT_SKILL_ARCHITECTURE_V2'
assert pointer['architecture_authority']['ref']==config['shared_authority']['commit']
assert re.fullmatch('[0-9a-f]{40}',config['shared_authority']['commit'])
assert pointer['shared_harness_sha']==config['shared_authority']['harness_revision']=='7293f818685bbd1e7386d78757fb82b930af5572'
assert pointer['current_router']==config['shared_authority']['current_router']=='scripts/architecture-work.py'
assert pointer['legacy_selection']==0
assert pointer['live_architecture_selector']['scope_axis']=='PROJECT_CURRENT'
repo='Takuro-Kwkm/sash-app'
assert all(p['repository']==repo for p in config['products'])
assert len({p['product_id'] for p in config['products']})==len(config['products'])
for p in config['products']:
 if p['connection_state']=='CONNECTED':assert (root/p['native_adapter']).is_file()
 else:assert p['safe_failure']['state']=='FAIL_CLOSED' and p['safe_failure']['fallback'] is False and p['safe_failure']['writes']==0
for p in read('contracts/production/current-state.v2.json')['products'].values():
 for name,expected in p['immutable_files'].items():assert hashlib.sha256((root/name).read_bytes()).hexdigest()==expected,name
 for name in p['native_validator_files']:assert (root/name).is_file(),name
assert all(re.fullmatch('[0-9a-f]{64}',s) for s in pointer['shared_router_files'].values())
assert len(read(pointer['validator_registry'])['products'])==len(config['products'])
assert 'terminal_policy' in read(pointer['resume'])
print(json.dumps({'status':'PASS','scope':'NATIVE_POINTER_AND_ADAPTER_CI_CONTRACT; authenticated shared readback separate','products':len(config['products']),'connected':sum(p['connection_state']=='CONNECTED' for p in config['products']),'legacy_selection':0}))
