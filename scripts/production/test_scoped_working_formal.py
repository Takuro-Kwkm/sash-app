"""Synthetic refusal checks; no fixture grants real product acceptance."""
import copy
import importlib.util
import os
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('scoped_working', Path(__file__).with_name('scoped-working-domain-formal.py'))
adapter = importlib.util.module_from_spec(spec); spec.loader.exec_module(adapter)
adapter.setup(os.environ['SHARED_HARNESS_ROOT'])
from harness.core import Blocked
from product_master.validators.validate import METRICS


class ScopedFormalSafety(unittest.TestCase):
    def setUp(self):
        self.c = dict(lifecycle_status='DRAFT', product={'revision': 'R3'}, provenance={'policy_ref': 'OLD'},
            fields=[dict(field_id='K', knowledge_status='KNOWN', lifecycle_status='DRAFT', value='official'),
                    dict(field_id='U', knowledge_status='UNRESOLVED', lifecycle_status='DRAFT', value=None)],
            handoff_tests=[{'case_id': 'executed'}],
            gaps=[dict(field_ids=['U'], classification='Non-Blocker', result_in_scope=False, confirmation_in_scope=True)])
        self.scope = dict(field_ids=['K'], excluded_field_ids=['U'],
            runtime_scope='NOT_INCLUDED_IN_PRODUCT_MASTER_FORMAL', automatic_orderability=False)
        self.f = copy.deepcopy(self.c); self.f['lifecycle_status'] = 'FORMAL'
        self.f['fields'][0]['lifecycle_status'] = 'FORMAL'; self.f['product']['revision'] = 'F1'
        self.f['provenance']['policy_ref'] = 'HUMAN_POLICY'
        self.qa = dict(status='PASS', qa_ready=True, formal=False, blocker_count=0,
            package_sha256=adapter.digest(self.c), executed_test_count=1,
            metrics={k: (1 if k == 'UNKNOWN' else 0) for k in METRICS},
            findings=[dict(code='UNKNOWN', target='U', blocking=False)])

    def test_known_promoted_unknown_exact(self):
        adapter.normalize_formal(self.c, self.f, self.scope)
        adapter.verify_carried_qa(self.c, self.qa, self.scope)

    def test_unknown_cannot_be_promoted(self):
        self.f['fields'][1]['lifecycle_status'] = 'FORMAL'
        with self.assertRaises(Blocked): adapter.normalize_formal(self.c, self.f, self.scope)

    def test_known_field_cannot_be_excluded(self):
        self.scope['field_ids'] = []; self.scope['excluded_field_ids'].append('K')
        with self.assertRaises(Blocked): adapter.scope_partition(self.c, self.scope)

    def test_unknown_cannot_enter_formal_scope(self):
        self.scope['field_ids'].append('U')
        with self.assertRaises(Blocked): adapter.scope_partition(self.c, self.scope)

    def test_manufacturer_fact_cannot_change(self):
        self.f['fields'][0]['value'] = 'guessed'
        with self.assertRaises(Blocked): adapter.normalize_formal(self.c, self.f, self.scope)

    def test_unknown_cannot_be_disguised_as_known(self):
        self.f['fields'][1]['knowledge_status'] = 'KNOWN'
        with self.assertRaises(Blocked): adapter.normalize_formal(self.c, self.f, self.scope)

    def test_critical_finding_never_carried(self):
        self.qa['metrics']['MISSING_EVIDENCE'] = 1
        with self.assertRaises(Blocked): adapter.verify_carried_qa(self.c, self.qa, self.scope)

    def test_hidden_unknown_count_never_carried(self):
        self.qa['metrics']['UNKNOWN'] = 0
        with self.assertRaises(Blocked): adapter.verify_carried_qa(self.c, self.qa, self.scope)

    def test_scope_intersection_blocks(self):
        self.c['gaps'][0]['result_in_scope'] = True
        self.qa['package_sha256'] = adapter.digest(self.c)
        with self.assertRaises(Blocked): adapter.verify_carried_qa(self.c, self.qa, self.scope)

    def test_old_generic_normalizer_is_unchanged_and_strict(self):
        path = Path(__file__).with_name('working-domain-formal.py')
        old_spec = importlib.util.spec_from_file_location('prior_working', path)
        old = importlib.util.module_from_spec(old_spec); old_spec.loader.exec_module(old)
        old.setup(os.environ['SHARED_HARNESS_ROOT'])
        with self.assertRaises(Blocked): old.normalize_formal(self.c, self.f)


if __name__ == '__main__': unittest.main()
