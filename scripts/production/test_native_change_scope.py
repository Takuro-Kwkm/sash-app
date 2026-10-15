import importlib.util,json,shutil,subprocess,tempfile,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
loader=importlib.util.spec_from_file_location('native_scope',ROOT/'scripts/production/native-change-scope.py');guard=importlib.util.module_from_spec(loader);loader.loader.exec_module(guard)
class NativeScope(unittest.TestCase):
    def setUp(self):
        tmp=tempfile.TemporaryDirectory();self.addCleanup(tmp.cleanup);self.root=Path(tmp.name)/'native'
        subprocess.run(['git','clone','--quiet','--shared',str(ROOT),str(self.root)],check=True)
        self.scope=json.loads((ROOT/guard.SCOPE_PATH).read_text());subprocess.run(['git','checkout','--quiet','--detach',self.scope['baseline_commit']],cwd=self.root,check=True)
        for name in self.scope['allowed_paths']:
            f=ROOT/name
            if f.exists():
                target=self.root/name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(f,target)
    def test_exact_successor_and_sealed_predecessor(self):self.assertEqual(guard.validate(self.root)['status'],'PASS')
    def test_unrelated_ui_mutation_rejected(self):
        p=self.root/'src/ui/web/app.js';p.write_bytes(p.read_bytes()+b'\n');self.assertEqual(guard.validate(self.root)['status'],'FAIL_CLOSED')
    def test_candidate_master_mutation_rejected(self):
        p=self.root/'changes/replus-runtime-v5/candidates/RPL_ROOM.xlsx';p.write_bytes(p.read_bytes()+b'\n');self.assertEqual(guard.validate(self.root)['status'],'FAIL_CLOSED')
    def test_untracked_outside_scope_rejected(self):
        (self.root/'foreign.json').write_text('{}');self.assertEqual(guard.validate(self.root)['status'],'FAIL_CLOSED')
    def test_scope_protection_removal_rejected(self):
        self.scope['protected_sha256'].pop(next(iter(self.scope['protected_sha256'])));(self.root/guard.SCOPE_PATH).write_text(json.dumps(self.scope));self.assertEqual(guard.validate(self.root)['status'],'FAIL_CLOSED')
if __name__=='__main__':unittest.main(verbosity=2)
