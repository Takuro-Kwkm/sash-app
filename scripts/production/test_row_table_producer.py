import copy
import hashlib
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

loader=importlib.util.spec_from_file_location('native_producer',Path(__file__).with_name('produce-row-table-runtime-candidate.py'))
worker=importlib.util.module_from_spec(loader);loader.loader.exec_module(worker)


class Producer(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.original=json.loads(Path(__file__).with_name('row-table-producer.test-contract.json').read_text())

    def setUp(self):
        self.directory=tempfile.TemporaryDirectory();self.addCleanup(self.directory.cleanup)
        self.root=Path(self.directory.name);self.contract=copy.deepcopy(self.original)

    def change_registry(self, change):
        doc=json.loads(worker.checked(self.contract['inputs']['registry']));change(doc)
        path=self.root/'registry.json';path.write_text(json.dumps(doc,ensure_ascii=False))
        self.contract['inputs']['registry']={'path':str(path),'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}

    def test_real_candidate_executes_source_cases_and_preserves_original(self):
        before={k:worker.checked(v) for k,v in self.contract['inputs'].items()}
        out=self.root/'output';receipt=worker.produce(self.contract,out)
        qa=json.loads((out/'native-constraint-qa.json').read_text());package=json.loads((out/'runtime-package.candidate.json').read_text())
        self.assertEqual(qa['checks'],40);self.assertEqual(qa['status'],'PASS')
        self.assertEqual(receipt['formal_files_written'],0);self.assertEqual(receipt['new_human_decisions'],0)
        self.assertEqual(receipt['role'],'EXISTING_FORMAL_INPUT_INSPECTION_ONLY')
        self.assertEqual(package['fields'].__len__(),45);self.assertFalse(receipt['product_qa_ready'])
        self.assertEqual(before,{k:worker.checked(v) for k,v in self.contract['inputs'].items()})

    def test_changed_master_bytes_rejected(self):
        self.contract['inputs']['master']['sha256']='0'*64
        with self.assertRaisesRegex(ValueError,'NATIVE_INPUT_CHANGED'):worker.produce(self.contract,self.root/'output')

    def test_wrong_registry_not_absence(self):
        self.change_registry(lambda d:d.update(isError=True))
        with self.assertRaisesRegex(ValueError,'REGISTRY_ACQUISITION_FAILED'):worker.produce(self.contract,self.root/'output')

    def test_wrong_registry_identity_rejected(self):
        self.contract['registry_id']='another-registry'
        with self.assertRaisesRegex(ValueError,'REGISTRY_IDENTITY'):worker.produce(self.contract,self.root/'output')

    def test_other_product_cannot_borrow_formal(self):
        self.contract['identity']['series']='another-product'
        with self.assertRaisesRegex(ValueError,'EXISTING_FORMAL_REQUIRED'):worker.produce(self.contract,self.root/'output')

    def test_existing_output_never_overwritten(self):
        out=self.root/'output';out.mkdir();(out/'original').write_text('preserve')
        with self.assertRaisesRegex(ValueError,'OUTPUT_EXISTS'):worker.produce(self.contract,out)
        self.assertEqual((out/'original').read_text(),'preserve')

    def test_unrelated_exporter_rejected(self):
        self.contract['exporter']=copy.deepcopy(self.contract['projection'])
        with self.assertRaisesRegex(ValueError,'NATIVE_IMPLEMENTATION_SCOPE'):worker.produce(self.contract,self.root/'output')

    def test_existing_formal_inspection_does_not_adopt_candidate(self):
        receipt=worker.produce(self.contract,self.root/'output','formal')
        self.assertEqual(receipt['mode'],'EXISTING_FORMAL_CARRY_FORWARD')
        self.assertEqual(receipt['written_files'],0)
        self.assertEqual(receipt['new_human_decisions'],0)
        self.assertFalse(receipt['candidate_formal_adoption'])
        preserved=(self.root/'output/formal-preserved.json').read_bytes()
        self.assertEqual(preserved,worker.checked(self.contract['inputs']['master']))


if __name__=='__main__':unittest.main()
