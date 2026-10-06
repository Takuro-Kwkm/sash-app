"""Build a review candidate from fixed central authority and existing app sources.

This creates no human decision, acceptance, or FORMAL status. Candidate records
are kept outside the accepted-evidence/approval registries.
"""
import collections
import gzip
import hashlib
import json
import pathlib
import tarfile
import tempfile

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / 'contracts/window-seven'
def read(p): return json.loads(pathlib.Path(p).read_text())
def digest(x): return hashlib.sha256(json.dumps(x, sort_keys=True, ensure_ascii=False, separators=(',', ':')).encode()).hexdigest()
def sha(p): return hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()
def write(name, x):
    p = OUT / name
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(x, ensure_ascii=False, indent=2)+'\n')
def ref(p, pointer=''): return {'path':p, 'pointer':pointer, 'sha256':sha(ROOT/p)}
def pointer(s): return s.replace('~','~0').replace('/','~1')

adoption = read(OUT/'adoption.json')
assert sha(ROOT/adoption['archive']) == adoption['archive_sha256']
raw = read(OUT/'evidence/runtime-observations.json')
sources = read(OUT/'evidence/source-index.json')
proof_path=OUT/'evidence/independent-runtime-replay.json'
proof_rows=read(proof_path)['fields'] if proof_path.exists() else []
proofs={r['field_id']:(i,r) for i,r in enumerate(proof_rows)}
products = {p['product_id']:p for p in sources['products']}
observed = {p['integration']['id']:p for p in raw['sash']}
assert len(products) == len(observed) == 7 and not raw['errors']
with tempfile.TemporaryDirectory() as td:
    with tarfile.open(ROOT/adoption['archive']) as t: t.extractall(td, filter='data')
    central = pathlib.Path(td)
    audit = read(central/'authority/audit/FIELD_INVENTORY.json')['fields']
    contracts = read(central/'fixtures/current-selection-baseline.v0.1.json')['fields']
    mapping = read(central/'mappings/field-mapping-baseline.v0.1.json')['fields']
    policy = read(central/'registries/formal-promotion/governance.v0.1.json')
    accepted = read(central/'authority/field-evidence-acceptance.v0.1.json')['evidence']
    approvals = read(central/'authority/field-promotion-approvals.v0.1.json')['approvals']
    exceptions = read(central/'registries/exceptions/exceptions.v0.1.json')['exceptions']
contracts = {c['field_id']:c for c in contracts if c['scope']['product'] in products}
mapping = {m['field_id']:m for m in mapping if m['product'] in products}
audit = [a for a in audit if a['product'] in products]
inventory, excluded, candidates, packet_fields, eligibility = [], [], [], [], []
source_trace = []
visibility_universe = {}
fixed_hidden = {}
for p in sources['products']:
    for doc in p['documents']:
        content = json.loads(gzip.decompress((ROOT/doc['path']).read_bytes()))
        if p['product_id']=='SER-LIX-EW' and doc['role']=='runtime_master':
            meaningful=[r for r in content['provider']['screens'] if r.get('presence')=='あり' and r.get('midrail') not in {None,'対象外'}]
            rules=content['source_tables']['09C_網戸適用ルール']['values']
            fixed_windows={r[1] for r in rules[3:] if len(r)>5 and r[5] in {'固定','継承'} and r[2]=='引違い網戸'}
            if meaningful and all(r['window_id'] in fixed_windows for r in meaningful):
                fixed_hidden['sash-app:SER-LIX-EW:screen_midrail']={'authority':doc['path'],'section':'source_tables/09C_網戸適用ルール; provider/screens; canonical-workbook-reference-v1-behavior-normalizer.mjs fixedMidrailRule/hideField','supporting_fact':'All meaningful current midrails belong to the two fixed/inherited sliding-screen rules; their selection control is explicitly hidden. Other screen forms are non-applicable.','official_pages':'EW 2026 P133; P185-187'}
        if p['product_id']=='SER-YKKAP-UCHIRIMO':
            universe=visibility_universe.setdefault(p['product_id'],set())
            if doc['role']=='canonical_runtime':
                universe.update(['room_specification','window_type','sash_configuration','size_class','frame_color','size_w','size_h','size_mode','frame_projection','bathroom_installation_type','extension_frame_reinforcement'])
                universe.update(['glass_family','glass_structure','low_e_type','glass_coating_color','glass_surface_type','safety_treatment','grille_type','grille_material','muntin_type','vacuum_glass_product','spacer_type','gas_fill','cavity_thickness_mm'])
                for matrix in content['detail_field_matrix']:
                    universe.update(k for k,v in matrix.items() if k!='node_id' and v not in {'NOT_APPLICABLE','FIXED'})
                universe.update(r['effect']['target_field'] for r in content['dependency_rules'] if r['effect']['action'] in {'require','auto_select','evaluate_phase3_r2_reinforcement_master'})
                universe.update(f['field_name'] for f in content['inner_window_frame_contract']['fields'] if f['selection_mode']!='NOT_APPLICABLE')
                universe.update(f['key'] for f in p['sales_request_extension']['fields'])
            if 'installation_input_contract' in content:
                universe.update(f['field_name'] for f in content['installation_input_contract'].get('raw_inputs',[]))
        def walk(x, at=''):
            if isinstance(x, dict):
                if any(k in x for k in ['source_id','evidence_id','sourceType','source_type']) or ('Evidence' in at and any(k in x for k in ['URL','url','資料名称','資料名'])):
                    source_trace.append({'product_id':p['product_id'],'document':doc['path'],'pointer':at,'record':x})
                for key, value in x.items(): walk(value, at+'/'+pointer(key))
            elif isinstance(x, list):
                for i, value in enumerate(x): walk(value, at+'/'+str(i))
        walk(content)
