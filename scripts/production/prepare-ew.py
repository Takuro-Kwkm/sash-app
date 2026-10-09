#!/usr/bin/env python3
"""Bind host-captured real EW data to the existing shared v2 Workflow Contract."""
import argparse
import json
import sys
from pathlib import Path


def prepare_output(args):
    """A native output successor on the existing Shared DAG; completed Current stays inspect-only."""
    central=Path(args.harness_root).resolve();sys.path.insert(0,str(central))
    from harness.core import read_json, write_json, sha, require
    import re
    require(bool(re.fullmatch('[0-9a-f]{40}',args.release_candidate_sha or '')),
            'CANDIDATE_SHA_REQUIRED','Bind the actual rendered fixed candidate SHA','PREPARE')
    root=Path(args.destination).resolve();require(not root.exists(),'WORK_EXISTS','Use a new immutable Work binding','PREPARE');root.mkdir()
    def ref(path):
        path=Path(path).resolve();return {'path':str(path),'sha256':sha(path.read_bytes())}
    old=Path(args.current_work).resolve();oldspec=read_json(old/'spec.json')
    require(oldspec['target']=='SER-LIX-EW','NATIVE_PRODUCT','EW Current Work required','PREPARE')
    for value in [args.output_profile,args.candidate,args.downstream,args.downstream_plan,args.browser_report]:
        require(value is not None,'OUTPUT_INPUT_REQUIRED','Bind all native output inputs','PREPARE')
    worker=ref(Path(__file__).with_name('ew-change.py'))
    data={'product_id':'SER-LIX-EW','checkout':str(Path(args.checkout).resolve()),'release_candidate_sha':args.release_candidate_sha,
          'current_work_spec':ref(old/'spec.json'),'current_work_checkpoint':str(old/'checkpoint'),
          'output_profile':ref(args.output_profile),'output_candidate':str(Path(args.candidate).resolve()),
          'output_plan':ref(args.downstream_plan),'output_browser_report':ref(args.browser_report)}
    write_json(root/'input.json',data)
    steps=[]
    for gate in ['OUTPUT_BASELINE','OUTPUT_IMPACT','OUTPUT_QA','OUTPUT_REVIEW']:
        steps.append({'id':gate,'kind':'build' if gate=='OUTPUT_REVIEW' else 'validator',
                      'needs':[steps[-1]['id']] if steps else [],'script':worker,
                      'args':['--harness-root',str(central),'--contract','{input}','--stage',gate,'--work','{work}','--out','{work}/'+gate+'.json'],
                      'output':'{work}/'+gate+'.json','result_path':['status'],'expected_result':'PASS','timeout_seconds':180})
    steps.extend([{'id':'HUMAN_RUNTIME_UI_ADOPTION','kind':'human','needs':['OUTPUT_REVIEW'],
                   'packet':'{work}/OUTPUT_REVIEW.json','packet_destination':'{workflow_id}/human-review.json'},
                  {'id':'DOWNSTREAM_ADOPTION','kind':'downstream-change','needs':['HUMAN_RUNTIME_UI_ADOPTION'],
                   'plan':data['output_plan'],'formal_result':'OUTPUT_BASELINE.json'}])
    for gate in ['OUTPUT_BASELINE','OUTPUT_IMPACT','OUTPUT_QA','OUTPUT_REVIEW','DOWNSTREAM_ADOPTION']:
        steps.append({'id':'SAVE_'+gate,'kind':'storage','needs':[steps[-1]['id']],
                      'source':'{work}/'+gate+'.json','destination':'{workflow_id}/'+gate+'.json'})
    workflow={'workflow_id':'EW_NATIVE_OUTPUT_SUCCESSOR_V1','version':'1.0.0','status':'CURRENT',
              'work_skill':'product-change-work','steps':steps,'targets':{'EW_NATIVE_OUTPUT_ADOPTION':['SAVE_DOWNSTREAM_ADOPTION']}}
    write_json(root/'workflow.json',workflow)
    authorities=oldspec['authorities']+[dict(ref(root/'workflow.json'),authority_id='EW_NATIVE_OUTPUT_WORKFLOW',
        authority_type='WORKFLOW',repository='Takuro-Kwkm/sash-app',version='1.0.0',status='CURRENT',
        scope_axis='PROJECT_CURRENT',resolution_source='FIXED_TECHNICAL_PR_CANDIDATE')]
    write_json(root/'authority-index.json',{'status':'CURRENT','entries':authorities})
    runtime=oldspec['runtime_refs']+[worker,ref(__file__),data['output_profile'],data['output_plan'],data['output_browser_report']]
    runtime.extend(u['source'] for u in read_json(args.downstream_plan)['updates'])
    runtime.extend(read_json(args.browser_report)['evidence_refs'])
    runtime.extend(ref(old/'checkpoint'/p) for p in ['workflow-events.json','workflow-binding.json','workflow-result.json'])
    spec={**oldspec,'workflow_id':root.name,'target_gate':'EW_NATIVE_OUTPUT_ADOPTION','authority_index':ref(root/'authority-index.json'),
          'authorities':authorities,'input':ref(root/'input.json'),'workflow':ref(root/'workflow.json'),
          'runtime_refs':runtime,'storage_root':str(root/'saved'),'downstream_checkout':str(Path(args.downstream).resolve()),
          'decisions':{'HUMAN_RUNTIME_UI_ADOPTION':str(root/'human-runtime-ui-decision.json')}}
    write_json(root/'spec.json',spec);write_json(root/'live-state.json',read_json(old/'live-state.json'))
    return {'status':'PREPARED_NOT_APPROVED','spec':str(root/'spec.json'),'scope':'EW_NORMAL_29_FIELDS_XLSX_ORDER5_BATCH1_V2',
            'formal_mutations':0,'human_decisions_generated':0,'external_operations':0}


