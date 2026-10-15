"""Verify native profile admission without granting product fact acceptance."""
import hashlib
import json
from pathlib import Path


def validate(root):
    root=Path(root).resolve();read=lambda p:json.loads((root/p).read_text())
    pointer=read('contracts/production/current-architecture.json')
    config=read(pointer['adapter_registry']);validators=read(pointer['validator_registry'])
    entries=[p for p in config['products'] if p.get('build_profile',{}).get('profile_id')=='sash-existing-working-sales-qa-v1']
    assert len(entries)==1
    for product in entries:
        ref=product['build_profile'];p=read(ref['path'])
        assert hashlib.sha256((root/ref['path']).read_bytes()).hexdigest()==ref['sha256']
        assert p['status']=='ADOPTED' and p['scope']=='EXISTING_WORKING_SALES_QA'
        assert p['product_id']==product['product_id'] and p['repository']==product['repository']
        assert p['target_gate']==product['default_gate']=='QA_READY'
        assert p['native_adapter']==product['native_adapter']
        assert p['native_prepare']==product['prepare_adapter']
        assert product['connection_scope']==p['scope'] and product['connection_state']=='CONNECTED'
        assert p['mutation_policy']=='WORKING_CANDIDATE_ONLY; no Formal/Registry/Runtime/UI/Release writes'
        old=p['predecessor_profile'];assert hashlib.sha256((root/old['path']).read_bytes()).hexdigest()==old['sha256']
        for name,value in p['implementation_hashes'].items():
            path=(root/name).resolve();assert path.is_relative_to(root)
            assert hashlib.sha256(path.read_bytes()).hexdigest()==value,name
        v=validators['products'][product['product_id']]
        assert v['native_profile']==ref and v['state']=='READY' and v['scope']==p['scope'] and v['no_fallback'] is True
        assert product['unsupported_gates']['FORMAL']=='NATIVE_FORMAL_PROFILE_AND_EXTERNAL_DECISION_REQUIRED'
    return dict(status='PASS',scope='NATIVE_PROFILE_ADMISSION_ONLY',business_qa=False,formal=False)


if __name__=='__main__':print(json.dumps(validate(Path(__file__).resolve().parents[2])))
