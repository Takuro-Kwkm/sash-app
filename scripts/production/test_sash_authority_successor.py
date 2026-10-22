"""Adversarial checks mutate only temporary isolated clones."""
import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]


class SuccessorTests(unittest.TestCase):
    def test_native_drift_is_rejected(self):
        names = ['contracts/production/work-connections.v2.json',
                 'contracts/production/validator-registry.v2.json',
                 'contracts/production/current-work.json',
                 'contracts/production/current-authority-successor.json',
                 'scripts/production/validate-current-authority-successor.py',
                 'contracts/production/authority-successors/sash-verification.v29.json']
        with tempfile.TemporaryDirectory(prefix='sash-adversarial-') as temporary:
            clone = Path(temporary) / 'native'
            subprocess.run(['git', 'clone', '--quiet', '--no-local', str(ROOT), str(clone)], check=True)
            definition = importlib.util.spec_from_file_location('sash_successor_test', clone / 'scripts/production/sash-authority-successor.py')
            module = importlib.util.module_from_spec(definition)
            definition.loader.exec_module(module)
            for name in names:
                with self.subTest(name=name):
                    path = clone / name
                    before = path.read_bytes()
                    try:
                        if name.endswith('work-connections.v2.json'):
                            record = json.loads(before)
                            record['products'].append(record['products'][0])
                            path.write_text(json.dumps(record))
                        else:
                            path.write_bytes(before + b'\n')
                        self.assertEqual(module.validate(clone)['status'], 'FAIL_CLOSED')
                    finally:
                        path.write_bytes(before)


if __name__ == '__main__':
    unittest.main()
