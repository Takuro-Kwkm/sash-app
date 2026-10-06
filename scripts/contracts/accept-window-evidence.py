"""Record the direct human acceptance of the already fixed 651-candidate Packet.

This does not record an independent Promotion Approval or change Field status.
"""
import hashlib
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'contracts/window-seven'
APPROVED_PACKET='591f11c7bd90a819d39f0e936209dce465a5e099cf7b5fd5a60ab68cf6999636'
REVIEW_AUTHORITY='WINDOW7-HUMAN-EVIDENCE-ACCEPTANCE'
def read(p):return json.loads(Path(p).read_text())
def digest(x):return hashlib.sha256(json.dumps(x,sort_keys=True,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def write(p,x):Path(p).write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n')
def ref(path,pointer=''):return {'path':path,'pointer':pointer,'sha256':sha(ROOT/path)}
packet=read(OUT/'human-review-packet.json');bound=packet.pop('packet_content_sha256')
assert bound==APPROVED_PACKET and digest(packet)==bound
assert packet['evidence_candidates_sha256']==sha(OUT/'evidence/evidence-candidates.json')
assert packet['inventory_sha256']==sha(OUT/'field-inventory.json')
if (OUT/'evidence-acceptance.json').exists():raise SystemExit('Existing acceptance preserved; no duplicate decision generated.')
candidates=read(OUT/'evidence/evidence-candidates.json')['candidates']
products=read(OUT/'evidence/source-index.json')['products']
assert len(candidates)==651 and len(packet['fields'])==217
source_authorities={};evidence=[];decisions=[]
for e in candidates:
    original=dict(e);payload_hash=original.pop('payload_sha256');assert digest(original)==payload_hash
    identity=e['source_identity'];kind=e['official_authority']
    if kind in {'AUDITED_MAPPING','VERIFIED_RUNTIME_BEHAVIOR'}:
        source_ref=ref(identity['path'],identity.get('pointer',''))
        assert source_ref['sha256']==identity['sha256']
    elif kind=='CONTRACT_AUTHORITY':
        source_ref=identity['declarative_app_contract'];assert sha(ROOT/source_ref['path'])==source_ref['sha256']
    elif kind=='FORMAL_PRODUCT_MASTER':
        # This is the original approved source-set identity, including all
        # component hashes and verified Formal manifest. No source is inferred.
        extra=identity.get('current_formal_option_authority')
        if extra:
            source_ref=extra;assert sha(ROOT/source_ref['path'])==source_ref['sha256']
        else:
            index=next(i for i,p in enumerate(products) if p['product_id']==e['product_id'])
            product=products[index]
            assert product['documents']==identity['documents'] and product['manifest']==identity['manifest']
            for d in product['documents']:assert sha(ROOT/d['path'])==d['sha256']
            assert sha(ROOT/product['manifest']['path'])==product['manifest']['sha256']
            source_ref=ref('contracts/window-seven/evidence/source-index.json','/products/'+str(index))
    else:raise AssertionError('Unsupported approved source class')
    sid='WINDOW7-SOURCE-'+digest({'class':kind,'ref':source_ref})[:20]
    source_authorities[sid]={'authority_id':sid,'kind':'EVIDENCE_SOURCE','status':'CURRENT','identity':source_ref,'source_classes':[kind],'purposes':['APPLICATION_FIELD']}
    section=e['page_section'] or e['source_identity'].get('pointer') or e['field_id']
    record={'evidence_id':e['evidence_id'],'source_class':kind,'source_authority':sid,
      'source_identifier':e['product_id']+' / '+e['document'],'document_version':e['edition'],
      'page_or_section':section,'captured_date':'2026-10-06','verification_state':'VERIFIED','status':'ACCEPTED',
      'source_ref':source_ref,'scope':e['scope'],'claims':e['claims']}
    decision_id=e['evidence_id']+'-HUMAN-ACCEPT'
    decisions.append({'decision_id':decision_id,'status':'APPROVED','payload':record.copy(),
      'original_candidate_payload_sha256':payload_hash,'original_packet_content_sha256':bound,
      'normalization':'Typed acceptance serialization of the approved candidate scope, source set and claims. Original Packet and candidate bytes are preserved.'})
    evidence.append(record)
review_path='contracts/window-seven/evidence/human-acceptance-decisions.json'
review_document={'version':'0.1','human_review_authority':'Direct human user in this Codex chat',
 'human_statement':'承認','interpreted_scope':'All 651 Evidence Acceptance candidates in the immediately preceding request and fixed Packet. No new claims or independent Promotion Approval.',
 'approved_packet_content_sha256':bound,'approved_pr_head':'a307482e571a88e708d00723a1e3c739d5cae593',
 'recorded_at_utc':'2026-10-06T02:28:06Z','attestation_type':'HUMAN_MESSAGE_RECORD_NOT_CRYPTOGRAPHIC_IDENTITY','promotion_approval_granted':False,'decisions':decisions}
write(ROOT/review_path,review_document)
review_identity=ref(review_path)
authorities=list(source_authorities.values())+[{'authority_id':REVIEW_AUTHORITY,'kind':'REVIEW_AUTHORITY','status':'CURRENT','identity':review_identity,'source_classes':[],'purposes':['APPLICATION_FIELD']}]
for i,e in enumerate(evidence):
    e['review']={'authority_id':REVIEW_AUTHORITY,'decision_id':decisions[i]['decision_id'],'decision_ref':ref(review_path,'/decisions/'+str(i))}
write(OUT/'evidence-acceptance.json',{'version':'0.1','authorities':authorities,'evidence':evidence})
print(json.dumps({'accepted':len(evidence),'rejected':0,'source_authorities':len(source_authorities),'promotion_approvals':0,'packet_content_sha256':bound}))
