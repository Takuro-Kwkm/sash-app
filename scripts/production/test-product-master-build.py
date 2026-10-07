#!/usr/bin/env python3
"""Exercise the acquired shared router against this real native profile."""
import importlib.util
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CENTRAL = Path(os.environ['SHARED_HARNESS_ROOT']).resolve()
sys.path.insert(0, str(CENTRAL))
from harness.architecture import route_instruction, resolve_build_profile
from harness.core import Blocked
from jsonschema import Draft202012Validator


def module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    result = importlib.util.module_from_spec(spec); spec.loader.exec_module(result)
    return result


planner = module('native_build', ROOT / 'scripts/production/product-master-build.py')
validator = module('native_qa', ROOT / 'scripts/production/validate-product-master-build.py')


class NativeProfileAcceptance(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(); self.addCleanup(self.temp.cleanup)
        self.work = Path(self.temp.name)
        self.registry = self.work / 'registry.json'
        self.raw = {'structuredContent': {'id': '1HMMZ8JdsbJPtL_8LjQfxMF8P_Zb4-LReqvPMFn1pJks',
            'content': ',manufacturer,series,master_status,package_version\n0,TEST,Existing,FORMAL_PASS,v1\n'}}
        self.save()

    def save(self): self.registry.write_text(json.dumps(self.raw))
    def plan(self, instruction='TEST NewSeriesの商品マスターを作成して'):
        return planner.plan(CENTRAL, instruction, self.registry, self.work)

    def test_native_profile_and_all_reference_bytes_resolve(self):
        config = json.loads((ROOT / 'contracts/production/work-connections.v2.json').read_text())
        profile, entry = resolve_build_profile(CENTRAL, ROOT, 'Takuro-Kwkm/sash-app', config)
        self.assertEqual(profile['profile_id'], 'sash-new-product-master-v1')
        Draft202012Validator(json.loads((CENTRAL / 'schemas/native-product-master-build-profile.v1.schema.json').read_text())).validate(profile)

    def test_native_absence_bootstraps_draft_candidate_only(self):
        result = self.plan()
        self.assertEqual(result['operation'], 'NEW_PRODUCT_BOOTSTRAP')
        self.assertEqual(result['domain_plan']['work_type'], 'NEW BUILD')
        self.assertFalse(result['product_master_created'])
        self.assertEqual(result['native_registry_writes'], 0)
        self.assertEqual(result['formal_adoption'], 'NOT_REQUESTED')
        self.assertEqual(result['source_requests'][0]['operation'], 'DISCOVER_OFFICIAL_SOURCE')

    def test_label_is_not_product_facts(self):
        result = self.plan('OTHER OtherSeriesの商品マスターを作成して')
        candidate = result['registry_bootstrap_candidate']['products'][0]
        self.assertEqual(candidate['identity_state'], 'PROVISIONAL_NOT_MANUFACTURER_FACT')
        self.assertNotIn('manufacturer', candidate)

    def test_live_native_existing_row_cannot_be_new(self):
        with self.assertRaises(Blocked) as caught: self.plan('TEST Existingの商品マスターを作成して')
        self.assertEqual(caught.exception.data['code'], 'EXISTING_PRODUCT_REQUIRES_NATIVE_ROUTE')

    def test_retrieval_failure_is_not_absence(self):
        self.raw['isError'] = True; self.save()
        with self.assertRaises(Blocked): self.plan()

    def test_wrong_registry_id_blocks(self):
        self.raw['structuredContent']['id'] = 'wrong'; self.save()
        with self.assertRaises(Blocked): self.plan()

    def test_empty_registry_blocks(self):
        self.raw['structuredContent']['content'] = ''; self.save()
        with self.assertRaises(Blocked): self.plan()

    def test_truncated_csv_blocks(self):
        self.raw['structuredContent']['content'] += '1,TEST,Truncated\n'; self.save()
        with self.assertRaises(Blocked): self.plan()

    def test_header_only_registry_is_not_absence(self):
        self.raw['structuredContent']['content'] = self.raw['structuredContent']['content'].splitlines()[0] + '\n'; self.save()
        with self.assertRaises(Blocked): self.plan()

    def test_duplicate_native_registry_identity_is_not_absence(self):
        lines = self.raw['structuredContent']['content'].splitlines()
        self.raw['structuredContent']['content'] += lines[1] + '\n'; self.save()
        with self.assertRaises(Blocked): self.plan()

    def test_thermosl_change_keeps_existing_adapter(self):
        r = route_instruction(CENTRAL, {'Takuro-Kwkm/sash-app': str(ROOT)}, 'サーモスLの最新版変更を確認して')
        self.assertEqual(r['work_skill'], 'product-change-work')
        self.assertEqual(r['product_id'], 'SER-LIX-SAMOSL')
        self.assertNotEqual(r.get('operation'), 'NEW_PRODUCT_BOOTSTRAP')

    def test_every_pending_adapter_remains_fail_closed(self):
        config = json.loads((ROOT / 'contracts/production/work-connections.v2.json').read_text())
        for product in config['products']:
            if product['connection_state'] == 'CONNECTED': continue
            with self.subTest(product=product['product_id']):
                with self.assertRaises(Blocked) as caught:
                    route_instruction(CENTRAL, {'Takuro-Kwkm/sash-app': str(ROOT)}, product['aliases'][0] + 'の最新版変更を確認して')
                self.assertEqual(caught.exception.data['code'], 'NATIVE_ADAPTER_UNAVAILABLE')

    def test_native_qa_cannot_self_certify_without_project_qa(self):
        with self.assertRaises(Blocked) as caught: validator.validate(CENTRAL, {})
        self.assertEqual(caught.exception.data['code'], 'NATIVE_PROJECT_QA_REQUIRED')


if __name__ == '__main__': unittest.main(verbosity=2)
