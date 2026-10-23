"""Validate the admitted XLSX recovery boundary and existing sales-QA binding."""
import hashlib
import json
from pathlib import Path


def validate(root):
    root = Path(root).resolve()
    read = lambda path: json.loads((root / path).read_text())
    config = read('contracts/production/work-connections.v2.json')
    validators = read('contracts/production/validator-registry.v2.json')
    selected = [p for p in config['products'] if p.get('build_profile', {}).get('profile_id')
                == 'sash-existing-xlsx-working-sales-qa-v1']
    assert selected, 'No admitted XLSX Working profile'
    for product in selected:
        entry = product['build_profile']
        profile = read(entry['path'])
        assert hashlib.sha256((root / entry['path']).read_bytes()).hexdigest() == entry['sha256']
        assert profile['product_id'] == product['product_id'] and profile['repository'] == product['repository']
        assert profile['status'] == 'ADOPTED' and profile['scope'] == product['connection_scope'] == 'EXISTING_WORKING_SALES_QA'
        assert product['connection_state'] == 'CONNECTED' and product['default_gate'] == profile['target_gate'] == 'QA_READY'
        assert profile['native_adapter'] == product['native_adapter'] == 'scripts/production/working-master-business-qa.py'
        assert profile['native_prepare'] == product['prepare_adapter'] == 'scripts/production/prepare-working-master-business-qa.py'
        previous = profile['predecessor_profile']
        assert hashlib.sha256((root / previous['path']).read_bytes()).hexdigest() == previous['sha256']
        recovery = read(previous['path'])
        assert recovery['product_id'] == product['product_id'] and recovery['header_row'] >= 1
        assert recovery['scope'] == 'STRUCTURAL_DRAFT_RECOVERY_ONLY'
        assert len(recovery['required_tables']) == len(set(recovery['required_tables']))
        assert set(recovery['required_runtime_tables']) <= set(recovery['required_tables'])
        assert recovery['runtime_bundle'] and recovery['working_states']
        for admitted in (profile, recovery):
            for path, expected in admitted['implementation_hashes'].items():
                target = (root / path).resolve()
                assert target.is_relative_to(root) and hashlib.sha256(target.read_bytes()).hexdigest() == expected, path
        v = validators['products'][product['product_id']]
        assert v['native_profile'] == entry and v['state'] == 'READY' and v['no_fallback'] is True
        assert v['scope'] == profile['scope'] and v['validators'] == product['validators']
        assert set(product['unsupported_gates']) == {'FORMAL', 'INTEGRATION', 'RELEASE'}
    return {'status': 'PASS', 'scope': 'NATIVE_PROFILE_ADMISSION_ONLY', 'profiles': len(selected),
            'business_qa': False, 'formal': False}


if __name__ == '__main__':
    print(json.dumps(validate(Path(__file__).resolve().parents[2])))
