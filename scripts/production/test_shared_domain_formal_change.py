import copy
import hashlib
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

import harness
from harness.core import Blocked


class SharedDomainFormalChangeTests(unittest.TestCase):
    def setUp(self):
        spec = importlib.util.spec_from_file_location('tested_shared_domain_successor', Path(__file__).with_name('shared-domain-formal-change.py'))
        self.adapter = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(self.adapter)
        self.adapter.setup(Path(harness.__file__).resolve().parents[1])
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        self.before = {'product': {'product_id': 'TEST'}, 'lifecycle_status': 'FORMAL',
                       'fields': [{'field_id': 'child', 'value': 'OLD'}, {'field_id': 'other', 'value': 'KEEP'}],
                       'constraints': ['KEEP'], 'scope': {'automatic_orderability': False},
                       'gaps': [], 'schema_version': '1', 'sources': [{'source_id': 'RETAIN'}],
                       'evidence': [{'evidence_id': 'RETAIN'}], 'handoff_tests': [{'id': 'KEEP'}, {'id': 'CHANGE'}]}
        self.candidate = copy.deepcopy(self.before)
        self.candidate['lifecycle_status'] = 'DRAFT'
        self.candidate['fields'][0]['value'] = 'NEW'
        self.candidate['sources'].append({'source_id': 'NEW'})
        self.candidate['evidence'].append({'evidence_id': 'NEW'})
        self.review = {'baseline_sha256': 'baseline', 'candidate_sha256': '', 'changed_fields': ['child'],
                       'unchanged_cases': 1, 'changed_expected_cases': 1}
        self.profile = {'baseline_kind': 'EXISTING_FORMAL_JSON', 'domain_schema': 'SHARED_DOMAIN_V1',
                        'formal_content_qa': True, 'confirmation_source': 'CONTROLLED_UNRESOLVED_SIDECAR',
                        'baseline_master_sha256': 'baseline', 'reviewed_candidate_sha256': '',
                        'changed_fields': ['child'], 'controlled_unresolved_count': 6}
        self.contract = {}
        self.bind()

    def ref(self, name, data):
        path = self.root/name
        path.write_text(json.dumps(data))
        return {'path': str(path), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}

    def bind(self):
        candidate = self.ref('candidate.json', self.candidate)
        self.review['candidate_sha256'] = candidate['sha256']
        self.profile['reviewed_candidate_sha256'] = candidate['sha256']
        self.contract.update(candidate_master=candidate, baseline_master=self.ref('before.json', self.before),
                             profile=self.ref('profile.json', self.profile), change_review=self.ref('review.json', self.review))

    def test_exact_reviewed_delta(self):
        self.assertEqual(self.adapter.reviewed_delta(self.contract), self.review)

    def test_unreviewed_candidate_bytes_rejected(self):
        path = Path(self.contract['candidate_master']['path'])
        path.write_text(path.read_text()+' ')
        with self.assertRaises(Blocked):
            self.adapter.reviewed_delta(self.contract)

    def test_unrelated_constraint_change_rejected_even_with_new_hash(self):
        self.candidate['constraints'] = []
        self.bind()
        with self.assertRaises(Blocked):
            self.adapter.reviewed_delta(self.contract)

    def test_unrelated_field_change_rejected_even_with_new_hash(self):
        self.candidate['fields'][1]['value'] = 'UNREVIEWED'
        self.bind()
        with self.assertRaises(Blocked):
            self.adapter.reviewed_delta(self.contract)

    def test_old_source_removal_rejected(self):
        self.candidate['sources'].pop(0)
        self.bind()
        with self.assertRaises(Blocked):
            self.adapter.reviewed_delta(self.contract)

    def test_old_evidence_edit_rejected(self):
        self.candidate['evidence'][0]['evidence_id'] = 'REPLACED'
        self.bind()
        with self.assertRaises(Blocked):
            self.adapter.reviewed_delta(self.contract)

    def test_fixture_deletion_rejected(self):
        self.candidate['handoff_tests'].pop()
        self.bind()
        with self.assertRaises(Blocked):
            self.adapter.reviewed_delta(self.contract)

    def test_post_human_formal_validation_cannot_be_omitted(self):
        self.profile['formal_content_qa'] = False
        self.bind()
        with self.assertRaises(Blocked):
            self.adapter.reviewed_delta(self.contract)

    def test_confirmations_are_native_sidecar_not_master_gaps(self):
        original = [{'id': str(i), 'automatic_resolution': False} for i in range(6)]
        self.adapter.package_files = lambda _: ({}, {'CONTROLLED_UNRESOLVED.json': json.dumps(original).encode()})
        self.contract.update(baseline_package={}, controlled_unresolved=self.ref('confirmations.json', original))
        self.assertEqual(self.adapter.confirmations(self.contract), original)
        original.pop()
        self.contract['controlled_unresolved'] = self.ref('confirmations.json', original)
        with self.assertRaises(Blocked):
            self.adapter.confirmations(self.contract)

    def test_legacy_working_projection_stays_lifecycle_only(self):
        path = Path(__file__).with_name('working-domain-formal.py')
        spec = importlib.util.spec_from_file_location('legacy_projection', path)
        legacy = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(legacy)
        legacy.setup(Path(harness.__file__).resolve().parents[1])
        before = {'lifecycle_status': 'DRAFT', 'fields': [{'field_id': 'F', 'lifecycle_status': 'DRAFT', 'values': ['A']}],
                  'product': {'revision': 'R1'}, 'provenance': {'policy_ref': 'OLD'}}
        after = copy.deepcopy(before)
        after['lifecycle_status'] = after['fields'][0]['lifecycle_status'] = 'FORMAL'
        after['product']['revision'] = 'F1'
        after['provenance']['policy_ref'] = 'HUMAN_REQUIRED'
        legacy.normalize_formal(before, after)
        after['fields'][0]['values'].append('B')
        with self.assertRaises(Blocked):
            legacy.normalize_formal(before, after)

    def connection_validator(self):
        spec = importlib.util.spec_from_file_location('connection_validator', Path(__file__).with_name('validate-sheet-package-connection.py'))
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return module

    def test_selected_formal_connection_checks_exact_profile_and_adapter(self):
        root = Path(__file__).resolve().parents[2]
        connection = json.loads((root/'contracts/production/work-connections.v2.json').read_text())
        row = next(p for p in connection['products'] if p.get('connection_scope') == 'EXISTING_FORMAL_SHARED_DOMAIN_CHANGE')
        self.assertEqual(self.connection_validator().validate(root, row['product_id'])['selected_product'], row['product_id'])

    def test_unknown_selected_connection_rejected(self):
        with self.assertRaises(AssertionError):
            self.connection_validator().validate(Path(__file__).resolve().parents[2], 'UNREGISTERED')

    def test_unrelated_unadopted_legacy_profile_is_still_rejected(self):
        # Default all-product validation keeps its pre-existing admission guard.
        # A selected-product success does not certify another product's status.
        with self.assertRaisesRegex(AssertionError, 'Native target drift'):
            self.connection_validator().validate(Path(__file__).resolve().parents[2])


if __name__ == '__main__':
    unittest.main()
