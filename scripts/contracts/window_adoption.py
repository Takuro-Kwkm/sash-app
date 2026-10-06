"""Overlay application-owned decisions on an unchanged, fixed central snapshot."""
import copy
import json
import shutil
import hashlib
from pathlib import Path

def check_acceptance_binding(registry, candidates, decisions, packet_sha):
    original={e['evidence_id']:e for e in candidates}
    accepted={e['evidence_id']:e for e in registry['evidence']}
    reviews={d['payload']['evidence_id']:d for d in decisions}
    assert set(original)==set(accepted)==set(reviews), 'Human acceptance universe differs from fixed Packet'
    for eid,c in original.items():
        e,d=accepted[eid],reviews[eid]
        assert e['claims']==c['claims'] and e['scope']==c['scope'], 'Accepted claims/scope differ from human-reviewed candidate'
        assert e['source_class']==c['official_authority'] and e['document_version']==c['edition'], 'Accepted source class/version changed'
        assert e['status']=='ACCEPTED' and e['verification_state']=='VERIFIED'
        assert d['original_candidate_payload_sha256']==c['payload_sha256'] and d['original_packet_content_sha256']==packet_sha, 'Decision does not bind original candidate'
        assert d['payload']=={k:v for k,v in e.items() if k!='review'}, 'Accepted payload differs from human decision'

def apply_decisions(bundle, app_root, staged_root):
    app_root, staged_root = Path(app_root), Path(staged_root)
    prefix = Path('contracts/window-seven')
    # Reference certificates retain their original central files and purposes.
    shutil.copytree(app_root/prefix, staged_root/prefix, dirs_exist_ok=True)
    code=Path('src/catalog/runtime-master/inner-window-sales-extension.mjs')
    (staged_root/code).parent.mkdir(parents=True,exist_ok=True)
    shutil.copy2(app_root/code,staged_root/code)
    acceptance=app_root/prefix/'evidence-acceptance.json'
    if acceptance.exists():
        extra=json.loads(acceptance.read_text())
        bundle['field_evidence']=copy.deepcopy(bundle['field_evidence'])
        for key in ['authorities','evidence']:bundle['field_evidence'][key].extend(extra[key])
    reviewers=app_root/prefix/'promotion-review-authorities.json'
    if reviewers.exists():
        bundle['field_evidence']['authorities'].extend(json.loads(reviewers.read_text())['authorities'])
    promotions=app_root/prefix/'formal-promotions.json'
    if promotions.exists():
        extra=json.loads(promotions.read_text())
        bundle['field_promotions']=copy.deepcopy(bundle['field_promotions'])
        for key in ['approvals','dossiers','blockers']:bundle['field_promotions'][key].extend(extra[key])
    local={f['field_id']:f for f in json.loads((app_root/prefix/'selection-contracts.json').read_text())['fields']}
    bundle['fields']=[copy.deepcopy(local.get(f['field_id'],f)) for f in bundle['fields']]
    return bundle
