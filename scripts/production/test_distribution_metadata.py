"""Validate a distribution-only successor while retaining its executed app QA."""
import hashlib
import json
import subprocess
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


class DistributionMetadata(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.input = json.loads((ROOT / 'artifacts/distribution-metadata-qa.json').read_bytes())
        cls.shared = Path(cls.input['shared'])
        sys.path.insert(0, str(cls.shared))
        from harness.common_local_release import read_profile
        cls.profile = read_profile(ROOT / cls.input['profile'])

    def test_complete_native_dependency_inventory(self):
        self.assertEqual(set(self.profile['native_files']), set(self.profile['native_paths']))
        for name, digest in self.profile['native_files'].items():
            data = (ROOT / name).read_bytes()
            self.assertEqual(hashlib.sha256(data).hexdigest(), digest, name)
            self.assertEqual(data, subprocess.check_output(['git', 'show', 'HEAD:' + name], cwd=ROOT))

    def test_exact_metadata_only_source_delta(self):
        changed = set(subprocess.check_output(['git', 'diff', '--name-only', self.input['base'], 'HEAD'], cwd=ROOT, text=True).splitlines())
        self.assertEqual(changed, set(self.input['allowed_changes']))

    def test_reviewed_ui_files_are_byte_identical(self):
        for row in self.input['ui_files']:
            data = (ROOT / row['native_path']).read_bytes()
            self.assertEqual(hashlib.sha256(data).hexdigest(), row['sha256'])
            self.assertEqual(data, subprocess.check_output(['git', 'show', self.input['base'] + ':' + row['native_path']], cwd=ROOT))

    def test_no_product_or_publication_scope_change(self):
        name = self.input['source_profile']
        old = json.loads(subprocess.check_output(['git', 'show', self.input['base'] + ':' + name], cwd=ROOT))
        current = json.loads((ROOT / name).read_bytes())
        for route in ('/styles.css', '/product-configuration-editor.mjs'):
            old['publication_policy']['http_artifacts'][route] = hashlib.sha256((ROOT / 'src/ui/web' / route[1:]).read_bytes()).hexdigest()
        self.assertEqual({k:v for k,v in old.items() if k != 'native_files'},
                         {k:v for k,v in current.items() if k != 'native_files'})
        name = 'contracts/production/app-release.v1.json'
        self.assertEqual((ROOT / name).read_bytes(), subprocess.check_output(['git', 'show', self.input['base'] + ':' + name], cwd=ROOT))

    def test_http_artifacts_match_served_source(self):
        for route, digest in self.profile['publication_policy']['http_artifacts'].items():
            if route.startswith('/work-management/') or route.startswith('/estimate-output/'):
                path = ROOT / 'src' / route[1:]
            else:
                path = ROOT / 'src/ui/web' / ('index.html' if route == '/' else route[1:])
            self.assertEqual(hashlib.sha256(path.read_bytes()).hexdigest(), digest, route)

    def test_existing_profile_admission(self):
        from harness.release_admission import adopted_profile
        adopted_profile(ROOT / self.input['profile'], self.profile,
            {'repository':self.profile['repository'], 'product_id':self.profile['product_scope']['product_id'],
             'scope':self.profile['product_scope']['scope'], 'execution_mode':'REAL'})

    def test_retained_verified_qa_without_reexecution(self):
        # Historical completion is checked against its original files and Git.
        # A host interpreter update does not replay or recertify those tests.
        from harness.core import fingerprint
        from harness.local_qa import snapshot, load_control
        root = Path(self.input['retained_qa_work'])
        read = lambda name: json.loads((root / name).read_bytes())
        spec, step, result, review = (read(name) for name in (
            'spec.json', 'step.json', 'local-qa-result.json', 'local-qa-review.json'))
        record, ledger = load_control(root, spec, step)
        self.assertEqual(record['cycle_state'], 'VERIFIED')
        self.assertEqual(result['status'], 'TESTS_PASSED')
        self.assertEqual(review['status'], 'PASS')
        self.assertEqual(review['unverified'], [])
        self.assertNotEqual(review['reviewer'], spec['local_qa']['implementer'])
        self.assertEqual(review['binding_sha256'], fingerprint({'spec': spec, 'step': step}))
        self.assertEqual(review['result_sha256'], hashlib.sha256((root / 'local-qa-result.json').read_bytes()).hexdigest())
        ref = review['review_ref']
        self.assertEqual(hashlib.sha256(Path(ref['path']).read_bytes()).hexdigest(), ref['sha256'])
        self.assertEqual(snapshot(spec['local_qa']['repositories']), result['identity']['repositories'])
        self.assertTrue(result['commands'])
        for row in result['commands']:
            self.assertEqual(row['exit_code'], 0)
            self.assertEqual(hashlib.sha256(Path(row['log']).read_bytes()).hexdigest(), row['log_sha256'])
        self.assertEqual(ledger['attempts'][-1]['status'], 'TESTS_PASSED')
        runtime = str(Path(result['identity']['executable']).resolve())
        changed = []
        for name, digest in result['identity']['environment_inputs'].items():
            actual = hashlib.sha256(Path(name).read_bytes()).hexdigest()
            if actual != digest:
                # Only the captured interpreter binary may differ. Every source,
                # ignored data input, lock and executed log remains exact.
                self.assertEqual(name, runtime, name)
                changed.append({'path': name, 'original_sha256': digest, 'current_sha256': actual})
        self.assertLessEqual(len(changed), 1)
        print('Retained completed QA: original verified receipt/logs/source exact; historical interpreter differences=' + json.dumps(changed))

    def test_shared_implementation_is_unchanged(self):
        self.assertEqual(subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=self.shared, text=True).strip(), self.input['shared_head'])
        self.assertEqual(subprocess.check_output(['git', 'status', '--porcelain'], cwd=self.shared), b'')
        for name, digest in self.profile['shared_contract']['files'].items():
            self.assertEqual(hashlib.sha256((self.shared / name).read_bytes()).hexdigest(), digest)
