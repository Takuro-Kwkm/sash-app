"""Safety regressions: Working recovery cannot invent business QA/acceptance."""
import importlib.util
import json
import sys
import tempfile
import unittest
from pathlib import Path

module_spec=importlib.util.spec_from_file_location('recovery',Path(__file__).with_name('working-master-recovery.py'))
adapter=importlib.util.module_from_spec(module_spec);module_spec.loader.exec_module(adapter)


class RecoverySafety(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup)
        self.root=Path(self.temp.name)
        self.profile={'registry_id':'live-registry','manufacturer':'Maker','registry_series':'Door','working_states':['WORKING_RECOVERY'],
                      'field_table':'fields','evidence_table':'evidence','unique_id_tables':['fields','evidence'],
                      'json_module_map':{'fields':'fields','installation_components':'components'}}
    def candidate(self):
        return {'revision':'R1','historical_payload':{'fields':[['F1','grade','EV-HISTORY']]},'tables':{
            'fields':{'columns':['record_id','field_id','evidence_id'],'rows':[{'record_id':'F1','field_id':'grade','evidence_id':'EV-HISTORY'}]},
            'evidence':{'columns':['evidence_id','source_url'],'rows':[{'evidence_id':'EV-HISTORY','source_url':None}]},
            'components':{'columns':['record_id','component_code'],'rows':[{'record_id':'C1','component_code':None}]}}}
    def test_formal_and_absent_products_are_rejected(self):
        header='manufacturer,series,master_status,package_version\n'
        for status in ('FORMAL_PASS','', 'UNREGISTERED'):
            raw={'structuredContent':{'id':'live-registry','content':header+'Maker,Door,'+status+',v1\n'}}
            with self.assertRaises(adapter.Blocked):adapter.working_row(raw,self.profile)
    def test_duplicate_or_truncated_registry_is_not_a_baseline(self):
        for csv in ('manufacturer,series,master_status,package_version\nMaker,Door,WORKING_RECOVERY\n',
                    'manufacturer,series,master_status,package_version\nMaker,Door,WORKING_RECOVERY,v1\nMaker,Door,WORKING_RECOVERY,v1\n'):
            with self.assertRaises(adapter.Blocked):adapter.working_row({'structuredContent':{'id':'live-registry','content':csv}},self.profile)
    def test_static_history_never_grants_current_qa(self):
        report=adapter.audit(self.candidate(),self.profile)
        self.assertEqual(report['status'],'PASS')
        self.assertFalse(report['qa_ready']);self.assertFalse(report['formal'])
        self.assertEqual(report['internal_history_used_as_fact_evidence'][0]['field_id'],'grade')
        self.assertIn('installation_components',report['restored_modules_absent_from_legacy_json'])
    def test_missing_evidence_is_a_structural_failure(self):
        c=self.candidate();c['tables']['fields']['rows'][0]['evidence_id']='missing'
        r=adapter.audit(c,self.profile)
        self.assertEqual(r['status'],'FAIL');self.assertIn('missing',r['dangling_evidence_ids'])
    def test_byte_drift_blocks_resume(self):
        path=self.root/'captured.json';path.write_text('{}')
        ref={'path':str(path),'sha256':adapter.sha(path.read_bytes())};path.write_text('{"accepted":true}')
        with self.assertRaises(adapter.Blocked):adapter.verified(ref)
    def test_actual_row_parity_is_not_a_count_check(self):
        c=self.candidate();c['historical_payload']['fields'][0][1]='different'
        r=adapter.audit(c,self.profile)['legacy_authoring_parity']['fields']
        self.assertEqual(r['json_count'],r['authoring_count']);self.assertFalse(r['exact_row_equal'])


if __name__ == '__main__':
    harness=sys.argv.pop(1);adapter.setup(harness);unittest.main()
