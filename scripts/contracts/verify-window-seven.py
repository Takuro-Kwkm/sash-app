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
    bundle=load_bundle(central)
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
    baseline={f['field_id']:f for f in bundle['fields']}
    m={r['field_id']:r for r in bundle['mapping']['fields']}
    for f in fields:
        c=selected[f['field_id']]
        check(c==baseline[c['field_id']],'Current Contract differs from fixed central authority')
        check(f['contract_sha256']==digest(c),'Stale Contract hash')
        check(f['canonical_mapping']==m[c['field_id']],'Mapping changed')
        check(c['runtime_key']==f['internal_key'],'Runtime binding changed')
        base=CLASSIFICATION[m[c['field_id']]['mapping_type']]
        needed=set(bundle['promotion_policy']['common_claims']+bundle['promotion_policy']['mapping_claims'][base])
        needed.add({'PRODUCT_FACT':'PRODUCT_FACT','BUSINESS_INPUT':'FIELD_RESPONSIBILITY','DERIVED':'DERIVATION_AUTHORITY'}[f['fact_kind']]);needed.add('RUNTIME_PARITY')
        accepted={cl for e in bundle['field_evidence']['evidence'] if e['status']=='ACCEPTED' and e['scope']=={'field_id':f['field_id'],'category':c['category'],'purpose':'APPLICATION_FIELD'} for cl in e['claims']}
        check(sorted(needed)==f['required_claims'] and sorted(needed-accepted)==f['missing_claims'],'Claim audit changed')
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
    candidates=read(OUT/'evidence/evidence-candidates.json')['candidates']
    check(len({e['evidence_id'] for e in candidates})==len(candidates),'Duplicate candidate ID')
    for e in candidates:
        v=dict(e);h=v.pop('payload_sha256');check(digest(v)==h,'Candidate payload changed')
        check(e['status']=='CANDIDATE_NOT_ACCEPTED' and e['decision'] is None,'Invented evidence acceptance')
    diff=subprocess.check_output(['git','diff','--name-only',a['application_baseline_sha'],'--'],cwd=ROOT,text=True).splitlines()
    unexpected=[p for p in diff if not p.startswith(('contracts/window-seven/','scripts/contracts/','.github/workflows/window-seven-contracts.yml'))]
    check(not unexpected,'Runtime or existing validation changed: '+str(unexpected))
    replay=read(OUT/'evidence/independent-runtime-replay.json')
    check(replay['status']=='PASS' and {f['field_id'] for f in replay['fields']}==fids,'Independent Runtime replay absent')
    dry=[({**c,'status':'FORMAL'} if c['field_id'] in fids else c,'APPLICATION_FIELD') for c in bundle['fields']]
    dry += [(c,'CONTRACT_REFERENCE') for c in bundle['references']]
    dry += [(x['contract'],'APPLICATION_FIELD') for x in bundle['presentation_fixtures']]
    dry_errors=validate_promotion(bundle['promotion_policy'],bundle['field_evidence'],bundle['field_promotions'],dry,central,validation['validators'],m,exception_records=bundle['exceptions']['exceptions'])
    missing_claims=sum(len(f['missing_claims']) for f in fields)
    unverified=[f['field_id'] for f in replay['fields'] if f['runtime_parity']!='PASS']
    result={'status':'PASS_ADOPTION_INTEGRITY','completion':'PENDING_HUMAN_DECISION','total_field_count':len(fields),
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
    if args.require_complete and (dry_errors or missing_claims or unverified):sys.exit(2)
