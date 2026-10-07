#!/usr/bin/env python3
"""Validate registered read-only audit admission and live-manifest baseline data."""
import hashlib
import json
from pathlib import Path

root=Path(__file__).resolve().parents[2]
read=lambda p:json.loads(p.read_text())
config=read(root/'contracts/production/work-connections.v2.json')
validators=read(root/'contracts/production/validator-registry.v2.json')
audits=[]
for product in config['products']:
    admission=product.get('catalogue_audit_profile')
    if not admission:continue
    path=(root/admission['path']).resolve()
    assert path.is_relative_to(root) and path.is_file()
    assert hashlib.sha256(path.read_bytes()).hexdigest()==admission['sha256']
    profile=read(path)
    assert product['connection_state']=='CONNECTED'
    assert profile['product_id']==product['product_id'] and profile['aliases']==product['aliases']
    assert profile['mutation_policy']==admission['mutation_policy']=='NONE'
    assert product['default_gate']==profile['admitted_target_gate']==admission['target_gate']=='SOURCE_AUDIT_VERIFIED'
    assert {'FORMAL_ADOPTION','SOURCE_ADOPTION','PRODUCT_MASTER_CHANGE','RUNTIME_UI_CHANGE'}.issubset(profile['unsupported_operations'])
    assert len(profile['native_sheets'])==len(set(profile['native_sheets'])) and profile['native_sheets']
    assert all((root/product[k]).is_file() for k in ['native_adapter','native_prepare'])
    v=validators['products'][product['product_id']]
    assert v['state']=='READY' and v['scope']=='SOURCE_AUDIT_ONLY' and v['mutation_policy']=='NONE' and v['no_fallback']
    assert v['profile']==admission and v['validators']==product['validators']
    baseline=read(path.with_name('baseline-runtime-manifest.json'))
    assert baseline['package_version']==product['current_formal_version']==product['current_runtime_version']==profile['formal_revision']
    assert baseline['formal_status']=='FORMAL_PASS' and baseline['authoring_sha256']
    assert profile['source_before']['file_id'] in [p.get('drive_file_id') for p in baseline['official_sources']]
    review=read(path.with_name('review.json'));visual=read(path.with_name('visual-comparison.json'))
    assert review['product_id']==product['product_id'] and review['status']=='COMPLETE_REVIEWED'
    assert review['before_sha256']==visual['before_sha256'] and review['after_sha256']==visual['after_sha256']
    assert review['scope_limits'] and review['reviewer_kind']=='AI'
    assert all(set(f['affected_sheets']).issubset(profile['native_sheets']) for f in review['findings'])
    audits.append(product['product_id'])
print(json.dumps({'status':'PASS','scope':'NATIVE_READ_ONLY_CATALOGUE_AUDIT_ADMISSION','products':audits,'product_qa_reissued':False}))
