"""Resolve persisted current Formal and compare its live native Registry row."""
import argparse
import json
import sys
from pathlib import Path

def resolve(checkout, harness_root, instruction, registry_raw):
    sys.path.insert(0, str(Path(harness_root).resolve()))
    from harness.core import read_json, require
    from harness.production import short_route, native_registry
    from harness.changed_path import resolve_current
    checkout = Path(checkout)
    config = read_json(checkout / 'contracts/production/work-connections.v2.json')
    route = short_route(instruction, config)
    connection = next(p for p in config['products'] if p['product_id'] == route['product_id'])
    require(connection.get('formal_state_root') and connection.get('current_formal_selector'),
            'CURRENT_FORMAL_SELECTOR_REQUIRED', 'Use the product native resolver', 'CURRENT_FORMAL_RESOLUTION')
    root = checkout / connection['formal_state_root']
    selector = (checkout / connection['current_formal_selector']).relative_to(root).as_posix()
    current = resolve_current(root, selector)
    native = native_registry(registry_raw, route['baseline_selector']['manufacturer'], route['baseline_selector']['series'])
    require(native['package_version'] == current['revision'], 'NATIVE_FORMAL_DRIFT',
            'Live Registry and repository current Formal differ', 'CURRENT_FORMAL_RESOLUTION')
    return {'status': 'PASS', 'route': route, 'current': current, 'native_registry': native,
            'scope': current.get('source_scope'), 'next_action': 'Create new immutable change input from this current revision; preserve prior Work journal'}

if __name__ == '__main__':
    p = argparse.ArgumentParser()
    for key in ('checkout', 'harness-root', 'instruction', 'registry-response'):
        p.add_argument('--' + key, required=True)
    a = p.parse_args()
    print(json.dumps(resolve(a.checkout, a.harness_root, a.instruction,
                     json.loads(Path(a.registry_response).read_text())), ensure_ascii=False, indent=2))
