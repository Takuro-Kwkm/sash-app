"""Prepare content-bound dossiers and proposed approval payloads for human review."""
import hashlib
import json
import sys
import tarfile
import tempfile
from pathlib import Path
from window_adoption import apply_decisions
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'contracts/window-seven'
def read(p):return json.loads(Path(p).read_text())
def digest(x):return hashlib.sha256(json.dumps(x,sort_keys=True,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def write(p,x):Path(p).write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n')
adoption=read(OUT/'adoption.json')
with tempfile.TemporaryDirectory() as td:
    stage=Path(td)
    with tarfile.open(ROOT/adoption['archive']) as t:t.extractall(stage,filter='data')
    sys.path.insert(0,str(stage/'scripts'))
    from contracts import load_bundle,validate_bundle
    from formal_promotion import validate_evidence,CLAIM_SOURCES
    bundle=apply_decisions(load_bundle(stage),ROOT,stage)
    validation=validate_bundle(bundle);assert validation['status']=='PASS',validation
    assert not validate_evidence(bundle['field_evidence'],stage)
    authorities={a['authority_id']:a for a in bundle['field_evidence']['authorities']}
    evidence={e['evidence_id']:e for e in bundle['field_evidence']['evidence']}
    inventory=read(OUT/'field-inventory.json')['fields'];contracts=read(OUT/'selection-contracts.json')['fields']
    prepared=[];states=[]
    for f,c in zip(inventory,contracts):
        assert f['field_id']==c['field_id'] and c['status']=='PROVISIONAL'
        selected=[e for e in evidence.values() if e['scope']=={'field_id':f['field_id'],'category':c['category'],'purpose':'APPLICATION_FIELD'}]
        claims={claim for e in selected if e['status']=='ACCEPTED' for claim in e['claims'] if claim not in CLAIM_SOURCES or e['source_class'] in CLAIM_SOURCES[claim]}
        assert not set(f['required_claims'])-claims
        target={**c,'status':'FORMAL'};fid=c['field_id'];token=hashlib.sha256(fid.encode()).hexdigest()[:20]
        d={'dossier_id':'WINDOW7-DOSSIER-'+token,'field_id':fid,'category':c['category'],'purpose':'APPLICATION_FIELD',
          'fact_kind':f['fact_kind'],'mapping_classification':f['central_mapping_classification'],'mapping_rationale':f['mapping_reason']+' '+f['semantic_mapping']['equivalence_basis'],
          'evidence_ids':[e['evidence_id'] for e in selected],'approval_id':'WINDOW7-PROMOTION-'+token,'contract_sha256':digest(target),
          'transition':{'from':'PROVISIONAL','to':'FORMAL','operation':'STATUS_TRANSITION','reason':'Requested window Selection Contract formalization after human-accepted evidence closure. Semantics, Runtime binding and values remain unchanged.','previous_contract':c,'previous_contract_sha256':digest(c)}}
        if f['central_mapping_classification']=='PRODUCT_SPECIFIC':
            identity=next(e for e in selected if 'PRODUCT_SPECIFIC_IDENTITY' in e['claims'])
            d['product_specific']={'reason':f['mapping_reason'],'why_global_role_insufficient':'Existing approved extension '+f['canonical_mapping']['canonical_target']+' retains a separate product-owned selection state and value domain; a Global role cannot replace its product-specific scope.',
              'owner':'WINDOW7-HUMAN-EVIDENCE-ACCEPTANCE','source':identity['source_authority'],'status':'REVIEWED',
              'review_condition':'Reopen only on a changed official source, product scope, semantics, mapping, evidence identity or conflicting product data.'}
        a={'approval_id':d['approval_id'],'field_id':fid,'category':c['category'],'purpose':'APPLICATION_FIELD','status':'APPROVED',
          'contract_sha256':digest(target),'evidence_sha256':digest(selected),'dossier_sha256':digest(d)}
        prepared.append({'field_id':fid,'dossier':d,'target_contract':target,'proposed_approval_payload':a,'human_decision':None})
        states.append({'field_id':fid,'status':'PROVISIONAL','evidence':'PASS','missing_claims':[],'mapping':'PASS','semantic':'PASS','exception':'PASS',
          'promotion_readiness':'READY_FOR_INDEPENDENT_HUMAN_APPROVAL','eligible':False,'governance':'PENDING_PROMOTION_APPROVAL'})
    packet={'schema':'WINDOW7_INDEPENDENT_PROMOTION_REVIEW_PACKET_V1','authority_sha':adoption['authority_sha'],
      'accepted_evidence_sha256':sha(OUT/'evidence-acceptance.json'),'evidence_acceptance_packet_content_sha256':read(OUT/'human-review-packet.json')['packet_content_sha256'],
      'scope':'217 status-only PROVISIONAL to FORMAL transitions; no Runtime/Product Master/UI/Canonical Mapping change. Proposed APPROVED payloads below are review targets, not registered approvals.',
      'promotion_approval_recorded':False,'fields':prepared,'human_decision':None}
    packet['packet_content_sha256']=digest(packet)
    write(OUT/'promotion-review-packet.json',packet)
    write(OUT/'promotion-eligibility.json',{'fields':states,'eligible_count':0,'ready_for_independent_approval':len(states)})
    summary=read(OUT/'summary.json');summary.update({'status':'EVIDENCE_ACCEPTED_PENDING_INDEPENDENT_PROMOTION_APPROVAL',
      'evidence_accepted':len([e for e in evidence.values() if e['scope']['purpose']=='APPLICATION_FIELD' and e['scope']['field_id'] in {f['field_id'] for f in inventory}]),
      'missing_claims':0,'blocked_fields':0,'pending_fields':len(states),'promotion_review_packet_content_sha256':packet['packet_content_sha256']})
    write(OUT/'summary.json',summary)
    print(json.dumps({'accepted':summary['evidence_accepted'],'missing_claims':0,'dossiers_prepared':len(prepared),'promotion_approvals':0,'promotion_packet_content_sha256':packet['packet_content_sha256']},indent=2))
