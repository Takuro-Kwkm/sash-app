"""Safety regression for the generic Working-domain admission, not product QA."""
import copy,importlib.util,os,unittest
from pathlib import Path

spec=importlib.util.spec_from_file_location('working_domain',Path(__file__).with_name('working-domain-formal.py'))
adapter=importlib.util.module_from_spec(spec);spec.loader.exec_module(adapter)
adapter.setup(os.environ['SHARED_HARNESS_ROOT'])
from harness.core import Blocked

class WorkingDomainSafety(unittest.TestCase):
    def setUp(self):
        self.before={'lifecycle_status':'DRAFT','fields':[{'field_id':'F','lifecycle_status':'DRAFT','selectable_values':['A']}],
                     'product':{'revision':'R1'},'provenance':{'policy_ref':'BOUNDARY'}}
        self.after=copy.deepcopy(self.before);self.after['lifecycle_status']='FORMAL'
        self.after['fields'][0]['lifecycle_status']='FORMAL';self.after['product']['revision']='F1'
        self.after['provenance']['policy_ref']='FIXED_HUMAN_POLICY'
    def test_lifecycle_only_delta(self):adapter.normalize_formal(self.before,self.after)
    def test_option_change_is_not_carry_forward(self):
        self.after['fields'][0]['selectable_values'].append('B')
        with self.assertRaises(Blocked):adapter.normalize_formal(self.before,self.after)
    def test_source_change_is_not_carry_forward(self):
        self.after['sources']=['invented']
        with self.assertRaises(Blocked):adapter.normalize_formal(self.before,self.after)
    def test_working_is_not_an_existing_formal(self):
        raw={'content':'manufacturer,series,master_status\nSYNTHETIC,M,WORKING_RECOVERY\n'}
        self.assertEqual(adapter.native_row(raw,'SYNTHETIC','M',['WORKING_RECOVERY'])['master_status'],'WORKING_RECOVERY')
        with self.assertRaises(Blocked):adapter.native_row(raw,'SYNTHETIC','M',['FORMAL_PASS'])
    def test_duplicate_native_row_is_rejected(self):
        raw={'content':'manufacturer,series,master_status\nSYNTHETIC,M,WORKING_RECOVERY\nSYNTHETIC,M,WORKING_RECOVERY\n'}
        with self.assertRaises(Blocked):adapter.native_row(raw,'SYNTHETIC','M',['WORKING_RECOVERY'])

if __name__=='__main__':unittest.main()
