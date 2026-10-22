"""Acquire and validate the selected shared successor, never install an engine."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[2]
RECORD = 'contracts/production/authority-successors/sash-verification.v29.json'
META = 'contracts/production/sash-verification-shared.v29.json'
BUNDLE = 'contracts/production/sash-verification-shared.v29.bundle'


def selected(root):
    return json.loads((Path(root) / 'contracts/production/current-authority-successor.json').read_bytes()).get('path') == RECORD


def unpack(root, destination):
    root, destination = Path(root).resolve(), Path(destination).resolve()
    if destination.exists() or destination.is_relative_to(root):
        raise ValueError('ISOLATED_DESTINATION_REQUIRED')
    selection = json.loads((root / 'contracts/production/current-authority-successor.json').read_bytes())
    metadata = json.loads((root / META).read_bytes())
    bundle = root / BUNDLE
    implementation = selection['implementation_sha']
    if not selected(root) or metadata != {
        'schema': 'SASH_VERIFICATION_SHARED_GIT_CARRIER_V29',
        'repository': 'Takuro-Kwkm/product-ui-contracts', 'source_commit': implementation,
        'sha256': hashlib.sha256(bundle.read_bytes()).hexdigest(), 'bytes': bundle.stat().st_size,
        'scope': 'INFRASTRUCTURE_COMPATIBILITY_ONLY; NO_INSTALLED_SHARED_COPY',
    }:
        raise ValueError('SELECTED_CARRIER_IDENTITY')
    destination.mkdir(parents=True)
    for arguments in (('init', '-q'), ('bundle', 'verify', str(bundle)),
                      ('fetch', '--quiet', str(bundle), implementation),
                      ('checkout', '--quiet', '--detach', implementation)):
        subprocess.run(['git', *arguments], cwd=destination, check=True, capture_output=True)
    result = subprocess.run([sys.executable, '-B', '-c',
        'import json,sys;from harness.sash_verification_scope import compatibility;'
        'print(json.dumps(compatibility(sys.argv[1],sys.argv[2])))', str(destination), str(root)],
        cwd=destination, capture_output=True, text=True, timeout=420)
    if result.returncode:
        raise ValueError('SUCCESSOR_REFUSED:' + result.stderr[-1600:])
    proof = json.loads(result.stdout)
    if proof.get('status') != 'PASS':
        raise ValueError('SUCCESSOR_PROOF_REQUIRED')
    return proof


def validate(root=ROOT):
    try:
        with tempfile.TemporaryDirectory(prefix='sash-authority-') as temporary:
            return unpack(root, Path(temporary) / 'central')['native_successor']
    except (OSError, ValueError, KeyError, subprocess.SubprocessError) as error:
        return {'status': 'FAIL_CLOSED', 'errors': [str(error)], 'deployment': 'NOT_EXECUTED'}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--destination')
    args = parser.parse_args()
    result = unpack(ROOT, args.destination) if args.destination else validate()
    print(json.dumps(result))
    return 0 if result['status'] == 'PASS' else 2


if __name__ == '__main__':
    raise SystemExit(main())
