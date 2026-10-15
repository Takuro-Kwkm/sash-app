"""Use the existing immutable native scope guard for the Working Formal successor."""
import importlib.util,json
from pathlib import Path

PATH='contracts/production/working-domain-formal-scope.v1.json'
BASE='6488ab4679ea4fe0d4250981733dfbef94923071'
FIXED={PATH,'.github/workflows/native-formal-storage.yml','contracts/production/work-connections.v2.json',
 'contracts/production/validator-registry.v2.json','contracts/production/working-master-recovery/doorremo-nonfire.formal.v1.json',
 'scripts/production/working-domain-formal.py','scripts/production/test_working_domain_formal.py',
 'scripts/production/prepare-sheet-package-formal.py','scripts/production/sheet-package-formal.py',
 'scripts/production/working-formal-connection-scope.py','scripts/production/native-change-scope.py',
 'scripts/production/formal-connection-scope.py','scripts/production/validate-sheet-package-connection.py',
 'docs/DOORREMO_FORMAL_CONNECTION.md','contracts/production/release-profile.v1.json',
 'contracts/production/current-authority-successor.json',
 'contracts/production/authority-successors/doorremo-formal-current.v1.json',
 'contracts/production/authority-successors/doorremo-formal-predecessor-profile.v1.json',
 'contracts/production/authority-successors/doorremo-formal-predecessor-selection.v1.json'}

def validate(root):
    root=Path(root)
    spec=importlib.util.spec_from_file_location('native_scope',root/'scripts/production/native-change-scope.py')
    guard=importlib.util.module_from_spec(spec);spec.loader.exec_module(guard);guard.SCOPE_PATH=PATH
    result=guard.validate(root)
    if result['status']!='PASS':return result
    try:
        scope=json.loads((root/PATH).read_text());assert scope['baseline_commit']==BASE,'BASELINE_CHANGED'
        before=guard.snapshot(root,BASE)
        profiles={p['path'] for p in json.loads(before['contracts/production/release-profiles.v1.json'])['profiles']}
        assert set(scope['allowed_paths'])==FIXED|profiles,'SCOPE_EXPANSION'
        target=json.loads((root/'contracts/production/working-master-recovery/doorremo-nonfire.formal.v1.json').read_text())['product_id']
        for name in ['work-connections.v2.json','validator-registry.v2.json']:
            old=json.loads(before['contracts/production/'+name]);new=json.loads((root/'contracts/production'/name).read_text())
            assert {k:v for k,v in old.items() if k!='products'}=={k:v for k,v in new.items() if k!='products'},'ROUTING_CHANGED'
            if isinstance(old['products'],list):
                prior=next(p for p in old['products'] if p['product_id']==target);selected=next(p for p in new['products'] if p['product_id']==target)
                assert [p for p in old['products'] if p['product_id']!=target]==[p for p in new['products'] if p['product_id']!=target],'UNRELATED_PRODUCT_CHANGED'
            else:
                prior=old['products'][target];selected=new['products'][target]
                assert {k:v for k,v in old['products'].items() if k!=target}=={k:v for k,v in new['products'].items() if k!=target},'UNRELATED_VALIDATOR_CHANGED'
            assert {k:v for k,v in selected.items() if k!='formal_profile'}==prior,'WORKING_QA_CONNECTION_CHANGED'
        return {**result,'scope':'EXISTING_WORKING_DOMAIN_FORMAL_CONNECTION','formal_before_human':0}
    except (AssertionError,OSError,ValueError,KeyError) as error:return {'status':'FAIL_CLOSED','errors':[str(error)]}

if __name__=='__main__':
    import sys
    result=validate(Path(__file__).resolve().parents[2]);print(json.dumps(result));sys.exit(0 if result['status']=='PASS' else 2)