write('evidence/inherited-source-trace.json', {'records':source_trace, 'note':'Inherited source records, not new accepted decisions. Scope remains the original product and record.'})
for a in audit:
    pid, fid, key = a['product'], a['field_id'], a['runtime_key']
    source = products[pid]
    extension = source['sales_request_extension'] or {}
    defs = {d.get('field_name'):d for d in source['runtime_definitions']}
    if fid in fixed_hidden:
        excluded.append({'field_id':fid,'reason':'EXPLICIT_FIXED_HIDDEN_CONTROL','original_contract_status':contracts[fid]['status'],**fixed_hidden[fid]})
        continue
    if key in extension.get('suppressedFields',[]):
        excluded.append({'field_id':fid,'reason':'EXPLICIT_SALES_PRESENTATION_SUPPRESSION','authority':'src/catalog/runtime-master/inner-window-sales-extension.mjs','original_contract_status':contracts[fid]['status']})
        continue
    if defs.get(key,{}).get('selection_mode') == 'NOT_APPLICABLE':
        excluded.append({'field_id':fid,'reason':'EXPLICIT_NOT_APPLICABLE','authority':source['documents'][0]['path']+' /inner_window_frame_contract/fields','original_contract_status':contracts[fid]['status']})
        continue
    if pid in visibility_universe and key not in visibility_universe[pid]:
        excluded.append({'field_id':fid,'reason':'NO_CURRENT_UI_VISIBILITY_PRODUCER','authority':'src/catalog/runtime-master/uchirimo-tabular-v1-adapter.mjs configureNodeAxes/configureDetailFields/configureGlass/applyRules/installationVisibility + current Formal matrices/contracts','source_code_sha256':sha(ROOT/'src/catalog/runtime-master/uchirimo-tabular-v1-adapter.mjs'),'original_contract_status':contracts[fid]['status'],'note':'Historical field_registry/derived output is retained in source; it is not a current Selection Field.'})
        assert next(f for f in observed[pid]['fields'] if f['key']==key).get('declared_only'), 'Observed UI Field cannot be excluded'
        continue
    c, m = contracts[fid], mapping[fid]
    live = next(f for f in observed[pid]['fields'] if f['key']==key)
    base_type = {'exact match':'EXACT','semantic match':'SEMANTIC','product specific':'PRODUCT_SPECIFIC'}[m['mapping_type']]
    scoped_ex = [e for e in exceptions if fid in e.get('field_id',[])]
    reported_type = 'EXCEPTION' if scoped_ex else base_type
    sales_def = next((f for f in extension.get('fields',[]) if f['key']==key),None)
    site_field = a['semantic_role']['semantic_stage']=='INSTALLATION_SURVEY' and key in {d['field_name'] for d in source['runtime_definitions'] if d.get('domain')=='INSTALLATION'}
    numeric_input = c['control_type'] in {'NUMBER','TEXT','TEXTAREA'}
    kind = 'BUSINESS_INPUT' if sales_def or numeric_input or site_field else 'DERIVED' if a['semantic_role']['field_role']=='DERIVED' else 'PRODUCT_FACT'
    claim = {'BUSINESS_INPUT':'FIELD_RESPONSIBILITY','DERIVED':'DERIVATION_AUTHORITY','PRODUCT_FACT':'PRODUCT_FACT'}[kind]
    needed = sorted(set(policy['common_claims'] + policy['mapping_claims'][base_type] + [claim,'RUNTIME_PARITY']))
    applicable_evidence = [e for e in accepted if e['scope']=={'field_id':fid,'category':c['category'],'purpose':'APPLICATION_FIELD'}]
    accepted_claims = {cl for e in applicable_evidence if e['status']=='ACCEPTED' for cl in e['claims']}
    missing = sorted(set(needed)-accepted_claims)
    relation = {'source_meaning':{'key':key,'labels':a['display_label'],'stage':a['semantic_role']['semantic_stage']},
      'target_meaning':{'semantic_role':m['semantic_role'],'canonical_target':m['canonical_target']},
      'equivalence_basis':'Existing centrally adopted audit mapping at the same application main SHA; aliases are semantic containers, not merged selection state or manufacturer Value Domains.',
      'differences':{'internal_key_preserved':key,'value_domain_owner':pid,'controls':c['allowed_control_types'],'product_fact_kind':kind,'same_label_does_not_prove_same_values':True},
      'applicability':{'product_id':pid,'category':c['category'],'rule':'Current product authority per selection; exclude non-applicable output.'}}
    if reported_type=='EXCEPTION': group='EXCEPTION'
    elif base_type=='PRODUCT_SPECIFIC': group='PRODUCT SPECIFIC'
    elif base_type=='SEMANTIC': group='SEMANTIC EQUIVALENT'
    else: group='CATEGORY SHARED'
    row={'manufacturer':a['manufacturer'],'product':a['series'],'product_id':pid,'module_id':pid,'field_id':fid,'internal_key':key,
      'ui_label':a['display_label'],'control_type':c['control_type'],
      'value_domain':{'policy':'PRODUCT_AUTHORITY_PER_SELECTION','observed_values':[v['value'] for v in live['options']],'observed_labels':[v['displayLabel'] for v in live['options']],'observed_union_is_allowed_set':False,'source':a['option_source'],'current_capture':'contracts/window-seven/evidence/runtime-observations.json'},
      'required_optional':c['required'],'dependency':a['dependency'],'reset_rule':c['reset_behavior'],
      'runtime_binding':{'key':key,'adapter':source['integration']['adapterType'],'runtime_version':source['integration']['packageVersion'],'manifest':source['manifest']['path'],'manifest_sha256':source['manifest']['sha256']},
      'product_master_source':{'formal_product_reference':source['integration'].get('productMasterFormalReference'),'documents':source['documents'],'original_integrity':source['original_source_integrity'],'scope':'Existing verified master projection; no extension to other series.'},
      'canonical_mapping':m,'validation':a['validation'],'existing_evidence':{'authority':c['authority'],'source_trace':{'path':'contracts/window-seven/evidence/inherited-source-trace.json','product_id':pid},'accepted_evidence_ids':[e['evidence_id'] for e in applicable_evidence if e['status']=='ACCEPTED']},
      'existing_status':c['status'],'mapping_type':reported_type,'central_mapping_classification':base_type,'classification':group,
      'mapping_reason':a['classification_reason'],'semantic_mapping':relation,'exceptions':scoped_ex,'fact_kind':kind,
      'observation_coverage':'DECLARED_CONTRACT_ONLY' if live.get('declared_only') else 'RESOLVER_SAMPLES',
      'required_claims':needed,'missing_claims':missing,'contract_sha256':digest(c),
      'runtime_identity_sha256':digest({k:v for k,v in c.items() if k!='status'})}
    inventory.append(row)
    runtime_ref=ref('contracts/window-seven/evidence/independent-runtime-replay.json','/fields/'+str(proofs[fid][0])) if fid in proofs else ref('contracts/window-seven/evidence/runtime-observations.json','/sash/'+str(list(observed).index(pid)))
    responsibility_source={'documents':source['documents'],'section':key,'manifest':source['manifest'],'source_trace_product':pid}
    if sales_def:
        responsibility_source={'declarative_app_contract':ref('src/catalog/runtime-master/inner-window-sales-extension.mjs'),'section':'UCHIRIMO_SALES_REQUEST fields / '+key,'authority_registration':'REQUIRES_INDEPENDENT_HUMAN_ACCEPTANCE_AS_APPLICATION_REQUEST_CONTRACT','product_formal_reference':source['integration'].get('productMasterFormalReference')}
    groups=[('CONTRACT',needed[:0]+policy['common_claims']+policy['mapping_claims'][base_type],{'path':adoption['archive'],'sha256':adoption['archive_sha256'],'section':'authority/audit/FIELD_INVENTORY.json / '+fid},'AUDITED_MAPPING'),
      ('RESPONSIBILITY',[claim],responsibility_source,'CONTRACT_AUTHORITY' if sales_def else 'FORMAL_PRODUCT_MASTER'),
      ('RUNTIME',['RUNTIME_PARITY'],runtime_ref, 'VERIFIED_RUNTIME_BEHAVIOR')]
    eids=[]
    for label, claims, source_ref, source_class in groups:
        eid='WINDOW7-'+hashlib.sha256((fid+':'+label).encode()).hexdigest()[:20]
        e={'evidence_id':eid,'manufacturer':a['manufacturer'],'product':a['series'],'product_id':pid,'field_id':fid,'claims':sorted(set(claims)),
          'source_identity':source_ref,'official_authority':source_class,'document':source_ref.get('path',source['manifest']['path']),
          'edition':source['integration']['packageVersion'] if label=='RESPONSIBILITY' else adoption['authority_sha'] if label=='CONTRACT' else adoption['application_baseline_sha'],
          'page_section':source_ref.get('section',source_ref.get('pointer','')),'scope':{'field_id':fid,'category':c['category'],'purpose':'APPLICATION_FIELD'},
          'supporting_fact':relation if label=='CONTRACT' else {'fact_kind':kind,'definition':sales_def or defs.get(key),'product_scope':pid,'unconditional_manufacturability_claim':False} if label=='RESPONSIBILITY' else {'sample_count':len(observed[pid]['samples']),'observation_coverage':row['observation_coverage'],'runtime_code_changed':False,'independent_replay':proofs.get(fid,(None,None))[1]},
          'applicability':relation['applicability'],'status':'CANDIDATE_NOT_ACCEPTED',
          'proposed_decision':'REVIEW_CACHED_EVIDENCE' if label!='RUNTIME' or not live.get('declared_only') else 'DO_NOT_ACCEPT_RUNTIME_PARITY_UNTIL_FIELD_BEHAVIOR_IS_PROVEN',
          'verification_state':'IDENTITY_AND_REPLAY_VERIFIED_NOT_ACCEPTED' if label=='RUNTIME' and fid in proofs and proofs[fid][1]['runtime_parity']=='PASS' else 'UNVERIFIED_FOR_PROMOTION' if label=='RUNTIME' else 'INHERITED_SOURCE_IDENTITY_VERIFIED_NOT_ACCEPTED',
          'reviewer':None,'decision':None}
        e['payload_sha256']=digest(e);candidates.append(e);eids.append(eid)
    target={**c,'status':'FORMAL'}
    blockers=[{'id':'WINDOW7-ACCEPT-'+hashlib.sha256(fid.encode()).hexdigest()[:16],'field_id':fid,'target_gate':'EVIDENCE_ACCEPTANCE','status':'PENDING','reason':'No application-purpose accepted content-bound decision for the required claims. Existing reference certificates are not application decisions.','evidence_state':'CANDIDATES_FIXED_NOT_ACCEPTED','resolution':'A human reviews each scoped candidate and records accepted/rejected decisions; retain rejection history.'},
      {'id':'WINDOW7-PROMOTE-'+hashlib.sha256(fid.encode()).hexdigest()[:16],'field_id':fid,'target_gate':'FORMAL_PROMOTION','status':'PENDING','reason':'No independent application-purpose Promotion Approval bound to this target Contract and accepted evidence.','evidence_state':'APPROVAL_ABSENT','resolution':'After all requirements pass, human approval binds target Contract, dossier, and selected accepted evidence hashes.'}]
    if live.get('declared_only'):
        blockers.append({'id':'WINDOW7-PARITY-'+hashlib.sha256(fid.encode()).hexdigest()[:16],'field_id':fid,'target_gate':'FORMAL_PROMOTION','status':'OPEN','reason':'Current definition was not reached by sampled resolver branches; no Field behavior PASS is asserted.','evidence_state':'DECLARED_CONTRACT_ONLY','resolution':'Execute an applicable current-product branch and prove Runtime/Flow parity, or obtain authoritative inactive-field exclusion.'})
    eligibility.append({'field_id':fid,'status':'PROVISIONAL','eligible':False,'missing_claims':missing,'mapping':'PASS','semantic':'PASS_EXISTING_CENTRAL_SCOPE','evidence':'PENDING','governance':'PENDING','exception':'PASS' if all(e['status'] not in {'PENDING_REVIEW','LEGACY_EXCEPTION'} for e in scoped_ex) else 'BLOCKED','blockers':blockers})
    packet_fields.append({'field_id':fid,'fact_kind':kind,'mapping_classification':base_type,'evidence_ids':eids,'prior_contract_sha256':digest(c),'target_contract':target,'target_contract_sha256':digest(target),'proposed_transition':'PROVISIONAL_TO_FORMAL_ONLY_AFTER_ACCEPTANCE_AND_INDEPENDENT_APPROVAL','decision':None,'blockers':blockers})
