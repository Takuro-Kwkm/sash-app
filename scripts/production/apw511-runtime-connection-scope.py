"""Bound this native admission; reuse the existing immutable scope validator."""
import importlib.util,json
from pathlib import Path
BASE = "04120930f7d1ca8179b852335414a8af2459f1aa"
PATH = "contracts/production/apw511-runtime-connection-scope.v1.json"
TARGET = "NATIVE_REGISTRY:YKK AP::APW511"
ALLOWED = {'scripts/production/apw511-runtime-connection-scope.py', 'changes/apw511-runtime-ui-r2/review/formal-provenance.json', 'changes/apw511-runtime-ui-r2/sources/PRODUCT_MASTER.json', 'contracts/production/runtime-candidates/apw511-r2.profile.json', 'contracts/production/work-connections.v2.json', 'changes/apw511-runtime-ui-r2/sources/UI_STANDARD_v2.1.docx', 'test/browser/declared-sales-runtime-browser-qa.mjs', 'changes/apw511-runtime-ui-r1/index.json', 'contracts/production/release-profiles/order5-batch3-tw.v1.json', 'contracts/production/authority-successors/apw511-runtime-predecessor-selection.v1.json', 'changes/apw511-runtime-ui-r2/review/current-route.json', 'scripts/production/test_apw511_runtime_connection.py', 'src/catalog/resolver-fields.mjs', 'contracts/production/release-profile.v1.json', 'changes/apw511-runtime-ui-r2/review/flow.json', 'contracts/production/release-profiles/replus-runtime-ui-v1.2-r1.json', 'contracts/production/release-profiles/order5-batch3-apw430.v1.json', 'docs/APW511_RUNTIME_UI_REVIEW.md', 'changes/apw511-runtime-ui-r2/index.json', 'changes/apw511-runtime-ui-r2/review/dependencies.json', 'contracts/tw-202610/runtime-implementation-successor.json', 'test/apw511-runtime-ui.test.mjs', 'changes/apw511-runtime-ui-r1/sources/PRODUCT_MASTER.json', 'changes/apw511-runtime-ui-r2/projection.json', 'contracts/production/authority-successors/apw511-runtime-predecessor-profile.v1.json', 'src/catalog/runtime-master/declared-selection-views.mjs', 'src/catalog/runtime-master/product-module-runtime-adapter.mjs', 'scripts/production/domain-runtime-connection-scope.py', 'changes/apw511-runtime-ui-r1/review/flow.json', 'contracts/production/validator-registry.v2.json', 'changes/apw511-runtime-ui-r2/candidates/module.json', 'contracts/production/release-profiles/order5-batch3-thermosl.v1.json', 'src/ui/web/product-configuration-editor.mjs', 'scripts/production/validate-domain-runtime-connection.py', 'src/work-management/domain.mjs', 'changes/apw511-runtime-ui-r1/sources/UI_STANDARD_v2.1.docx', 'contracts/production/release-profiles/order5-batch3-apw431.v1.json', 'changes/apw511-runtime-ui-r2/review/browser-qa.json', 'contracts/production/authority-successors/apw511-runtime-current.v1.json', 'changes/apw511-runtime-ui-r1/review/dependencies.json', 'scripts/production/compile-domain-projection.py', 'docs/APW511_CURRENT_CONNECTION.md', 'scripts/production/validate-domain-runtime-projection.mjs', 'changes/apw511-runtime-ui-r1/candidates/module.json', 'scripts/production/domain-runtime-candidate.py', 'changes/apw511-runtime-ui-r2/sources/PRODUCT_MASTER_MANIFEST.json', 'contracts/production/current-authority-successor.json', 'src/catalog/catalog-resolver.mjs', 'changes/apw511-runtime-ui-r1/projection.json', 'contracts/production/apw511-runtime-connection-scope.v1.json', '.github/workflows/native-formal-storage.yml', 'changes/apw511-runtime-ui-r1/sources/PRODUCT_MASTER_MANIFEST.json'}

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
