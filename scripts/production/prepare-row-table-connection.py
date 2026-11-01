#!/usr/bin/env python3
"""Prepare a bounded native connection using the existing router and v2 DAG."""
import argparse
import json
import sys
from pathlib import Path


def prepare(shared,checkout,contract_path,qa_evidence,destination):
    shared,checkout,contract_path,qa_evidence,destination=map(lambda x:Path(x).resolve(),
        (shared,checkout,contract_path,qa_evidence,destination))
    sys.path.insert(0,str(shared))
    from harness.architecture import route_instruction
    from harness.core import read_json,write_json,require,sha
    from harness.local_qa import revalidate
    require(not destination.exists(),'WORK_EXISTS','Preserve original Work and create an explicit successor')
    require(not destination.is_relative_to(shared) and not destination.is_relative_to(checkout),'CHECKPOINT_SCOPE','External Work required')
    contract=read_json(contract_path);target=contract['identity']['product_id'];repository='Takuro-Kwkm/sash-app'
    route=route_instruction(shared,{repository:str(checkout)},contract['identity']['series']+'のnative接続候補を更新して',target)
    require(route['target_gate']=='NATIVE_RUNTIME_CANDIDATE','NATIVE_CONNECTION_SCOPE','No Formal adoption or UI release through this profile')
    config=read_json(checkout/'contracts/production/work-connections.v2.json')
    native=next(r for r in config['products'] if r['product_id']==target)
    reference=native['native_reconnect_profile'];profile=checkout/reference['path']
    require(sha(profile.read_bytes())==reference['sha256'],'NATIVE_PROFILE_CHANGED','Restore exact local connection profile')
    require(read_json(profile)['product_id']==target and read_json(profile)['target_gate']==route['target_gate'],
        'NATIVE_PROFILE_SCOPE','Use the exact selected native product/profile')
    revalidate(read_json(qa_evidence))
    ref=lambda p:{'path':str(p),'sha256':sha(p.read_bytes())}
    destination.mkdir(parents=True)
    write_json(destination/'route.json',route)
    write_json(destination/'input.json',{**contract,'formal':contract['inputs']['master'],
        'qa_evidence':ref(qa_evidence),'shared_root':str(shared),'execution_mode':'LOCAL_CANDIDATE'})
    # One native worker under the existing engine; no local journal or runner.
    worker=ref(checkout/native['native_adapter'])
    steps=[]
    for stage,folder,name,extra in [
        ('qa','qa','qa-carry.json',[]),
        ('formal','formal','formal-inspection-receipt.json',['formal-preserved.json']),
        ('projection','runtime','native-constraint-qa.json',['runtime-package.candidate.json','source-preservation-receipt.json'])]:
        output='{work}/'+folder+'/'+name
        steps.append({'id':stage.upper(),'kind':'validator','needs':[steps[-1]['id']] if steps else [],
            'script':worker,'args':[stage,'--contract','{input}','--out-dir','{work}/'+folder],
            'output':output,'side_outputs':['{work}/'+folder+'/'+n for n in extra],
            'result_path':['status'],'expected_result':'PASS','timeout_seconds':180})
    for source,name in [('formal/formal-inspection-receipt.json','formal-inspection-receipt.json'),
            ('formal/formal-preserved.json','formal-preserved.json'),
            ('runtime/runtime-package.candidate.json','runtime-package.candidate.json'),
            ('runtime/native-constraint-qa.json','native-constraint-qa.json'),
            ('runtime/source-preservation-receipt.json','source-preservation-receipt.json')]:
        steps.append({'id':'SAVE_'+name.replace('.','_').replace('-','_').upper(),'kind':'storage','needs':[steps[-1]['id']],
            'source':'{work}/'+source,'destination':name})
    write_json(destination/'workflow.json',{'workflow_id':'NATIVE_ROW_TABLE_CONNECTION_CANDIDATE','version':'1',
        'status':'ACTIVE','work_skill':'product-change-work','steps':steps,'targets':{'NATIVE_RUNTIME_CANDIDATE':[steps[-1]['id']]}})
    authority={**ref(profile),'authority_id':'NATIVE_ROW_TABLE_CONNECTION_CANDIDATE','authority_type':'NATIVE_EXECUTION_CONTRACT',
        'repository':repository,'version':'LOCAL_CANDIDATE_V1','status':'ACTIVE','scope_axis':'LOCAL_CONNECTION_CANDIDATE_ONLY',
        'resolution_source':'User-authorized next-step implementation; no Formal, Human or UI adoption authority'}
    write_json(destination/'authority-index.json',{'status':'CURRENT','entries':[authority]})
    write_json(destination/'registry.json',{'registry_id':'NATIVE_EXISTING_FORMAL_CAPTURE','version':contract['identity']['revision'],
        'status':'CURRENT','products':[{'product_id':target,'aliases':native['aliases'],'master_state':'PRESENT',
            'observation':contract['inputs']['registry']}]})
    dependencies=[ref(checkout/n) for n in [native['native_adapter'],read_json(profile)['native_prepare'],
        'scripts/production/export-row-table-runtime.mjs','src/catalog/runtime-master/row-table-runtime-projection.mjs',
        'contracts/production/work-connections.v2.json','contracts/production/validator-registry.v2.json']]
    dependencies += contract['runtime_refs']+list(contract['inputs'].values())+[contract['node'],ref(qa_evidence)]
    dependencies += [ref(shared/n) for n in ['harness/workflow.py','harness/core.py','harness/resolvers.py','harness/artifacts.py','harness/local_qa.py']]
    spec={'workflow_id':contract['work_id'],'work_skill':'product-change-work','repository':repository,
        'target':target,'target_gate':'NATIVE_RUNTIME_CANDIDATE','execution_mode':'LOCAL_CANDIDATE',
        'skill_root':str(shared/'work_skills/product-change-work'),'authority_index':ref(destination/'authority-index.json'),
        'authorities':[authority],'registry':ref(destination/'registry.json'),
        'sources':[{**contract['inputs']['master'],'source_id':target+'::'+contract['identity']['revision'],'identity':contract['identity']['series'],
            'version':contract['identity']['revision'],'product_id':target,'role':'CURRENT_ADOPTED','status':'ADOPTED'}],
        'workflow':ref(destination/'workflow.json'),'input':ref(destination/'input.json'),'runtime_refs':dependencies,
        'storage_root':str(destination/'saved')}
    write_json(destination/'spec.json',spec)
    return {'state':'PREPARED_NATIVE_LOCAL_CANDIDATE','spec':str(destination/'spec.json'),
        'work':str(destination/'checkpoint'),'formal_mutation':False,'ui_adoption':False}


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    for name in ['shared','checkout','contract','qa-evidence','destination']:parser.add_argument('--'+name,required=True)
    a=parser.parse_args();print(json.dumps(prepare(a.shared,a.checkout,a.contract,a.qa_evidence,a.destination),ensure_ascii=False,indent=2))
