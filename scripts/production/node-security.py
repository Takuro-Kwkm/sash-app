"""Acquire the pinned runtime-maintenance validator; execute no Work or release."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[2]
RECORD = 'contracts/production/authority-successors/node-security.20261021.json'
META = 'contracts/production/node-security-shared.20261021.json'
BUNDLE = 'contracts/production/node-security-shared.20261021.bundle'


def unpack(destination, root=ROOT):
    root, destination = Path(root).resolve(), Path(destination).resolve()
    if destination.exists() or destination.is_relative_to(root):
        raise ValueError('NODE_SECURITY_ISOLATED_DESTINATION_REQUIRED')
    paths = [root / name for name in (RECORD, META, BUNDLE)]
    if any(not path.is_file() or any(parent.is_symlink() for parent in (path, *path.parents)) for path in paths):
        raise ValueError('NODE_SECURITY_CARRIER_MISSING_OR_LINKED')
    record, meta = (json.loads(path.read_bytes()) for path in paths[:2])
    implementation, bundle = record['shared_implementation_sha'], paths[2]
    if not re.fullmatch('[0-9a-f]{40}', implementation) or meta != {
        'schema': 'NODE_SECURITY_SHARED_GIT_CARRIER_V1', 'repository': 'Takuro-Kwkm/product-ui-contracts',
        'source_commit': implementation, 'sha256': hashlib.sha256(bundle.read_bytes()).hexdigest(),
        'bytes': bundle.stat().st_size, 'scope': record['terminal_policy'],
    }:
        raise ValueError('NODE_SECURITY_CARRIER_IDENTITY')
    destination.mkdir(parents=True)
    for arguments in (('init', '-q'), ('bundle', 'verify', str(bundle)),
                      ('fetch', '--quiet', str(bundle), implementation),
                      ('checkout', '--quiet', '--detach', implementation)):
        subprocess.run(['git', *arguments], cwd=destination, check=True, capture_output=True)
    if subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=destination, text=True).strip() != implementation:
        raise ValueError('NODE_SECURITY_CARRIER_COMMIT')
    return destination


def validate(root=ROOT, retained=True):
    with tempfile.TemporaryDirectory(prefix='node-security-validator-') as temporary:
        central = unpack(Path(temporary) / 'central', root)
        result = subprocess.run([sys.executable, '-B', '-c',
            'import json,sys;from harness.node_security_scope import validate_native;'
            'print(json.dumps(validate_native(sys.argv[1],sys.argv[2],retained=sys.argv[3]=="true")))',
            str(central), str(root), str(retained).lower()], cwd=central, capture_output=True, text=True, timeout=720)
        if result.returncode:
            raise ValueError('NODE_SECURITY_NATIVE_REFUSED:' + result.stderr[-2400:])
        value = json.loads(result.stdout)
        if value.get('status') != ('PASS' if retained else 'CURRENT_SCOPE_VERIFIED') or value.get('qa_skip_authority') is not False:
            raise ValueError('NODE_SECURITY_NATIVE_RESULT')
        return value


def prepare(github_env, root=ROOT, workflow=None):
    result = validate(root, retained=False)
    commit = result['predecessor_native_commit']
    # These completed product checks predate later infrastructure successors.
    # Their immutable inputs are replayed at their original accepted snapshots.
    if result['repository'] == 'Takuro-Kwkm/sash-app' and workflow == '.github/workflows/window-seven-contracts.yml':
        commit = '0758307d44ce8c831e4b023b97bf7cc553737c66'
        subprocess.run(['git', 'diff', '--exit-code', commit, result['predecessor_native_commit'], '--',
                        'contracts/window-seven/', 'scripts/contracts/'], cwd=root, check=True, capture_output=True)
    elif result['repository'] == 'Takuro-Kwkm/exterior-estimator' and workflow in (
            '.github/workflows/sw-selection-order.yml', '.github/workflows/sw-screen-stage09.yml'):
        record = json.loads((Path(root) / 'contracts/production/authority-successors/exterior-verification.v30.json').read_bytes())
        commit = 'fd9bdc8191cab04199ebb8dc146536ce05064643'
        if record['predecessor_native_commit'] != commit:
            raise ValueError('NODE_SECURITY_HISTORICAL_PRODUCT_IDENTITY')
    subprocess.run(['git', 'merge-base', '--is-ancestor', commit, result['predecessor_native_commit']], cwd=root, check=True, capture_output=True)
    area = Path(tempfile.mkdtemp(prefix='node-security-predecessor-', dir=os.environ.get('RUNNER_TEMP')))
    prior = area / 'native'
    subprocess.run(['git', 'clone', '--quiet', '--no-local', str(root), str(prior)], check=True, capture_output=True)
    origin = subprocess.check_output(['git', 'remote', 'get-url', 'origin'], cwd=root, text=True).strip()
    subprocess.run(['git', 'remote', 'set-url', 'origin', origin], cwd=prior, check=True, capture_output=True)
    subprocess.run(['git', 'checkout', '--quiet', '--detach', commit], cwd=prior, check=True, capture_output=True)
    if subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=prior, text=True).strip() != commit:
        raise ValueError('NODE_SECURITY_PREDECESSOR_IDENTITY')
    with Path(github_env).open('a') as output:
        output.write('NODE_SECURITY_PREDECESSOR=' + str(prior) + '\n')
        output.write('NODE_SECURITY_PREDECESSOR_COMMIT=' + commit + '\n')
    return {**result, 'predecessor_checkout': str(prior), 'historical_workflow_commit': commit, 'current_qa': 'REQUIRED_SEPARATELY'}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('command', choices=('unpack', 'validate', 'prepare'))
    parser.add_argument('destination', nargs='?')
    parser.add_argument('--github-env')
    parser.add_argument('--workflow')
    args = parser.parse_args()
    try:
        if args.command == 'unpack':
            if not args.destination:
                raise ValueError('NODE_SECURITY_DESTINATION_REQUIRED')
            result = {'status': 'CARRIER_ACQUIRED', 'path': str(unpack(args.destination)), 'execution_authority': 'NONE'}
        elif args.command == 'prepare':
            if not args.github_env:
                raise ValueError('NODE_SECURITY_GITHUB_ENV_REQUIRED')
            result = prepare(args.github_env, workflow=args.workflow)
        else:
            result = validate()
        print(json.dumps({key: value for key, value in result.items() if key != 'shared_semantic_hashes'}))
        return 0
    except (OSError, KeyError, ValueError, TypeError, subprocess.SubprocessError) as error:
        print(json.dumps({'status': 'FAIL_CLOSED', 'errors': [str(error)], 'deployment': 'NOT_EXECUTED'}))
        return 2


if __name__ == '__main__':
    raise SystemExit(main())
