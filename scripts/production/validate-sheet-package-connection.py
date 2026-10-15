#!/usr/bin/env python3
"""Native connection admission only, never manufacturer or business QA."""
import hashlib
import json
from pathlib import Path


def validate(root):
    root=Path(root)
    read=lambda name:json.loads((root/name).read_text())
    config=read('contracts/production/work-connections.v2.json')
    validators=read('contracts/production/validator-registry.v2.json')
    matches=[p for p in config['products'] if p.get('native_adapter')=='scripts/production/sheet-package-change.py']
    assert matches, 'Native Sheets connection missing'
    for product in matches:
        entry=product['change_profile'];path=root/entry['path']
        assert hashlib.sha256(path.read_bytes()).hexdigest()==entry['sha256'], 'Native profile hash drift'
        profile=json.loads(path.read_text())
        assert profile['product_id']==product['product_id'] and profile['repository']==product['repository'], 'Wrong native identity'
        assert profile['status']=='ADOPTED' and profile['target_gate']==product['default_gate']=='QA_READY', 'Native target drift'
        assert product['build_profile']['mode']=='EXISTING_FORMAL_SUCCESSOR' and product['build_profile']['path']==entry['path'], 'No existing Formal handoff'
        assert profile['formal_mutations']==profile['runtime_ui_mutations']==0 and profile['shared_engine']=='scripts/production-work.py', 'Native boundary drift'
        assert len(profile['native_sheets'])==len(set(profile['native_sheets'])) and profile['native_sheets'], 'Native sheet scope'
        assert validators['products'][product['product_id']]['state']=='READY' and validators['products'][product['product_id']]['no_fallback'] is True
        for field in ('native_adapter','native_preparer','native_qa'):
            assert (root/profile[field]).is_file(), field
        if product.get('formal_profile'):
            formal = product['formal_profile']; path = root/formal['path']
            assert hashlib.sha256(path.read_bytes()).hexdigest() == formal['sha256'], 'Formal profile hash drift'
            declared = json.loads(path.read_text())
            assert declared['product_id'] == product['product_id'] and declared['status'] == 'ADOPTED'
            assert declared['target_gate'] == 'FORMAL_CHANGE_ADOPTION' and declared['human_gate'] == 'HUMAN_ADOPTION'
            assert declared['formal_writes_before_human'] == declared['runtime_ui_mutations'] == 0
            assert declared['automatic_orderability'] is False and declared['shared_engine'] == 'scripts/production-work.py'
            assert all((root/declared[k]).is_file() for k in ('native_preparer','native_worker'))
    for product in config['products']:
        if not product.get('formal_profile'): continue
        entry=product['formal_profile'];path=root/entry['path'];profile=json.loads(path.read_text())
        assert hashlib.sha256(path.read_bytes()).hexdigest()==entry['sha256']
        assert profile['product_id']==product['product_id'] and profile['status']=='ADOPTED'
        declared=validators['products'][product['product_id']]['formal_profile']
        assert {k:declared[k] for k in ('path','sha256')}==entry
        if profile.get('baseline_kind')=='EXISTING_WORKING_DOMAIN':
            adapter=profile['domain_adapter'];file=(root/adapter['path']).resolve()
            assert file.is_relative_to(root.resolve()) and hashlib.sha256(file.read_bytes()).hexdigest()==adapter['sha256']
            assert profile['human_gate']=='HUMAN_ADOPTION' and profile['formal_writes_before_human']==0
    return {'status':'PASS','connections':len(matches),'business_qa':'NOT_EXECUTED_BY_CONNECTION_VALIDATOR','shared_engine_mutations':0}


if __name__=='__main__':
    print(json.dumps(validate(Path(__file__).resolve().parents[2])))
