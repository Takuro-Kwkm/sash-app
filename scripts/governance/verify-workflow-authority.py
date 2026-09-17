"""Static authority verification; parse YAML instead of trusting grep/self-report."""
import json,pathlib,sys,yaml
root=pathlib.Path('.')
policy=json.loads((root/'project-governance/workflow-authority-policy.json').read_text())
errors=[]; docs={}
for p in (root/'.github/workflows').glob('*.yml'):
 try:docs[p.name]=yaml.safe_load(p.read_text())
 except Exception as e:errors.append(f'{p.name}: invalid YAML: {e}')
controller=policy['controller']; auth=policy['authorization_workflow']
for name,d in docs.items():
 events=d.get('on',d.get(True)) or {}
 if name==controller:
  if set(events)-{'push','pull_request','workflow_dispatch'}:errors.append('Controller has unauthorized trigger')
  for key,j in d['jobs'].items():
   if key not in ('governance','persist') and (j.get('needs')!='governance' or "needs.governance.outputs.authorized == 'true'" not in str(j.get('if'))):errors.append(f'{name}/{key}: controller bypass')
  continue
 if set(events)!={'workflow_call'}:errors.append(f'{name}: independent workflow trigger')
 if name==auth:continue
 if name not in policy['legacy_workflows']:errors.append(f'{name}: unregistered authority')
 gate=d['jobs'].get('governance-authority',{})
 if gate.get('uses')!='./.github/workflows/'+auth:errors.append(f'{name}: missing authority verifier')
 for key,j in d['jobs'].items():
  if key=='governance-authority':continue
  deps=j.get('needs',[]);deps=[deps] if isinstance(deps,str) else deps
  if 'governance-authority' not in deps or "needs.governance-authority.outputs.authorized == 'true'" not in str(j.get('if')):errors.append(f'{name}/{key}: authority bypass')
  for step in j.get('steps',[]):
   # A legacy echo cannot become an independent app/release PASS declaration.
   run=step.get('run','')
   for claim in ('APP_INTEGRATION_READY=TRUE','RELEASE_INPUT_GATE=PASS','PRODUCTION_READY=TRUE'):
    if claim in run:errors.append(f'{name}/{key}: independent declaration {claim}')
for name in policy['legacy_workflows']:
 if name not in docs:errors.append(f'Missing preserved workflow {name}')
report={'status':'FAIL' if errors else 'PASS','legacy_workflow_count':len(policy['legacy_workflows']),'legacy_independent_authority_count':sum(1 for n,d in docs.items() if n!=controller and set(d.get('on',d.get(True)) or {})!={'workflow_call'}),'errors':errors}
p=root/'artifacts/governance/workflow-authority-verification.json';p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report));sys.exit(bool(errors))
