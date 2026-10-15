"""Exact native infrastructure successor guard; Shared owns Work and publication."""
import hashlib
import io
import json
import subprocess
import tarfile
from pathlib import Path

BASE = 'fe6c87c1169c407bfd8a286aed19262592a29760'
SCOPE = 'SASH_PUBLICATION_LIFECYCLE_20261014_V1'
PROFILE = 'contracts/production/release-profile.v1.json'
REGISTRY = 'contracts/production/release-profiles.v1.json'
SCOPE_PATH = 'contracts/production/publication-lifecycle-scope.v1.json'
ALLOWED = {
    '.github/workflows/common-release-contract.yml',
    '.github/workflows/ew-output-successor.yml',
    '.github/workflows/new-product-actual-build.yml',
    'contracts/production/authority-successors/publication-lifecycle-predecessor-profile.v1.json',
    'contracts/production/authority-successors/publication-lifecycle-predecessor-selection.v1.json',
    'contracts/production/authority-successors/publication-lifecycle-predecessor-build-profile.v1.json',
    'contracts/production/authority-successors/publication-lifecycle.v1.json',
    'contracts/production/current-authority-successor.json',
    'contracts/production/current-architecture.json',
    'contracts/production/work-connections.v2.json',
    'contracts/production/product-master-build-profile.v1.json',
    'contracts/production/publication-lifecycle.v1.json', SCOPE_PATH, PROFILE, REGISTRY,
    'contracts/production/release-profiles/order5-batch3-thermosl.v1.json',
    'contracts/production/release-profiles/order5-batch3-tw.v1.json',
    'contracts/production/release-profiles/order5-batch3-apw430.v1.json',
    'contracts/production/release-profiles/order5-batch3-apw431.v1.json',
    'contracts/production/shared-release-authority.v1.bundle',
    'contracts/production/shared-release-authority.v1.json',
    'docs/PUBLICATION_LIFECYCLE.md',
    'scripts/production/publication-lifecycle.mjs',
    'scripts/production/publication-lifecycle-qa.mjs',
    'scripts/production/protected-qa-access.mjs',
    'scripts/production/verify-app-release.mjs',
    'scripts/production/publication-lifecycle-scope.py',
    'scripts/production/prepare-publication-lifecycle.py',
    'scripts/production/release-batch.py',
    'scripts/production/unpack-build-authority.py',
    'scripts/production/unpack-release-authority.py',
    'scripts/production/validate-order4-release.py',
    'scripts/production/validate-order5-release.py',
    'scripts/production/test_publication_lifecycle.py',
    'test/browser/eight-series-business-flow-qa.mjs',
    'test/protected-qa-access.test.mjs',
}
CYCLIC = {SCOPE_PATH, PROFILE, 'contracts/production/current-authority-successor.json',
          'contracts/production/authority-successors/publication-lifecycle.v1.json',
          'contracts/production/release-profiles/order5-batch3-thermosl.v1.json',
          'contracts/production/release-profiles/order5-batch3-tw.v1.json',
          'contracts/production/release-profiles/order5-batch3-apw430.v1.json',
          'contracts/production/release-profiles/order5-batch3-apw431.v1.json'}


def digest(value):
    return hashlib.sha256(value).hexdigest()


def baseline(root):
    archive = subprocess.check_output(['git', 'archive', BASE], cwd=root)
    with tarfile.open(fileobj=io.BytesIO(archive)) as source:
        return {member.name: source.extractfile(member).read() for member in source if member.isfile()}


