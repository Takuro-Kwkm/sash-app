#!/usr/bin/env python3
"""Bind native Sheets captures to the unchanged Shared Harness v2 DAG."""
import argparse
import importlib.util
import json
import sys
from pathlib import Path


def prepare(harness_root, checkout, captures, destination, instruction):
    central, checkout, root = [Path(p).resolve() for p in (harness_root, checkout, destination)]
    sys.path.insert(0, str(central))
    from harness.core import require, sha, read_json, write_json
    from harness.architecture import route_instruction
    from harness.current_authority import compatibility, semantic_hashes
    from harness.production import repository_binding, observation_fingerprint, connector_document
    compatibility(central, checkout)
    c = read_json(captures)
    route = route_instruction(central, {c['repository']: str(checkout)}, instruction, c['product_id'])
    if route['target_gate'] == 'FORMAL_CHANGE_ADOPTION':
        formal_entry = checkout / 'scripts/production/prepare-sheet-package-formal.py'
        entry_spec = importlib.util.spec_from_file_location('native_formal_preparer', formal_entry)
        entry = importlib.util.module_from_spec(entry_spec); entry_spec.loader.exec_module(entry)
        return entry.prepare(central, checkout, captures, destination, instruction)
    requested_route = route
    if route['work_type'] == 'PRODUCT_MASTER_BUILD':
        require(route['native_profile'].get('mode') == 'EXISTING_FORMAL_SUCCESSOR',
                'EXISTING_FORMAL_ROUTE', 'Use the admitted existing-Formal handoff', 'PREPARE')
        route = route_instruction(central, {c['repository']: str(checkout)}, '商品マスターを更新', c['product_id'])
    require(route['native_adapter'] == 'scripts/production/sheet-package-change.py' and route['target_gate'] == 'QA_READY',
            'NATIVE_TARGET', 'Only the admitted Working candidate route is connected', 'PREPARE')
    def ref(path):
        path = Path(path).resolve()
        return {'path': str(path), 'sha256': sha(path.read_bytes())}
    connection = next(p for p in read_json(checkout / 'contracts/production/work-connections.v2.json')['products'] if p['product_id'] == route['product_id'])
    profile = connection['change_profile']
    require(ref(checkout/profile['path'])['sha256'] == profile['sha256'], 'NATIVE_PROFILE_CHANGED', 'Reacquire native profile', 'PREPARE')
    module_spec = importlib.util.spec_from_file_location('native_sheets', checkout / route['native_adapter'])
    worker = importlib.util.module_from_spec(module_spec); module_spec.loader.exec_module(worker); worker.setup(central)
    contract = {key:value for key,value in c['contract'].items()}
    contract.update(profile=ref(checkout/profile['path']), product_id=route['product_id'], scope_id=c['scope_id'],
                    qa_worker=ref(checkout/'scripts/production/sheet-candidate-qa.mjs'))
    worker.baseline(contract, read_json(checkout/profile['path']))
    worker.review(contract, read_json(checkout/profile['path']))
    require(not root.exists(), 'IMMUTABLE_WORK_EXISTS', 'Resume the existing Work or create a successor', 'PREPARE')
    observations = {key:read_json(path) for key,path in c['observations'].items()}
    require({'native_registry','information_manifest','central_branch','formal_authoring_metadata','working_folder'}.issubset(observations),
            'AUTHORITY_ACQUISITION_REQUIRED', 'Complete live native observations required', 'PREPARE')
    import subprocess
    central_head=subprocess.check_output(['git','rev-parse','HEAD'],cwd=central,text=True).strip()
    require(connector_document(observations['central_branch'])['commit']['sha']==central_head,
            'CURRENT_AUTHORITY_UNVERIFIED','Execution checkout differs from acquired Central HEAD','PREPARE')
    binding = repository_binding(c['repository'], read_json(c['branch']), read_json(c['tree']), {path:checkout/path for path in c['captured_paths']})
    binding.update(checkout=str(checkout), observations={key:observation_fingerprint(value) for key,value in observations.items()})
    root.mkdir(parents=True)
    write_json(root/'production-binding.json', binding)
    write_json(root/'live-state.json', {'repository':read_json(c['branch']), 'observations':observations})
    write_json(root/'contract.json', contract)
    script = ref(checkout/route['native_adapter'])
    steps = []
    for gate in worker.STAGES:
        steps.append({'id':gate, 'kind':'validator', 'needs':[steps[-1]['id']] if steps else [], 'script':script,
                      'args':['--harness-root',str(central),'--contract','{input}','--stage',gate,'--work','{work}','--out','{work}/'+gate+'.json'],
                      'output':'{work}/'+gate+'.json', 'result_path':['status'], 'expected_result':'PASS', 'timeout_seconds':240})
        if gate == 'CHANGE_APPLICATION':
            steps[-1]['side_outputs']=['{work}/candidate/'+name for name in contract['candidate_files']]
        if gate == 'NATIVE_QA':
            steps[-1]['side_outputs']=['{work}/project-qa.json']
    for gate, dependency in [('SAVE_CANDIDATE','QA_READY'),('SAVE_REVIEW','REVIEW_PACKET')]:
        steps.append({'id':gate,'kind':'storage','needs':[dependency], 'source':'{work}/'+dependency+'.json',
                      'destination':'{workflow_id}/'+dependency+'.json'})
    workflow = {'workflow_id':c['work_id'],'version':'1.0','status':'CURRENT','work_skill':'product-change-work',
                'steps':steps,'targets':{'QA_READY':['SAVE_CANDIDATE','SAVE_REVIEW']}}
    write_json(root/'workflow.json',workflow)
    sources = contract['sources']
    authorities = []
    for key,item in c['authorities'].items():
        authorities.append({**item,**ref(item['path'])})
    authority_index = {'status':'CURRENT','entries':[{key:item[key] for key in ('authority_id','version','sha256','status','scope_axis')} for item in authorities]}
    write_json(root/'authority-index.json', authority_index)
    registry = {'registry_id':'NATIVE_SHEETS_CHANGE_CAPTURE','version':'1.0','status':'CURRENT','products':[{'product_id':route['product_id'],'master_state':'PRESENT','current_revision':connection['current_formal_version'],
                           'aliases':connection['aliases'],'manufacturer':connection['baseline_selector']['manufacturer'],
                           'series':connection['baseline_selector']['series']}]}
    write_json(root/'registry.json',registry)
    runtime = [script,contract['qa_worker'],contract['profile']]
    runtime += [ref(checkout/name) for name in ('scripts/production/prepare-sheet-package-change.py','src/catalog/runtime-master/runtime-condition.mjs')]
    runtime += [ref(checkout/('src/catalog/runtime-master/'+name)) for name in ('generic-rule-engine.mjs','runtime-state.mjs','runtime-effects.mjs')]
    runtime += [ref(central/name) for name in semantic_hashes(central)]
    def nested_refs(value):
        if isinstance(value,dict):
            if 'path' in value and 'sha256' in value:
                yield {'path':value['path'],'sha256':value['sha256']}
            else:
                for item in value.values(): yield from nested_refs(item)
        elif isinstance(value,list):
            for item in value: yield from nested_refs(item)
    runtime += list(nested_refs(contract))
    runtime=list({item['path']:item for item in runtime}.values())
    spec = {'workflow_id':c['work_id'],'work_skill':'product-change-work','target':route['product_id'],'target_gate':'QA_READY',
            'skill_root':str(central),'authority_index':ref(root/'authority-index.json'),'authorities':authorities,
            'registry':ref(root/'registry.json'),'sources':sources,'workflow':ref(root/'workflow.json'),
            'input':ref(root/'contract.json'),'runtime_refs':runtime,'storage_root':str(root/'storage'),
            'production_binding':ref(root/'production-binding.json')}
    write_json(root/'spec.json',spec)
    return {'status':'PREPARED','requested_route':requested_route,'route':route,'spec':str(root/'spec.json'),'shared_engine':'scripts/production-work.py','formal_writes':0}


if __name__ == '__main__':
    parser=argparse.ArgumentParser()
    for key in ('harness-root','checkout','captures','destination','instruction'): parser.add_argument('--'+key,required=True)
    args=parser.parse_args()
    print(json.dumps(prepare(args.harness_root,args.checkout,args.captures,args.destination,args.instruction),ensure_ascii=False,indent=2))
