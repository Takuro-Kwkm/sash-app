"""Registration boundaries; reader safety is retained from the separate QA."""
import hashlib
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('profile_validator', Path(__file__).with_name('validate-working-master-delta-profile.py'))
validator = importlib.util.module_from_spec(spec)
spec.loader.exec_module(validator)


class DeltaProfileAdmission(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        self.relative = 'contracts/profile.json'
        for name in ('worker.py', 'prepare.py', 'validator.py'):
            (self.root / name).write_text('# native script\n')
        self.profile = {'profile_id': 'delta-reader', 'product_id': 'P1', 'repository': 'owner/repo',
            'status': 'ADOPTED', 'scope': 'STRUCTURAL_DRAFT_RECOVERY_ONLY', 'target_gate': 'WORKING_STRUCTURE_VERIFIED',
            'mutation_policy': 'CANDIDATE_ONLY; no Registry/Formal/Runtime/UI/Release writes',
            'native_adapter': 'worker.py', 'native_prepare': 'prepare.py', 'source_revision': 'SR3',
            'registry_id': 'registry', 'manufacturer': 'Maker', 'registry_series': 'Window',
            'implementation_hashes': {name: self.hash(self.root / name) for name in ('worker.py', 'prepare.py')},
            'predecessor': {'required_tables': ['Nodes']}, 'delta_sheets': {'Delta': {}}, 'working_states': ['WORKING_ATOMIC_RECOVERY']}
        self.row = {'product_id': 'P1', 'repository': 'owner/repo', 'connection_state': 'CONNECTED',
            'connection_scope': self.profile['scope'], 'default_gate': self.profile['target_gate'],
            'native_adapter': 'worker.py', 'prepare_adapter': 'prepare.py', 'validators': ['validator.py'],
            'current_working_version': 'SR3', 'baseline_selector': {'registry_id': 'registry', 'manufacturer': 'Maker',
                'series': 'Window', 'state': 'WORKING_ATOMIC_RECOVERY', 'package_version': 'SR3'},
            'unsupported_gates': {k: 'BLOCKED' for k in ('QA_READY', 'FORMAL', 'INTEGRATION', 'RELEASE')}}
        self.registry = {'state': 'READY', 'scope': self.profile['scope'], 'no_fallback': True, 'validators': ['validator.py']}
        self.save()

    @staticmethod
    def hash(path):
        return hashlib.sha256(path.read_bytes()).hexdigest()

    def write(self, name, value):
        path = self.root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(value))

    def save(self):
        self.write(self.relative, self.profile)
        entry = {'profile_id': self.profile['profile_id'], 'path': self.relative,
                 'sha256': self.hash(self.root / self.relative)}
        self.row['build_profile'] = entry
        self.registry['native_profile'] = entry
        self.write('contracts/production/work-connections.v2.json', {'products': [self.row]})
        self.write('contracts/production/validator-registry.v2.json', {'products': {'P1': self.registry}})

    def result(self):
        return validator.validate(self.root, self.relative, verify_scope=False)

    def rejected(self, reason):
        result = self.result()
        self.assertEqual(result['status'], 'FAIL_CLOSED')
        self.assertIn(reason, result['reason'])

    def test_structural_scope_does_not_grant_product_qa_or_formal(self):
        result = self.result()
        self.assertEqual(result['status'], 'PASS')
        self.assertFalse(result['product_qa'])
        self.assertFalse(result['formal'])
        self.assertFalse(result['release'])

    def test_profile_hash_drift_is_rejected(self):
        path = self.root / self.relative
        path.write_text(path.read_text() + ' ')
        self.rejected('PROFILE_HASH')

    def test_worker_byte_drift_is_rejected(self):
        (self.root / 'worker.py').write_text('# changed\n')
        self.rejected('IMPLEMENTATION_HASH')

    def test_pending_connection_is_rejected(self):
        self.row['connection_state'] = 'ADAPTER_PENDING'
        self.save()
        self.rejected('CONNECTION_SCOPE')

    def test_missing_qa_ready_exclusion_is_rejected(self):
        del self.row['unsupported_gates']['QA_READY']
        self.save()
        self.rejected('GATE_EXPANSION')

    def test_formal_profile_expansion_is_rejected(self):
        self.row['formal_profile'] = {'path': 'other-product.json'}
        self.save()
        self.rejected('GATE_EXPANSION')

    def test_validator_fallback_is_rejected(self):
        self.registry['no_fallback'] = False
        self.save()
        self.rejected('VALIDATOR_SCOPE')

    def test_wrong_working_revision_is_rejected(self):
        self.row['current_working_version'] = 'SR2'
        self.save()
        self.rejected('BASELINE_SCOPE')

    def test_symlink_implementation_is_rejected(self):
        (self.root / 'worker.py').unlink()
        (self.root / 'worker.py').symlink_to(self.root / 'prepare.py')
        self.rejected('PROFILE_PATH')

    def test_candidate_status_is_not_admission(self):
        self.profile['status'] = 'CANDIDATE_REVIEW_ONLY'
        self.save()
        self.rejected('PROFILE_SCOPE')
