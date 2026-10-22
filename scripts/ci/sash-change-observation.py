"""Delegate change responsibility assessment to the existing Current router."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import platform
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[2]


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True).encode()).hexdigest()


def main():
    parser = argparse.ArgumentParser()
    for name in ('central', 'base', 'head', 'event', 'out'):
        parser.add_argument('--' + name, required=True)
    args = parser.parse_args()
    central = Path(args.central).resolve()
    sys.path.insert(0, str(central))
    from harness.architecture import assess_change
    from harness.verification_scope import tree
    inventory = tree(ROOT, args.head)
    environment = {
        'validator_sha256': digest({name: value for name, value in inventory.items()
                                    if name.startswith(('scripts/production/', 'scripts/ci/', 'test/'))}),
        'dependency_sha256': digest(inventory),
        'environment_sha256': digest({'python': platform.python_version(), 'system': platform.system(),
                                      'machine': platform.machine(), 'shared': tree(central, subprocess.check_output(
                                          ['git', 'rev-parse', 'HEAD'], cwd=central, text=True).strip())}),
        'lifecycle_stage': 'INFRASTRUCTURE_VERIFICATION_ONLY',
    }
    result = assess_change(central, {'Takuro-Kwkm/sash-app': str(ROOT)}, args.base, args.head, args.event, environment)
    result['runner_identity'] = {name: os.environ.get(name) for name in ('GITHUB_RUN_ID', 'GITHUB_RUN_ATTEMPT', 'GITHUB_SHA')}
    output = Path(args.out).resolve()
    if output.is_relative_to(ROOT) and not output.is_relative_to(ROOT / 'artifacts' / 'authority'):
        raise ValueError('OBSERVATION_OUTPUT_SCOPE')
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    if json.loads(output.read_bytes()) != result:
        raise ValueError('OBSERVATION_READBACK_FAILED')
    print(json.dumps({'state': result['state'], 'mode': 'ADVISORY_ONLY',
                      'sha256': hashlib.sha256(output.read_bytes()).hexdigest(), 'execution_authority': 'NONE'}))


if __name__ == '__main__':
    main()
