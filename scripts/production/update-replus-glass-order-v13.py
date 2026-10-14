"""Declare appearance-first sales dependencies; retain reviewed manufacturer facts."""
import json,hashlib,importlib.util
from pathlib import Path
R=Path('changes/replus-runtime-v5');V='REPLUS_GLASS_APPEARANCE_FIRST_V13_20261014'
TARGETS={'RPL_ROOM','RPL_TW','RPL_EW','RPL_BATH'}
def read(p):return json.loads(p.read_text())
def write(p,d):p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
spec=importlib.util.spec_from_file_location('compiler','scripts/production/compile-table-projection.py');compiler=importlib.util.module_from_spec(spec);spec.loader.exec_module(compiler)
index=read(R/'index.json')
if index['revision']==V:raise SystemExit('ALREADY_UPDATED_INSPECT_ONLY')
policy={'schema':'USER_GLASS_SELECTION_POLICY_V1','revision':V,'formalAdoption':False,'order':['glass_category','glass_appearance','glass','glass_function'],'appearanceParent':'glass_category','functionParent':'glass_appearance','compatibility':'Existing MILKY appearance/function pairing is evaluated downstream; incompatible functions clear, valid detail and appearance values remain. No manufacturer availability or requiredness inferred.','evidenceCarryForward':'flow/official-glass-review.v8.json','unchangedReferenceComponents':['RPL_ATT_TW','RPL_ATT_TH','RPL_CUT_MALL']}
write(R/'flow/glass-appearance-first-policy.v13.json',policy);index['revision']=V
for entry in index['products']:
 name=entry['id'].split(':')[1]
 if name not in TARGETS:continue
 p=read(R/'candidates'/(name+'.projection.json'));d=read(R/'candidates'/(name+'.json'));fields={f['key']:f for f in p['fields']};roles=entry['uiFlowContract']['fields']
 appearance=fields['glass_appearance'];appearance['displayLabel']='ガラス種';appearance['parentFields']=['glass_category'];appearance['selector']={'glass_category':{'$exists':True}}
 for choice in appearance['choices']:
  choice['selector']={'glass_category':{'$exists':True}};choice['displayOrder']={'CLEAR':1,'OBSCURE':2,'FROST':3,'MILKY':4}[choice['value']]
 fields['glass']['parentFields'].insert(1,'glass_appearance')
 fields['glass_function']['parentFields'].insert(1,'glass_appearance')
 for choice in fields['glass_function']['choices']:
  condition={'glass_appearance':'MILKY'} if choice['value']=='MILKY' else {'not':{'glass_appearance':'MILKY'}}
  choice['selector']={'all':[choice.get('selector',{}),condition]}
 for rank,key in enumerate(policy['order'],1):
  fields[key]['displayOrder']=690+rank*10;roles[key]['rank']=rank;roles[key]['parents']=fields[key]['parentFields']
 roles['glass_appearance']['label']='ガラス種';roles['glass_appearance']['meaning']='透明・型板・フロスト・乳白の見え方。ガラス種類の後に選び、追加機能との既存対応を後段で再評価する。'
 p['candidate_revision']=V;d['candidate_revision']=V
 rows=d['tables']['14_UI選択契約']['values']
 for row in rows[2:]:
  row[5]=V
  if row[0]=='フロー' and row[1] in policy['order']:
   row[2]=','.join(fields[row[1]]['parentFields']);payload=json.loads(row[3]);payload['label']=roles[row[1]]['label'];payload['rank']=roles[row[1]]['rank'];row[3]=json.dumps(payload,ensure_ascii=False)
 for key in ['glass_appearance','glass','glass_function']:
  rows.append(['FIELD_PATCH',key,','.join(fields[key]['parentFields']),json.dumps(fields[key],ensure_ascii=False),'USER_FLOW_POLICY_WITH_EXISTING_EVIDENCE',V])
 source=R/'candidates'/(name+'.json');write(source,d);p['source']['sha256']=sha(source);write(R/'candidates'/(name+'.projection.json'),p);module=R/entry['path'];write(module,compiler.compile_profile(p,R))
 flow=entry['uiFlowContract'];flow['revision']=V;flow['sourceFlow']['sha256']=sha(source)
 for role in roles.values():
  for ref in role.get('sourceRefs',[]):
   if ref.get('path')==flow['sourceFlow']['path']:ref['sha256']=sha(source)
 flow['reviewSources'].append({'path':'flow/glass-appearance-first-policy.v13.json','sha256':sha(R/'flow/glass-appearance-first-policy.v13.json')})
 entry['packageVersion']=V;entry['sha256']=entry['sourceHash']=sha(module)
write(R/'index.json',index)
review=read(R/'flow/reviewed-global-selection-flow.v12.json');review['revision']=V;review['contracts']={e['id']:e['uiFlowContract'] for e in index['products']};write(R/'flow/reviewed-global-selection-flow.v13.json',review)
b=read(R/'binding.v12.json');b['revision']=V;b['parent_commit']='760d579199ccd445ff84bb24523f24c23c5c8f0b';b['pre_qa_index']={**b['index'],'scope':'PREDECESSOR_V12_ONLY'};b['index']={'sha256':sha(R/'index.json'),'bytes':(R/'index.json').stat().st_size,'readback':'PENDING'};b['current_authority']={'repository':'Takuro-Kwkm/product-ui-contracts','head':'22420adf26c5cb80a48eb44911fce3d24d8402a7','registry_sha256':'863685f5d0fd36c67b02fdc3a7e5644e1ff0a051da300378993f0c625c4419df','skill_authority_sha256':'39efeca95214ea29816c6666b53c8127e665c821e74e34de3738761cc797e7d3'};b['native_state']='FAIL_CLOSED:CURRENT_ROUTER_CHANGED';b['modules']=[{'id':e['id'],'sha256':e['sha256']} for e in index['products']];b['qa']={'state':'PENDING'};b['changed_components']=sorted(TARGETS);b['carry_forward_components']=policy['unchangedReferenceComponents'];write(R/'binding.v13.json',b)
print('GLASS_APPEARANCE_FIRST_SUCCESSOR_UPDATED',len(TARGETS))
