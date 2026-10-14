"""Prepare one reviewable native infrastructure successor from immutable Git inputs."""
import argparse
import importlib.util
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('lifecycle_scope', ROOT / 'scripts/production/publication-lifecycle-scope.py')
guard = importlib.util.module_from_spec(spec)
spec.loader.exec_module(guard)


def write(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--central', required=True)
    parser.add_argument('--shared-ref', required=True)
    args = parser.parse_args()
    central = Path(args.central).resolve()
    actual = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=central, text=True).strip()
    assert actual == args.shared_ref and len(actual) == 40, 'FIXED_SHARED_IMPLEMENTATION_REQUIRED'
    assert not subprocess.check_output(['git', 'status', '--porcelain'], cwd=central).strip(), 'COMMIT_SHARED_IMPLEMENTATION_FIRST'
    before = guard.baseline(ROOT)
    authority = ROOT / 'contracts/production/authority-successors'
    profile_snapshot = authority / 'publication-lifecycle-predecessor-profile.v1.json'
    selection_snapshot = authority / 'publication-lifecycle-predecessor-selection.v1.json'
    profile_snapshot.write_bytes(before[guard.PROFILE])
    selection_snapshot.write_bytes(before['contracts/production/current-authority-successor.json'])
    original = json.loads(before[guard.PROFILE])
    shared_files = set(original['shared_contract']['files']) | {'schemas/ci-impact.v1.schema.json', 'scripts/release-lifecycle-cli.mjs', 'harness/architecture.py'}
    for name in shared_files:
        assert (central / name).read_bytes() == subprocess.check_output(['git', 'show', actual + ':' + name], cwd=central), 'UNCOMMITTED_SHARED_BYTES:' + name
    carrier = ROOT / 'contracts/production/shared-release-authority.v1.bundle'
    if carrier.exists():
        carrier.unlink()
    # Git's bundle head table requires a symbolic ref; HEAD was checked against
    # the fixed implementation above and is verified again after creation.
    subprocess.check_call(['git', 'bundle', 'create', str(carrier), 'HEAD'], cwd=central)
    heads = subprocess.check_output(['git', 'bundle', 'list-heads', str(carrier)], cwd=central, text=True)
    assert heads.split()[0] == actual, 'SHARED_BUNDLE_HEAD_CHANGED'
    metadata = json.loads(before['contracts/production/shared-release-authority.v1.json'])
    metadata['source_commit'] = actual
    metadata['sha256'] = guard.digest(carrier.read_bytes())
    metadata['bytes'] = carrier.stat().st_size
    write(ROOT / 'contracts/production/shared-release-authority.v1.json', metadata)
    pointer = json.loads(before['contracts/production/current-architecture.json'])
    pointer['shared_router_files']['harness/architecture.py'] = guard.digest((central / 'harness/architecture.py').read_bytes())
    write(ROOT / 'contracts/production/current-architecture.json', pointer)
    paths = set(original['native_paths']) | (guard.ALLOWED - guard.CYCLIC)
    native_files = {name: guard.digest((ROOT / name).read_bytes()) for name in sorted(paths)}
    protected = {name: guard.digest((ROOT / name).read_bytes()) for name in original['publication_policy']['protected_files']}
    protected.update({name: guard.digest(value) for name, value in before.items() if name not in guard.ALLOWED})
    registry = json.loads(before[guard.REGISTRY])
    for entry in registry['profiles']:
        profile = json.loads(before[entry['path']])
        profile['shared_contract'] = {**profile['shared_contract'], 'ref': actual,
                                      'files': {name: guard.digest((central / name).read_bytes()) for name in sorted(shared_files)}}
        profile['native_paths'] = sorted(paths)
        profile['native_files'] = native_files
        profile['publication_policy']['protected_files'] = protected
        profile['qa_command'] = 'node scripts/production/publication-lifecycle-qa.mjs --profile PROFILE --url URL --expect-commit SHA --output-dir EVIDENCE'
        profile['lifecycle'] = {'mode': 'EXISTING_V2_RELEASE_LIFECYCLE_V1',
                                'entry': 'scripts/production/publication-lifecycle.mjs',
                                'configuration': 'contracts/production/publication-lifecycle.v1.json',
                                'storage_destination': {'provider': 'GOOGLE_DRIVE', 'parent_id': '1l8BoCcT-rTh8x9vdpkO7gf1c0C7cKEmx'},
                                'shared_entry': 'scripts/release-provider-host.mjs'}
        write(ROOT / entry['path'], profile)
    (ROOT / guard.PROFILE).write_bytes((ROOT / registry['profiles'][0]['path']).read_bytes())
    sys.path.insert(0, str(central))
    from harness.current_authority import lifecycle_successor_contract, compatibility
    predecessor_profile = {'path': profile_snapshot.relative_to(ROOT).as_posix(), 'sha256': guard.digest(profile_snapshot.read_bytes())}
    predecessor_selection = {'path': selection_snapshot.relative_to(ROOT).as_posix(), 'sha256': guard.digest(selection_snapshot.read_bytes())}
    record_path = authority / 'publication-lifecycle.v1.json'
    record = lifecycle_successor_contract(central, ROOT, actual, guard.BASE, predecessor_profile, predecessor_selection)
    write(record_path, record)
    write(ROOT / 'contracts/production/current-authority-successor.json',
          {'schema': 'CURRENT_AUTHORITY_SUCCESSOR_SELECTION_V1', 'path': record_path.relative_to(ROOT).as_posix(),
           'sha256': guard.digest(record_path.read_bytes()), 'implementation_sha': actual})
    write(ROOT / guard.SCOPE_PATH, {'schema': 'NATIVE_PUBLICATION_LIFECYCLE_SCOPE_V1', 'scope_id': guard.SCOPE,
                                  'starting_main': guard.BASE, 'product_fact_mutation_allowed': False,
                                  'allowed_paths': sorted(guard.ALLOWED),
                                  'protected_sha256': {name: guard.digest(value) for name, value in before.items() if name not in guard.ALLOWED},
                                  'candidate_files_sha256': {name: guard.digest((ROOT / name).read_bytes()) for name in sorted(guard.ALLOWED - guard.CYCLIC)}})
    checked = guard.validate(ROOT)
    assert checked['status'] == 'PASS', checked
    compatible = compatibility(central, ROOT)
    assert compatible['status'] == 'PASS', compatible
    print(json.dumps({'status': 'PREPARED_NOT_ADOPTED', 'shared_ref': actual, 'scope_validation': checked,
                      'compatibility': compatible, 'deployment': 'NOT_EXECUTED', 'human_decision': 'NOT_ISSUED'}))


if __name__ == '__main__':
    main()