active={r['field_id'] for r in inventory}
role_groups=collections.defaultdict(list)
for r in inventory: role_groups[r['canonical_mapping']['semantic_role']].append(r)
for rows in role_groups.values():
    if len({r['product_id'] for r in rows})>1 and len({r['manufacturer'] for r in rows})==1:
        for r in rows:
            if r['classification']=='CATEGORY SHARED':r['classification']='MANUFACTURER SHARED'
write('selection-contracts.json',{'fields':[c for fid,c in contracts.items() if fid in active]})
write('field-inventory.json',{'counting_unit':'Existing product-scoped logical Selection Field; conditional fields included; mirrored UI controls count once.','fields':inventory,'excluded':excluded,'central_audit_total':len(audit),'active_total':len(inventory)})
write('evidence/evidence-candidates.json',{'candidates':candidates,'acceptance_policy':'No AI-generated Accepted/Rejected decision; this file is not the central acceptance registry.'})
write('promotion-eligibility.json',{'fields':eligibility,'eligible_count':0})
packet={'schema':'WINDOW7_FIXED_HUMAN_REVIEW_PACKET_V1','authority_sha':adoption['authority_sha'],'application_baseline_sha':adoption['application_baseline_sha'],
 'scope':'Application Selection Field governance only; no Runtime/Product Master mutation or manufacturer orderability approval.',
 'evidence_candidates_sha256':sha(OUT/'evidence/evidence-candidates.json'),'inventory_sha256':sha(OUT/'field-inventory.json'),
 'existing_decisions_requiring_reapproval':0,'fields':packet_fields,'human_decision':None}
