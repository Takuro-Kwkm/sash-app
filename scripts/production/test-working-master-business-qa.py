"""Synthetic safety checks; these are never evidence for a real product Gate."""
import importlib.util
import sys
import unittest
from pathlib import Path

spec=importlib.util.spec_from_file_location('adapter',Path(__file__).with_name('working-master-business-qa.py'))
adapter=importlib.util.module_from_spec(spec);spec.loader.exec_module(adapter);adapter.setup(sys.argv[1]);sys.argv=sys.argv[:1]
from harness.core import Blocked


class Safety(unittest.TestCase):
    def setUp(self):
        self.p={'product':{'product_id':'SYNTHETIC_ONLY'},'fields':[], 'gaps':[], 'constraints':[]}
        self.r={'confirmation_requests':[dict(id='CHECK',condition=True,status='ESTIMATE_CONFIRM_REQUIRED')]}
    def test_quantity_rejects_bool_zero_negative_fraction(self):
        for v in [True,False,0,-1,1.5,'1']:
            with self.subTest(v=v),self.assertRaises(Blocked):adapter.request_envelope(self.p,self.r,dict(quantity=v,selection={}))
    def test_positive_sales_quantity_is_not_bom(self):
        out=adapter.request_envelope(self.p,self.r,dict(quantity=2,selection={}))
        self.assertTrue(out['request_valid']);self.assertEqual(out['quantity_role'],'SALES_REQUEST_COUNT')
        self.assertIsNone(out['bom']);self.assertIsNone(out['price']);self.assertIsNone(out['set_code'])
        self.assertFalse(out['automatic_orderability']);self.assertFalse(out['manufacturing_approval'])
        self.assertEqual(out['confirmation_requests'],self.r['confirmation_requests'])
    def test_unknown_input_is_not_accepted(self):
        out=adapter.request_envelope(self.p,self.r,dict(quantity=1,selection={'unmapped':'x'}))
        self.assertFalse(out['request_valid'])
    def test_manufacturer_prohibition_is_not_confirmation(self):
        self.p['constraints']=[dict(rule_id='NO',when=True)]
        out=adapter.request_envelope(self.p,self.r,dict(quantity=1,selection={}))
        self.assertFalse(out['request_valid']);self.assertIn('NO:forbidden',out['errors'])


if __name__=='__main__':unittest.main()
