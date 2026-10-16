"""Reuse the existing immutable guard; inspect completed Formal work at its seal."""
import importlib.util
import json
from pathlib import Path

PATH='contracts/production/domain-runtime-candidate-scope.v1.json'
BASE='0609b2eb44ecd4d2e6c2b8f9eff89eb92d1bcb8a'
FIXED={
    PATH,'.github/workflows/native-formal-storage.yml',
    'contracts/production/work-connections.v2.json','contracts/production/validator-registry.v2.json',
    'contracts/production/runtime-candidates/doorremo-nonfire-r1.profile.json',
    'contracts/production/current-authority-successor.json','contracts/production/release-profile.v1.json',
    'contracts/production/authority-successors/doorremo-runtime-current.v1.json',
    'contracts/production/authority-successors/doorremo-runtime-predecessor-profile.v1.json',
    'contracts/production/authority-successors/doorremo-runtime-predecessor-selection.v1.json',
    'scripts/production/native-change-scope.py','scripts/production/formal-connection-scope.py',
    'scripts/production/domain-runtime-connection-scope.py','scripts/production/compile-domain-projection.py',
    'scripts/production/domain-runtime-candidate.py','scripts/production/prepare-domain-runtime-candidate.py',
    'scripts/production/validate-domain-runtime-connection.py','scripts/production/validate-domain-runtime-projection.mjs',
    'src/catalog/resolver-fields.mjs','src/catalog/runtime-master/composed-product-runtime-adapter.mjs',
    'src/catalog/runtime-master/declared-selection-views.mjs','src/work-management/domain.mjs','src/estimate-output/model.mjs',
    'src/server/candidate-runtime-preview.mjs',
    'test/domain-runtime-projection.test.mjs','test/browser/declared-sales-runtime-browser-qa.mjs',
    'docs/DOORREMO_RUNTIME_UI_CANDIDATE.md',
    'scripts/build-composed-candidate-review-preview.mjs','scripts/verify-tw-202610-adoption.mjs',
    'contracts/tw-202610/runtime-implementation-successor.json',
    'changes/doorremo-runtime-ui-r1/candidates/module.json','changes/doorremo-runtime-ui-r1/index.json',
    'changes/doorremo-runtime-ui-r1/projection.json','changes/doorremo-runtime-ui-r1/review/browser-qa.json',
    'changes/doorremo-runtime-ui-r1/review/flow.json','changes/doorremo-runtime-ui-r1/review/formal-provenance.json',
    'changes/doorremo-runtime-ui-r1/sources/PRODUCT_MASTER.json','changes/doorremo-runtime-ui-r1/sources/UI_STANDARD_v2.1.docx',
}


def validate(root):
    if (root/'contracts/production/apw511-publication-scope.v1.json').exists():
        definition=importlib.util.spec_from_file_location('apw511_publication_scope',root/'scripts/production/apw511-publication-scope.py')
        module=importlib.util.module_from_spec(definition);definition.loader.exec_module(module)
        return module.validate(root)
    root=Path(root)
    if (root/'contracts/production/apw511-full-coverage-scope.v1.json').exists():
        definition=importlib.util.spec_from_file_location('runtime_full_coverage_scope',root/'scripts/production/runtime-full-coverage-scope.py')
        module=importlib.util.module_from_spec(definition);definition.loader.exec_module(module)
        return module.validate(root)
    if (root/'contracts/production/apw511-r3-ui-adoption-scope.v1.json').exists():
        definition=importlib.util.spec_from_file_location('runtime_ui_adoption_scope',root/'scripts/production/runtime-ui-adoption-scope.py')
        module=importlib.util.module_from_spec(definition);definition.loader.exec_module(module)
        return module.validate(root)
    if (root/'contracts/production/apw511-runtime-connection-scope.v1.json').exists():
        definition=importlib.util.spec_from_file_location('apw511_connection_scope',root/'scripts/production/apw511-runtime-connection-scope.py')
        module=importlib.util.module_from_spec(definition);definition.loader.exec_module(module)
        return module.validate(root)
    definition=importlib.util.spec_from_file_location('immutable_scope',root/'scripts/production/native-change-scope.py')
    guard=importlib.util.module_from_spec(definition);definition.loader.exec_module(guard);guard.SCOPE_PATH=PATH
    result=guard.validate(root)
    if result['status']!='PASS':return result
    try:
        before=guard.snapshot(root,BASE);scope=json.loads((root/PATH).read_bytes())
        profiles={p['path'] for p in json.loads(before['contracts/production/release-profiles.v1.json'])['profiles']}
        assert scope['baseline_commit']==BASE and set(scope['allowed_paths'])==FIXED|profiles,'SCOPE_EXPANSION'
        profile=json.loads((root/'contracts/production/runtime-candidates/doorremo-nonfire-r1.profile.json').read_bytes())
        target=profile['product_id']
        for name in ('work-connections.v2.json','validator-registry.v2.json'):
            old=json.loads(before['contracts/production/'+name]);new=json.loads((root/'contracts/production'/name).read_bytes())
            assert {k:v for k,v in old.items() if k!='products'}=={k:v for k,v in new.items() if k!='products'},'ROUTING_CHANGED'
            if isinstance(old['products'],list):
                assert [x for x in old['products'] if x['product_id']!=target]==[x for x in new['products'] if x['product_id']!=target],'OTHER_PRODUCT_CHANGED'
                prior=next(x for x in old['products'] if x['product_id']==target);selected=next(x for x in new['products'] if x['product_id']==target)
            else:
                assert {k:v for k,v in old['products'].items() if k!=target}=={k:v for k,v in new['products'].items() if k!=target},'OTHER_VALIDATOR_CHANGED'
                prior=old['products'][target];selected=new['products'][target]
            assert {k:v for k,v in selected.items() if k!='runtime_candidate_profile'}==prior,'EXISTING_PRODUCT_WORK_CHANGED'
        for name in {'contracts/production/release-profile.v1.json'}|profiles:
            old=json.loads(before[name]);new=json.loads((root/name).read_bytes())
            assert {k:v for k,v in old.items() if k not in ('native_paths','native_files','publication_policy')}=={k:v for k,v in new.items() if k not in ('native_paths','native_files','publication_policy')},'RELEASE_GUARANTEE_CHANGED'
            assert {k:v for k,v in old['publication_policy'].items() if k!='protected_files'}=={k:v for k,v in new['publication_policy'].items() if k!='protected_files'},'PUBLICATION_CHANGED'
            assert set(old['native_paths'])<=set(new['native_paths'])==set(new['native_files']),'PIN_COVERAGE'
            assert set(old['publication_policy']['protected_files'])<=set(new['publication_policy']['protected_files']),'PROTECTION_SHRANK'
        return {**result,'scope':'DOMAIN_RUNTIME_CANDIDATE_ONLY','formal_work':'INSPECT_ONLY','formal_adoption':False,'release':False}
    except (AssertionError,OSError,ValueError,KeyError) as error:return dict(status='FAIL_CLOSED',errors=[str(error)])


if __name__=='__main__':
    import sys
    result=validate(Path(__file__).resolve().parents[2]);print(json.dumps(result));sys.exit(0 if result['status']=='PASS' else 2)
