"""Successor presentation projection; manufacturer source tables stay intact."""
import json, hashlib, importlib.util
from pathlib import Path
R=Path('changes/replus-runtime-v5')
V='REPLUS_SALES_FLOW_V10_20261014'
KEYS={'survey_cover_top','survey_cover_bottom','survey_cover_side','building_structure','installation_room','usage_humidity','work_space'}
def read(p): return json.loads(p.read_text())
def write(p,d): p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
spec=importlib.util.spec_from_file_location('compiler','scripts/production/compile-table-projection.py')
compiler=importlib.util.module_from_spec(spec);spec.loader.exec_module(compiler)
index=read(R/'index.json');index['revision']=V
policy={'schema':'USER_SELECTION_POLICY_V1','revision':V,'parent_revision':'REPLUS_GLOBAL_FLOW_V9_20261014','formalAdoption':False,'manufacturerFactsChanged':False,'excludedSalesFields':sorted(KEYS),'missingSiteConditions':'MANUAL_CHECK; never defaulted to suitable','scope':'Remove seven photographed sales inputs, required checks and obsolete saved selections; preserve source constraints, cover links and final dimensions'}
write(R/'flow/user-selection-policy.v10.json',policy)
for entry in index['products']:
 name=entry['id'].split(':')[1];pp=R/'candidates'/(name+'.projection.json');p=read(pp)
 excluded=[f for f in p['fields'] if f['key'] in KEYS]
 p['candidate_revision']=V;p['fields']=[f for f in p['fields'] if f['key'] not in KEYS]
 p['scope']+='; SALES_SITE_INPUTS_EXCLUDED_SOURCE_CONSTRAINTS_RETAINED'
 # Common resolver removes keys absent from definitions, including old saves.
 # Unknown measurements keep cover choices tentative; they do not certify fit.
 if any(f['key'].startswith('survey_cover_') for f in excluded):
  p['dependencies'].append({'id':'external-cover-site-confirmation-v10','mode':'MANUAL_CHECK','when':{'exterior_cover_type':{'$exists':True}},'message':'化粧カバーの納まり・適合は現調で確認してください。'})
 flow=entry['uiFlowContract'];flow['revision']=V
 for f in excluded: flow['fields'][f['key']]['salesInput']=False
 flow['reviewSources'].append({'path':'flow/user-selection-policy.v10.json','sha256':sha(R/'flow/user-selection-policy.v10.json'),'table':'User-requested sales presentation exclusions'})
 source=R/'candidates'/(name+'.json');d=read(source);d['candidate_revision']=V
 rows=d['tables']['01_入力フロー']['values'];visiblegroups={flow['fields'][f['key']]['group'] for f in p['fields'] if not f.get('internal') and not f.get('technical')}
 kept=rows[:4]+[r for r in rows[4:] if len(r)>2 and r[2] in visiblegroups]
 for i,row in enumerate(kept[4:],2): row[0]=i
 d['tables']['01_入力フロー']['values']=kept;d['tables']['01_入力フロー']['address']='A1:E'+str(len(kept))
 policyrows=d['tables']['14_UI選択契約']['values']
 for row in policyrows[2:]:
  row[5]=V
  if row[0]=='フロー' and row[1] in KEYS:
   body=json.loads(row[3]);body['salesInput']=False;body['required']=False;body['externalSiteCheck']=True;row[3]=json.dumps(body,ensure_ascii=False);row[4]='USER_APPLICATION_POLICY'
 write(source,d);p['source']['sha256']=sha(source);write(pp,p)
 module=R/entry['path'];write(module,compiler.compile_profile(p,R))
 entry['packageVersion']=V;entry['sha256']=entry['sourceHash']=sha(module);flow['sourceFlow']['sha256']=sha(source)
write(R/'index.json',index)
review=read(R/'flow/reviewed-global-selection-flow.v9.json');review['revision']=V;review['contracts']={e['id']:e['uiFlowContract'] for e in index['products']}
write(R/'flow/reviewed-global-selection-flow.v10.json',review)
binding=read(R/'binding.v9.json');binding['revision']=V;binding['parent_commit']='6569e4f7e32d2f9d703c69b86cdda8659c06a6a3';binding['index']={'sha256':sha(R/'index.json'),'bytes':(R/'index.json').stat().st_size,'readback':'PENDING'};binding['modules']=[{'id':e['id'],'sha256':e['sha256']} for e in index['products']];binding['qa']={'state':'PENDING'};binding['excluded_sales_fields']=sorted(KEYS)
write(R/'binding.v10.json',binding)
print('SUCCESSOR_UPDATED',len(index['products']))
