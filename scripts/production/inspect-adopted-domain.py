#!/usr/bin/env python3
"""Read-only native handoff into the unchanged common FLOW contract."""
import argparse
import importlib.util
import json
import os
import subprocess
import sys
from pathlib import Path


def execute(shared, contract):
    sys.path.insert(0, str(shared))
    from harness.core import read_json, require, sha, fingerprint, validate_authorization
    from harness.resolvers import capture
    from harness.common_development import inspected_work, artifact_hashes
    from harness.common_preparation import output_documents, unique_output
    from harness.application_ui_release import inspect_original_qa
    c = read_json(contract)
    n = Path(c['native_checkout']).resolve()
    doc = lambda reference: json.loads(capture('/', reference))
    check = lambda condition, reason: require(condition, 'DOMAIN_HANDOFF_INVALID', reason, 'FLOW')
    check(c['schema'] == 'ADOPTED_SHARED_DOMAIN_COMMON_INSPECTION_V1'
          and c['repository'] == 'Takuro-Kwkm/sash-app', 'Wrong native format')
    master = doc(c['master'])
    check(master['product']['product_id'] == c['product_id'], 'Wrong Business product')
    fs, formal, _, frows = inspected_work(c['master_work'], c['product_id'])
    receipt = doc(c['master_receipt'])
    check(receipt['role'] == 'PRODUCT_MASTER' and receipt['formal'] == 'FORMAL_PASS'
          and receipt['master_sha256'] == c['master']['sha256']
          and c['master_receipt']['sha256'] in artifact_hashes(frows)
          and c['master']['sha256'] in artifact_hashes(frows), 'Use actual saved Formal outputs')
    check({'HUMAN_ADOPTION', 'FORMAL_CONTENT_QA', 'NATIVE_FORMAL_READBACK', 'FORMAL_COMPLETION'}
          <= set(formal['completed_gates']), 'Incomplete native Formal')
    _, content = unique_output(output_documents(frows), lambda d: d.get('executed') is True
        and d.get('report', {}).get('gates', {}).get('QA_PASS') == 'PASS', 'post-Human content QA')
    check(content['status'] == 'PASS' and content['report']['blocker_count'] == 0, 'Native content QA failed')

    rs, runtime, definition, rrows = inspected_work(c['runtime_adoption_work'], c['product_id'])
    rc = doc(rs['input'])
    profile = doc(rc['profile'])
    check(rs['execution_mode'] == 'REAL' and rc['formal_work'] == c['master_work']
          and profile['formal_master']['sha256'] == c['master']['sha256']
          and profile['formal_product_id'] == c['runtime_product_id'], 'Different actual native adoption')
    validate_authorization(doc(rc['scope']), doc(rc['authorization']))
    # Inspect the registered original producer and its original Main-bound DAG.
    # No fresh Main retargeting, caller-defined stage omission, or copy worker.
    origin = Path(rc['checkout'])
    registry = read_json(origin / 'contracts/production/validator-registry.v2.json')
    declared = registry['products'][c['product_id']]['runtime_ui_adoption_profile']
    check(rc['profile'] == {'path': str(origin / declared['path']), 'sha256': declared['sha256']},
          'Original registered profile differs')
    check(runtime['completed_gates'] == profile['required_stages'] + ['SAVE_ADOPTION_RESULT'],
          'Keep every mandatory native adoption gate')
    production = doc(rs['production_binding'])
    original_head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=origin, text=True).strip()
    canonical = subprocess.check_output(['git', 'remote', 'get-url', 'origin'], cwd=origin, text=True).strip()
    check(canonical.removesuffix('.git') == 'https://github.com/' + c['repository']
          and production['repository'] == c['repository']
          and production['checkout'] == str(origin)
          and production['head_sha'] == original_head, 'Original native repository/HEAD differs')
    check(subprocess.run(['git', 'merge-base', '--is-ancestor', original_head, c['source_commit']],
                        cwd=n, capture_output=True).returncode == 0, 'Original Main not in current native history')
    names = ['contracts/production/validator-registry.v2.json', declared['path'],
             profile['native_preparer'], profile['native_worker']]
    for name in names:
        value = (origin / name).read_bytes()
        committed = subprocess.check_output(['git', 'show', original_head + ':' + name], cwd=origin)
        check(value == committed and production['files'][name]['sha256'] == sha(value),
              'Original registered code differs from actual Main Git bytes')
    preparer = origin / profile['native_preparer']
    check({'path': str(preparer), 'sha256': sha(preparer.read_bytes())} in rs['runtime_refs'],
          'Original admission implementation is not pinned')
    source = importlib.util.spec_from_file_location('original_native_admission', preparer)
    admission = importlib.util.module_from_spec(source)
    source.loader.exec_module(admission)
    admission.validate_spec(Path(rs['skill_root']), origin, Path(rc['profile']['path']), rs)
    for step in definition['steps'][:-1]:
        row = next(row for row in rrows if row['gate'] == step['id'])
        check(row['evidence'].get('execution') == 'SUBPROCESS'
              and row['evidence'].get('implementation') == step['script']['path'],
              'Native producer did not execute the mandatory validator')
    rout = output_documents(rrows)
    _, adoption = unique_output(rout, lambda d: d.get('state') == 'RUNTIME_UI_ADOPTED', 'Runtime adoption')
    check(adoption['status'] == 'PASS' and adoption['release'] is False
          and adoption['product_master_mutations'] == 0, 'Native adoption result differs')
    _, saved = unique_output(rout, lambda d: d.get('gate') == 'NATIVE_FORMAL_LOCATION_READBACK', 'Runtime readback')
    proof = saved['actual_readback']
    check(proof['full_bytes_verified'] is True and proof['source'] == 'CONNECTED_GOOGLE_DRIVE_TOOL'
          and proof['folder_id'] == rc['formal_folder_id'], 'Actual canonical bytes readback required')
    packages = read_json(n / 'contracts/production/released-runtime-packages.v1.json')['packages']
    package = next(row for row in packages if row['product_id'] == c['runtime_product_id'])
    check(package['native_product_id'] == c['product_id']
          and package['adoption_work_id'] == rs['workflow_id']
          and package['adoption_result_sha256'] in artifact_hashes(rrows)
          and package['index']['sha256'] == proof['index']['sha256']
          and package['index']['manifestFileId'] == proof['index']['file_id'], 'Distribution registry differs')
    for name, meta in package['files'].items():
        check({'path': name, **meta} in proof['package']['files'], 'Distribution bytes outside adopted package')
        payload = (n / package['root'] / name).read_bytes()
        check(len(payload) == meta['bytes'] and sha(payload) == meta['sha256'], 'Distribution bytes changed')

    # Inspect completed QA with its captured input, runtime, ledger and review.
    q = Path(c['retained_qa_work'])
    qs = read_json(q / 'spec.json')
    qr = read_json(q / 'local-qa-result.json')
    inspect_original_qa(q, qs['local_qa'], qr)
    check(doc(c['retained_browser'])['status'] == 'PASS', 'Original Browser QA not complete')
    for item in c['retained_ui_sources']:
        capture('/', item['original'])
        check(sha((n / item['native_path']).read_bytes()) == item['original']['sha256'], 'Approved UI implementation changed')
    # New file inventory is bound to a new actual DOM capture; previous image
    # observations are explicitly retained and compared against exact image bytes.
    browser, raw, dom = (doc(c[k]) for k in ('browser_report', 'retained_browser', 'dom_observations'))
    check(raw['errors'] == [] and len(raw['viewports']) == 3
          and all(v['overflow'] == 'PASS' for v in raw['viewports']), 'Original Browser failures')
    check(browser['raw_report_sha256'] == c['retained_browser']['sha256']
          and browser['dom_report_sha256'] == c['dom_observations']['sha256']
          and browser['image_observations'] == raw['image_observations'], 'Retained image evidence was relabelled')
    check(dom['status'] == 'PASS' and dom['observedCommit'] == c['source_commit']
          and subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=n, text=True).strip() == c['source_commit'],
          'Actual DOM belongs to another native source')
    for view in dom['observations']:
        check(view['errors'] == [] and view['fields'] == dom['observations'][0]['fields'], 'Actual DOM differs by width')
    source_fields = {field['field_id']: field for field in doc(c['expected_inventory'])['fields']}
    for view in dom['observations']:
        check(len(browser['fields']) == len(view['fields']), 'Normalized DOM field count differs')
        for normalized, observed in zip(browser['fields'], view['fields']):
            check(all(normalized.get(key) == value for key, value in observed.items()),
                  'Normalized field differs from the actual DOM observation')
            declared_field = source_fields[observed['field_id']]
            check(all(normalized.get(key) == declared_field.get(key)
                      for key in ('stage', 'role', 'interaction')),
                  'Normalized field semantics differ from the reviewed source')
    assets = doc(c['image_assets'])
    module = read_json(Path(rc['package_root']) / 'candidates/module.json')
    check(assets['source_module_sha256'] == proof['module']['sha256'], 'Image source differs')
    by_hash = {item['sha256']: item for item in assets['assets']}
    import base64
    for item in assets['module_references']:
        value = module
        for key in item['module_pointer'].split('/')[1:]:
            key = key.replace('~1', '/').replace('~0', '~')
            value = value[int(key)] if isinstance(value, list) else value[key]
        payload = base64.b64decode(value.split(',', 1)[1], validate=True)
        check(sha(payload) == item['image_sha256'], 'Extracted image differs')
    for digest, item in by_hash.items():
        payload = (n / item['native_path']).read_bytes()
        check(sha(payload) == digest and len(payload) == item['bytes'], 'Git image bytes changed')
    check(all(row['image_sha256'] in by_hash for row in raw['image_observations']), 'Observed image not in source assets')

    probe = doc(c['probe_input'])
    check(probe['formal'] == c['master'] and probe['runtime_product_id'] == c['runtime_product_id'], 'Probe scope differs')
    env = {k: v for k, v in os.environ.items() if k not in ('SASH_PRIVATE_FORMAL_RUNTIME_MANIFEST', 'SASH_PRIVATE_FORMAL_RUNTIME_SHA256')}
    run = subprocess.run([c['node'], str(n / 'scripts/production/project-declared-composed-flow.mjs'),
        c['probe_input']['path']], cwd=n, env=env, text=True, capture_output=True, timeout=180)
    check(run.returncode == 0, (run.stdout + run.stderr)[-2000:])
    projection = json.loads(run.stdout)
    expected = doc(c['expected_inventory'])
    attrs = ['field_id', 'stage', 'role', 'control', 'candidate_values', 'visible', 'required', 'label']
    pick = lambda fields: [{k: f[k] for k in attrs} for f in fields]
    check(pick([f for f in expected['fields'] if f['role'] in ('SELECTOR', 'DERIVED')])
          == pick(projection['fields']) == pick(browser['fields']), 'Source, Runtime and actual DOM differ')
    check({f['field_id'] for f in doc(c['master_projection'])['fields']}
          == {f['field_id'] for f in master['fields']}, 'Master field mapping incomplete')
    entry = doc(c['native_registry'])['products'][c['product_id']]
    worker = 'scripts/production/inspect-adopted-domain.py'
    check(worker in entry['validators'], 'Register actual executed Native producer')
    inherited = {}
    for name in entry['validators']:
        if name == worker:
            continue
        original = c['retained_validator_sources'][name]
        capture('/', original)
        check(sha((n / name).read_bytes()) == original['sha256'] and original in fs['runtime_refs'], 'Retained validator changed')
        inherited[name] = 'PASS'
    return {'status': 'PASS', 'repository': c['repository'], 'product_id': c['product_id'],
        'master_sha256': c['master']['sha256'], 'flow_sha256': c['flow']['sha256'],
        'native_registry_entry_sha256': fingerprint(entry), 'validator_results': {**inherited, worker: 'PASS'},
        'validator_evidence': {'retained_formal': c['master_work'], 'executed_inspector': worker,
            'native_adoption': c['runtime_adoption_work'], 'retained_qa_work': c['retained_qa_work']},
        'checks': projection['checks'], 'flow_stages': projection['flow_stages'],
        **{k + '_sha256': c[k]['sha256'] for k in ['mapping', 'expected_inventory', 'master_projection', 'preview']},
        'browser_sha256': c['browser_report']['sha256'],
        'ui_files_sha256': fingerprint(sorted(r['sha256'] for r in c['ui_files'])),
        'execution_scope': 'ACTUAL_COMPLETED_NATIVE_WORK_AND_RETAINED_QA_PLUS_EXECUTED_CONNECTION',
        'native_projection': projection, 'product_master_mutations': 0, 'release': False}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    for key in ('shared', 'contract', 'out'):
        parser.add_argument('--' + key, required=True)
    args = parser.parse_args()
    result = execute(Path(args.shared), Path(args.contract))
    Path(args.out).write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'status': result['status'], 'output': args.out, 'canonical_writes': 0}))
