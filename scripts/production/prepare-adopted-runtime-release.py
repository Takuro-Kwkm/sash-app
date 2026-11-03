"""Normalize inspected native Master/Runtime adoption for existing Release gates.

No Human decision, new adoption, QA execution, journal or provider operation.
"""
import argparse,json,sys,subprocess
from pathlib import Path

def prepare(shared,reference_path,output):
 sys.path.insert(0,str(Path(shared).resolve()))
 from harness.core import read_json,write_json,require
 from harness.common_development import inspected_work,document,ref,master_input,validate_original_decision
 reference=read_json(reference_path);spec,state,_,_=inspected_work(reference,document(reference['evidence']['adoption_result'])['product_id'])
 result=document(reference['evidence']['adoption_result']);contract=document(spec['input']);review=contract['review_work'];ui_spec,_,_,_=inspected_work(review,result['product_id']);packet,decision=validate_original_decision(review,ui_spec,'HUMAN_UI_REVIEW');plan=document(ui_spec['input'])
 # Inspect the retained Master with its ORIGINAL fixed Shared implementation.
 original=Path(review['root']).resolve();code='import json,sys;sys.path.insert(0,sys.argv[1]);from harness.common_development import master_input;print(json.dumps(master_input(json.load(sys.stdin))))'
 observed=subprocess.run([sys.executable,'-B','-c',code,str(original)],input=json.dumps(plan),capture_output=True,text=True,check=True,cwd=original)
 master=json.loads(observed.stdout)
 require(spec['execution_mode']=='REAL'and spec['target_gate']=='RUNTIME_UI_ADOPTED'and state['state']=='COMPLETED'and result['state']=='RUNTIME_UI_ADOPTED'and result['release']is False and result['product_master_mutations']==0,'NATIVE_RELEASE_UPSTREAM','Completed actual native adoption required')
 require(master['status']=='PASS'and plan['master']['sha256']==document(contract['profile'])['formal_master']['sha256'],'NATIVE_RELEASE_UPSTREAM','Same inspected Formal Master required')
 p=Path(output).resolve();require(not p.exists(),'PRESERVE_NATIVE_UPSTREAM','Use a new immutable output')
 envelope={'schema':'NATIVE_ADOPTED_RUNTIME_RELEASE_INPUT_V1','work_id':result['work_id'],'product_id':result['product_id'],'qa_ready':'PASS','formal_adopted':'PASS','app_integration_ready':'PASS','native_adoption_result':reference['evidence']['adoption_result'],'native_adoption_work':{'root':reference['root'],'work':reference['work'],'spec':reference['spec']},'original_ui_review':review,'master_receipt':plan['master_receipt'],'master':plan['master'],'master_inspection':master,'gate_meaning':'CARRY_FORWARD_INSPECTED_FORMAL_MASTER_AND_COMPLETED_NATIVE_RUNTIME_UI_ADOPTION; NOT_NEW_QA_OR_RELEASE_PERMISSION','new_formal_adoptions':0,'new_human_decisions':0,'release':False};write_json(p,envelope);return {'state':'NATIVE_RELEASE_UPSTREAM_PREPARED','reference':ref(p),'publication_authority':False}
if __name__=='__main__':
 p=argparse.ArgumentParser()
 for k in ('shared','reference','output'):p.add_argument('--'+k,required=True)
 a=p.parse_args();print(json.dumps(prepare(a.shared,a.reference,a.output)))
