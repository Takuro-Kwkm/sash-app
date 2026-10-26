"""Connection admission only; no manufacturer facts, decision or storage."""
import hashlib
import json
from pathlib import Path


def validate(root):
    root = Path(root).resolve()
    read = lambda p: json.loads((root / p).read_bytes())
    config = read('contracts/production/work-connections.v2.json')
    validators = read('contracts/production/validator-registry.v2.json')
    matches = []
    for row in config['products']:
        if not row.get('formal_profile'): continue
        ref = row['formal_profile']; p = read(ref['path'])
        if p.get('scoped_working_formal') is not True: continue
        assert hashlib.sha256((root / ref['path']).read_bytes()).hexdigest() == ref['sha256']
        assert p['product_id'] == row['product_id'] and p['repository'] == row['repository']
        assert p['status'] == 'ADOPTED' and p['target_gate'] == 'FORMAL_CHANGE_ADOPTION'
        assert p['human_gate'] == 'HUMAN_ADOPTION' and p['formal_writes_before_human'] == 0
        assert p['automatic_orderability'] is False and p['runtime_ui_mutations'] == 0
        assert p['runtime_scope'] == 'NOT_INCLUDED_IN_PRODUCT_MASTER_FORMAL'
        assert p['shared_engine'] == 'scripts/production-work.py'
        assert p['native_preparer'] == 'scripts/production/prepare-sheet-package-formal.py'
        assert p['native_worker'] == 'scripts/production/sheet-package-formal.py'
        assert validators['products'][p['product_id']]['formal_profile'] == ref
        a = p['domain_adapter']; path = (root / a['path']).resolve()
        assert path.is_relative_to(root) and hashlib.sha256(path.read_bytes()).hexdigest() == a['sha256']
        assert p['baseline_states'] and p['completed_work_id']
        assert set(p['formal_scope_field_ids']).isdisjoint(p['excluded_field_ids'])
        assert p['transaction_owned_observations'] == ['native_registry']
        matches.append(p['profile_id'])
    assert matches
    return dict(status='PASS', profiles=matches, scope='CONNECTION_ONLY', formal=False, release=False)


if __name__ == '__main__':
    print(json.dumps(validate(Path(__file__).resolve().parents[2])))
