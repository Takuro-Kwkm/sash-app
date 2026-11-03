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
        self.assertEqual({k:v for k,v in old.items() if k != 'native_files'},
                         {k:v for k,v in current.items() if k != 'native_files'})
        name = 'contracts/production/app-release.v1.json'
        self.assertEqual((ROOT / name).read_bytes(), subprocess.check_output(['git', 'show', self.input['base'] + ':' + name], cwd=ROOT))

    def test_existing_profile_admission(self):
        from harness.release_admission import adopted_profile
        adopted_profile(ROOT / self.input['profile'], self.profile,
            {'repository':self.profile['repository'], 'product_id':self.profile['product_scope']['product_id'],
             'scope':self.profile['product_scope']['scope'], 'execution_mode':'REAL'})

    def test_retained_verified_qa_without_reexecution(self):
        from harness.application_ui_release import inspect_original_qa
        root = Path(self.input['retained_qa_work'])
        spec = json.loads((root / 'spec.json').read_bytes())
        result = json.loads((root / 'local-qa-result.json').read_bytes())
        inspect_original_qa(root, spec['local_qa'], result)
        self.assertEqual(json.loads((root / 'record.json').read_bytes())['cycle_state'], 'VERIFIED')

    def test_shared_implementation_is_unchanged(self):
        self.assertEqual(subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=self.shared, text=True).strip(), self.input['shared_head'])
        self.assertEqual(subprocess.check_output(['git', 'status', '--porcelain'], cwd=self.shared), b'')
        for name, digest in self.profile['shared_contract']['files'].items():
            self.assertEqual(hashlib.sha256((self.shared / name).read_bytes()).hexdigest(), digest)
