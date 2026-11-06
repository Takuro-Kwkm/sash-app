"""Synthetic boundary regressions; never product evidence or Human approval."""
import copy
import hashlib
import importlib.util
import json
import sys
import tempfile
import unittest
from pathlib import Path
from openpyxl import Workbook

SHARED=Path(sys.argv[1]).resolve()
sys.path.insert(0,str(SHARED))
sys.argv=sys.argv[:1]
from harness.core import Blocked

path=Path(__file__).with_name('native-working-workbook-intake.py')
loader=importlib.util.spec_from_file_location('working_intake',path)
intake=importlib.util.module_from_spec(loader)
loader.loader.exec_module(intake)


class WorkingIntake(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root=Path(self.temp.name)
        self.profile=dict(authoring_location='WORKING',registry_id='registry',manufacturer='Test',
            registry_series='Test',product_id='SYNTHETIC_ONLY',baseline_revision='working-test',
            baseline_states=['WORKING_PHASE_PASS'],authoring_file_id='master',
            canonical_folder_id='canonical',working_folder_id='working',old_folder_id='old',required_sheets=['Source'])
        book=Workbook();sheet=book.active;sheet.title='Source';sheet['A1']='legacy PASS';sheet['C8']='=1+2'
        authoring=self.root/'source.xlsx';book.save(authoring)
        self.profile['authoring_sha256']=hashlib.sha256(authoring.read_bytes()).hexdigest()
        original=intake.reader().inspect_workbook(authoring,self.profile)
        self.values={
            'registry':{'structuredContent':{'id':'registry','content':
                'manufacturer,series,master_status,authoring_file_id,package_version,canonical_folder_id,working_folder_id,old_folder_id\n'
                'Test,Test,WORKING_PHASE_PASS,master,working-test,canonical,working,old\n'}},
            'authoring_metadata':{'structuredContent':{'id':'master','mime_type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','parent_ids':['working']}},
            'original':original}
        self.values['authoring_readback_metadata']=copy.deepcopy(self.values['authoring_metadata'])
        self.contract={'inputs':{}}
        for name,value in self.values.items():self.put(name,value)
        self.contract['inputs'].update(authoring=self.ref(authoring),authoring_readback=self.ref(authoring))

    def ref(self,path):return {'path':str(path),'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}

    def put(self,name,value):
        path=self.root/(name+'.json');path.write_text(json.dumps(value))
        self.contract['inputs'][name]=self.ref(path)

    def verify(self):return intake.verify_inputs(self.contract,self.profile,SHARED)

    def test_working_snapshot_retains_sparse_formula_and_history(self):
        result=self.verify()
        self.assertEqual(result['tables']['Source']['cells']['C8'],{'value':'=1+2','type':'f'})
        self.assertFalse(result['qa_ready']);self.assertFalse(result['formal_pass'])

    def test_original_or_readback_in_canonical_is_rejected(self):
        for name in ('authoring_metadata','authoring_readback_metadata'):
            with self.subTest(name=name):
                before=copy.deepcopy(self.values[name]);bad=copy.deepcopy(before)
                bad['structuredContent']['parent_ids']=['canonical'];self.put(name,bad)
                with self.assertRaises(Blocked):self.verify()
                self.put(name,before)

    def test_registry_revision_folder_or_state_drift_is_rejected(self):
        original=self.values['registry']
        for before,after in [('working-test','changed'),('working,old','other,old'),('WORKING_PHASE_PASS','FORMAL_PASS')]:
            with self.subTest(change=after):
                bad=copy.deepcopy(original);bad['structuredContent']['content']=bad['structuredContent']['content'].replace(before,after)
                self.put('registry',bad)
                with self.assertRaises(Blocked):self.verify()
        self.put('registry',original)

    def test_changed_bytes_or_cell_snapshot_is_rejected(self):
        path=self.root/'different.xlsx';path.write_bytes(b'different')
        ref=self.contract['inputs']['authoring_readback'];self.contract['inputs']['authoring_readback']=self.ref(path)
        with self.assertRaises(Blocked):self.verify()
        self.contract['inputs']['authoring_readback']=ref
        bad=copy.deepcopy(self.values['original']);bad['tables']['Source']['cells'].pop('C8');self.put('original',bad)
        with self.assertRaises(Blocked):self.verify()

    def test_missing_or_duplicate_registry_row_is_rejected(self):
        original=self.values['registry']
        for change in ('missing','duplicate'):
            bad=copy.deepcopy(original);lines=bad['structuredContent']['content'].splitlines()
            bad['structuredContent']['content']='\n'.join(lines[:1] if change=='missing' else lines+[lines[-1]])+'\n'
            self.put('registry',bad)
            with self.assertRaises(Blocked):self.verify()


if __name__=='__main__':unittest.main()
