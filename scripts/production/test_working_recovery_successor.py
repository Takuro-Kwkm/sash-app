"""Actual selected native-scope checks in isolated, disposable clones."""
import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]


class WorkingRecoverySuccessor(unittest.TestCase):
    def test_selected_carrier_and_protected_bytes(self):
        with tempfile.TemporaryDirectory(prefix='working-native-scope-') as temporary:
            target = Path(temporary) / 'native'
            subprocess.run(['git', 'clone', '--quiet', '--no-local', str(ROOT), str(target)], check=True)
            spec = importlib.util.spec_from_file_location('native_working_v35',
                target / 'scripts/production/sash-authority-successor.py')
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            selection = json.loads((target / 'contracts/production/current-authority-successor.json').read_bytes())
            self.assertIn(selection['path'], {
                'contracts/production/authority-successors/working-recovery.v35.json',
                'contracts/production/authority-successors/scoped-working-formal.v38.json'})
            proof = module.validate(target)
            self.assertEqual(proof['status'], 'PASS', proof)
            self.assertFalse(proof['qa_skip_authority'])
            self.assertFalse(proof['formal_or_runtime_ui_mutation'])
            self.assertFalse(proof['release_profile_admission'])
            self.assertEqual(proof['retained_native_proof'], 'PASS')
            names = ['contracts/production/work-connections.v2.json',
                     'contracts/production/current-work.json',
                     'contracts/production/current-authority-successor.json',
                     selection['path'],
                     'contracts/production/working-recovery-shared.v35.json',
                     'contracts/production/working-recovery-shared.v35.bundle',
                     'scripts/production/working-master-xlsx-recovery.py']
            names.extend(module.VERSIONS[selection['path']][:2])
            protected = next(name for name in proof['verified_unchanged_sha256']
                             if name.startswith('src/') and name.endswith(('.mjs', '.ts', '.js')))
            names.append(protected)
            for name in names:
                with self.subTest(name=name):
                    path = target / name
                    original = path.read_bytes()
                    subprocess.run(['git', 'update-index', '--assume-unchanged', name], cwd=target, check=True)
                    try:
                        path.write_bytes(original + b'\n')
                        self.assertEqual(module.validate(target)['status'], 'FAIL_CLOSED')
                    finally:
                        path.write_bytes(original)
            stray = target / 'scripts/production/second_recovery.py'
            stray.write_text('pass\n')
            self.assertEqual(module.validate(target)['status'], 'FAIL_CLOSED')


if __name__ == '__main__':
    unittest.main()
