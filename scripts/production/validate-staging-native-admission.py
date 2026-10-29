#!/usr/bin/env python3
"""Candidate review composes Shared inspection; CI permission is separate."""
import argparse
import json
import os
import subprocess
import sys
from pathlib import Path


def ci_guard(policy, native, shared):
    head = subprocess.check_output(['git', '-C', str(native), 'rev-parse', 'HEAD'], text=True).strip()
    central = subprocess.check_output(['git', '-C', str(shared), 'rev-parse', 'HEAD'], text=True).strip()
    return (policy.get('enabled') is True and policy.get('max_runs') == 1
            and os.environ.get('APPROVED_NATIVE_HEAD') == head == os.environ.get('EXPECTED_NATIVE_HEAD')
            and os.environ.get('APPROVED_SHARED_HEAD') == central
            and os.environ.get('GITHUB_EVENT_NAME') == 'pull_request'
            and os.environ.get('EXPECTED_EVENT_ACTION') == 'ready_for_review'
            and os.environ.get('GITHUB_RUN_ATTEMPT') == '1'
            and os.environ.get('GITHUB_JOB') == 'staging-native-admission')


def main(argv=None):
    parser = argparse.ArgumentParser()
    parser.add_argument('--central', required=True)
    parser.add_argument('--repositories', required=True)
    parser.add_argument('--ci', action='store_true')
    parser.add_argument('--transport-manifest')
    parser.add_argument('--cache-root')
    parser.add_argument('--transport-authorization')
    parser.add_argument('--authorization-sha256')
    args = parser.parse_args(argv)
    native = Path(__file__).resolve().parents[2]
    policy = json.loads((native / 'contracts/production/staging-native-ci-policy.v1.json').read_text())
    if args.ci and not ci_guard(policy, native, args.central):
        print(json.dumps({'state': 'FAIL_CLOSED', 'blocking_reason': {'code': 'STAGING_CI_NOT_AUTHORIZED'}}))
        return 2
    command = [sys.executable, '-B', str(native / 'scripts/production/staging-recovery-connection.py'),
               '--central', args.central, '--repositories', args.repositories, '--inspect']
    for key in ('transport_manifest', 'cache_root', 'transport_authorization', 'authorization_sha256'):
        value = getattr(args, key)
        if value:
            command += ['--' + key.replace('_', '-'), value]
    result = subprocess.run(command, check=False)
    # Inspection success proves the candidate structure, never adopted acceptance.
    return result.returncode


if __name__ == '__main__':
    sys.exit(main())
