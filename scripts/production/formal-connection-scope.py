"""Reuse the adopted immutable native scope guard for this Formal connection."""
import hashlib
import importlib.util
import json
from pathlib import Path

PATH = 'contracts/production/giesta2-formal-scope.v1.json'
BASE = '5cca65e07e4a8051173dcd2862f145d5a5ff2553'
FIXED = {
    PATH, '.github/workflows/native-formal-storage.yml',
    'contracts/production/giesta2-formal-profile.v1.json',
    'contracts/production/current-authority-successor.json',
    'contracts/production/authority-successors/giesta2-formal-current.v1.json',
    'contracts/production/authority-successors/giesta2-formal-predecessor-profile.v1.json',
    'contracts/production/authority-successors/giesta2-formal-predecessor-selection.v1.json',
    'contracts/production/release-profile.v1.json',
    'contracts/production/work-connections.v2.json',
    'contracts/production/validator-registry.v2.json',
    'scripts/production/prepare-sheet-package-change.py',
    'scripts/production/prepare-sheet-package-formal.py',
    'scripts/production/sheet-package-formal.py',
    'scripts/production/validate-sheet-package-connection.py',
    'scripts/production/formal-connection-scope.py',
    'scripts/production/instruction-scope.py',
    'scripts/production/native-change-scope.py',
    'scripts/production/test_instruction_scope.py',
    'scripts/production/test_sheet_package_formal.py',
    'docs/GIESTA2_FORMAL_CONNECTION.md',
}


def validate(root):
    root = Path(root)
    definition = importlib.util.spec_from_file_location('adopted_native_scope', root/'scripts/production/native-change-scope.py')
    guard = importlib.util.module_from_spec(definition); definition.loader.exec_module(guard)
    guard.SCOPE_PATH = PATH
    result = guard.validate(root)
    if result['status'] != 'PASS': return result
    try:
        before = guard.snapshot(root, BASE)
        s = json.loads((root/PATH).read_bytes())
        profiles = [p['path'] for p in json.loads(before['contracts/production/release-profiles.v1.json'])['profiles']]
        assert s['baseline_commit'] == BASE and set(s['allowed_paths']) == FIXED | set(profiles), 'SCOPE_EXPANSION'
        target = 'NATIVE_REGISTRY:LIXIL::ジエスタ2'
        for file in ('work-connections.v2.json', 'validator-registry.v2.json'):
            old = json.loads(before['contracts/production/'+file])
            new = json.loads((root/'contracts/production'/file).read_bytes())
            assert {k:v for k,v in old.items() if k!='products'} == {k:v for k,v in new.items() if k!='products'}, 'ROUTING_CHANGED'
            if isinstance(old['products'], list):
                assert [p for p in old['products'] if p['product_id']!=target] == [p for p in new['products'] if p['product_id']!=target], 'UNRELATED_PRODUCT_CHANGED'
                selected = next(p for p in new['products'] if p['product_id']==target)
                prior = next(p for p in old['products'] if p['product_id']==target)
                assert {k:v for k,v in selected.items() if k!='formal_profile'} == prior, 'QA_READY_CONNECTION_CHANGED'
            else:
                assert {k:v for k,v in old['products'].items() if k!=target} == {k:v for k,v in new['products'].items() if k!=target}, 'UNRELATED_VALIDATOR_CHANGED'
                assert {k:v for k,v in new['products'][target].items() if k!='formal_profile'} == old['products'][target], 'QA_READY_VALIDATOR_CHANGED'
        for name in ['contracts/production/release-profile.v1.json']+profiles:
            old = json.loads(before[name]); new = json.loads((root/name).read_bytes())
            assert {k:v for k,v in old.items() if k not in ('native_paths','native_files','publication_policy')} == {k:v for k,v in new.items() if k not in ('native_paths','native_files','publication_policy')}, 'RELEASE_GUARANTEE_CHANGED'
            assert {k:v for k,v in old['publication_policy'].items() if k!='protected_files'} == {k:v for k,v in new['publication_policy'].items() if k!='protected_files'}, 'PUBLICATION_POLICY_CHANGED'
            assert set(old['native_paths']) <= set(new['native_paths']) == set(new['native_files']), 'NATIVE_PIN_COVERAGE'
            assert set(old['publication_policy']['protected_files']) <= set(new['publication_policy']['protected_files']), 'PROTECTED_COVERAGE'
            for path, expected in {**new['native_files'], **new['publication_policy']['protected_files']}.items():
                assert hashlib.sha256((root/path).read_bytes()).hexdigest() == expected, 'PROFILE_BYTES_DRIFT:'+path
        return {**result, 'scope': 'GIESTA2_MASTER_FORMAL_CONNECTION_V1', 'prior_qa_ready': 'UNCHANGED',
                'formal_before_human': 0, 'runtime_ui_release': 'NOT_EXECUTED'}
    except (AssertionError, OSError, KeyError, ValueError) as error:
        return {'status': 'FAIL_CLOSED', 'errors': [str(error)]}


if __name__ == '__main__':
    import sys
    result = validate(Path(__file__).resolve().parents[2])
    print(json.dumps(result)); sys.exit(0 if result['status']=='PASS' else 2)
