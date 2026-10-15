"""Bind an acquired native table package to the existing Shared production DAG."""
import argparse,json,sys
from pathlib import Path

def prepare(shared,checkout,captures,destination,instruction):
    shared,checkout,root=[Path(x).resolve() for x in (shared,checkout,destination)]
    sys.path.insert(0,str(shared))
    from harness.core import read_json,write_json,sha,require
    from harness.architecture import route_instruction
    from harness.current_authority import compatibility
    from harness.production import repository_binding,observation_fingerprint,native_registry
    ref=lambda p:{'path':str(Path(p).resolve()),'sha256':sha(Path(p).read_bytes())}
    c=read_json(captures);route=route_instruction(shared,{c['repository']:str(checkout)},instruction,c['product_id'])
    require(route['target_gate']=='FORMAL_CHANGE_ADOPTION','NATIVE_CHANGE_SCOPE','One explicit Formal change required','PREPARE')
    compatibility(shared,checkout)
    require(not root.exists(),'IMMUTABLE_WORK_EXISTS','Inspect or resume the existing input','PREPARE');root.mkdir(parents=True)
    contract=read_json(c['contract']);profile=read_json(contract['profile']['path'])
    require(profile['product_id']==route['product_id'] and profile['worker']==route['native_adapter'],'NATIVE_CHANGE_SCOPE','Profile/route mismatch','PREPARE')
    row=native_registry(read_json(contract['registry_response']['path']),profile['manufacturer'],profile['series'])
    require(row==contract['registry_before'],'NATIVE_FORMAL_DRIFT','Reacquire the live baseline','PREPARE')
    binding=repository_binding(c['repository'],read_json(c['branch']),read_json(c['tree']),{p:checkout/p for p in c['captured_paths']})
    binding.update(checkout=str(checkout),observations={k:observation_fingerprint(read_json(v)) for k,v in c['observations'].items()})
    write_json(root/'production-binding.json',binding)
    worker=ref(checkout/profile['worker']);stages=['CURRENT_FORMAL_RESOLUTION','SOURCE_AND_SCOPE','AUTHORING_AND_DEPENDENCY_QA','FORMAL_REVIEW'];steps=[]
    for stage in stages:
        steps.append({'id':stage,'kind':'validator','needs':[steps[-1]['id']] if steps else [],'script':worker,
          'args':['--harness-root',str(shared),'--contract','{input}','--stage',stage,'--work','{work}','--out','{work}/'+stage+'.json'],
          'output':'{work}/'+stage+'.json','result_path':['status'],'expected_result':'PASS','timeout_seconds':300})
    steps.append({'id':'HUMAN_ADOPTION','kind':'human','needs':['FORMAL_REVIEW'],'packet':'{work}/FORMAL_REVIEW.json','packet_destination':'{workflow_id}/HUMAN_ADOPTION.json'})
    steps.append({'id':'FORMAL_SAVE','kind':'formal-save','needs':['HUMAN_ADOPTION'],'plan':ref(contract['formal_plan']['path'])})
    write_json(root/'workflow.json',{'workflow_id':'NATIVE_TABLE_PACKAGE_CHANGE_V1','version':'1.0.0','status':'CURRENT','work_skill':'product-change-work','steps':steps,'targets':{'FORMAL_CHANGE_ADOPTION':['FORMAL_SAVE']},'boundary':'Existing Shared human and native-receipt Formal save; no runtime promotion or publication'})
    authorities=[]
    for key,path in c['authorities'].items():authorities.append({**ref(path),'authority_id':key,'authority_type':key,'repository':c['repository'],'version':c['authority_versions'][key],'status':'ACTIVE','scope_axis':'PROJECT_CURRENT','resolution_source':'FRESH_CURRENT_ACQUISITION'})
    authorities.append({**ref(root/'workflow.json'),'authority_id':'NATIVE_TABLE_CHANGE_WORKFLOW','authority_type':'WORKFLOW','repository':c['repository'],'version':'1.0.0','status':'CURRENT','scope_axis':'PROJECT_CURRENT','resolution_source':'ADMITTED_NATIVE_PROFILE'})
    write_json(root/'authority-index.json',{'status':'CURRENT','entries':authorities})
    write_json(root/'registry.json',{'registry_id':'NATIVE_TABLE_CHANGE_CURRENT','version':row['package_version'],'status':'CURRENT','products':[{'product_id':route['product_id'],'aliases':[], 'master_state':'PRESENT','lifecycle_state':'FORMAL','formal_revision':row['package_version'],'native_entry':row}]})
    refs=[worker,contract['profile']]+[ref(checkout/p) for p in c['captured_paths']]+[ref(p) for p in sorted((shared/'harness').glob('*.py'))]
    for component in contract['components']:refs.extend(v for v in component.values() if isinstance(v,dict) and set(v)=={'path','sha256'})
    refs+=contract['sources']+contract['reviews']+contract['governance']+contract['review_artifacts']+[contract['runtime_index'],contract['runtime_manifest'],contract['formal_plan']]
    spec={'workflow_id':c['work_id'],'work_skill':'product-change-work','target':route['product_id'],'target_gate':route['target_gate'],'skill_root':str(checkout/'scripts/production'),
      'authority_index':ref(root/'authority-index.json'),'authorities':authorities,'registry':ref(root/'registry.json'),'workflow':ref(root/'workflow.json'),'input':ref(c['contract']),
      'sources':[{**v,'source_id':Path(v['path']).stem,'identity':Path(v['path']).stem,'version':c['source_versions'][Path(v['path']).stem], 'product_id':route['product_id'],'role':'NEW_CANDIDATE' if Path(v['path']).stem==c['candidate_source'] else 'CURRENT_ADOPTED','status':'CANDIDATE' if Path(v['path']).stem==c['candidate_source'] else 'CURRENT'} for v in contract['sources']],
      'runtime_refs':list({x['path']:x for x in refs}.values()),'storage_root':str(root/'saved'),'production_binding':ref(root/'production-binding.json'),'production_routing':ref(checkout/'contracts/production/work-connections.v2.json'),
      'decisions':{'HUMAN_ADOPTION':str(root/'human-decision.json')},'formal_receipt':str(root/'native-formal-readback.json')}
    write_json(root/'spec.json',spec)
    write_json(root/'live-state.json',{'repository':read_json(c['branch']),'observations':{k:read_json(v) for k,v in c['observations'].items()}})
    return {'status':'PREPARED_NATIVE_CHANGE','route':route,'root':str(root),'spec':str(root/'spec.json'),'live_state':str(root/'live-state.json'),'work':str(root/'checkpoint')}

if __name__=='__main__':
    p=argparse.ArgumentParser()
    for key in ['harness-root','checkout','captures','destination','instruction']:p.add_argument('--'+key,required=True)
    a=p.parse_args()
    try:r=prepare(a.harness_root,a.checkout,a.captures,a.destination,a.instruction)
    except Exception as e:r={'status':'FAIL_CLOSED','blocking_reason':getattr(e,'data',{'reason':str(e)})}
    print(json.dumps(r,ensure_ascii=False,indent=2));sys.exit(2 if r['status']=='FAIL_CLOSED' else 0)
