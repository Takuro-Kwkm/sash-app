#!/usr/bin/env python3
"""Bind the admitted native structural recovery to the existing shared v2 DAG."""
import argparse
import json
import sys
from pathlib import Path


def prepare(harness_root, checkout, captures, destination, instruction):
    harness_root, checkout, root = map(lambda p:Path(p).resolve(), (harness_root,checkout,destination))
    sys.path.insert(0,str(harness_root))
    from harness.core import read_json, write_json, require, sha
    from harness.production import repository_binding, observation_fingerprint
    from harness.architecture import route_instruction
    from harness.current_authority import compatibility
    from importlib.util import spec_from_file_location, module_from_spec
    c = read_json(captures)
    require(not root.is_relative_to(checkout) and not root.is_relative_to(harness_root),
            'OUTPUT_PATH','External Work destination required','PREPARE')
    require(not any(word in instruction for word in ('正式採用','正式反映','QA_READY','本番','リリース','統合')),
            'NATIVE_GATE_SCOPE','This profile admits DRAFT structural recovery only','PREPARE')
    compatibility(harness_root, checkout)
    route = route_instruction(harness_root,{c['repository']:str(checkout)},instruction,c['product_id'])
    require(route['work_skill'] == 'product-master-builder' and route.get('native_profile'),
            'NATIVE_BUILD_PROFILE_REQUIRED','One admitted Working recovery build profile required','PREPARE')
    profile_ref = route['native_profile']
    profile_path = (checkout/profile_ref['path']).resolve()
    require(profile_path.is_relative_to(checkout) and sha(profile_path.read_bytes()) == profile_ref['sha256'],
            'NATIVE_PROFILE_CHANGED','Working recovery profile differs','PREPARE')
    profile = read_json(profile_path)
    require(profile['status'] == 'ADOPTED' and profile['scope'] == 'STRUCTURAL_DRAFT_RECOVERY_ONLY'
            and profile['product_id'] == c['product_id'], 'NATIVE_PROFILE_SCOPE','Native admitted DRAFT profile required','PREPARE')
    ref = lambda path:{'path':str(Path(path).resolve()),'sha256':sha(Path(path).read_bytes())}
    require(not root.exists(), 'WORK_ALREADY_EXISTS','Inspect completed Work; new inputs require successor','PREPARE')
    module_spec=spec_from_file_location('recovery',checkout/profile['native_adapter'])
    adapter=module_from_spec(module_spec);module_spec.loader.exec_module(adapter);adapter.setup(harness_root)
    row=adapter.working_row(read_json(c['inputs']['registry']),profile)
    contract={'product_id':c['product_id'],'revision':c['revision'],'profile':ref(profile_path),
              'inputs':{k:ref(v) for k,v in c['inputs'].items()}}
    # Authenticate/inspect actual Working payload before creating Work outputs.
    candidate=adapter.recover(contract,profile)
    binding=repository_binding(c['repository'],read_json(c['branch']),read_json(c['tree']),
                               {p:checkout/p for p in c['captured_paths']})
    binding.update(checkout=str(checkout),observations={k:observation_fingerprint(read_json(v)) for k,v in c['observations'].items()})
    root.mkdir(parents=True)
    write_json(root/'contract.json',contract);write_json(root/'production-binding.json',binding)
    worker=ref(checkout/profile['native_adapter']);steps=[]
    for stage in ('RECOVERY','STRUCTURAL_AUDIT'):
        steps.append({'id':stage,'kind':'validator','needs':[steps[-1]['id']] if steps else [],'script':worker,
                      'args':['--harness-root',str(harness_root),'--contract','{input}','--stage',stage,'--work','{work}','--out','{work}/'+stage+'.json'],
                      'output':'{work}/'+stage+'.json','side_outputs':['{work}/product-master.json'] if stage == 'RECOVERY' else [],
                      'result_path':['status'],'expected_result':'PASS','timeout_seconds':240})
    for name in ('product-master.json','RECOVERY.json','STRUCTURAL_AUDIT.json'):
        steps.append({'id':'SAVE_'+name.removesuffix('.json').replace('-','_').upper(),'kind':'storage','needs':[steps[-1]['id']],
                      'source':'{work}/'+name,'destination':name})
    workflow={'workflow_id':'NATIVE_WORKING_MASTER_RECOVERY_V1','version':'1.0','status':'CURRENT','work_skill':'product-master-builder',
              'steps':steps,'targets':{profile['target_gate']:[steps[-1]['id']]},'scope':profile['scope']}
    write_json(root/'workflow.json',workflow)
    authorities=[{**ref(v),'authority_id':k,'authority_type':k,'repository':'LIVE_DRIVE_SASH_GOVERNANCE','version':c['authority_versions'][k],
                  'status':'ACTIVE','scope_axis':'PROJECT_CURRENT','resolution_source':'LIVE_CURRENT_INFORMATION_SOURCE_MANIFEST'} for k,v in c['authorities'].items()]
    authorities.append({**ref(root/'workflow.json'),'authority_id':'NATIVE_WORKING_RECOVERY_WORKFLOW','authority_type':'WORKFLOW',
                       'repository':c['repository'],'version':'1.0','status':'CURRENT','scope_axis':'PROJECT_CURRENT','resolution_source':'ADOPTED_NATIVE_PROFILE'})
    write_json(root/'authority-index.json',{'status':'CURRENT','entries':authorities})
    write_json(root/'registry.json',{'registry_id':'NATIVE_WORKING_RECOVERY','version':row['package_version'],'status':'CURRENT',
                                   'products':[{'product_id':c['product_id'],'aliases':[profile['registry_series']],
                                                'master_state':'PRESENT','lifecycle_state':'DRAFT','native_entry':row}]})
    sources=[{**ref(v['path']),'source_id':v['source_id'],'identity':v['identity'],'version':v['version'],
              'product_id':c['product_id'],'role':'SUPPLEMENTAL','status':'CAPTURED_NOT_READOPTED'} for v in c['sources']]
    spec={'workflow_id':c['work_id'],'work_skill':'product-master-builder','target':c['product_id'],'target_gate':profile['target_gate'],
          'skill_root':str(checkout/'scripts/production'),'authority_index':ref(root/'authority-index.json'),'authorities':authorities,
          'registry':ref(root/'registry.json'),'sources':sources,'workflow':ref(root/'workflow.json'),'input':ref(root/'contract.json'),
          'runtime_refs':list(contract['inputs'].values())+[ref(profile_path),ref(harness_root/'registries/current-architecture.v2.json'),ref(harness_root/'registries/skill-authority.v2.json')],
          'storage_root':c['storage_root'],'production_binding':ref(root/'production-binding.json'),
          'production_routing':ref(checkout/'contracts/production/work-connections.v2.json')}
    write_json(root/'spec.json',spec)
    return {'status':'PREPARED','spec':str(root/'spec.json'),'binding_head':binding['head_sha'],'route':route,
            'scope':profile['scope'],'qa_ready':False,'formal':False}


if __name__ == '__main__':
    p=argparse.ArgumentParser()
    for key in ('harness-root','checkout','captures','destination','instruction'):p.add_argument('--'+key,required=True)
    a=p.parse_args()
    print(json.dumps(prepare(a.harness_root,a.checkout,a.captures,a.destination,a.instruction),ensure_ascii=False,indent=2))