def validate(root):
    if (Path(root)/'contracts/production/new-product-environment-scope.v1.json').exists():
        import importlib.util
        shared = Path(root)/'scripts/production'
        spec = importlib.util.spec_from_file_location('new_product_native_scope', shared/'new-product-environment-scope.py')
        module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
        return module.validate(root)
    root = Path(root)
    errors = []
    protected = {}
    try:
        before = baseline(root)
        scope = json.loads((root / SCOPE_PATH).read_bytes())
        assert scope['schema'] == 'NATIVE_PUBLICATION_LIFECYCLE_SCOPE_V1', 'SCOPE_SCHEMA'
        assert scope['scope_id'] == SCOPE and scope['starting_main'] == BASE, 'SCOPE_IDENTITY'
        assert scope['product_fact_mutation_allowed'] is False, 'PRODUCT_MUTATION_NOT_AUTHORIZED'
        assert set(scope['allowed_paths']) == ALLOWED, 'UNBOUNDED_ALLOWED_PATHS'
        protected = {path: digest(value) for path, value in before.items() if path not in ALLOWED}
        assert scope['protected_sha256'] == protected, 'INCOMPLETE_NATIVE_PROTECTION'
        for path, expected in protected.items():
            file = root / path
            assert file.is_file() and not file.is_symlink() and digest(file.read_bytes()) == expected, 'PROTECTED_DRIFT:' + path
        changed = set(subprocess.check_output(['git', 'diff', '--name-only', BASE], cwd=root, text=True).splitlines())
        changed.update(subprocess.check_output(['git', 'ls-files', '--others', '--exclude-standard'], cwd=root, text=True).splitlines())
        assert changed <= ALLOWED, 'UNAUTHORIZED_NATIVE_PATH:' + ','.join(sorted(changed - ALLOWED))
        assert set(scope['candidate_files_sha256']) == ALLOWED - CYCLIC, 'CANDIDATE_PIN_SET'
        for path, expected in scope['candidate_files_sha256'].items():
            file = root / path
            assert file.is_file() and not file.is_symlink() and digest(file.read_bytes()) == expected, 'CANDIDATE_BYTES_DRIFT:' + path
        original = json.loads(before[PROFILE])
        registry = json.loads((root / REGISTRY).read_bytes())
        assert registry == json.loads(before[REGISTRY]), 'PRODUCT_SCOPE_REGISTRY_CHANGED'
        config = json.loads((root / 'contracts/production/publication-lifecycle.v1.json').read_bytes())
        assert config['repository'] == original['repository'] and config['target_gate'] == 'RELEASE_COMPLETED', 'LIFECYCLE_CONFIG'
        pointer = json.loads((root / 'contracts/production/current-architecture.json').read_bytes())
        prior_pointer = json.loads(before['contracts/production/current-architecture.json'])
        assert {key: value for key, value in pointer.items() if key not in ('shared_router_files', 'new_product_build_profile')} == {key: value for key, value in prior_pointer.items() if key not in ('shared_router_files', 'new_product_build_profile')}, 'ARCHITECTURE_AXIS_CHANGED'
        assert {key: value for key, value in pointer['shared_router_files'].items() if key != 'harness/architecture.py'} == {key: value for key, value in prior_pointer['shared_router_files'].items() if key != 'harness/architecture.py'}, 'UNRELATED_ROUTER_PIN_CHANGED'
        build_path = 'contracts/production/product-master-build-profile.v1.json'
        build = json.loads((root / build_path).read_bytes())
        prior_build = json.loads(before[build_path])
        expected_build = json.loads(before[build_path])
        expected_build['refs']['current_authority']['sha256'] = build['refs']['current_authority']['sha256']
        assert build == expected_build, 'BUILD_PROFILE_GUARANTEE_CHANGED'
        assert (root / 'contracts/production/authority-successors/publication-lifecycle-predecessor-build-profile.v1.json').read_bytes() == before[build_path], 'PREDECESSOR_BUILD_PROFILE_DRIFT'
        expected_entry = {**prior_pointer['new_product_build_profile'], 'sha256': digest((root / build_path).read_bytes())}
        assert pointer['new_product_build_profile'] == expected_entry, 'BUILD_PROFILE_POINTER_DRIFT'
        connections_path = 'contracts/production/work-connections.v2.json'
        connections = json.loads((root / connections_path).read_bytes())
        expected_connections = json.loads(before[connections_path])
        expected_connections['new_product_build_profile'] = expected_entry
        assert connections == expected_connections, 'UNRELATED_CONNECTION_CHANGED'
        assert (root / 'contracts/production/authority-successors/publication-lifecycle-predecessor-profile.v1.json').read_bytes() == before[PROFILE], 'PREDECESSOR_PROFILE_DRIFT'
        assert (root / 'contracts/production/authority-successors/publication-lifecycle-predecessor-selection.v1.json').read_bytes() == before['contracts/production/current-authority-successor.json'], 'PREDECESSOR_SELECTION_DRIFT'
        for entry in registry['profiles']:
            profile = json.loads((root / entry['path']).read_bytes())
            old = json.loads(before[entry['path']])
            mutable = {'shared_contract', 'native_paths', 'native_files', 'publication_policy', 'lifecycle', 'qa_command', 'required_ci'}
            assert {key: value for key, value in profile.items() if key not in mutable} == {key: value for key, value in old.items() if key not in mutable}, 'RELEASE_GUARANTEE_CHANGED'
            assert set(profile['required_ci']) >= set(old['required_ci']), 'CI_WEAKENED'
            assert pointer['shared_router_files']['harness/architecture.py'] == profile['shared_contract']['files']['harness/architecture.py'], 'ROUTER_IMPLEMENTATION_PIN_MISMATCH'
            assert build['refs']['current_authority']['sha256'] == profile['shared_contract']['files']['harness/current_authority.py'], 'BUILD_AUTHORITY_IMPLEMENTATION_PIN_MISMATCH'
            assert profile['lifecycle'] == {'mode': 'EXISTING_V2_RELEASE_LIFECYCLE_V1', 'entry': 'scripts/production/publication-lifecycle.mjs', 'configuration': 'contracts/production/publication-lifecycle.v1.json', 'storage_destination': {'provider': 'GOOGLE_DRIVE', 'parent_id': '1l8BoCcT-rTh8x9vdpkO7gf1c0C7cKEmx'}, 'shared_entry': 'scripts/release-provider-host.mjs'}, 'LIFECYCLE_ENTRY'
            assert config['qa_command'] == ['node', 'scripts/production/publication-lifecycle-qa.mjs', '--profile', '{profile}', '--url', '{url}', '--expect-commit', '{sha}', '--output-dir', '{output}'], 'NATIVE_QA_COMMAND_NOT_BOUND'
            assert profile['qa_command'] == 'node scripts/production/publication-lifecycle-qa.mjs --profile PROFILE --url URL --expect-commit SHA --output-dir EVIDENCE', 'QA_COMMAND_MISMATCH'
            assert {key: value for key, value in profile['publication_policy'].items() if key != 'protected_files'} == {key: value for key, value in old['publication_policy'].items() if key != 'protected_files'}, 'PUBLICATION_GUARANTEE_CHANGED'
            assert set(old['publication_policy']['protected_files']) <= set(profile['publication_policy']['protected_files']), 'PUBLICATION_PROTECTION_REMOVED'
            assert set(profile['native_files']) == set(profile['native_paths']) and set(old['native_paths']) <= set(profile['native_paths']), 'NATIVE_DEPENDENCY_COVERAGE'
            for path, expected in profile['native_files'].items():
                assert digest((root / path).read_bytes()) == expected, 'NATIVE_BYTES_DRIFT:' + path
        assert (root / PROFILE).read_bytes() == (root / registry['profiles'][0]['path']).read_bytes(), 'DEFAULT_PROFILE_DRIFT'
    except (AssertionError, OSError, KeyError, ValueError, subprocess.CalledProcessError) as error:
        errors.append(str(error))
    return {'status': 'FAIL_CLOSED' if errors else 'PASS', 'scope': SCOPE, 'errors': errors,
            'protected_files': len(protected), 'product_runtime_ui_mutations': 0 if not errors else 'BLOCKED',
            'completed_work': 'INSPECT_ONLY', 'deployment': 'NOT_EXECUTED'}


if __name__ == '__main__':
    import sys
    result = validate(Path(__file__).resolve().parents[2])
    print(json.dumps(result))
    sys.exit(0 if result['status'] == 'PASS' else 2)
