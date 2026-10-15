"""CI readback of the native DRAFT recovery admission and its exact code."""
import hashlib
import json
from pathlib import Path


def validate(root):
    root=Path(root).resolve()
    read=lambda p:json.loads((root/p).read_text())
    pointer=read('contracts/production/current-architecture.json')
    connections=read(pointer['adapter_registry'])
    validators=read(pointer['validator_registry'])
    admitted=0
    for product in connections['products']:
        entry=product.get('build_profile',{})
        if entry.get('profile_id') != 'sash-working-master-recovery-v1':continue
        path=(root/entry['path']).resolve()
        assert path.is_relative_to(root) and hashlib.sha256(path.read_bytes()).hexdigest()==entry['sha256']
        profile=read(entry['path'])
        assert profile['status']=='ADOPTED' and profile['scope']=='STRUCTURAL_DRAFT_RECOVERY_ONLY'
        assert profile['product_id']==product['product_id'] and profile['repository']==product['repository']
        assert profile['mutation_policy']=='CANDIDATE_ONLY; no Registry/Formal/Runtime/UI/Release writes'
        assert product['connection_state']=='CONNECTED' and product['connection_scope']==profile['scope']
        assert product['default_gate']==profile['target_gate']=='WORKING_STRUCTURE_VERIFIED'
        assert product['native_adapter']==profile['native_adapter']
        for name,expected in profile['implementation_hashes'].items():
            target=(root/name).resolve()
            assert target.is_relative_to(root) and hashlib.sha256(target.read_bytes()).hexdigest()==expected,name
        registry=validators['products'][product['product_id']]
        assert registry['state']=='READY' and registry['scope']==profile['scope'] and registry['no_fallback'] is True
        assert registry['native_profile']==entry
        admitted+=1
    assert admitted==1
    return {'status':'PASS','scope':'STRUCTURAL_DRAFT_RECOVERY_ONLY','business_qa':False,'formal':False,'native_profiles':admitted}


if __name__=='__main__':print(json.dumps(validate(Path(__file__).resolve().parents[2])))
