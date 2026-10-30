#!/usr/bin/env python3
"""Native local test entry. No CI IDs, workflow dispatch or provider writes."""
import argparse
import json
import os
from pathlib import Path
import runpy
import sys
import tempfile
import unittest


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--central',required=True);parser.add_argument('--context',required=True)
    parser.add_argument('--transport-json',required=True)
    args=parser.parse_args()
    native=Path(__file__).resolve().parents[2];central=Path(args.central).resolve()
    sys.path[:0]=[str(central),str(central/'tests'),str(native/'scripts/production')]
    from harness.sash_local_qa import MODULES
    from harness.staging_admission import TransportContext
    transport=json.loads(args.transport_json)
    TransportContext.from_envelope(transport,central,native)
    with tempfile.TemporaryDirectory(prefix='sash-local-transport-') as tmp:
        path=Path(tmp)/'transport.json';path.write_text(json.dumps(transport))
        isolation=native/'scripts/production/local-qa-isolation'
        os.environ.update(STAGING_SHARED_CHECKOUT=str(central),STAGING_NATIVE_CHECKOUT=str(native),
            STAGING_BASELINE_CONTEXT=args.context,STAGING_TEST_TRANSPORT=str(path),PYTHONDONTWRITEBYTECODE='1',
            PYTHONPATH=os.pathsep.join([str(isolation),str(central),str(central/'tests'),str(native/'scripts/production')]))
        runpy.run_path(str(isolation/'sitecustomize.py'))
        original=json.loads(Path(transport['manifest']['path']).read_text())['objects'][0]['original_ref']
        try:
            Path(original).read_bytes()
            raise AssertionError('Original host read unexpectedly allowed')
        except FileNotFoundError as exc:
            assert 'TEST_ISOLATION' in str(exc)
        suite=unittest.defaultTestLoader.loadTestsFromNames(MODULES)
        def ids(group):
            return [v for t in group for v in (ids(t) if isinstance(t,unittest.TestSuite) else [t.id()])]
        inventory=ids(suite)
        assert len(inventory)==len(set(inventory)), 'Duplicate test case IDs'
        expected=json.loads((native/'contracts/production/staging-baseline-adoption-profile.v1.json').read_text())['baseline_test_cases']
        assert set(expected)<=set(inventory), 'Missing baseline tests'
        print(json.dumps({'original_open_guard':'ACTIVE_AND_PROBED','baseline_count':len(expected),'unique_ids':inventory}),flush=True)
        result=unittest.TextTestRunner(verbosity=2).run(suite)
        return 0 if result.wasSuccessful() and not result.skipped else 1

if __name__=='__main__':sys.exit(main())
