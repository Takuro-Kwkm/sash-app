"""Real candidate table parity and mutation rejection; no synthetic Formal proof."""
import importlib.util,json,os,shutil,tempfile,unittest,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
CENTRAL=Path(os.environ['SHARED_HARNESS_ROOT'])
loader=importlib.util.spec_from_file_location('native_tables',ROOT/'scripts/production/table-package-change.py');worker=importlib.util.module_from_spec(loader);loader.loader.exec_module(worker)
ref=lambda p:{'path':str(p),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}

class TablePackageChange(unittest.TestCase):
    def setUp(self):
        tmp=tempfile.TemporaryDirectory();self.addCleanup(tmp.cleanup);self.temp=Path(tmp.name)
        p=ROOT/'contracts/production/native-change-profiles/replus-v13.json';profile=json.loads(p.read_text());base=ROOT/profile['table_root']
        self.contract={'checkout':str(ROOT),'profile':ref(p),'components':[],'runtime_index':ref(base/'index.json')}
        for key in profile['components']:
            self.contract['components'].append({'id':key,'authoring':ref(base/'candidates'/f'{key}.xlsx'),'table_data':ref(base/'candidates'/f'{key}.json'),'module':ref(base/'candidates'/f'{key}.module.json'),'projection':ref(base/'candidates'/f'{key}.projection.json')})
    def run_case(self):
        path=self.temp/'input.json';path.write_text(json.dumps(self.contract));return worker.run('AUTHORING_AND_DEPENDENCY_QA',path,self.temp,CENTRAL)
    def test_seven_native_workbooks_match_reviewed_tables_and_modules(self):
        r=self.run_case();self.assertEqual(r['validated']['workbooks'],7);self.assertGreater(r['validated']['cells'],20000)
    def test_missing_component_rejected(self):
        self.contract['components'].pop()
        with self.assertRaises(Exception):self.run_case()
    def test_duplicate_component_rejected(self):
        self.contract['components'][-1]=self.contract['components'][0]
        with self.assertRaises(Exception):self.run_case()
    def test_authoring_byte_tamper_rejected(self):
        item=self.contract['components'][0];path=self.temp/'tampered.xlsx';path.write_bytes(Path(item['authoring']['path']).read_bytes()+b'tamper');item['authoring']['path']=str(path)
        with self.assertRaises(Exception):self.run_case()
    def test_substituted_module_even_with_rehashed_ref_rejected(self):
        item=self.contract['components'][0];path=self.temp/'module.json';data=json.loads(Path(item['module']['path']).read_text());data['formal_adoption']=True;path.write_text(json.dumps(data));item['module']=ref(path)
        with self.assertRaises(Exception):self.run_case()
    def test_xlsx_table_semantic_mismatch_rejected(self):
        item=self.contract['components'][0];path=self.temp/'table.json';data=json.loads(Path(item['table_data']['path']).read_text());data['tables']['14_UI選択契約']['values'][0][0]='tamper';path.write_text(json.dumps(data));item['table_data']=ref(path)
        with self.assertRaises(Exception):self.run_case()

if __name__=='__main__':unittest.main(verbosity=2)
