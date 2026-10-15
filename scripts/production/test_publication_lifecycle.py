import importlib.util
import json
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('lifecycle', ROOT / 'scripts/production/publication-lifecycle-scope.py')
guard = importlib.util.module_from_spec(spec)
spec.loader.exec_module(guard)


class LifecycleScopeTest(unittest.TestCase):
    def setUp(self):
        scratch = tempfile.TemporaryDirectory()
        self.addCleanup(scratch.cleanup)
        self.root = Path(scratch.name) / 'native'
        subprocess.run(['git', 'clone', '--quiet', '--shared', str(ROOT), str(self.root)], check=True)
        base, paths = guard.BASE, set(guard.ALLOWED)
        if (ROOT / 'contracts/production/giesta2-connection-scope.v1.json').exists():
            successor_spec = importlib.util.spec_from_file_location('sheets_scope', ROOT / 'scripts/production/giesta2-connection-scope.py')
            successor = importlib.util.module_from_spec(successor_spec)
            successor_spec.loader.exec_module(successor)
            base, paths = successor.BASE, paths | successor.ALLOWED
        if (ROOT / 'contracts/production/new-product-environment-scope.v1.json').exists():
            scope = json.loads((ROOT / 'contracts/production/new-product-environment-scope.v1.json').read_text())
            base, paths = scope['starting_main'], set(scope['allowed_paths'])
            self.scope_path = 'contracts/production/new-product-environment-scope.v1.json'
        else:
            self.scope_path = guard.SCOPE_PATH
        subprocess.run(['git', 'checkout', '--quiet', '--detach', base], cwd=self.root, check=True)
        for name in paths:
            source = ROOT / name
            if source.exists():
                target = self.root / name
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(source, target)

    def rejected(self):
        result = guard.validate(self.root)
        self.assertEqual(result['status'], 'FAIL_CLOSED', result)

    def test_prepared_successor(self):
        self.assertEqual(guard.validate(self.root)['status'], 'PASS')

    def test_formal_asset_change_rejected(self):
        target = self.root / 'contracts/production/formal-state/current/SER-LIX-SAMOSL.json'
        target.write_bytes(target.read_bytes() + b' ')
        self.rejected()

    def test_foreign_untracked_change_rejected(self):
        (self.root / 'unrelated-product.json').write_text('{}')
        self.rejected()

    def test_approval_downgrade_rejected(self):
        path = self.root / guard.PROFILE
        value = json.loads(path.read_bytes())
        value['mandatory_approvals'] = []
        path.write_text(json.dumps(value))
        self.rejected()

    def test_scope_widening_rejected(self):
        path = self.root / self.scope_path
        value = json.loads(path.read_bytes())
        value['allowed_paths'].append('src/ui/web/app.js')
        path.write_text(json.dumps(value))
        self.rejected()

    def test_missing_qa_pin_rejected(self):
        path = self.root / guard.PROFILE
        value = json.loads(path.read_bytes())
        value['native_files'].pop('scripts/production/publication-lifecycle-qa.mjs')
        path.write_text(json.dumps(value))
        self.rejected()


if __name__ == '__main__':
    unittest.main()
