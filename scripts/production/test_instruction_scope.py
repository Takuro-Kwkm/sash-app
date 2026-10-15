"""Refuse protected-byte changes and scope expansion, including untracked files."""
import importlib.util
import json
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('instructions_guard',ROOT/'scripts/production/instruction-scope.py')
guard=importlib.util.module_from_spec(spec);spec.loader.exec_module(guard)

class InstructionScopeTests(unittest.TestCase):
    def test_current_and_original_native_guard_pass(self):
        self.assertEqual(guard.validate(ROOT)['status'],'PASS')

    def test_mutations_and_scope_expansion_fail(self):
        if (ROOT/'contracts/production/giesta2-formal-scope.v1.json').exists():
            with tempfile.TemporaryDirectory() as folder:
                baseline=Path(folder)/'sealed'
                subprocess.run(['git','clone','--quiet','--shared','--dissociate',str(ROOT),str(baseline)],check=True)
                subprocess.run(['git','-C',str(baseline),'checkout','--quiet','--detach','54f397a8ef3b5061f35fd4d0b9100db7b159d88a'],check=True)
                import sys
                subprocess.run([sys.executable,'-B',str(baseline/'scripts/production/test_instruction_scope.py')],check=True)
            return
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory)/'native';guard.materialize(ROOT,root)
            for path in guard.ALLOWED:
                target=root/path;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(ROOT/path,target)
            self.assertEqual(guard.verify(root)['status'],'PASS')
            scope=json.loads((root/guard.SCOPE).read_text())
            protected=next(p for p in scope['protected_sha256'] if p.startswith('contracts/production/') and p.endswith('.json'))
            target=root/protected;original=target.read_bytes();target.write_bytes(original+b' ')
            with self.assertRaisesRegex(AssertionError,'BYTE_DRIFT'):guard.verify(root)
            target.write_bytes(original)
            foreign=root/'unapproved-instruction.txt';foreign.write_text('extra')
            with self.assertRaisesRegex(AssertionError,'OUT_OF_SCOPE'):guard.verify(root)
            foreign.unlink()
            scope['allowed_paths'].append('unapproved-instruction.txt');(root/guard.SCOPE).write_text(json.dumps(scope))
            with self.assertRaisesRegex(AssertionError,'SCOPE_EXPANSION'):guard.verify(root)

if __name__=='__main__':unittest.main()
