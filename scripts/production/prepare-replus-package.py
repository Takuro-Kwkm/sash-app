#!/usr/bin/env python3
"""Prepare one immutable native audit binding for the existing Shared v2 engine."""
import argparse
import importlib.util
import json
import sys
from pathlib import Path


def prepare(central, checkout, captures, destination, instruction):
    central, checkout, root = [Path(p).resolve() for p in (central, checkout, destination)]
    sys.path.insert(0, str(central))
    from harness.architecture import route_instruction
    from harness.current_authority import compatibility
    from harness.core import read_json, write_json, sha, require
    from harness.production import repository_binding, observation_fingerprint
    compatibility(central, checkout)
    route = route_instruction(central, {'Takuro-Kwkm/sash-app': str(checkout)}, instruction)
    config = read_json(checkout/'contracts/production/work-connections.v2.json')
    entry = next(p for p in config['products'] if p['product_id'] == route['product_id'])
    admitted = entry.get('existing_package_profile')
    require(admitted and route['target_gate'] == admitted['target_gate']
            and route['operation'] == 'RUN', 'NATIVE_OPERATION_UNSUPPORTED',
            'Only the declared seven-component package audit is admitted; no Formal, Resume rebind or Release fallback', 'PREPARE')
    c = read_json(captures)
    profile_path = (checkout/admitted['path']).resolve()
    require(profile_path.is_relative_to(checkout) and sha(profile_path.read_bytes()) == admitted['sha256'],
            'NATIVE_PROFILE_CHANGED', 'Acquire fixed native profile', 'PREPARE')
    profile = read_json(profile_path)
    require(profile['product_id'] == route['product_id'] and profile['mutation_policy'] == 'NONE'
            and c['component_ids'] == [x['component_id'] for x in profile['components']],
            'NATIVE_COMPONENT_SCOPE', 'Audit must include all seven captured components', 'PREPARE')
    require(not root.exists(), 'IMMUTABLE_WORK_EXISTS', 'Resume or inspect the existing binding; never overwrite it', 'PREPARE')
    ref = lambda p: {'path': str(Path(p).resolve()), 'sha256': sha(Path(p).read_bytes())}
    binding = repository_binding(route['repository'], read_json(c['branch']), read_json(c['tree']),
                                 {p: checkout/p for p in c['captured_paths']})
    binding.update(checkout=str(checkout), observations={k: observation_fingerprint(read_json(v)) for k,v in c['observations'].items()})
    module_spec = importlib.util.spec_from_file_location('native_existing_package', checkout/'scripts/production/replus-package.py')
    adapter = importlib.util.module_from_spec(module_spec)
    module_spec.loader.exec_module(adapter)
    adapter.baseline(checkout, profile, Path(c['registry']).read_text())
    root.mkdir(parents=True)
    write_json(root/'production-binding.json', binding)
    contract = {'work_id': c['work_id'], 'checkout': str(checkout), 'product_id': route['product_id'],
                'target_gate': profile['admitted_target_gate'], 'scope': profile['scope'],
                'profile': ref(profile_path), 'native_registry': ref(c['registry']), 'storage_root': str(root/'saved')}
    write_json(root/'contract.json', contract)
    worker = ref(checkout/'scripts/production/replus-package.py')
    steps = []
    for gate in adapter.STAGES:
        if gate == 'COMPLETION':
            for previous in adapter.STAGES[:-1]:
                steps.append({'id': 'SAVE_'+previous, 'kind': 'storage', 'needs': [steps[-1]['id']],
                              'source': '{work}/'+previous+'.json', 'destination': '{workflow_id}/'+previous+'.json'})
        steps.append({'id': gate, 'kind': 'validator', 'needs': [steps[-1]['id']] if steps else [],
                      'script': worker, 'args': ['--contract', '{input}', '--stage', gate, '--work', '{work}', '--out', '{work}/'+gate+'.json'],
                      'output': '{work}/'+gate+'.json', 'result_path': ['status'], 'expected_result': 'PASS', 'timeout_seconds': 180})
    workflow = {'workflow_id': profile['profile_id'], 'status': 'CURRENT', 'version': '1.0.0',
                'work_skill': 'product-change-work', 'steps': steps,
                'targets': {profile['admitted_target_gate']: ['COMPLETION']}, 'mutation_policy': 'NONE'}
    write_json(root/'workflow.json', workflow)
    authorities = [{**ref(path), 'authority_id': key, 'authority_type': key, 'repository': 'LIVE_DRIVE_SASH_GOVERNANCE',
                    'version': c['authority_versions'][key], 'status': 'ACTIVE', 'scope_axis': 'PROJECT_CURRENT',
                    'resolution_source': 'LIVE_CURRENT_INFORMATION_SOURCE_MANIFEST'} for key,path in c['authorities'].items()]
    authorities.append({**ref(root/'workflow.json'), 'authority_id': 'NATIVE_PACKAGE_AUDIT_WORKFLOW', 'authority_type': 'WORKFLOW',
                        'repository': route['repository'], 'version': '1.0.0', 'status': 'CURRENT', 'scope_axis': 'PROJECT_CURRENT',
                        'resolution_source': 'ISOLATED_TECHNICAL_CANDIDATE; not Formal or manufacturer evidence'})
    write_json(root/'authority-index.json', {'status': 'CURRENT', 'entries': authorities})
    write_json(root/'registry.json', {'registry_id': 'NATIVE_OBSERVED_FORMAL', 'status': 'CURRENT', 'version': profile['formal_package_version'],
               'products': [{'product_id': route['product_id'], 'aliases': profile['aliases'], 'master_state': 'PRESENT',
                             'lifecycle_state': 'FORMAL', 'formal_revision': profile['formal_package_version']}]})
    # Source declaration inventory is explicitly archived. It is never offered
    # as complete official PDF bytes or a new Current source adoption.
    source = {**ref(checkout/profile['manifests']['runtime-manifest.json']['path']),
              'source_id': 'EXISTING_FORMAL_SOURCE_DECLARATIONS', 'identity': 'DECLARATIONS_NOT_OFFICIAL_PDF_BYTES',
              'version': profile['formal_package_version'], 'product_id': route['product_id'], 'role': 'ARCHIVED', 'status': 'ARCHIVED'}
    refs = [ref(checkout/p) for p in c['captured_paths']]
    refs += [ref(p) for p in (checkout/'contracts/production/replus').rglob('*') if p.is_file()]
    refs += [ref(checkout/p) for p in ('scripts/production/replus-package.py', 'scripts/production/prepare-replus-package.py',
                                     'scripts/production/replus-work.py', 'contracts/production/work-connections.v2.json',
                                     'contracts/production/validator-registry.v2.json')]
    refs += [ref(p) for p in (central/'harness').glob('*.py')]
    refs += [ref(central/p) for p in ('scripts/production-work.py','scripts/architecture-work.py',
             'registries/current-architecture.v2.json','registries/skill-authority.v2.json',
             'work_skills/product-change-work/SKILL.md','work_skills/app-quality-review/SKILL.md')]
    spec = {'workflow_id': c['work_id'], 'work_skill': 'product-change-work', 'target': route['product_id'],
            'target_gate': profile['admitted_target_gate'], 'skill_root': str(checkout/'scripts/production'),
            'authority_index': ref(root/'authority-index.json'), 'authorities': authorities,
            'registry': ref(root/'registry.json'), 'sources': [source], 'workflow': ref(root/'workflow.json'),
            'input': ref(root/'contract.json'), 'runtime_refs': refs+[ref(c['registry'])],
            'storage_root': str(root/'saved'), 'production_binding': ref(root/'production-binding.json'),
            'production_routing': ref(checkout/'contracts/production/work-connections.v2.json')}
    write_json(root/'spec.json', spec)
    write_json(root/'live-state.json', {'repository': read_json(c['branch']), 'observations': {k:read_json(v) for k,v in c['observations'].items()}})
    return {'status': 'PREPARED', 'spec': str(root/'spec.json'), 'route': route, 'product_qa': 'NOT_REISSUED'}


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    for key in ('central','checkout','captures','destination','instruction'):
        p.add_argument('--'+key, required=True)
    a = p.parse_args()
    try:
        print(json.dumps(prepare(a.central,a.checkout,a.captures,a.destination,a.instruction),ensure_ascii=False,indent=2))
    except (OSError, ValueError, KeyError, TypeError) as error:
        print(json.dumps({'status':'FAIL_CLOSED','blocking_reason':{'reason':str(error)},'external_operations':0}))
        raise SystemExit(2)
