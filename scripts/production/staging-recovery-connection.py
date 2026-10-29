#!/usr/bin/env python3
"""Thin native composition; all admission stays at the single Shared entrance."""
import argparse
import json
import subprocess
import sys
import tempfile
import hashlib
from pathlib import Path


def main(argv=None):
    parser = argparse.ArgumentParser()
    parser.add_argument('--central', required=True)
    parser.add_argument('--repositories', required=True)
    parser.add_argument('--plan')
    parser.add_argument('--inspect', action='store_true')
    parser.add_argument('--transport-manifest')
    parser.add_argument('--cache-root')
    parser.add_argument('--transport-authorization')
    parser.add_argument('--authorization-sha256')
    parser.add_argument('--source-context-json')
    args = parser.parse_args(argv)
    native = Path(__file__).resolve().parents[2]
    try:
        mapping = json.loads(Path(args.repositories).read_text())
        if mapping != {'Takuro-Kwkm/sash-app': str(native)} or args.inspect == bool(args.plan):
            raise ValueError('One exact checkout and either inspection or operation plan required')
        central = Path(args.central).resolve()
        command = [sys.executable, '-B', str(central / 'scripts/architecture-work.py'), 'route',
                   '--repositories', str(Path(args.repositories).resolve()), '--instruction',
                   'STAGING_NATIVE_INSPECT' if args.inspect else 'STAGING_NATIVE_PREFLIGHT']
        supplied = [args.transport_manifest, args.cache_root, args.transport_authorization, args.authorization_sha256]
        if any(supplied):
            if not all(supplied) or not args.inspect:
                raise ValueError('Complete explicit inspection transport required')
            def capture(name):
                p = Path(name).resolve()
                return {'path': str(p), 'sha256': hashlib.sha256(p.read_bytes()).hexdigest(),
                        'location': 'existing host original transport capture', 'observed_at': 'host-bound'}
            envelope = {'schema': 'STAGING_NATIVE_INSPECTION_INPUT_V1', 'transport': {
                'manifest': capture(args.transport_manifest), 'cache_root': str(Path(args.cache_root).resolve()),
                'authorization': capture(args.transport_authorization), 'authorization_sha256': args.authorization_sha256}}
            if args.source_context_json:
                envelope['transport']['successor'] = json.loads(args.source_context_json)
            with tempfile.TemporaryDirectory() as temporary:
                p = Path(temporary)/'inspection-input.json'; p.write_text(json.dumps(envelope))
                return subprocess.run(command + ['--staging-plan', str(p)], check=False).returncode
        if args.plan:
            command += ['--staging-plan', str(Path(args.plan).resolve())]
        return subprocess.run(command, check=False).returncode
    except (OSError, ValueError, TypeError):
        print(json.dumps({'state': 'FAIL_CLOSED', 'blocking_reason': {'code': 'STAGING_NATIVE_INPUT'},
                          'external_operations': 0, 'execution_authority': 'NONE'}))
        return 2


if __name__ == '__main__':
    sys.exit(main())
