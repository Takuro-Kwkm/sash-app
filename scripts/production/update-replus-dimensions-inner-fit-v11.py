"""Bind reviewed official dimensions and installation choices to common runtime data."""
import json,hashlib,importlib.util
from pathlib import Path
R=Path('changes/replus-runtime-v5');V='REPLUS_DIMENSIONS_INNER_FIT_V11_20261014'
def read(p):return json.loads(p.read_text())
def write(p,d):p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
spec=importlib.util.spec_from_file_location('compiler','scripts/production/compile-table-projection.py');compiler=importlib.util.module_from_spec(spec);spec.loader.exec_module(compiler)
index=read(R/'index.json');index['revision']=V
review={'schema':'REVIEWED_OFFICIAL_DIMENSION_INSTALLATION_V1','revision':V,'manufacturerSourceAdoption':False,'source':'SN1200 2025-08; existing adopted source bytes rechecked','source_sha256':sha(Path('/private/tmp/replus-20261014-v5/sealed-r2/sources/SN1200.pdf')),'pages':{'dimension_direct':{'pdf':[252,254],'printed':[248,250],'formula':'WD=WS-10; HD=HS-10; standard/inner-fit share the same formula'},'installation':{'pdf':[212,231,233,247,249,251],'printed':[208,227,229,243,245,247]},'attachment':{'pdf':[255,256,266,268],'printed':[251,252,262,264]}},'manualBoundary':'Installation suitability and shaded inner-fit manufacturing polygons remain MANUAL_CHECK; no price/BOM/set code inferred','userPresentation':'glass → inner-fit specification → inner cover → outer cover; both measured and finished sizes at the end'}
write(R/'flow/official-dimensions-inner-fit.v11.json',review)
def choice(value,label,ev,manual=False):return{'value':value,'displayLabel':label,'evidenceIds':[ev],'selector':{},'metadata':{'manualCheck':manual}}
def field(key,label,kind,parents,selector={},choices=[],required=False,**extra):return{'key':key,'displayLabel':label,'dataType':kind,'displayOrder':900,'choices':choices,'required':required,'autoSelectSingle':False,'parentFields':parents,'selector':selector,**extra}
def role(key,label,group,rank,parents,table='14_UI選択契約',meaning=None):return{'label':label,'meaning':meaning or label,'slot':'size' if group=='size' else 'frame_spec','stage':'SIZE' if group=='size' else 'INSTALLATION_SURVEY','group':group,'rank':rank,'parents':parents,'sourceRefs':[{'path':'flow/official-dimensions-inner-fit.v11.json','sha256':sha(R/'flow/official-dimensions-inner-fit.v11.json'),'table':table}],**({'evaluationContext':True} if group=='size' else {})}
for e in index['products']:
 name=e['id'].split(':')[1];p=read(R/'candidates'/(name+'.projection.json'));d=read(R/'candidates'/(name+'.json'));flow=e['uiFlowContract'];flow['revision']=V;p['candidate_revision']=V;d['candidate_revision']=V
 ev='EV-DIMENSIONS-INNER-FIT-V11';evidence={'id':ev,'source_id':ev,'source_type':'ADOPTED_OFFICIAL_SOURCE_REVIEW','document':'SN1200','sha256':review['source_sha256'],'locator':'PDF252/254 dimensions, 212/231/233/247/249/251 installation, 255/256 attachments','status':'REVIEWED_CANDIDATE_BINDING'}
 if name!='RPL_CUT_MALL':
  flow['groups'].append({'id':'inner_fit','label':'内はめ仕様','order':6.5})
  parent='referenced_window_id' if p.get('composition') else 'window_type';sel={parent:{'$exists':True}}
  install=field('installation_method','内はめ仕様','ENUM',[parent],sel,[choice('STANDARD','標準用',ev,True),choice('INNER_FIT_INSET','内はめ用（既設内付・半外付）',ev,True),choice('INNER_FIT_OUTSET','内はめ用（既設外付）',ev,True)],True)
  p['fields']=[f for f in p['fields'] if f['key']!='installation_method'];p['fields'].append(install)
  flow['fields']['installation_method']=role('installation_method','内はめ仕様','inner_fit',0,[parent],meaning='新設枠の施工仕様。窓の内押縁ガラス仕様とは別項目')
  p.setdefault('selection_migrations',[]).append({'source':'installation_method','value':'内嵌め用','clearSource':True,'assign':{},'reason':'Legacy value does not specify existing mount. Require explicit choice; never guess INSET/OUTSET.'})
  p['dependencies'].append({'id':'installation-confirmation-v11','mode':'MANUAL_CHECK','when':{'installation_method':{'$in':['INNER_FIT_INSET','INNER_FIT_OUTSET']}},'message':'内はめ用の製作範囲・既設枠への取付可否は現調・積算で確認してください。'})
  links=[]
  if not p.get('composition'):
   parts={'RPL_ROOM':'ROOM-UPPER-BASE','RPL_TW':'TW-OP-UPPER-BASE','RPL_EW':'EW-OP-UPPER-BASE','RPL_BATH':'BATH-OP-UPPER-BASE'};part=parts[name]
   for f in p['fields']:
    if f['key']=='options':f['choices']=[v for v in f['choices'] if v['value']!=part]
   partsel={**sel,'installation_method':{'$in':['INNER_FIT_INSET','INNER_FIT_OUTSET']}}
   p['fields'].append(field('inner_fit_required_component','内はめ用の必須部材','ENUM',['installation_method'],partsel,[choice(part,'既設上枠ベース材（必須・価格要確認）',ev,True)],False))
   flow['fields']['inner_fit_required_component']=role('inner_fit_required_component','内はめ用の必須部材','inner_fit',1,['installation_method'],meaning='内はめ用で必要な既設上枠ベース材。数量・価格は積算確認')
   links.append({'targetField':'inner_fit_required_component','parents':['installation_method'],'applicability':partsel,'cases':[{'when':{'installation_method':v},'value':part} for v in ['INNER_FIT_INSET','INNER_FIT_OUTSET']],'resolvedMessage':'内はめ用のため必要です。数量・価格は積算で確認してください。','pendingMessage':'内はめ仕様を選択してください。','unavailableMessage':'必要な内はめ部材の対応を確認してください。'})
   size=next(f for f in p['fields'] if f['key']=='size_mode');size['internal']=True;size['autoSelectSingle']=True
   p['fields'].append(field('dimension_basis','入力する寸法','ENUM',[],{},[choice('SURVEY','採寸寸法から入力',ev),choice('FINISHED','仕上がり寸法から入力',ev)],True))
   flow['fields']['dimension_basis']=role('dimension_basis','入力する寸法','size',1,[])
   for key,label,rank in [('survey_width','採寸幅 WS（mm）',2),('survey_height','採寸高さ HS（mm）',3),('custom_width','製品仕上がり幅 WD（mm）',4),('custom_height','製品仕上がり高さ HD（mm）',5)]:
    p['fields']=[f for f in p['fields'] if f['key']!=key];p['fields'].append(field(key,label,'NUMBER',['dimension_basis'],{'size_mode':'CUSTOM'},required=True))
    flow['fields'][key]=role(key,label,'size',rank,['dimension_basis'],meaning='採寸と仕上がりを分離。指定した入力基準以外は公式換算の確認表示')
   p['ruleSets'].append({'id':'numeric-input-pairs-v11','type':'NUMERIC_INPUT_PAIRS','status':'ACTIVE','payload':[{'basisField':'dimension_basis','measuredBasis':'SURVEY','finishedBasis':'FINISHED','legacyBasis':'FINISHED','evaluationAssignments':{'size_mode':'CUSTOM'},'pairs':[{'measuredField':'survey_width','finishedField':'custom_width','offset':-10,'message':'公式換算：仕上がり寸法 = 採寸寸法 − 10mm。'},{'measuredField':'survey_height','finishedField':'custom_height','offset':-10,'message':'公式換算：仕上がり寸法 = 採寸寸法 − 10mm。'}]}],'evidenceIds':[ev]})
  else:
   frameprefix='ATT-TW' if name=='RPL_ATT_TW' else 'ATT-TH'
   p['fields'].append(field('attachment_frame_spec','アタッチ枠仕様','ENUM',['installation_method'],sel,[choice(frameprefix+'-FRAME-STD','標準用アタッチ枠',ev),choice(frameprefix+'-FRAME-INNER-SINGLE','既設単体・内はめ用アタッチ枠',ev,True)]))
   flow['fields']['attachment_frame_spec']=role('attachment_frame_spec','アタッチ枠仕様','inner_fit',1,['installation_method'],meaning='公式03A/03Bに基づく施工仕様からのアタッチ枠対応')
   links.append({'targetField':'attachment_frame_spec','parents':['installation_method'],'cases':[{'when':{'installation_method':v},'value':frameprefix+('-FRAME-STD' if v=='STANDARD' else '-FRAME-INNER-SINGLE')} for v in ['STANDARD','INNER_FIT_INSET','INNER_FIT_OUTSET']],'resolvedMessage':'施工仕様に連動しています。','pendingMessage':'内はめ仕様を選択してください。','unavailableMessage':'アタッチ枠の対応を確認してください。'})
   for key,label,parentkey,rank in [('attachment_finished_w','アタッチ枠仕上がり幅 WD（mm）','survey_w',110),('attachment_finished_h','アタッチ枠仕上がり高さ HD（mm）','survey_h',111)]:
    p['fields'].append(field(key,label,'NUMBER',[parentkey],{},required=False,selectionMode='DERIVED',userSelectable=False));flow['fields'][key]=role(key,label,'size',rank,[parentkey],meaning='アタッチ枠の出来寸。新設サッシ本体寸法とは区別')
  p['ruleSets'].append({'id':'installation-component-links-v11','type':'SELECTION_LINKS','status':'ACTIVE','payload':links,'evidenceIds':[ev]})
  p['evidence'].append(evidence)
  d['tables']['90_Evidence']['values'].append([ev,'公式商品カタログ','リプラス SN1200','2025-08','PDF252/254・231/233/247/249/251','https://drive.google.com/file/d/1wH1nhmsftl6y8Mp7y6twtoXSi6rxqxzT/view','2026-10-14','HIGH','採寸/出来寸の相互換算と標準/内はめの施工仕様を共通Runtimeへ接続'])
 # Rebuild the application view, carrying manufacturer source tables forward.
 groups=sorted(flow['groups'],key=lambda g:g['order']);active={flow['fields'][f['key']]['group'] for f in p['fields'] if not f.get('internal') and not f.get('technical')}
 rows=[['リプラス住宅用・グローバルセレクションフロー'],[],['順番','表示項目','データキー','候補/入力','制御方針'],[1,'商品・リプラス仕様','product / specification','リプラス住宅用 → 仕様','アプリ運用ルール']]
 for g in groups:
  if g['id'] in active:rows.append([len(rows)-2,g['label'],g['id'],'選択・確認','採寸と仕上がりを併記' if g['id']=='size' else 'ガラスの後で選択' if g['id']=='inner_fit' else '対応する項目のみ表示'])
 d['tables']['01_入力フロー']['values']=rows;d['tables']['01_入力フロー']['address']='A1:E'+str(len(rows))
 old=d['tables']['14_UI選択契約']['values'][:2];data=[]
 for set in p['ruleSets']:
  if set['type'] in ['SELECTION_LINKS','NUMERIC_INPUT_PAIRS']:
   for rule in set['payload']:data.append([set['type'],rule.get('targetField',rule.get('basisField')),','.join(rule.get('parents',[])),json.dumps(rule,ensure_ascii=False),'OFFICIAL_SOURCE_REVIEW' if set['id'].endswith('v11') else 'USER_APPLICATION_POLICY',V])
 for f in p['fields']:data.append(['フロー',f['key'],','.join(f['parentFields']),json.dumps({'label':f['displayLabel'],'group':flow['fields'][f['key']]['group'],'internal':f.get('internal',False)},ensure_ascii=False),'UI_PRESENTATION',V])
 d['tables']['14_UI選択契約']['values']=old+data
 source=R/'candidates'/(name+'.json');write(source,d);p['source']['sha256']=sha(source);write(R/'candidates'/(name+'.projection.json'),p);module=R/e['path'];write(module,compiler.compile_profile(p,R))
 e['packageVersion']=V;e['sha256']=e['sourceHash']=sha(module);flow['sourceFlow']['sha256']=sha(source)
 for existing_role in flow['fields'].values():
  for ref in existing_role.get('sourceRefs',[]):
   if ref.get('path')==flow['sourceFlow']['path']:ref['sha256']=sha(source)
 flow['reviewSources'].append({'path':'flow/official-dimensions-inner-fit.v11.json','sha256':sha(R/'flow/official-dimensions-inner-fit.v11.json')})
write(R/'index.json',index)
reviewed=read(R/'flow/reviewed-global-selection-flow.v10.json');reviewed['revision']=V;reviewed['contracts']={e['id']:e['uiFlowContract'] for e in index['products']};write(R/'flow/reviewed-global-selection-flow.v11.json',reviewed)
binding=read(R/'binding.v10.json');binding['revision']=V;binding['parent_commit']='3a07439209065a4d1303d9302d3492e8fbf0f281';binding['index']={'sha256':sha(R/'index.json'),'bytes':(R/'index.json').stat().st_size,'readback':'PENDING'};binding['modules']=[{'id':e['id'],'sha256':e['sha256']} for e in index['products']];binding['qa']={'state':'PENDING'};write(R/'binding.v11.json',binding)
print('DIMENSIONS_INNER_FIT_SUCCESSOR_UPDATED',len(index['products']))