packet['packet_content_sha256']=digest(packet)
write('human-review-packet.json',packet)
counts=collections.Counter(r['product_id'] for r in inventory)
summary={'status':'PENDING_HUMAN_REVIEW_NOT_COMPLETE','product_field_counts':dict(counts),'manufacturer_field_counts':dict(collections.Counter(r['manufacturer'] for r in inventory)),
 'total_field_count':len(inventory),'excluded_field_count':len(excluded),'mapping_counts':dict(collections.Counter(r['mapping_type'] for r in inventory)),
 'central_mapping_counts':dict(collections.Counter(r['central_mapping_classification'] for r in inventory)),
 'classification_counts':{k:sum(r['classification']==k for r in inventory) for k in ['GLOBAL EXACT','MANUFACTURER SHARED','CATEGORY SHARED','SEMANTIC EQUIVALENT','PRODUCT SPECIFIC','EXCEPTION']},
 'before':{'FORMAL':0,'PROVISIONAL':len(inventory)},'after':{'FORMAL':0,'PROVISIONAL':len(inventory)},
 'evidence_accepted':sum(e['status']=='ACCEPTED' for e in accepted if e['scope']['field_id'] in active and e['scope']['purpose']=='APPLICATION_FIELD'),'evidence_rejected':0,'evidence_candidates':len(candidates),
 'missing_claims':sum(len(r['missing_claims']) for r in inventory),'blocked_fields':sum(any(b['status']=='OPEN' for b in r['blockers']) for r in eligibility),
 'pending_fields':len(inventory),'promotion_approval_count':sum(a['status']=='APPROVED' for a in approvals if a['field_id'] in active and a['purpose']=='APPLICATION_FIELD'),'mapping_gap':0,'semantic_gap':0,
 'central_changes':adoption['central_changes'],'central_authority_sha':adoption['authority_sha'],'starting_authority_sha':adoption['starting_authority_sha'],
 'runtime_diff':0,'packet_content_sha256':packet['packet_content_sha256'],'runtime_browser_regression':'SEE_EXECUTION_RECORD','merge':'NOT_EXECUTED','post_merge':'NOT_EXECUTED'}
write('summary.json',summary)
print(json.dumps(summary,ensure_ascii=False,indent=2))
