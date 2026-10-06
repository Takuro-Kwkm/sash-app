"""Validate fixed bytes and current git identity without trusting generated totals."""
import argparse
import collections
import gzip
import hashlib
import json
import pathlib
import subprocess
import sys
import tarfile
import tempfile
from window_adoption import apply_decisions,check_acceptance_binding
ROOT=pathlib.Path(__file__).resolve().parents[2]
OUT=ROOT/'contracts/window-seven'
def read(p):return json.loads(pathlib.Path(p).read_text())
def digest(v):return hashlib.sha256(json.dumps(v,sort_keys=True,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()
def sha(p):return hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()
def check(ok,why):
    if not ok:raise AssertionError(why)
parser=argparse.ArgumentParser()
parser.add_argument('--require-complete',action='store_true')
args=parser.parse_args()
a=read(OUT/'adoption.json')
check(sha(ROOT/a['archive'])==a['archive_sha256'],'Central snapshot bytes changed')
with tempfile.TemporaryDirectory() as td:
    with tarfile.open(ROOT/a['archive']) as t:t.extractall(td,filter='data')
    central=pathlib.Path(td)
    sys.path.insert(0,str(central/'scripts'))
    from contracts import load_bundle,validate_bundle
    from formal_promotion import validate_promotion,CLASSIFICATION
    bundle=apply_decisions(load_bundle(central),ROOT,central)
    validation=validate_bundle(bundle)
    check(validation['status']=='PASS',json.dumps(validation['validators']))
    (OUT/'evidence/central-validation.json').write_text(json.dumps(validation,indent=2)+'\n')
    contract_rows=read(OUT/'selection-contracts.json')['fields']
    selected={c['field_id']:c for c in contract_rows}
    inv=read(OUT/'field-inventory.json')
    fields=inv['fields'];fids={f['field_id'] for f in fields}
    excluded={x['field_id'] for x in inv['excluded']}
    audit=read(central/'authority/audit/FIELD_INVENTORY.json')['fields']
    targetids={f['product_id'] for f in fields}
    audited={r['field_id'] for r in audit if r['product'] in targetids}
    check(len(targetids)==7,'Wrong product universe')
    check(len(fids)==len(fields)==len(selected),'Duplicate or missing Field')
    check(fids.isdisjoint(excluded) and fids|excluded==audited,'Audit Field coverage missing or duplicated')
    baseline={f['field_id']:f for f in read(central/'fixtures/current-selection-baseline.v0.1.json')['fields']}
    current_missing={}
    m={r['field_id']:r for r in bundle['mapping']['fields']}
    for f in fields:
        c=selected[f['field_id']]
        prior=baseline[c['field_id']]
        check({k:v for k,v in c.items() if k!='status'}=={k:v for k,v in prior.items() if k!='status'},'Contract semantics differ from fixed central authority')
        check(f['contract_sha256']==digest(prior),'Stale approved baseline Contract hash')
        check(f['canonical_mapping']==m[c['field_id']],'Mapping changed')
        check(c['runtime_key']==f['internal_key'],'Runtime binding changed')
        base=CLASSIFICATION[m[c['field_id']]['mapping_type']]
        needed=set(bundle['promotion_policy']['common_claims']+bundle['promotion_policy']['mapping_claims'][base])
        needed.add({'PRODUCT_FACT':'PRODUCT_FACT','BUSINESS_INPUT':'FIELD_RESPONSIBILITY','DERIVED':'DERIVATION_AUTHORITY'}[f['fact_kind']]);needed.add('RUNTIME_PARITY')
        accepted={cl for e in bundle['field_evidence']['evidence'] if e['status']=='ACCEPTED' and e['scope']=={'field_id':f['field_id'],'category':c['category'],'purpose':'APPLICATION_FIELD'} for cl in e['claims']}
        check(sorted(needed)==f['required_claims'],'Required Claim audit changed')
        current_missing[f['field_id']]=sorted(needed-accepted)
    source_index=read(OUT/'evidence/source-index.json')
    for product in source_index['products']:
        check(sha(ROOT/product['manifest']['path'])==product['manifest']['sha256'],'Runtime manifest changed')
        for d in product['documents']:
            check(sha(ROOT/d['path'])==d['sha256'],'Cached master bytes changed')
            check(hashlib.sha256(gzip.decompress((ROOT/d['path']).read_bytes())).hexdigest()==d['decoded_sha256'],'Decoded master hash changed')
    packet=read(OUT/'human-review-packet.json');bound=packet.pop('packet_content_sha256')
    check(digest(packet)==bound,'Human Packet binding changed')
    check(packet['inventory_sha256']==sha(OUT/'field-inventory.json'),'Packet inventory stale')
    check(packet['evidence_candidates_sha256']==sha(OUT/'evidence/evidence-candidates.json'),'Packet evidence stale')
    check(packet['human_decision'] is None,'Unregistered human decision')
    acceptance_path=OUT/'evidence-acceptance.json'
    if acceptance_path.exists():
        record=read(OUT/'evidence/human-acceptance-decisions.json')
        check(record['approved_packet_content_sha256']==bound and record['human_statement']=='承認','Human acceptance does not bind this Packet')
        check(record['promotion_approval_granted'] is False,'Evidence Acceptance cannot impersonate independent Promotion Approval')
    candidates=read(OUT/'evidence/evidence-candidates.json')['candidates']
    if acceptance_path.exists():
        check_acceptance_binding(read(acceptance_path),candidates,record['decisions'],bound)
    check(len({e['evidence_id'] for e in candidates})==len(candidates),'Duplicate candidate ID')
    for e in candidates:
        v=dict(e);h=v.pop('payload_sha256');check(digest(v)==h,'Candidate payload changed')
        check(e['status']=='CANDIDATE_NOT_ACCEPTED' and e['decision'] is None,'Invented evidence acceptance')
        extra=e['source_identity'].get('current_formal_option_authority')
        if extra:check(sha(ROOT/extra['path'])==extra['sha256'],'Current R6 Formal option evidence changed')
    promotion_packet=OUT/'promotion-review-packet.json'
    if promotion_packet.exists():
        prepared=read(promotion_packet);prepared_sha=prepared.pop('packet_content_sha256')
        check(digest(prepared)==prepared_sha,'Promotion Packet hash changed')
        check(prepared['accepted_evidence_sha256']==sha(acceptance_path),'Promotion Packet acceptance hash stale')
        accepted_by_id={e['evidence_id']:e for e in read(acceptance_path)['evidence']}
        check({x['field_id'] for x in prepared['fields']}==fids,'Promotion Packet Field universe changed')
        for row in prepared['fields']:
            d,payload,target=row['dossier'],row['proposed_approval_payload'],row['target_contract']
            check(digest(d)==payload['dossier_sha256'] and digest(target)==payload['contract_sha256']==d['contract_sha256'],'Promotion dossier/target binding stale')
            check(digest([accepted_by_id[eid] for eid in d['evidence_ids']])==payload['evidence_sha256'],'Promotion evidence binding stale')
            check({k:v for k,v in target.items() if k!='status'}=={k:v for k,v in baseline[row['field_id']].items() if k!='status'},'Promotion changes semantics')
        if (OUT/'formal-promotions.json').exists():
            decision=read(OUT/'evidence/human-promotion-decisions.json')
            check(decision['approved_packet_content_sha256']==prepared_sha and decision['human_statement']=='217件の独立Promotion Approvalを承認','Independent human Promotion Approval is not bound to the fixed Packet')
    diff=subprocess.check_output(['git','diff','--name-only',a['application_baseline_sha'],'--'],cwd=ROOT,text=True).splitlines()
    unexpected=[p for p in diff if not p.startswith(('contracts/window-seven/','scripts/contracts/','.github/workflows/window-seven-contracts.yml'))]
    check(not unexpected,'Runtime or existing validation changed: '+str(unexpected))
    replay=read(OUT/'evidence/independent-runtime-replay.json')
    check(replay['status']=='PASS' and {f['field_id'] for f in replay['fields']}==fids,'Independent Runtime replay absent')
    dry=[({**c,'status':'FORMAL'} if c['field_id'] in fids else c,'APPLICATION_FIELD') for c in bundle['fields']]
    dry += [(c,'CONTRACT_REFERENCE') for c in bundle['references']]
    dry += [(x['contract'],'APPLICATION_FIELD') for x in bundle['presentation_fixtures']]
    dry_errors=validate_promotion(bundle['promotion_policy'],bundle['field_evidence'],bundle['field_promotions'],dry,central,validation['validators'],m,exception_records=bundle['exceptions']['exceptions'])
    missing_claims=sum(len(v) for v in current_missing.values())
    unverified=[f['field_id'] for f in replay['fields'] if f['runtime_parity']!='PASS']
    actual_formal=sum(c['status']=='FORMAL' for c in contract_rows)
    result={'status':'PASS_ADOPTION_INTEGRITY','completion':'FORMAL_VALIDATION_PASS' if actual_formal==len(fields) and not dry_errors and not missing_claims and not unverified else 'PENDING_INDEPENDENT_PROMOTION_APPROVAL' if acceptance_path.exists() else 'PENDING_HUMAN_DECISION','total_field_count':len(fields),
        'manufacturer_counts':dict(collections.Counter(f['manufacturer'] for f in fields)),
        'product_counts':dict(collections.Counter(f['product_id'] for f in fields)),
        'mapping_counts':dict(collections.Counter(f['mapping_type'] for f in fields)),
        'statuses':dict(collections.Counter(c['status'] for c in contract_rows)),
        'evidence_accepted_application':sum(e['status']=='ACCEPTED' for e in bundle['field_evidence']['evidence'] if e['scope']['field_id'] in fids and e['scope']['purpose']=='APPLICATION_FIELD'),
        'missing_claims':missing_claims,'runtime_unverified_fields':unverified,
        'central_authority_sha':a['authority_sha'],'runtime_diff':len(unexpected),'central_validator_count':len(validation['validators']),
        'promotion_dry_run_error_count':len(dry_errors),'promotion_dry_run_errors':dry_errors,
        'git_head':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),'packet_content_sha256':bound}
    (OUT/'evidence/independent-verification.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({k:v for k,v in result.items() if k!='promotion_dry_run_errors'},ensure_ascii=False,indent=2))
    if args.require_complete and (dry_errors or missing_claims or unverified or actual_formal!=len(fields)):sys.exit(2)
