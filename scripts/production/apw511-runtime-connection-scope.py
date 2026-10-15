"""Bound this native admission; reuse the existing immutable scope validator."""
import importlib.util,json
from pathlib import Path
BASE = "04120930f7d1ca8179b852335414a8af2459f1aa"
PATH = "contracts/production/apw511-runtime-connection-scope.v1.json"
TARGET = "NEW-CANDIDATE-d780d8e7c8cdae7ba41675eb"
ALLOWED = {'changes/apw511-runtime-ui-r1/sources/PRODUCT_MASTER_MANIFEST.json', 'contracts/production/validator-registry.v2.json', 'changes/apw511-runtime-ui-r2/sources/UI_STANDARD_v2.1.docx', 'src/ui/web/product-configuration-editor.mjs', 'contracts/production/authority-successors/apw511-runtime-predecessor-profile.v1.json', 'changes/apw511-runtime-ui-r2/candidates/module.json', 'src/catalog/runtime-master/declared-selection-views.mjs', 'changes/apw511-runtime-ui-r2/sources/PRODUCT_MASTER_MANIFEST.json', 'changes/apw511-runtime-ui-r2/review/dependencies.json', 'changes/apw511-runtime-ui-r2/review/flow.json', 'changes/apw511-runtime-ui-r2/review/browser-qa.json', 'contracts/production/release-profiles/replus-runtime-ui-v1.2-r1.json', 'changes/apw511-runtime-ui-r2/projection.json', 'changes/apw511-runtime-ui-r1/review/flow.json', 'src/catalog/resolver-fields.mjs', 'changes/apw511-runtime-ui-r1/projection.json', 'src/catalog/runtime-master/product-module-runtime-adapter.mjs', 'contracts/production/release-profiles/order5-batch3-thermosl.v1.json', 'contracts/production/release-profiles/order5-batch3-apw431.v1.json', 'changes/apw511-runtime-ui-r1/review/dependencies.json', 'changes/apw511-runtime-ui-r2/review/current-route.json', 'docs/APW511_CURRENT_CONNECTION.md', 'contracts/production/authority-successors/apw511-runtime-current.v1.json', 'contracts/production/current-authority-successor.json', 'contracts/production/work-connections.v2.json', 'changes/apw511-runtime-ui-r1/sources/UI_STANDARD_v2.1.docx', 'docs/APW511_RUNTIME_UI_REVIEW.md', 'scripts/production/domain-runtime-connection-scope.py', 'changes/apw511-runtime-ui-r2/review/formal-provenance.json', 'contracts/production/runtime-candidates/apw511-r2.profile.json', 'changes/apw511-runtime-ui-r2/sources/PRODUCT_MASTER.json', 'scripts/production/compile-domain-projection.py', 'changes/apw511-runtime-ui-r2/index.json', 'src/work-management/domain.mjs', 'src/catalog/catalog-resolver.mjs', 'scripts/production/validate-domain-runtime-connection.py', 'contracts/production/release-profiles/order5-batch3-tw.v1.json', 'contracts/production/apw511-runtime-connection-scope.v1.json', 'scripts/production/validate-domain-runtime-projection.mjs', 'contracts/production/authority-successors/apw511-runtime-predecessor-selection.v1.json', 'changes/apw511-runtime-ui-r1/candidates/module.json', '.github/workflows/native-formal-storage.yml', 'scripts/production/domain-runtime-candidate.py', 'contracts/production/release-profiles/order5-batch3-apw430.v1.json', 'changes/apw511-runtime-ui-r1/sources/PRODUCT_MASTER.json', 'test/browser/declared-sales-runtime-browser-qa.mjs', 'contracts/production/release-profile.v1.json', 'scripts/production/test_apw511_runtime_connection.py', 'test/apw511-runtime-ui.test.mjs', 'scripts/production/apw511-runtime-connection-scope.py', 'changes/apw511-runtime-ui-r1/index.json'}

def validate(root):
    root=Path(root)
    loader=importlib.util.spec_from_file_location('immutable_scope',root/'scripts/production/native-change-scope.py')
    guard=importlib.util.module_from_spec(loader);loader.loader.exec_module(guard);guard.SCOPE_PATH=PATH
    result=guard.validate(root)
    if result['status']!='PASS':return result
    try:
        before=guard.snapshot(root,BASE);scope=json.loads((root/PATH).read_bytes())
        assert scope['baseline_commit']==BASE and set(scope['allowed_paths'])==ALLOWED,'SCOPE_EXPANSION'
        for name in ['work-connections.v2.json','validator-registry.v2.json']:
            old=json.loads(before['contracts/production/'+name]);new=json.loads((root/'contracts/production'/name).read_bytes())
            assert {k:v for k,v in old.items() if k!='products'}=={k:v for k,v in new.items() if k!='products'},'ROUTING_POLICY_CHANGED'
            if isinstance(old['products'],list):
                assert [p for p in new['products'] if p['product_id']!=TARGET]==old['products'],'OTHER_PRODUCT_CHANGED'
                assert sum(p['product_id']==TARGET for p in new['products'])==1,'TARGET_IDENTITY'
            else:
                assert {k:v for k,v in new['products'].items() if k!=TARGET}==old['products'],'OTHER_VALIDATOR_CHANGED'
        # The reviewed runtime/flow/source bytes are carried forward exactly.
        from hashlib import sha256
        index=root/'changes/apw511-runtime-ui-r2/index.json'
        assert sha256(index.read_bytes()).hexdigest()=='3f1e66efccdba3fbd4bedf8868776a803100110e6e1aff89a3a19e6c58013590','REVIEWED_INDEX_CHANGED'
        for name in {'contracts/production/release-profile.v1.json'}|{p['path'] for p in json.loads(before['contracts/production/release-profiles.v1.json'])['profiles']}:
            old=json.loads(before[name]);new=json.loads((root/name).read_bytes())
            assert {k:v for k,v in old.items() if k not in ('native_paths','native_files','publication_policy')}=={k:v for k,v in new.items() if k not in ('native_paths','native_files','publication_policy')},'RELEASE_GUARANTEE_CHANGED'
            assert {k:v for k,v in old['publication_policy'].items() if k!='protected_files'}=={k:v for k,v in new['publication_policy'].items() if k!='protected_files'},'PUBLICATION_POLICY_CHANGED'
            assert set(old['native_paths'])<=set(new['native_paths'])==set(new['native_files']),'PIN_COVERAGE'
            assert set(old['publication_policy']['protected_files'])<=set(new['publication_policy']['protected_files']),'PROTECTION_SHRANK'
            for path,digest in {**new['native_files'],**new['publication_policy']['protected_files']}.items():
                assert sha256((root/path).read_bytes()).hexdigest()==digest,'PROFILE_BYTES_DRIFT:'+path
        return {**result,'scope':'APW511_CURRENT_RUNTIME_UI_CANDIDATE_CONNECTION','formal_work':'INSPECT_ONLY','human_flow_review':'REQUIRED_NOT_GRANTED','runtime_adoption':False,'release':False}
    except (AssertionError,OSError,ValueError,KeyError) as e:return {'status':'FAIL_CLOSED','errors':[str(e)]}

if __name__=='__main__':
    import sys
    result=validate(Path(__file__).resolve().parents[2]);print(json.dumps(result));sys.exit(0 if result['status']=='PASS' else 2)
