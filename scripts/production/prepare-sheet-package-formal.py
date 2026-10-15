#!/usr/bin/env python3
"""Bind admitted native Formal captures to the existing Shared v2 engine."""
import argparse
import importlib.util
import json
import subprocess
import sys
from pathlib import Path


def prepare(shared, checkout, captures, destination, instruction):
    shared, checkout, root = [Path(x).resolve() for x in (shared, checkout, destination)]
    sys.path.insert(0, str(shared))
    from harness.core import read_json, write_json, sha, require
    from harness.architecture import route_instruction
    from harness.current_authority import compatibility, semantic_hashes
    from harness.production import repository_binding, observation_fingerprint, connector_document
    compatibility(shared, checkout)
    c = read_json(captures)
    route = route_instruction(shared, {c['repository']: str(checkout)}, instruction, c['product_id'])
    require(route['target_gate'] == 'FORMAL_CHANGE_ADOPTION', 'FORMAL_TARGET_REQUIRED',
            'Use this native profile only for an explicit Formal adoption', 'PREPARE')
    connection = next(x for x in read_json(checkout/'contracts/production/work-connections.v2.json')['products']
                      if x['product_id'] == c['product_id'])
    def ref(path):
        path = Path(path).resolve()
        return {'path': str(path), 'sha256': sha(path.read_bytes())}
    selected = connection['formal_profile']
    profile = ref(checkout/selected['path'])
    require(profile['sha256'] == selected['sha256'], 'NATIVE_PROFILE_CHANGED', 'Reacquire the Formal profile', 'PREPARE')
    p = read_json(profile['path'])
    require(p['native_preparer'] == 'scripts/production/prepare-sheet-package-formal.py'
            and p['shared_engine'] == 'scripts/production-work.py', 'NATIVE_PROFILE_CHANGED', 'Use the admitted native entry', 'PREPARE')
    require(not root.exists(), 'IMMUTABLE_WORK_EXISTS', 'Resume the saved binding; never replace it', 'PREPARE')
    contract = {**c['contract'], 'profile': profile, 'checkout': str(checkout), 'harness_root': str(shared),
                'product_id': c['product_id'], 'revision': p['candidate_revision'],
                'decision_path': str(root/'human-decision.json'),
                'execution_observations_path': str(root/'execution-observations.json'),
                'move_readback_path': str(root/'move-readback.json'),
                'native_readback_path': str(root/'native-connector-readback.json')}
    module = importlib.util.spec_from_file_location('native_formal', checkout/p['native_worker'])
    worker = importlib.util.module_from_spec(module); module.loader.exec_module(worker); worker.setup(shared)
    worker.baseline(contract)
    worker.review(contract, root/'checkpoint')
    observations = {key: read_json(path) for key, path in c['observations'].items()}
    required_observations = {'central_branch', 'native_registry', 'information_manifest',
                             'working_authoring_metadata', 'canonical_listing'}
    if p.get('baseline_kind') != 'EXISTING_WORKING_DOMAIN': required_observations.add('formal_authoring_metadata')
    require(required_observations.issubset(observations),
            'AUTHORITY_ACQUISITION_REQUIRED', 'Acquire live native identities and Current', 'PREPARE')
    require(connector_document(observations['central_branch'])['commit']['sha'] ==
            subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=shared, text=True).strip(),
            'CURRENT_AUTHORITY_UNVERIFIED', 'Central acquisition differs from executing checkout', 'PREPARE')
    binding = repository_binding(c['repository'], read_json(c['branch']), read_json(c['tree']),
                                 {path: checkout/path for path in c['captured_paths']})
    # These are planned native transaction targets, not immutable live authorities.
    # Their exact before/after identities stay pinned in input/plan and native receipts.
    owned = {'formal_authoring_metadata', 'canonical_listing'}
    binding.update(checkout=str(checkout),
                   observations={key: observation_fingerprint(v) for key, v in observations.items() if key not in owned},
                   native_transaction_before={key: observation_fingerprint(v) for key, v in observations.items() if key in owned})
    root.mkdir(parents=True)
    write_json(root/'production-binding.json', binding)
    write_json(root/'live-state.json', {'repository': read_json(c['branch']), 'observations': observations})
    write_json(root/'contract.json', contract)
    script = ref(checkout/p['native_worker'])
    steps = []
    def validator(stage, need):
        return {'id': stage, 'kind': 'validator', 'needs': [need] if need else [], 'script': script,
                'args': ['--harness-root', str(shared), '--contract', '{input}', '--stage', stage,
                         '--work', '{work}', '--out', '{work}/'+stage+'.json'],
                'output': '{work}/'+stage+'.json', 'result_path': ['status'], 'expected_result': 'PASS',
                'timeout_seconds': 1800 if stage == 'FORMAL_CONTENT_QA' else 300}
    for stage in worker.STAGES: steps.append(validator(stage, steps[-1]['id'] if steps else None))
    steps.append({'id': 'HUMAN_ADOPTION', 'kind': 'human', 'needs': ['FORMAL_REVIEW'],
                  'packet': '{work}/FORMAL_REVIEW.json', 'packet_destination': '{workflow_id}/HUMAN_ADOPTION.json'})
    prior = 'HUMAN_ADOPTION'
    if p.get('baseline_kind') == 'EXISTING_WORKING_DOMAIN':
        steps.append(validator('FORMAL_CONTENT_QA', prior)); prior = 'FORMAL_CONTENT_QA'
    steps.append(validator('NATIVE_SAVE_REQUESTS', prior))
    steps.append(validator('NATIVE_REGISTRY_REQUEST', 'NATIVE_SAVE_REQUESTS'))
    steps.append(validator('NATIVE_FORMAL_READBACK', 'NATIVE_REGISTRY_REQUEST'))
    steps[-1]['side_outputs'] = ['{work}/native-formal-readback.json']
    steps.append({'id': 'FORMAL_SAVE', 'kind': 'formal-save', 'needs': ['NATIVE_FORMAL_READBACK'],
                  'plan': contract['formal_plan']})
    steps.append(validator('FORMAL_COMPLETION', 'FORMAL_SAVE'))
    write_json(root/'workflow.json', {'workflow_id': c['work_id'], 'version': '1.0', 'status': 'CURRENT',
               'work_skill': 'product-change-work', 'steps': steps,
               'targets': {'FORMAL_CHANGE_ADOPTION': ['FORMAL_COMPLETION']},
               'boundary': 'Existing Shared Human/Native receipt/Formal save; no Runtime/UI/release'})
    authorities = [{**item, **ref(item['path'])} for item in c['authorities'].values()]
    write_json(root/'authority-index.json', {'status': 'CURRENT', 'entries': [
        {key: item[key] for key in ('authority_id', 'version', 'sha256', 'status', 'scope_axis')} for item in authorities]})
    write_json(root/'registry.json', {'registry_id': 'NATIVE_SHEETS_FORMAL_CURRENT', 'version': p['baseline_revision'],
               'status': 'CURRENT', 'products': [{'product_id': c['product_id'], 'aliases': connection['aliases'],
               'master_state': 'PRESENT', 'current_revision': contract['registry_before']['package_version'],
               'native_entry': contract['registry_before']}]})
    def nested(value):
        if isinstance(value, dict):
            if 'path' in value and 'sha256' in value: yield {'path': value['path'], 'sha256': value['sha256']}
            else:
                for item in value.values(): yield from nested(item)
        elif isinstance(value, list):
            for item in value: yield from nested(item)
    runtime = [script, ref(checkout/p['native_preparer'])] + [ref(shared/name) for name in semantic_hashes(shared)]
    runtime += [ref(checkout/path) for path in c['captured_paths']] + list(nested(contract))
    runtime += list(nested(read_json(contract['formal_plan']['path'])))
    runtime = list({v['path']: v for v in runtime}.values())
    spec = {'workflow_id': c['work_id'], 'work_skill': 'product-change-work', 'target': c['product_id'],
            'target_gate': 'FORMAL_CHANGE_ADOPTION', 'skill_root': str(shared),
            'authority_index': ref(root/'authority-index.json'), 'authorities': authorities,
            'registry': ref(root/'registry.json'), 'sources': contract['sources'],
            'workflow': ref(root/'workflow.json'), 'input': ref(root/'contract.json'),
            'runtime_refs': runtime, 'storage_root': str(root/'saved'),
            'production_binding': ref(root/'production-binding.json'),
            'decisions': {'HUMAN_ADOPTION': contract['decision_path']},
            'formal_receipt': str(root/'checkpoint/native-formal-readback.json')}
    write_json(root/'spec.json', spec)
    return {'status': 'PREPARED_NATIVE_FORMAL', 'route': route, 'spec': str(root/'spec.json'),
            'work': str(root/'checkpoint'), 'live_state': str(root/'live-state.json'),
            'formal_writes_before_human': 0, 'shared_engine': p['shared_engine']}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    for key in ('harness-root', 'checkout', 'captures', 'destination', 'instruction'): parser.add_argument('--'+key, required=True)
    args = parser.parse_args()
    try: result = prepare(args.harness_root, args.checkout, args.captures, args.destination, args.instruction)
    except Exception as error: result = {'status': 'FAIL_CLOSED', 'blocking_reason': getattr(error, 'data', {'reason': str(error)})}
    print(json.dumps(result, ensure_ascii=False, indent=2))
    sys.exit(2 if result['status'] == 'FAIL_CLOSED' else 0)
