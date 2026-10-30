import importlib.util,json,tempfile,unittest
from pathlib import Path
from openpyxl import Workbook

script=Path(__file__).with_name('native-workbook-intake.py')
sp=importlib.util.spec_from_file_location('intake',script);i=importlib.util.module_from_spec(sp);sp.loader.exec_module(i)

class WorkbookIntake(unittest.TestCase):
    def test_sparse_cells_formulas_and_legacy_status_are_preserved(self):
        with tempfile.TemporaryDirectory() as d:
            path=Path(d)/'input.xlsx';b=Workbook();s=b.active;s.title='Source';s['A1']='history';s['C7']='=1+2';s['F9']='PASS';b.save(path)
            result=i.inspect_workbook(path,{'required_sheets':['Source'],'product_id':'SYNTHETIC_ONLY','manufacturer':'Test','registry_series':'Test','baseline_revision':'test'})
            self.assertEqual(result['tables']['Source']['cells']['C7'],{'value':'=1+2','type':'f'})
            self.assertEqual(result['tables']['Source']['cells']['F9']['value'],'PASS')
            self.assertFalse(result['qa_ready']);self.assertFalse(result['formal_pass'])
            self.assertEqual(len(result['tables']['Source']['cells']),3)
    def test_missing_sheet_is_rejected(self):
        with tempfile.TemporaryDirectory() as d:
            path=Path(d)/'input.xlsx';Workbook().save(path)
            with self.assertRaisesRegex(ValueError,'inventory'):
                i.inspect_workbook(path,{'required_sheets':['Missing']})

if __name__=='__main__':unittest.main()
