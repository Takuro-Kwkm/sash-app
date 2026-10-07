#!/usr/bin/env python3
"""Bind acquired native sources to the existing production runner, without writes."""
import argparse
import json
import sys
from pathlib import Path


def prepare(harness_root, checkout, captures, destination, instruction):
    harness_root, checkout, root = [Path(p).resolve() for p in (harness_root, checkout, destination)]
    sys.path.insert(0, str(harness_root))
    from harness.core import require, read_json, write_json, sha
    from harness.production import repository_binding, native_registry, observation_fingerprint
    from harness.architecture import route_instruction
    from importlib.util import spec_from_file_location, module_from_spec
    module_spec = spec_from_file_location('native_audit', checkout/'scripts/production/catalog-change-audit.py')
    adapter = module_from_spec(module_spec); module_spec.loader.exec_module(adapter)
    c = read_json(captures); root.mkdir(parents=True, exist_ok=False)
    ref = lambda path: {'path': str(Path(path).resolve()), 'sha256': sha(Path(path).read_bytes())}
    route = route_instruction(harness_root, {c['repository']: str(checkout)}, instruction)
    require(route['target_gate'] == 'SOURCE_AUDIT_VERIFIED' and route.get('operation') == 'RUN'
            and any(word in instruction.lower() for word in ('最新版', 'latest')),
            'NATIVE_AUDIT_SCOPE', 'Acquire an admitted catalogue audit route', 'PREPARE')
    connection = next(p for p in read_json(checkout/'contracts/production/work-connections.v2.json')['products'] if p['product_id'] == route['product_id'])
    admitted = connection['catalogue_audit_profile']
    profile_path = (checkout/admitted['path']).resolve()
    require(profile_path.is_relative_to(checkout), 'NATIVE_PROFILE_CHANGED', 'Profile escapes native checkout', 'PREPARE')
    profile_ref = ref(profile_path); profile = read_json(profile_ref['path'])
    require(profile_ref['sha256'] == admitted['sha256'], 'NATIVE_PROFILE_CHANGED', 'Profile hash differs', 'PREPARE')
    require(profile['product_id'] == route['product_id'] and profile['mutation_policy'] == 'NONE', 'NATIVE_AUDIT_SCOPE', 'Read-only product identity required', 'PREPARE')
    row = native_registry(read_json(c['registry']), profile['manufacturer'], profile['registry_series'])
    binding = repository_binding(c['repository'], read_json(c['branch']), read_json(c['tree']), {p: checkout/p for p in c['captured_paths']})
    binding.update(checkout=str(checkout), observations={k: observation_fingerprint(read_json(v)) for k, v in c['observations'].items()})
    write_json(root/'production-binding.json', binding)
    contract = {**{k: c[k] for k in ('scope_id', 'authoring_file_id', 'runtime_manifest_file_id')},
                'product_id': route['product_id'], 'profile': profile_ref, 'native_registry': ref(c['registry']),
                **{k: ref(c[k]) for k in ('runtime_manifest', 'authoring', 'source_before', 'source_after',
                                        'source_before_metadata', 'source_after_metadata', 'official_locator', 'review', 'visual_comparison')},
                'preserved_refs': [ref(p) for p in c['preserved_paths']]}
    write_json(root/'contract.json', contract)
    worker = ref(checkout/'scripts/production/catalog-change-audit.py'); steps = []
    for gate in adapter.STAGES:
        if gate == 'COMPLETION':
            for saved in adapter.STAGES[:-1]:
                steps.append({'id': 'SAVE_'+saved, 'kind': 'storage', 'needs': ['AUDIT_REVIEW'],
                              'source': '{work}/'+saved+'.json', 'destination': c['work_id']+'/'+saved+'.json'})
        needs = [s['id'] for s in steps if s['kind'] == 'storage'] if gate == 'COMPLETION' else [steps[-1]['id']] if steps else []
        steps.append({'id': gate, 'kind': 'validator', 'needs': needs, 'script': worker,
                      'args': ['--harness-root', str(harness_root), '--contract', '{input}', '--stage', gate, '--work', '{work}', '--out', '{work}/'+gate+'.json'],
                      'output': '{work}/'+gate+'.json', 'result_path': ['status'], 'expected_result': 'PASS', 'timeout_seconds': 240})
    workflow = {'workflow_id': 'NATIVE_CATALOGUE_AUDIT_V1', 'version': '1.0.0', 'status': 'CURRENT',
                'work_skill': 'product-change-work', 'steps': steps, 'targets': {'SOURCE_AUDIT_VERIFIED': ['COMPLETION']},
                'scope': 'PRIMARY_CATALOGUE_READ_ONLY; no Formal/source/runtime adoption'}
    write_json(root/'workflow.json', workflow)
    authorities = [{**ref(path), 'authority_id': key, 'authority_type': key, 'repository': 'LIVE_DRIVE_SASH_GOVERNANCE',
                    'version': c['authority_versions'][key], 'status': 'ACTIVE', 'scope_axis': 'PROJECT_CURRENT',
                    'resolution_source': 'LIVE_CURRENT_INFORMATION_SOURCE_MANIFEST'} for key, path in c['authorities'].items()]
    authorities.append({**ref(root/'workflow.json'), 'authority_id': 'NATIVE_AUDIT_WORKFLOW', 'authority_type': 'WORKFLOW',
                        'repository': c['repository'], 'version': '1.0.0', 'status': 'CURRENT', 'scope_axis': 'PROJECT_CURRENT', 'resolution_source': 'MERGED_NATIVE_PROFILE'})
    write_json(root/'authority-index.json', {'status': 'CURRENT', 'entries': authorities})
    write_json(root/'registry.json', {'registry_id': 'NATIVE_AUDIT_CURRENT', 'version': row['package_version'], 'status': 'CURRENT',
        'products': [{'product_id': route['product_id'], 'aliases': profile['aliases'], 'master_state': 'PRESENT',
                      'lifecycle_state': 'FORMAL', 'formal_revision': row['package_version'], 'native_entry': row}]})
    sources = [{**ref(c[key]), 'source_id': profile[key]['file_id'], 'identity': profile[key]['code'], 'version': profile[key]['issue'],
                'product_id': route['product_id'], 'role': role, 'status': status} for key, role, status in
               [('source_before', 'CURRENT_ADOPTED', 'CURRENT'), ('source_after', 'NEW_CANDIDATE', 'CANDIDATE')]]
    spec = {'workflow_id': c['work_id'], 'work_skill': 'product-change-work', 'target': route['product_id'], 'target_gate': 'SOURCE_AUDIT_VERIFIED',
            'skill_root': str(checkout/'scripts/production'), 'authority_index': ref(root/'authority-index.json'), 'authorities': authorities,
            'registry': ref(root/'registry.json'), 'sources': sources, 'workflow': ref(root/'workflow.json'), 'input': ref(root/'contract.json'),
            'runtime_refs': [ref(checkout/p) for p in c['captured_paths']] + contract['preserved_refs'] + [profile_ref, contract['review'], contract['visual_comparison']],
            'storage_root': str(root/'saved'), 'production_binding': ref(root/'production-binding.json'),
            'production_routing': ref(checkout/'contracts/production/work-connections.v2.json')}
    write_json(root/'spec.json', spec)
    return {'status': 'PREPARED', 'spec': str(root/'spec.json'), 'route': route, 'binding_head': binding['head_sha']}


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    for key in ('harness-root', 'checkout', 'captures', 'destination', 'instruction'): p.add_argument('--'+key, required=True)
    a = p.parse_args()
    print(json.dumps(prepare(a.harness_root, a.checkout, a.captures, a.destination, a.instruction), ensure_ascii=False, indent=2))