def prepare(harness_root, checkout, captures, destination, instruction):
    harness_root, checkout, root = map(lambda p: Path(p).resolve(), (harness_root, checkout, destination))
    sys.path.insert(0, str(harness_root))
    from harness.core import read_json, write_json, sha, require
    from harness.production import short_route, native_registry, repository_binding, observation_fingerprint
    from importlib.util import spec_from_file_location, module_from_spec
    modspec=spec_from_file_location('ew_native',checkout/'scripts/production/ew-change.py'); adapter=module_from_spec(modspec);modspec.loader.exec_module(adapter);adapter.setup(harness_root)
    root.mkdir(parents=True, exist_ok=True)
    def ref(p):
        p=Path(p).resolve();return {'path':str(p),'sha256':sha(p.read_bytes())}
    c = read_json(captures)
    route = short_route(instruction, read_json(checkout/'contracts/production/work-connections.v2.json'))
    row = native_registry(read_json(c['registry']), 'LIXIL', 'EW')
    require(route['product_id']=='SER-LIX-EW', 'NATIVE_PRODUCT', 'EW adapter product mismatch', 'PREPARE')
    originals = c['captured_paths']
    binding=repository_binding(route['repository'],read_json(c['branch']),read_json(c['tree']),{p:checkout/p for p in originals})
    binding['checkout']=str(checkout)
    observations = dict(c['authorities'])
    observations.update(native_registry=c['registry'], source_metadata=c['source_metadata'],
                        authoring_metadata=c['authoring_metadata'])
    binding['observations']={k:observation_fingerprint(read_json(p)) for k,p in observations.items()}
    write_json(root/'production-binding.json',binding)
    sources=read_json(c['source_metadata'])
    package_ref=ref(c['package'])
    _, files, pm=adapter.package(package_ref)
    require(pm['formal_revision']==row['package_version'], 'NATIVE_BASELINE','Current Formal package/Registry mismatch','PREPARE')
    source_id=json.loads(files['delta-audit.json'])['current_source_file_id']
    source_code=json.loads(files['source-identity.json'])['source_code']
    registry={'registry_id':'EW_NATIVE_NORMALIZED_CURRENT','version':row['package_version'],'status':'CURRENT','products':[
        {'product_id':route['product_id'],'aliases':['EW'],'master_state':'PRESENT','lifecycle_state':'FORMAL','formal_revision':row['package_version'],
         'formal_sha256':package_ref['sha256'],'native_registry_file_id':'1HMMZ8JdsbJPtL_8LjQfxMF8P_Zb4-LReqvPMFn1pJks','native_entry':row}]}
    write_json(root/'registry.json',registry)
    contract={'work_id':c['work_id'],'repository':route['repository'],'product_id':route['product_id'],'routing':route,
              'starting_head':binding['head_sha'],'checkout':str(checkout),'formal_package':package_ref,
              'native_registry':ref(c['registry']),'registry_entry':row,'official_source':ref(c['official_source']),
              'authoring_ranges':ref(c['authoring_ranges']),
              'source_id':source_id,'source_code':source_code,'source_metadata':sources,
              'official_locator':c['official_locator'],'purpose_authority_id':'SALES_ESTIMATE_REQUEST_BOUNDARY',
              'working_state':c['working_state'],'storage_root':str(root/'saved'),'saved_artifacts':[]}
    # Current core code and all native consumer code are hash-bound for Resume.
    deps=[harness_root/p for p in ('harness/workflow.py','harness/core.py','harness/resolvers.py','harness/artifacts.py','harness/production.py')]
    deps += list((checkout/'src/catalog/runtime-master').rglob('*.mjs'))
    deps += [checkout/'scripts/production/ew-change.py',checkout/'scripts/production/ew-parity.mjs',checkout/'scripts/production/prepare-ew.py',checkout/'contracts/production/work-connections.v2.json']
    deps += [checkout/p for p in originals]
    worker=ref(checkout/'scripts/production/ew-change.py')
    stages=list(adapter.STAGES)
    contract['saved_artifacts']=[g+'.json' for g in stages if g not in ('NATIVE_READBACK','COMPLETION')]+['selected-master.zip','runtime-parity.json']
    write_json(root/'contract.json',contract)
    steps=[]
    for gate in stages:
        if gate=='FORMAL_ADOPTION':
            steps.append({'id':'HUMAN_ADOPTION','kind':'human','needs':['FORMAL_REVIEW'],'packet':'{work}/FORMAL_REVIEW.json',
                'packet_destination':'review/{workflow_id}/bound-review.json','when':{'source':'{work}/FORMAL_REVIEW.json','result_path':['human_required'],'allowed_values':[True,False],'equals':True}})
        if gate=='NATIVE_READBACK':
            for i,name in enumerate(contract['saved_artifacts']):
                steps.append({'id':'STORAGE_'+str(i),'kind':'storage','needs':['DOWNSTREAM_IMPACT'],
                    'source':'{work}/'+name,'destination':'{workflow_id}/'+name})
        needs=[s['id'] for s in steps if s['kind']=='storage'] if gate=='NATIVE_READBACK' else [steps[-1]['id']] if steps else []
        step={'id':gate,'kind':'validator','needs':needs,'script':worker,
              'args':['--harness-root',str(harness_root),'--contract','{input}','--stage',gate,'--work','{work}','--out','{work}/'+gate+'.json'],
              'output':'{work}/'+gate+'.json','result_path':['status'],'expected_result':'PASS','timeout_seconds':180}
        if gate=='CHANGE_APPLICATION':step['side_outputs']=['{work}/selected-master.zip']
        if gate=='NATIVE_QA':step['side_outputs']=['{work}/runtime-parity.json']
        steps.append(step)
    profile={'workflow_id':'EW_PRODUCTION_CHANGE_V2','version':'2.1.0','status':'CURRENT','work_skill':'product-change-work',
             'steps':steps,'targets':{'FORMAL_CHANGE_ADOPTION':['COMPLETION']},'scope':'REAL_NATIVE_EW; unchanged source carry-forward; changed source requires reviewed native package and admitted transaction'}
    write_json(root/'workflow.json',profile)
    authorities=[]
    for key,path in c['authorities'].items():
        authority={**ref(path),'authority_id':key,'authority_type':key,'repository':'LIVE_DRIVE_SASH_GOVERNANCE',
                   'version':c['authority_versions'][key],'status':'ACTIVE','scope_axis':'PROJECT_CURRENT','resolution_source':'LIVE_CURRENT_INFORMATION_SOURCE_MANIFEST'}
        authorities.append(authority)
    authorities.append({**ref(root/'workflow.json'),'authority_id':'EW_PRODUCTION_WORKFLOW','authority_type':'WORKFLOW',
             'repository':route['repository'],'version':'2.1.0','status':'CURRENT','scope_axis':'PROJECT_CURRENT','resolution_source':'TECHNICAL_PR_CANDIDATE'})
    write_json(root/'authority-index.json',{'status':'CURRENT','entries':authorities})
    src=[{**ref(c['official_source']),'source_id':source_id,'identity':source_code,'version':'2026-10','product_id':route['product_id'],'status':'CURRENT','role':'CURRENT_ADOPTED'}]
    spec={'workflow_id':c['work_id'],'work_skill':'product-change-work','target':route['product_id'],'target_gate':'FORMAL_CHANGE_ADOPTION',
          'skill_root':str(checkout/'scripts/production'),'authority_index':ref(root/'authority-index.json'),'authorities':authorities,
          'registry':ref(root/'registry.json'),'sources':src,'workflow':ref(root/'workflow.json'),'input':ref(root/'contract.json'),
          'runtime_refs':[ref(p) for p in sorted(set(deps))]+[package_ref], 'storage_root':str(root/'saved'),
          'production_binding':ref(root/'production-binding.json'),'production_routing':ref(checkout/'contracts/production/work-connections.v2.json'),
          'decisions':{'HUMAN_ADOPTION':str(root/'human-decision.json')}}
    write_json(root/'spec.json',spec)
    return {'status':'PREPARED','spec':str(root/'spec.json'),'binding':binding,'route':route}


if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--harness-root',required=True);p.add_argument('--checkout',required=True)
    p.add_argument('--captures');p.add_argument('--destination',required=True);p.add_argument('--instruction',required=True)
    for name in ['current-work','output-profile','candidate','downstream','downstream-plan','browser-report','release-candidate-sha']:p.add_argument('--'+name)
    a=p.parse_args()
    result=prepare_output(a) if a.output_profile else prepare(a.harness_root,a.checkout,a.captures,a.destination,a.instruction)
    print(json.dumps(result,ensure_ascii=False,indent=2))
