"""Validate the scoped CURRENT TW extension without rewriting the fixed global audit."""
import argparse,copy,json,hashlib,sys
from pathlib import Path
from jsonschema import Draft202012Validator
from formal_promotion import digest,runtime_identity,validate_promotion,GATES
ROOT=Path(__file__).resolve().parents[1]; D=Path('authority/products/lixil-tw/202610')
def load(root,n):return json.loads((root/D/n).read_text())
def validate(root=ROOT):
 f=load(root,'field-contract.json');p=load(root,'runtime-proof.json');b=load(root,'baseline-25-fields.json');a=load(root,'active-manifest.json');source=load(root,'official-source-snapshot.json');dictionary=load(root,'field-responsibility.json');mapping=load(root,'mapping.json')
 gates={g:[] for g in GATES}
 def need(g,ok,msg):
  if not ok:gates[g].append(msg)
 schema=json.loads((root/'schemas/selection-contract.schema.json').read_text())
 gates['schema']=[x.message for x in Draft202012Validator(schema).iter_errors(f)]
 need('mapping',mapping[f['field_id']]['runtime_key']==f['runtime_key']=='custom_height_secondary','Product-specific Runtime mapping differs')
 need('selection-contract',f['required']['observation']['when']=={'window_type':'SWT-LIX-TW-FIX-TRAPEZOID-IN','size_mode':'CUSTOM'},'Required applicability boundary differs')
 need('selection-contract',f['visibility']['non_applicable']=='HIDE_AND_EXCLUDE' and f['applicability']['business_output']=='EXCLUDE_IF_NON_APPLICABLE','Non-applicable selections must be excluded')
 need('ui-standard',f['control_type']=='NUMBER' and p['checks']['schema_control_type']=='NUMBER' and f['unit']['observation']==['mm'] and p['checks']['label'] in f['display_label'],'Control, label or unit differs')
 seq=p['checks']['display_sequence'];need('category-flow',seq.index('custom_height')<seq.index('custom_height_secondary')<seq.index('exterior_color') and f['group']['id']=='SIZE','H2 must follow H1 in SIZE, before downstream selections')
 need('dependency',set(f['upstream_fields'])=={'sash-app:SER-LIXIL-TW:window_type','sash-app:SER-LIXIL-TW:size_mode'} and p['checks']['missing_H2_blocks_downstream'],'Declared parent dependencies or missing-height gate differs')
 need('reset',p['checks']['non_applicable_H2_cleared'] and f['reset_behavior']['non_applicable']=='HIDE_AND_EXCLUDE','Non-applicable H2 was retained')
 need('exceptions',f['exception_id'] is None and p['checks']['valid_geometry_requires_manufacturer_confirmation'],'This input cannot infer order/manufacturing acceptance')
 need('authority',source['document_number']=='SN4100' and source['edition']=='0110L26' and len(source['source_parts'])==2 and {'TW-202610-TRAP-MEASUREMENT','TW-202610-TRAP-BOUND'}<=set(r['fact_id'] for r in source['facts']),'Current official Source boundary absent')
 need('authority',dictionary['base_dictionary']['status']=='CURRENT' and dictionary['additional_definitions'][0]['runtime_key']==f['runtime_key'],'Current Data Dictionary scope absent')
 need('coverage',len(b['fields'])==25 and all(x['status']=='FORMAL' for x in b['fields']) and len({x['field_id'] for x in b['fields']})==25 and f['field_id'] not in {x['field_id'] for x in b['fields']},'Existing 25 Formal identities must carry forward with one new conditional field')
 need('coverage',a['existing_formal_carry_forward']==25 and a['total_formal_fields']==26,'Manifest count mismatch')
 need('output',p['checks']['save_reload_value']==p['checks']['rerender_value']==1250 and 'H2 1250' in p['checks']['output_size'] and 'TW_TRAPEZOID_GLASS_AND_BEAD' in p['checks']['confirmation_codes'],'Storage, re-display or estimate output lost H2/source confirmation')
 need('presentation-resolution',f['allowed_control_types']==['NUMBER'] and f['display_label']==['台形のもう一方の高さ H2（mm）'],'H2 presentation must resolve uniquely')
 for filename,sha in a['files'].items():need('authority',hashlib.sha256((root/D/filename).read_bytes()).hexdigest()==sha,'Manifest source bytes changed: '+filename)
 errors=validate_promotion(json.loads((root/'registries/formal-promotion/governance.v0.1.json').read_text()),load(root,'evidence-acceptance.json'),load(root,'formal-promotion.json'),[(f,'APPLICATION_FIELD')],root,gates,mapping)
 errors += [{'code':'TW_SCOPED_GATE','gate':g,'message':s} for g,m in gates.items() for s in m]
 return {'status':'PASS' if not errors else 'FAIL','scope':'LIXIL::TW 2026-10 conditional H2 extension','existing_formal_carry_forward':25,'conditional_formal_fields':1,'runtime_identity_sha256':runtime_identity(f),'gate_results':{g:'PASS' if not m else 'FAIL' for g,m in gates.items()},'errors':errors,'user_authorization':'Explicit conditional official-source change adoption; automated execution attestation, not invented human review of generated payload.'}
if __name__=='__main__':
 ap=argparse.ArgumentParser();ap.add_argument('--report',default='test-results/tw-202610.json');args=ap.parse_args();r=validate();p=ROOT/args.report;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n');print(json.dumps(r,ensure_ascii=False));sys.exit(0 if r['status']=='PASS' else 1)
