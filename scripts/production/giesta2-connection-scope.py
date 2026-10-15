"""Native successor scope; completed publication Work is inspected at its commit."""
import hashlib
import importlib.util
import io
import json
import subprocess
import tarfile
import tempfile
import sys
from pathlib import Path

sys.dont_write_bytecode = True

BASE = '8152f03883430716f520168ff01d60738e4a4b8f'
SCOPE = 'GIESTA2_NATIVE_SHEETS_CONNECTION_20261015_V1'
PATH = 'contracts/production/giesta2-connection-scope.v1.json'
ALLOWED = {
    '.github/workflows/native-sheets-connection.yml',
    'contracts/production/authority-successors/giesta2-current-registry.v1.json',
    'contracts/production/authority-successors/giesta2-predecessor-profile.v1.json',
    'contracts/production/authority-successors/giesta2-predecessor-selection.v1.json',
    'contracts/production/current-authority-successor.json',
    'contracts/production/giesta2-change-profile.v1.json', PATH,
    'contracts/production/release-profile.v1.json',
    'contracts/production/release-profiles/order5-batch3-thermosl.v1.json',
    'contracts/production/release-profiles/order5-batch3-tw.v1.json',
    'contracts/production/release-profiles/order5-batch3-apw430.v1.json',
    'contracts/production/release-profiles/order5-batch3-apw431.v1.json',
    'contracts/production/shared-release-authority.v1.bundle',
    'contracts/production/shared-release-authority.v1.json',
    'contracts/production/validator-registry.v2.json',
    'contracts/production/work-connections.v2.json',
    'docs/GIESTA2_CHANGE_CONNECTION.md',
    'scripts/production/giesta2-connection-scope.py',
    'scripts/production/prepare-sheet-package-change.py',
    'scripts/production/publication-lifecycle-scope.py',
    'scripts/production/sheet-candidate-qa.mjs',
    'scripts/production/sheet-package-change.py',
    'scripts/production/test_sheet_package_change.py',
    'scripts/production/test_publication_lifecycle.py',
    'scripts/production/validate-sheet-package-connection.py',
    'test/101-native-sheets-connection.test.mjs',
}


def digest(value):
    return hashlib.sha256(value).hexdigest()


def baseline(root):
    data = subprocess.check_output(['git','archive',BASE],cwd=root)
    with tarfile.open(fileobj=io.BytesIO(data)) as archive:
        return {m.name:archive.extractfile(m).read() for m in archive if m.isfile()}


