"""Hide operational confirmations, keeping declared calculation and dependencies."""
import json,hashlib,importlib.util
from pathlib import Path
R=Path('changes/replus-runtime-v5');V='REPLUS_HIDE_DERIVED_CONFIRMATIONS_V12_20261014'
KEYS={'inner_fit_required_component','exterior_cover_color','interior_cover_color','interior_resin_cover_color','cut_mall_color','interior_adjustment_angle_color'}
def read(p):return json.loads(p.read_text())
def write(p,d):p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
spec=importlib.util.spec_from_file_location('compiler','scripts/production/compile-table-projection.py');compiler=importlib.util.module_from_spec(spec);spec.loader.exec_module(compiler)
policy={'schema':'USER_PRESENTATION_POLICY_V1','revision':V,'formalAdoption':False,'hiddenConfirmations':sorted(KEYS),'calculation':'UNCHANGED; colors still follow body and inner-fit still requires upper-frame base','scope':'Sales display and resolved informational notices only; retain unknown mapping and installation/price holds'}
write(R/'flow/user-presentation-policy.v12.json',policy)
index=read(R/'index.json')
if index['revision']==V:raise SystemExit('ALREADY_UPDATED_INSPECT_ONLY')
index['revision']=V
for entry in index['products']:
 name=entry['id'].split(':')[1];p=read(R/'candidates'/(name+'.projection.json'));d=read(R/'candidates'/(name+'.json'));p['candidate_revision']=V;d['candidate_revision']=V
 hidden=[]
 for f in p['fields']:
  if f['key'] in KEYS:f['internal']=True;hidden.append(f['key'])
 for set in p['ruleSets']:
  if set['type']=='SELECTION_LINKS':
   for rule in set['payload']:
    if rule['targetField']=='inner_fit_required_component':rule['resolvedNoticeVisibility']='INTERNAL_ONLY'
 rows=d['tables']['14_UI選択契約']['values']
 for row in rows[2:]:
  row[5]=V
  if row[0]=='フロー' and row[1] in KEYS:
   value=json.loads(row[3]);value['internal']=True;value['salesDisplay']=False;row[3]=json.dumps(value,ensure_ascii=False);row[4]='USER_PRESENTATION_POLICY'
  if row[0]=='SELECTION_LINKS' and row[1]=='inner_fit_required_component':
   value=json.loads(row[3]);value['resolvedNoticeVisibility']='INTERNAL_ONLY';row[3]=json.dumps(value,ensure_ascii=False)
 source=R/'candidates'/(name+'.json');write(source,d);p['source']['sha256']=sha(source);write(R/'candidates'/(name+'.projection.json'),p);module=R/entry['path'];write(module,compiler.compile_profile(p,R))
 flow=entry['uiFlowContract'];flow['revision']=V;flow['sourceFlow']['sha256']=sha(source)
 for key in hidden:flow['fields'][key]['salesDisplay']=False
 for role in flow['fields'].values():
  for ref in role.get('sourceRefs',[]):
   if ref.get('path')==flow['sourceFlow']['path']:ref['sha256']=sha(source)
 flow['reviewSources'].append({'path':'flow/user-presentation-policy.v12.json','sha256':sha(R/'flow/user-presentation-policy.v12.json')})
 entry['packageVersion']=V;entry['sha256']=entry['sourceHash']=sha(module)
write(R/'index.json',index)
review=read(R/'flow/reviewed-global-selection-flow.v11.json');review['revision']=V;review['contracts']={e['id']:e['uiFlowContract'] for e in index['products']};write(R/'flow/reviewed-global-selection-flow.v12.json',review)
b=read(R/'binding.v11.json');b['revision']=V;b['parent_commit']='9fd0333c26cad370553023f8c0fbbee6dfef7f92';b['index']={'sha256':sha(R/'index.json'),'bytes':(R/'index.json').stat().st_size,'readback':'PENDING'};b['pre_qa_index']={**b['index'],'drive_file_id':'1I2bA_jd4KeVR3IFDGB99JIH9rDn33yg7','sha256':'f26877ed855e0757b9bb70b0a957d4b4f125cc9fc16360eae307422f5afe3de7','bytes':260849,'readback':'MATCH','scope':'PREDECESSOR_V11_ONLY'};b['hidden_sales_confirmations']=sorted(KEYS);b['modules']=[{'id':e['id'],'sha256':e['sha256']} for e in index['products']];b['qa']={'state':'PENDING'};write(R/'binding.v12.json',b)
print('PRESENTATION_SUCCESSOR_UPDATED',len(index['products']))
