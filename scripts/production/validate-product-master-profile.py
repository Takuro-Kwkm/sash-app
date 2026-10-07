#!/usr/bin/env python3
"""Native CI readback. Shared reference bytes are checked by the acquired router."""
import hashlib
import json
import re
from pathlib import Path


def validate(root):
    root = Path(root).resolve()
    read = lambda name: json.loads((root / name).read_text())
    pointer = read('contracts/production/current-architecture.json')
    config = read(pointer['adapter_registry'])
    entry = pointer['new_product_build_profile']
    assert entry == config['new_product_build_profile'], 'Profile pointer drift'
    path = (root / entry['path']).resolve()
    assert path.is_relative_to(root) and path.is_file(), 'Profile path escapes checkout'
    assert hashlib.sha256(path.read_bytes()).hexdigest() == entry['sha256'], 'Profile hash drift'
    profile = json.loads(path.read_text())
    assert profile['repository'] == 'Takuro-Kwkm/sash-app'
    assert profile['profile_id'] == entry['profile_id'] == 'sash-new-product-master-v1'
    assert profile['status'] == 'ADOPTED' and profile['mode'] == 'NEW_PRODUCT_MASTER_BUILD'
    assert profile['work_skill'] == 'product-master-builder'
    assert profile['contracts']['registry_bootstrap']['absent_is_normal'] is True
    assert profile['contracts']['output_boundary']['formal_writes'] == 0
    assert profile['contracts']['output_boundary']['runtime_ui_writes'] == 0
    assert profile['contracts']['output_boundary']['release_writes'] == 0
    for ref in profile['refs'].values():
        assert ref['owner'] in ('native', 'shared') and re.fullmatch('[0-9a-f]{64}', ref['sha256'])
        assert not Path(ref['path']).is_absolute() and '..' not in Path(ref['path']).parts
        if ref['owner'] == 'native':
            p = (root / ref['path']).resolve()
            assert p.is_relative_to(root) and p.is_file()
            assert hashlib.sha256(p.read_bytes()).hexdigest() == ref['sha256'], ref['path']
    registered = read(pointer['validator_registry'])['build_profiles'][entry['profile_id']]
    assert registered == {'state': 'READY', 'validator': profile['refs']['native_validator']['path'], 'no_fallback': True}
    # Profile adoption changes no product connection state or production adapter.
    assert len(config['products']) == len(read(pointer['validator_registry'])['products'])
    assert not any('NEW-CANDIDATE-' in p['product_id'] for p in config['products'])
    return {'status': 'PASS', 'profile_id': profile['profile_id'], 'native_references':
        sum(r['owner'] == 'native' for r in profile['refs'].values()),
        'scope': 'NATIVE_CI_POINTER_AND_HASH_READBACK; shared bytes/schema/routing verified by acquired Current host',
        'formal_writes': 0, 'legacy_selection': 0}


if __name__ == '__main__': print(json.dumps(validate(Path(__file__).resolve().parents[2])))
