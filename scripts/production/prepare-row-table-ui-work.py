#!/usr/bin/env python3
"""Bind a native UI validation step to the existing v2 engine; no new runner."""
import argparse,json,sys
from pathlib import Path

def prepare(shared,checkout,input_path,destination):
 shared,checkout,input_path,destination=map(lambda p:Path(p).resolve(),(shared,checkout,input_path,destination));sys.path.insert(0,str(shared))
 from harness.core import read_json,write_json,sha,require
 from harness.common_development import inspected_work,ref
 from harness.architecture import route_instruction
 from harness.local_qa import revalidate
 require(not destination.exists(),'WORK_EXISTS','Use a successor; preserve saved binding')
 source=read_json(input_path);revalidate(read_json(source['local_qa']['path']))
 base,_,_,_=inspected_work(source['master_work'],source['product_id'])
 route=route_instruction(shared,{source['repository']:str(checkout)},source['product_name']+'のUI接続候補を更新して',source['product_id'])
 require(route['target_gate']=='NATIVE_UI_CANDIDATE','NATIVE_UI_SCOPE','Use the local UI producer only')
 destination.mkdir(parents=True);write_json(destination/'route.json',route)
 entry=read_json(checkout/'contracts/production/work-connections.v2.json')['products'];entry=next(r for r in entry if r['product_id']==source['product_id'])
 profile=entry['runtime_ui_profile'];authority={**ref(checkout/profile['path']),'authority_id':'NATIVE_ROW_TABLE_UI_CANDIDATE','authority_type':'NATIVE_EXECUTION_CONTRACT','repository':source['repository'],'version':'LOCAL_UI_V1','status':'ACTIVE','scope_axis':'LOCAL_CANDIDATE_ONLY','resolution_source':'Source-derived local UI; no Human adoption or publication authority'}
 require(authority['sha256']==profile['sha256'],'PROFILE_CHANGED','Exact native UI profile required')
 workflow={'workflow_id':'NATIVE_ROW_TABLE_UI_CANDIDATE','version':'1','status':'ACTIVE','work_skill':'product-change-work','steps':[
 {'id':'NATIVE_UI_QA','kind':'validator','needs':[],'script':ref(checkout/entry['native_adapter']),'args':['--input','{input}','--out','{work}/native-ui-qa.json'],'output':'{work}/native-ui-qa.json','result_path':['status'],'expected_result':'PASS','timeout_seconds':180},
 {'id':'SAVE_NATIVE_UI_QA','kind':'storage','needs':['NATIVE_UI_QA'],'source':'{work}/native-ui-qa.json','destination':'native-ui-qa.json'}],'targets':{'NATIVE_UI_CANDIDATE':['SAVE_NATIVE_UI_QA']}}
 write_json(destination/'workflow.json',workflow)
 index=read_json(base['authority_index']['path']);index['entries'].append(authority);write_json(destination/'authority-index.json',index)
 spec={**base,'workflow_id':source['work_id'],'repository':source['repository'],'target_gate':'NATIVE_UI_CANDIDATE','execution_mode':'LOCAL_CANDIDATE','skill_root':str(shared/'work_skills/product-change-work'),'workflow':ref(destination/'workflow.json'),'input':ref(input_path),'authority_index':ref(destination/'authority-index.json'),'authorities':base['authorities']+[authority],'storage_root':str(destination/'saved')}
 for k in ['decision','decisions','authorization','receipts','formal_receipt','production_binding','local_qa']:spec.pop(k,None)
 refs=[ref(shared/n) for n in ['harness/workflow.py','harness/core.py','harness/resolvers.py','harness/common_development.py','harness/local_qa.py']]
 refs += [ref(checkout/n) for n in ['scripts/production/validate-row-table-ui.py','scripts/production/prepare-row-table-ui-work.py','contracts/production/work-connections.v2.json','contracts/production/validator-registry.v2.json']]
 refs += [source[k] for k in ['master','master_receipt','master_projection','flow','expected_inventory','mapping','preview','browser_report','image_inventory','local_qa','native_registry']]+source['ui_files']
 spec['runtime_refs']=base.get('runtime_refs',[])+refs;write_json(destination/'spec.json',spec)
 return {'state':'PREPARED_NATIVE_UI_CANDIDATE','spec':str(destination/'spec.json'),'work':str(destination/'checkpoint'),'publication_authority':False}
if __name__=='__main__':
 p=argparse.ArgumentParser()
 for key in ['shared','checkout','input','destination']:p.add_argument('--'+key,required=True)
 a=p.parse_args();print(json.dumps(prepare(a.shared,a.checkout,a.input,a.destination),ensure_ascii=False,indent=2))
