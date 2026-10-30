"""Verify declared native profile; never certify manufacturer facts."""
import hashlib,json
from pathlib import Path

def validate(root):
    root=Path(root).resolve();read=lambda p:json.loads((root/p).read_bytes())
    config=read('contracts/production/work-connections.v2.json')
    validators=read('contracts/production/validator-registry.v2.json')
    entries=[p for p in config['products'] if p.get('connection_scope')=='EXISTING_AUTHORING_WORKBOOK_SALES_QA']
    assert len(entries)==1
    for row in entries:
        ref=row['build_profile'];p=read(ref['path'])
        assert hashlib.sha256((root/ref['path']).read_bytes()).hexdigest()==ref['sha256']
        assert p['operation']=='EXISTING_AUTHORING_QA' and p['status']=='ADOPTED'
        assert p['product_id']==row['product_id'] and p['repository']==row['repository']=='Takuro-Kwkm/sash-app'
        assert p['scope']=='EXISTING_WORKING_SALES_QA' and p['target_gate']==row['default_gate']=='QA_READY'
        assert p['baseline_states']==['PACKAGE_BLOCKED'] and p['baseline_revision']=='v1.0'
        assert p['native_adapter']==row['native_adapter']=='scripts/production/working-master-business-qa.py'
        assert p['native_prepare']==row['prepare_adapter']=='scripts/production/prepare-native-workbook-qa.py'
        assert row['connection_state']=='CONNECTED' and p['automatic_orderability'] is False
        assert p['mutation_policy']=='WORKING_CANDIDATE_ONLY; no Formal/Registry/Runtime/UI/Release writes'
        assert set(p['required_sheets']) and len(p['required_sheets'])==len(set(p['required_sheets']))
        for name,digest in p['implementation_hashes'].items():
            path=(root/name).resolve();assert path.is_relative_to(root) and not path.is_symlink()
            assert hashlib.sha256(path.read_bytes()).hexdigest()==digest,name
        v=validators['products'][row['product_id']]
        assert v['native_profile']==ref and v['state']=='READY' and v['no_fallback'] is True
        assert v['validators']==row['validators']==['scripts/production/validate-native-workbook-profile.py']
        assert row['unsupported_gates']=={'FORMAL':'NATIVE_FORMAL_PROFILE_AND_EXTERNAL_DECISION_REQUIRED','RUNTIME_UI':'NATIVE_ADAPTER_UNAVAILABLE','RELEASE':'NATIVE_RELEASE_PROFILE_REQUIRED'}
    return {'status':'PASS','scope':'NATIVE_PROFILE_CONNECTION_ONLY','product_qa':False,'formal':False}

if __name__=='__main__':print(json.dumps(validate(Path(__file__).resolve().parents[2])))
