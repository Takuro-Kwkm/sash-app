"""Bind a row-table format profile to the existing native adoption DAG.

All inputs, including actual Main/readback sources, are acquired by the host.
"""
import argparse,json,sys
from pathlib import Path
def prepare(shared,checkout,contract,destination):
 shared,checkout,contract,destination=map(lambda x:Path(x).resolve(),(shared,checkout,contract,destination));sys.path.insert(0,str(shared))
 from harness.core import read_json,write_json,require
 from harness.common_development import inspected_work,ref
 from harness.architecture import route_instruction
 require(not destination.exists(),'WORK_EXISTS','Preserve existing bindings')
 c=read_json(contract);profile_path=Path(c['profile']['path']);p=read_json(profile_path)
 require(Path(c['native_spec_path']).resolve()==destination/'spec.json','ROW_TABLE_SCOPE','Bind the exact future native spec path')
 require(c['checkout']==str(checkout)and p['format']=='ROW_TABLE_RUNTIME_V1'and p['product_id']==c['product_id'],'ROW_TABLE_SCOPE','Exact native format/product required')
 route=route_instruction(shared,{p['repository']:str(checkout)},c['product_name']+'のRuntime/UI正式採用',p['product_id']);require(route['native_ui_adoption_profile']=={'path':profile_path.relative_to(checkout).as_posix(),'sha256':ref(profile_path)['sha256']},'PROFILE_CHANGED','Use acquired profile')
 base,_,_,_=inspected_work(c['review_work'],p['product_id']);destination.mkdir(parents=True)
 stages=p['required_stages'];worker=ref(checkout/p['native_worker']);steps=[{'id':name,'kind':'validator','needs':[stages[i-1]]if i else[],'script':worker,'args':['--central',str(shared),'--contract','{input}','--stage',name,'--work','{work}','--out','{work}/'+name+'.json'],'output':'{work}/'+name+'.json','result_path':['status'],'expected_result':'PASS','timeout_seconds':600}for i,name in enumerate(stages)]
 steps.append({'id':'SAVE_ADOPTION_RESULT','kind':'storage','needs':[stages[-1]],'source':'{work}/RUNTIME_UI_ADOPTION.json','destination':'RUNTIME_UI_ADOPTION.json'})
 workflow={'workflow_id':'NATIVE_ROW_TABLE_RUNTIME_ADOPTION','version':'1','status':'ACTIVE','work_skill':'product-change-work','steps':steps,'targets':{'RUNTIME_UI_ADOPTED':['SAVE_ADOPTION_RESULT']}};write_json(destination/'workflow.json',workflow)
 spec={**base,'workflow_id':c['work_id'],'target_gate':'RUNTIME_UI_ADOPTED','workflow':ref(destination/'workflow.json'),'input':ref(contract),'skill_root':str(shared/'work_skills/product-change-work'),'storage_root':str(destination/'saved'),'production_binding':c['production_binding'],'runtime_refs':base.get('runtime_refs',[])+[ref(profile_path),worker,ref(checkout/p['native_preparer']),ref(checkout/p['native_validator'])]+list(c['inputs'].values())}
 for k in ('decision','decisions','authorization','receipts','formal_receipt','local_qa'):spec.pop(k,None)
 write_json(destination/'spec.json',spec);return {'state':'PREPARED_NOT_ADOPTED','spec':str(destination/'spec.json'),'work':str(destination/'checkpoint'),'native_entry':p['native_preparer'],'source_master_mutations':0,'publication':False}
if __name__=='__main__':
 a=argparse.ArgumentParser()
 for k in ('shared','checkout','contract','destination'):a.add_argument('--'+k,required=True)
 x=a.parse_args();print(json.dumps(prepare(x.shared,x.checkout,x.contract,x.destination),ensure_ascii=False))
