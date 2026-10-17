#!/usr/bin/env python3
"""Native Runtime/UI admission wrapper; Shared v2 owns execution and save."""
import argparse
import hashlib
import json
import subprocess
import sys
from pathlib import Path


def main():
    parser = argparse.ArgumentParser()
    for name in ('central', 'checkout', 'profile', 'repositories', 'instruction',
                 'spec', 'work', 'live-state', 'root'):
        parser.add_argument('--' + name, required=True)
    parser.add_argument('--resume', action='store_true')
    args = parser.parse_args()
    central = Path(args.central).resolve()
    checkout = Path(args.checkout).resolve()
    profile_path = Path(args.profile).resolve()
    profile_bytes = profile_path.read_bytes()
    profile = json.loads(profile_bytes)
    route = subprocess.run(
        [sys.executable, str(central/'scripts/architecture-work.py'), 'route',
         '--repositories', args.repositories, '--selected-product',
         profile['product_id'], '--instruction', args.instruction],
        capture_output=True, text=True)
    print(route.stdout, end='')
    print(route.stderr, end='', file=sys.stderr)
    if route.returncode:
        return route.returncode
    try:
        resolved = json.loads(route.stdout)
        spec = json.loads(Path(args.spec).read_bytes())
        expected_profile = {'path': profile_path.relative_to(checkout).as_posix(),
                            'sha256': hashlib.sha256(profile_bytes).hexdigest()}
        assert profile['schema'] == 'NATIVE_RUNTIME_UI_ADOPTION_PROFILE_V1'
        assert resolved['product_id'] == profile['product_id']
        assert resolved['native_ui_adoption_profile'] == expected_profile
        assert resolved['target_gate'] == profile['target_gate'] == 'RUNTIME_UI_ADOPTED'
        assert resolved['native_adapter'] == 'scripts/production/runtime-ui-adoption-work.py'
        assert spec['target'] == profile['product_id']
        assert spec['target_gate'] == profile['target_gate']
        assert any(ref['sha256'] == expected_profile['sha256']
                   and Path(ref['path']).resolve() == profile_path
                   for ref in spec['runtime_refs'])
        assert profile['formal_master']['unresolved_count'] == 6
        assert profile['formal_master']['carried_qa_failed'] == 0
        assert profile['product_fact_mutation_allowed'] is False
        assert profile['release'] is False
    except (AssertionError, KeyError, TypeError, ValueError) as error:
        print(json.dumps({'state': 'FAIL_CLOSED',
                          'code': 'NATIVE_RUNTIME_UI_ADOPTION_INPUT_NOT_BOUND',
                          'reason': str(error), 'writes': 0, 'fallback': False}))
        return 2
    engine = [sys.executable, str(central/'scripts/production-work.py'),
              'resume' if args.resume else 'run', '--root', args.root,
              '--work', args.work, '--spec', args.spec,
              '--live-state', args.live_state]
    return subprocess.call(engine)


if __name__ == '__main__':
    raise SystemExit(main())
