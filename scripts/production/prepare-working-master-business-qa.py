#!/usr/bin/env python3
"""Prepare a fixed existing Working successor for the single shared v2 DAG."""
import argparse
import json
import sys
from pathlib import Path


def prepare(harness_root,checkout,captures,destination,instruction):
    harness_root,checkout,root=map(lambda p:Path(p).resolve(),(harness_root,checkout,destination))
    sys.path.insert(0,str(harness_root))
    from harness.core import read_json,write_json,require,sha
    from harness.production import repository_binding,observation_fingerprint
    from harness.architecture import route_instruction
    from harness.current_authority import compatibility
    c=read_json(captures)
    require(not root.is_relative_to(checkout) and not root.is_relative_to(harness_root) and not root.exists(),
            'WORK_ALREADY_EXISTS','Use an external successor; completed Work remains INSPECT_ONLY','PREPARE')
    compatibility(harness_root,checkout)
    route=route_instruction(harness_root,{c['repository']:str(checkout)},instruction,c['product_id'])
    require(route.get('native_profile') and route['work_skill']=='product-master-builder',
            'NATIVE_BUILD_PROFILE_REQUIRED','An admitted Working build profile is required','PREPARE')
    ref=lambda p:{'path':str(Path(p).resolve()),'sha256':sha(Path(p).read_bytes())}
    pr=route['native_profile'];profile_path=checkout/pr['path'];profile=read_json(profile_path)
    require(ref(profile_path)['sha256']==pr['sha256'] and profile['scope']=='EXISTING_WORKING_SALES_QA'
            and profile['product_id']==c['product_id'],'NATIVE_PROFILE_SCOPE','Fixed sales QA profile required','PREPARE')
    # Reuse the native Registry identity reader from structural recovery.
    from importlib.util import spec_from_file_location,module_from_spec
    m=spec_from_file_location('recovery',checkout/'scripts/production/working-master-recovery.py');a=module_from_spec(m);m.loader.exec_module(a);a.setup(harness_root)
    old_profile=read_json(checkout/profile['predecessor_profile']['path'])
    row=a.working_row(read_json(c['inputs']['registry']),old_profile)
    require(row['authoring_file_id']==old_profile['authoring_file_id'] and row['working_folder_id']==profile['working_folder_id'],
            'WORKING_BASELINE_REQUIRED','Same live Working and working folder required','PREPARE')
    binding=repository_binding(c['repository'],read_json(c['branch']),read_json(c['tree']),{p:checkout/p for p in c['captured_paths']})
    binding.update(checkout=str(checkout),observations={k:observation_fingerprint(read_json(v)) for k,v in c['observations'].items()})
    root.mkdir(parents=True)
    contract={'product_id':c['product_id'],'profile':ref(profile_path),'inputs':{k:ref(v) for k,v in c['inputs'].items()},'governance':{k:ref(v) for k,v in c['authorities'].items()}}
    write_json(root/'contract.json',contract);write_json(root/'production-binding.json',binding)
    steps=[];worker=ref(checkout/profile['native_adapter'])
    for stage,outputs in [('BUILD',['candidate-draft.json']),('BUSINESS_QA',['product-master.json','request-samples.json']),('REVIEW_PACKET',[])]:
        steps.append(dict(id=stage,kind='validator',needs=[steps[-1]['id']] if steps else [],script=worker,
                          args=['--harness-root',str(harness_root),'--contract','{input}','--stage',stage,'--work','{work}','--out','{work}/'+stage+'.json'],
                          output='{work}/'+stage+'.json',side_outputs=['{work}/'+p for p in outputs],result_path=['status'],expected_result='PASS',timeout_seconds=1800))
    for name in ['product-master.json','BUSINESS_QA.json','request-samples.json','REVIEW_PACKET.json']:
        steps.append(dict(id='SAVE_'+name.split('.')[0].replace('-','_').upper(),kind='storage',needs=[steps[-1]['id']],source='{work}/'+name,destination=name))
    workflow=dict(workflow_id='NATIVE_EXISTING_WORKING_SALES_QA_V1',version='1.0',status='CURRENT',work_skill='product-master-builder',steps=steps,targets={'QA_READY':[steps[-1]['id']]},scope=profile['scope'])
    write_json(root/'workflow.json',workflow)
    authorities=[{**ref(v),'authority_id':k,'authority_type':k,'repository':'LIVE_DRIVE_SASH_GOVERNANCE','version':c['authority_versions'][k],'status':'ACTIVE','scope_axis':'PROJECT_CURRENT','resolution_source':'LIVE_CURRENT_INFORMATION_SOURCE_MANIFEST'} for k,v in c['authorities'].items()]
    authorities.append({**ref(root/'workflow.json'),'authority_id':'NATIVE_WORKING_QA_WORKFLOW','authority_type':'WORKFLOW','repository':c['repository'],'version':'1.0','status':'CURRENT','scope_axis':'PROJECT_CURRENT','resolution_source':'ADOPTED_NATIVE_PROFILE'})
    write_json(root/'authority-index.json',dict(status='CURRENT',entries=authorities))
    write_json(root/'registry.json',dict(registry_id='NATIVE_WORKING_QA',version=row['package_version'],status='CURRENT',products=[dict(product_id=c['product_id'],aliases=[old_profile['registry_series']],master_state='PRESENT',lifecycle_state='DRAFT',native_entry=row)]))
    spec=dict(workflow_id=c['work_id'],work_skill='product-master-builder',target=c['product_id'],target_gate='QA_READY',skill_root=str(checkout/'scripts/production'),authority_index=ref(root/'authority-index.json'),authorities=authorities,registry=ref(root/'registry.json'),sources=c['sources'],workflow=ref(root/'workflow.json'),input=ref(root/'contract.json'),runtime_refs=list(contract['inputs'].values())+list(contract['governance'].values())+[ref(profile_path),ref(harness_root/'registries/current-architecture.v2.json'),ref(harness_root/'registries/skill-authority.v2.json')],storage_root=c['storage_root'],production_binding=ref(root/'production-binding.json'),production_routing=ref(checkout/'contracts/production/work-connections.v2.json'))
    write_json(root/'spec.json',spec)
    return dict(status='PREPARED',spec=str(root/'spec.json'),binding_head=binding['head_sha'],scope=profile['scope'],qa_ready=False,formal=False)


if __name__=='__main__':
    p=argparse.ArgumentParser()
    for k in ('harness-root','checkout','captures','destination','instruction'):p.add_argument('--'+k,required=True)
    a=p.parse_args();print(json.dumps(prepare(a.harness_root,a.checkout,a.captures,a.destination,a.instruction),ensure_ascii=False,indent=2))