def validate(root):
    root = Path(root)
    # A later immutable Work seals and inspects this adopted connection at its
    # actual Main revision instead of reapplying its old whole-repository scope.
    if (root/'contracts/production/native-change-scope.v1.json').exists():
        spec=importlib.util.spec_from_file_location('current_native_scope',root/'scripts/production/native-change-scope.py')
        module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
        return module.validate(root)
    errors = []
    protected = {}
    try:
        before = baseline(root)
        scope = json.loads((root/PATH).read_bytes())
        assert scope['scope_id'] == SCOPE and scope['starting_main'] == BASE, 'SCOPE_IDENTITY'
        assert scope['shared_engine_mutations'] == scope['product_runtime_ui_mutations'] == 0, 'SCOPE_BOUNDARY'
        allowed = set(scope['allowed_paths'])
        assert allowed == ALLOWED, 'UNBOUNDED_ALLOWED_PATHS'
        assert allowed == set(scope['candidate_files_sha256']) | set(scope['cyclic_paths']), 'SCOPE_PIN_SET'
        changed = set(subprocess.check_output(['git','diff','--name-only',BASE],cwd=root,text=True).splitlines())
        changed.update(subprocess.check_output(['git','ls-files','--others','--exclude-standard'],cwd=root,text=True).splitlines())
        assert changed <= allowed, 'UNAUTHORIZED_NATIVE_PATH:' + ','.join(sorted(changed-allowed))
        protected = {p:digest(b) for p,b in before.items() if p not in allowed}
        assert scope['protected_sha256'] == protected, 'INCOMPLETE_PROTECTION'
        for path,expected in {**protected,**scope['candidate_files_sha256']}.items():
            assert (root/path).is_file() and not (root/path).is_symlink() and digest((root/path).read_bytes()) == expected, 'BYTE_DRIFT:'+path
        connection_path='contracts/production/work-connections.v2.json'
        current=json.loads((root/connection_path).read_bytes());old=json.loads(before[connection_path])
        target=scope['product_id']
        assert {k:v for k,v in current.items() if k!='products'} == {k:v for k,v in old.items() if k!='products'}, 'ROUTING_GUARANTEE_CHANGED'
        assert [p for p in current['products'] if p['product_id']!=target] == [p for p in old['products'] if p['product_id']!=target], 'UNRELATED_PRODUCT_CHANGED'
        selected=next(p for p in current['products'] if p['product_id']==target)
        assert selected['connection_state']=='CONNECTED' and selected['default_gate']=='QA_READY', 'TARGET_ADMISSION'
        assert selected['native_adapter']=='scripts/production/sheet-package-change.py', 'NATIVE_ENTRY'
        validator_path='contracts/production/validator-registry.v2.json'
        current_valid=json.loads((root/validator_path).read_bytes());old_valid=json.loads(before[validator_path])
        assert {k:v for k,v in current_valid.items() if k!='products'} == {k:v for k,v in old_valid.items() if k!='products'}, 'UNRELATED_VALIDATOR_CHANGED'
        assert {k:v for k,v in current_valid['products'].items() if k!=target} == {k:v for k,v in old_valid['products'].items() if k!=target}, 'UNRELATED_PRODUCT_VALIDATOR_CHANGED'
        assert (root/'contracts/production/authority-successors/giesta2-predecessor-profile.v1.json').read_bytes() == before['contracts/production/release-profile.v1.json'], 'PREDECESSOR_PROFILE_DRIFT'
        assert (root/'contracts/production/authority-successors/giesta2-predecessor-selection.v1.json').read_bytes() == before['contracts/production/current-authority-successor.json'], 'PREDECESSOR_SELECTION_DRIFT'
        profiles=json.loads(before['contracts/production/release-profiles.v1.json'])['profiles']
        for name in ['contracts/production/release-profile.v1.json']+[p['path'] for p in profiles]:
            profile=json.loads((root/name).read_bytes());previous=json.loads(before[name])
            assert {k:v for k,v in profile.items() if k not in ('shared_contract','native_paths','native_files','publication_policy')} == {k:v for k,v in previous.items() if k not in ('shared_contract','native_paths','native_files','publication_policy')}, 'RELEASE_GUARANTEE_CHANGED:'+name
            assert {k:v for k,v in profile['publication_policy'].items() if k!='protected_files'} == {k:v for k,v in previous['publication_policy'].items() if k!='protected_files'}, 'PUBLICATION_POLICY_CHANGED'
            assert set(previous['native_paths']) <= set(profile['native_paths']), 'NATIVE_COVERAGE_WEAKENED'
            assert set(profile['native_files']) == set(profile['native_paths']), 'NATIVE_QA_PIN_MISSING'
            assert set(previous['shared_contract']['files']) <= set(profile['shared_contract']['files']), 'SHARED_DEPENDENCY_COVERAGE_WEAKENED'
            assert profile['shared_contract']['repository'] == previous['shared_contract']['repository'] and profile['shared_contract']['entry'] == previous['shared_contract']['entry'], 'SHARED_ENTRY_CHANGED'
            assert set(previous['publication_policy']['protected_files']) <= set(profile['publication_policy']['protected_files']), 'PROTECTED_COVERAGE_WEAKENED'
            for path,expected in {**profile['native_files'],**profile['publication_policy']['protected_files']}.items():
                assert digest((root/path).read_bytes())==expected, 'PROFILE_BYTES_DRIFT:'+path
        assert (root/'contracts/production/release-profile.v1.json').read_bytes() == (root/profiles[0]['path']).read_bytes(), 'DEFAULT_PROFILE_DRIFT'
        with tempfile.TemporaryDirectory(prefix='giesta2-publication-inspect-') as folder:
            snapshot=Path(folder)
            subprocess.run(['git','clone','--shared','--no-checkout',str(root),str(snapshot)],check=True,capture_output=True)
            subprocess.run(['git','checkout','--detach',BASE],cwd=snapshot,check=True,capture_output=True)
            spec=importlib.util.spec_from_file_location('completed_publication',snapshot/'scripts/production/publication-lifecycle-scope.py')
            module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
            result=module.validate(snapshot)
            assert result['status']=='PASS', 'COMPLETED_PUBLICATION_INSPECTION:'+str(result['errors'])
    except (AssertionError,OSError,KeyError,ValueError,subprocess.CalledProcessError) as error:
        errors.append(str(error))
    return {'status':'FAIL_CLOSED' if errors else 'PASS','scope':SCOPE,'errors':errors,
            'protected_files':len(protected),'product_runtime_ui_mutations':0 if not errors else 'BLOCKED',
            'completed_work':'INSPECT_ONLY','deployment':'NOT_EXECUTED'}


if __name__=='__main__':
    import sys
    result=validate(Path(__file__).resolve().parents[2]);print(json.dumps(result));sys.exit(0 if result['status']=='PASS' else 2)
