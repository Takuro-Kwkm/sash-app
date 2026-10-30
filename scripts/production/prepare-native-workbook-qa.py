#!/usr/bin/env python3
"""Bind existing authoring and reviewed facts to the existing Shared v2 DAG."""
import argparse,importlib.util,json,sys
from pathlib import Path

def prepare(shared,checkout,captures,destination,instruction):
    shared,checkout,root=[Path(x).resolve() for x in (shared,checkout,destination)]
    sys.path.insert(0,str(shared))
    from harness.core import read_json,write_json,sha,require
    from harness.architecture import route_instruction
    from harness.current_authority import compatibility,semantic_hashes
    from harness.production import repository_binding,observation_fingerprint
    require(not root.exists() and not root.is_relative_to(checkout) and not root.is_relative_to(shared),
        'IMMUTABLE_WORK_EXISTS','Resume the original binding; preserve completed Work','PREPARE')
    compatibility(shared,checkout);c=read_json(captures)
    route=route_instruction(shared,{c['repository']:str(checkout)},instruction,c['product_id'])
    row=next(p for p in read_json(checkout/'contracts/production/work-connections.v2.json')['products'] if p['product_id']==c['product_id'])
    require(route['target_gate']=='QA_READY' and row['connection_scope']=='EXISTING_AUTHORING_WORKBOOK_SALES_QA',
        'NATIVE_QA_SCOPE','Use this entry only for existing authoring sales QA','PREPARE')
    ref=lambda x:{'path':str(Path(x).resolve()),'sha256':sha(Path(x).read_bytes())}
    profile=ref(checkout/row['build_profile']['path'])
    require(profile['sha256']==row['build_profile']['sha256'],'NATIVE_PROFILE_CHANGED','Reacquire profile','PREPARE')
    p=read_json(profile['path'])
    contract={'product_id':c['product_id'],'profile':profile,'inputs':{k:ref(v) for k,v in c['inputs'].items()},
        'governance':{k:ref(v) for k,v in c['authorities'].items()}}
    loader=importlib.util.spec_from_file_location('intake',checkout/p['intake_adapter'])
    intake=importlib.util.module_from_spec(loader);loader.loader.exec_module(intake)
    intake.verify_inputs(contract,p,shared)
    binding=repository_binding(c['repository'],read_json(c['branch']),read_json(c['tree']),{n:checkout/n for n in c['captured_paths']})
    binding.update(checkout=str(checkout),observations={k:observation_fingerprint(read_json(v)) for k,v in c['observations'].items()})
    root.mkdir(parents=True);write_json(root/'contract.json',contract);write_json(root/'production-binding.json',binding)
    steps=[{'id':'INTAKE','kind':'validator','needs':[],'script':ref(checkout/p['intake_adapter']),
        'args':['--harness-root',str(shared),'--contract','{input}','--work','{work}','--out','{work}/INTAKE.json'],
        'output':'{work}/INTAKE.json','result_path':['status'],'expected_result':'PASS','timeout_seconds':300}]
    for stage,outputs in [('BUILD',['candidate-draft.json']),('BUSINESS_QA',['product-master.json','request-samples.json']),('REVIEW_PACKET',[])]:
        steps.append({'id':stage,'kind':'validator','needs':[steps[-1]['id']],'script':ref(checkout/p['native_adapter']),
            'args':['--harness-root',str(shared),'--contract','{input}','--stage',stage,'--work','{work}','--out','{work}/'+stage+'.json'],
            'output':'{work}/'+stage+'.json','side_outputs':['{work}/'+n for n in outputs],
            'result_path':['status'],'expected_result':'PASS','timeout_seconds':1800})
    for name in ['INTAKE.json','product-master.json','BUSINESS_QA.json','request-samples.json','REVIEW_PACKET.json']:
        steps.append({'id':'SAVE_'+name.split('.')[0].replace('-','_').upper(),'kind':'storage','needs':[steps[-1]['id']],
            'source':'{work}/'+name,'destination':name})
    write_json(root/'workflow.json',{'workflow_id':c['work_id'],'version':'1.0','status':'CURRENT',
        'work_skill':'product-master-builder','steps':steps,'targets':{'QA_READY':[steps[-1]['id']]}})
    authorities=[{**ref(v),'authority_id':k,'authority_type':k,'repository':'LIVE_DRIVE_SASH_GOVERNANCE',
        'version':c['authority_versions'][k],'status':'ACTIVE','scope_axis':'PROJECT_CURRENT',
        'resolution_source':'LIVE_CURRENT_INFORMATION_SOURCE_MANIFEST'} for k,v in c['authorities'].items()]
    write_json(root/'authority-index.json',{'status':'CURRENT','entries':authorities})
    write_json(root/'registry.json',{'registry_id':'NATIVE_EXISTING_AUTHORING_QA','version':p['baseline_revision'],
        'status':'CURRENT','products':[{'product_id':c['product_id'],'aliases':row['aliases'],'master_state':'PRESENT'}]})
    runtime=[ref(shared/name) for name in semantic_hashes(shared)]
    runtime += [ref(checkout/name) for name in c['captured_paths']]+list(contract['inputs'].values())+list(contract['governance'].values())
    spec={'workflow_id':c['work_id'],'work_skill':'product-master-builder','target':c['product_id'],'target_gate':'QA_READY',
        'skill_root':str(shared),'authority_index':ref(root/'authority-index.json'),'authorities':authorities,
        'registry':ref(root/'registry.json'),'sources':c['sources'],'workflow':ref(root/'workflow.json'),
        'input':ref(root/'contract.json'),'runtime_refs':runtime,'storage_root':str(root/'saved'),
        'production_binding':ref(root/'production-binding.json'),'production_routing':ref(checkout/'contracts/production/work-connections.v2.json')}
    write_json(root/'spec.json',spec)
    write_json(root/'live-state.json',{'repository':read_json(c['branch']),'observations':{k:read_json(v) for k,v in c['observations'].items()}})
    return {'status':'PREPARED','spec':str(root/'spec.json'),'work':str(root/'checkpoint'),'qa_ready':False,'formal':False}

if __name__=='__main__':
    parser=argparse.ArgumentParser()
    for k in ('harness-root','checkout','captures','destination','instruction'):parser.add_argument('--'+k,required=True)
    a=parser.parse_args()
    print(json.dumps(prepare(a.harness_root,a.checkout,a.captures,a.destination,a.instruction),ensure_ascii=False,indent=2))
