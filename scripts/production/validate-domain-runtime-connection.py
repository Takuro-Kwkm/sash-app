"""Validate candidate profile admission; never grant Runtime Formal or release."""
import hashlib
import json
from pathlib import Path


def validate(root):
    root=Path(root).resolve();read=lambda path:json.loads((root/path).read_bytes())
    routing=read('contracts/production/work-connections.v2.json');validators=read('contracts/production/validator-registry.v2.json')
    count=0
    for connection in routing['products']:
        entry=connection.get('runtime_candidate_profile')
        if not entry:continue
        path=(root/entry['path']).resolve()
        assert path.is_relative_to(root) and not path.is_symlink(), 'PROFILE_PATH'
        assert hashlib.sha256(path.read_bytes()).hexdigest()==entry['sha256'], 'PROFILE_BYTES_CHANGED'
        p=read(entry['path'])
        assert p['schema']=='NATIVE_RUNTIME_UI_CANDIDATE_PROFILE_V1' and p['status']=='ADOPTED' and p['admission_state']=='CANDIDATE_ONLY'
        assert p['product_id']==connection['product_id'] and p['repository']==connection['repository']
        assert validators['products'][p['product_id']]['runtime_candidate_profile']==entry
        assert p['target_gate']=='RUNTIME_UI_CANDIDATE_QA_REVIEW' and p['shared_entrypoint']=='scripts/production-work.py'
        assert p['formal_adoption'] is p['source_adoption'] is p['release'] is p['automatic_manufacturing'] is p['automatic_price'] is False
        assert len(p['native_paths'])==len(set(p['native_paths']))
        for name in p['native_paths']:
            file=(root/name).resolve();assert file.is_relative_to(root) and file.is_file() and not file.is_symlink(), 'NATIVE_PATH'
        index=read(p['runtime_index']);assert index['adoption']=='CANDIDATE_ONLY' and len(index['products'])==1
        row=index['products'][0];assert row['id']==p['runtime_product_id'] and row['adapterType']=='COMPOSED_PRODUCT_MODULE_V1'
        module=root/p['candidate_root']/row['path'];assert hashlib.sha256(module.read_bytes()).hexdigest()==row['sha256'], 'MODULE_BYTES_CHANGED'
        document=json.loads(module.read_bytes())
        assert document['formal_adoption'] is document['source_adoption'] is False
        assert document['pricing']=={'price':None,'bom':None,'set_code':None}
        master=read((Path(p['candidate_root'])/document['baseline']['path']).as_posix())
        assert master['lifecycle_status']=='FORMAL' and master['product']['revision']==p['baseline_package_version']
        count+=1
    assert count, 'NO_ADMITTED_CANDIDATE_PROFILE'
    return dict(status='PASS',profiles=count,formal_adoption=False,release=False)


if __name__=='__main__':print(json.dumps(validate(Path(__file__).resolve().parents[2])))
