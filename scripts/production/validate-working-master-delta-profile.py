"""Validate a scoped native delta-reader registration, never product acceptance."""
import hashlib
import importlib.util
import json
from pathlib import Path


def check(condition, reason):
    if not condition:
        raise ValueError(reason)


def owned(root, name):
    relative = Path(name)
    path = root / relative
    check(not relative.is_absolute() and '..' not in relative.parts
          and path.resolve().is_relative_to(root) and path.is_file() and not path.is_symlink(),
          'PROFILE_PATH:' + str(name))
    return path


def validate(root, profile_relative, verify_scope=True):
    root = Path(root).resolve()
    try:
        read = lambda name: json.loads(owned(root, name).read_text())
        digest = lambda name: hashlib.sha256(owned(root, name).read_bytes()).hexdigest()
        profile = read(profile_relative)
        check(profile['status'] == 'ADOPTED' and profile['scope'] == 'STRUCTURAL_DRAFT_RECOVERY_ONLY'
              and profile['target_gate'] == 'WORKING_STRUCTURE_VERIFIED'
              and profile['mutation_policy'] == 'CANDIDATE_ONLY; no Registry/Formal/Runtime/UI/Release writes',
              'PROFILE_SCOPE')
        config = read('contracts/production/work-connections.v2.json')
        matches = [r for r in config['products'] if r['product_id'] == profile['product_id']]
        check(len(matches) == 1, 'PROFILE_PRODUCT')
        row = matches[0]
        entry = row['build_profile']
        check(entry == {'profile_id': profile['profile_id'], 'path': profile_relative,
                        'sha256': digest(profile_relative)}, 'PROFILE_HASH')
        check(row['repository'] == profile['repository'] and row['connection_state'] == 'CONNECTED'
              and row['connection_scope'] == profile['scope'] and row['default_gate'] == profile['target_gate']
              and row['native_adapter'] == profile['native_adapter'] and row['prepare_adapter'] == profile['native_prepare'],
              'CONNECTION_SCOPE')
        check(set(row['unsupported_gates']) == {'QA_READY', 'FORMAL', 'INTEGRATION', 'RELEASE'}
              and not any(k in row for k in ('formal_profile', 'runtime_ui_profile', 'runtime_candidate_profile',
                                            'runtime_ui_adoption_profile', 'release_profile')), 'GATE_EXPANSION')
        check(row['current_working_version'] == profile['source_revision']
              and row['baseline_selector'] == {'registry_id': profile['registry_id'],
                  'manufacturer': profile['manufacturer'], 'series': profile['registry_series'],
                  'state': 'WORKING_ATOMIC_RECOVERY', 'package_version': profile['source_revision']}, 'BASELINE_SCOPE')
        registry = read('contracts/production/validator-registry.v2.json')['products'][profile['product_id']]
        check(registry['state'] == 'READY' and registry['scope'] == profile['scope']
              and registry['no_fallback'] is True and registry['native_profile'] == entry
              and registry['validators'] == row['validators'], 'VALIDATOR_SCOPE')
        check(profile['native_adapter'] in profile['implementation_hashes']
              and profile['native_prepare'] in profile['implementation_hashes'], 'IMPLEMENTATION_INVENTORY')
        for name, expected in profile['implementation_hashes'].items():
            check(digest(name) == expected, 'IMPLEMENTATION_HASH:' + name)
        owned(root, profile['native_adapter'])
        owned(root, profile['native_prepare'])
        for name in row['validators']:
            owned(root, name)
        check(profile['predecessor']['required_tables']
              and len(set(profile['predecessor']['required_tables'])) == len(profile['predecessor']['required_tables'])
              and profile['delta_sheets'] and profile['working_states'], 'TABLE_INVENTORY')
        if verify_scope:
            spec = importlib.util.spec_from_file_location('scope_guard', root / 'scripts/production/native-change-scope.py')
            guard = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(guard)
            guard.SCOPE_PATH = profile['native_change_scope']
            result = guard.validate(root)
            check(result['status'] == 'PASS', 'NATIVE_CHANGE_SCOPE:' + json.dumps(result))
            scope = read(profile['native_change_scope'])
            before = json.loads(guard.snapshot(root, scope['baseline_commit'])['contracts/production/work-connections.v2.json'])
            old_validators = json.loads(guard.snapshot(root, scope['baseline_commit'])['contracts/production/validator-registry.v2.json'])
            check({k:v for k,v in config.items() if k != 'products'} == {k:v for k,v in before.items() if k != 'products'}
                  and [r for r in config['products'] if r['product_id'] != profile['product_id']]
                  == [r for r in before['products'] if r['product_id'] != profile['product_id']], 'UNRELATED_CONNECTION')
            current_validators = read('contracts/production/validator-registry.v2.json')
            check({k:v for k,v in current_validators.items() if k != 'products'}
                  == {k:v for k,v in old_validators.items() if k != 'products'}
                  and {k:v for k,v in current_validators['products'].items() if k != profile['product_id']}
                  == {k:v for k,v in old_validators['products'].items() if k != profile['product_id']}, 'UNRELATED_VALIDATOR')
        return {'status': 'PASS', 'scope': profile['scope'], 'product_id': profile['product_id'],
                'profile_admission_only': True, 'product_qa': False, 'formal': False, 'release': False}
    except (ValueError, KeyError, TypeError, OSError) as error:
        return {'status': 'FAIL_CLOSED', 'reason': str(error), 'product_qa': False, 'formal': False}


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--checkout', required=True)
    parser.add_argument('--profile', required=True)
    args = parser.parse_args()
    result = validate(args.checkout, args.profile)
    print(json.dumps(result, ensure_ascii=False))
    raise SystemExit(0 if result['status'] == 'PASS' else 2)
