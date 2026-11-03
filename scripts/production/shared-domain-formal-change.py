"""Bind a reviewed shared-domain delta to the existing native Formal worker.

This adapter validates content. Shared v2 and sheet-package-formal retain all
Human, transaction, storage, Registry CAS, readback and completion ownership.
"""
import copy
import importlib.util
import json
import subprocess
import sys
from pathlib import Path


def setup(shared):
    sys.path.insert(0, str(Path(shared).resolve()))
    global require, sha, checked_bytes, digest
    from harness.core import require, sha
    from harness.changed_path import checked_bytes
    from product_master.identity import digest


def doc(ref):
    return json.loads(checked_bytes(ref))


def native_row(raw, manufacturer, series, allowed_states):
    from harness.production import native_registry
    require(allowed_states == ['FORMAL_PASS'], 'NATIVE_FORMAL_REQUIRED', 'Existing adopted baseline required', 'FORMAL_REVIEW')
    return native_registry(raw, manufacturer, series)


def profile(c):
    p = doc(c['profile'])
    require(p['baseline_kind'] == 'EXISTING_FORMAL_JSON'
            and p['domain_schema'] == 'SHARED_DOMAIN_V1'
            and p['formal_content_qa'] is True
            and p['confirmation_source'] == 'CONTROLLED_UNRESOLVED_SIDECAR',
            'NATIVE_PROFILE_SCOPE', 'Exact shared-domain successor capabilities required', 'FORMAL_REVIEW')
    return p


def package_files(reference):
    from harness.core import inspect_package, package_members
    data = checked_bytes(reference)
    info = inspect_package(data)
    _, files = package_members(data)
    return info, files


def baseline(c, p):
    from harness.production import connector_document
    row = native_row(doc(c['registry_response']), p['manufacturer'], p['series'], ['FORMAL_PASS'])
    before = doc(c['baseline_master'])
    require(row == c['registry_before'] and row['package_version'] == p['baseline_revision'] == before['product']['revision']
            and before['product']['product_id'] == c['product_id'] and before['lifecycle_status'] == 'FORMAL'
            and c['baseline_master']['sha256'] == p['baseline_master_sha256'],
            'NATIVE_FORMAL_DRIFT', 'Acquire the exact adopted shared-domain baseline', 'CURRENT_FORMAL_RESOLUTION')
    meta = connector_document(doc(c['baseline_authoring_metadata']))
    require(meta['id'] == row['authoring_file_id'] and meta['mime_type'] == 'application/json'
            and meta['parent_ids'] == [p['canonical_folder_id']],
            'NATIVE_FORMAL_IDENTITY', 'Actual native authoring identity and parent required', 'CURRENT_FORMAL_RESOLUTION')
    info, files = package_files(c['baseline_package'])
    require(info['revision'] == p['baseline_revision']
            and files['PRODUCT_MASTER.json'] == checked_bytes(c['baseline_master'])
            and files['PRODUCT_MASTER_MANIFEST.json'] == checked_bytes(c['baseline_live_manifest']),
            'NATIVE_FORMAL_DRIFT', 'Actual package, manifest and loose baseline must agree', 'CURRENT_FORMAL_RESOLUTION')
    for key in ('canonical_folder_id', 'old_folder_id', 'working_folder_id'):
        require(row[key] == p[key], 'NATIVE_FOLDER_DRIFT', key, 'CURRENT_FORMAL_RESOLUTION')
    return row


def confirmations(c):
    _, files = package_files(c['baseline_package'])
    original = json.loads(files['CONTROLLED_UNRESOLVED.json'])
    current = doc(c['controlled_unresolved'])
    require(current == original and len(current) == profile(c)['controlled_unresolved_count']
            and len({r['id'] for r in current}) == len(current)
            and all(r['automatic_resolution'] is False for r in current),
            'CONTROLLED_UNRESOLVED_CHANGED', 'Preserve actual native sidecar confirmations', 'CARRY_FORWARD_QA')
    return current


def reviewed_delta(c):
    p = profile(c)
    before, candidate = doc(c['baseline_master']), doc(c['candidate_master'])
    require(c['candidate_master']['sha256'] == p['reviewed_candidate_sha256']
            and candidate['product']['product_id'] == before['product']['product_id']
            and candidate['lifecycle_status'] == 'DRAFT',
            'UNREVIEWED_DOMAIN_DELTA', 'Exact independently reviewed candidate required', 'CARRY_FORWARD_QA')
    scope = doc(c['change_review'])
    require(scope['baseline_sha256'] == p['baseline_master_sha256']
            and scope['candidate_sha256'] == p['reviewed_candidate_sha256']
            and scope['changed_fields'] == p['changed_fields']
            and scope['unchanged_cases'] + scope['changed_expected_cases'] == len(before['handoff_tests'])
            and len(candidate['handoff_tests']) == len(before['handoff_tests']),
            'DOMAIN_DELTA_BINDING', 'Retain the exact reviewed fields and case accounting', 'CARRY_FORWARD_QA')
    unchanged = sum(a == b for a, b in zip(before['handoff_tests'], candidate['handoff_tests']))
    require(scope['unchanged_cases'] == unchanged
            and scope['changed_expected_cases'] == len(before['handoff_tests']) - unchanged,
            'DOMAIN_DELTA_BINDING', 'Case accounting must match the actual retained fixtures', 'CARRY_FORWARD_QA')
    require(candidate['constraints'] == before['constraints'] and candidate['scope'] == before['scope']
            and candidate['gaps'] == before['gaps'] and candidate['schema_version'] == before['schema_version']
            and len(candidate['fields']) == len(before['fields'])
            and candidate['sources'][:len(before['sources'])] == before['sources']
            and candidate['evidence'][:len(before['evidence'])] == before['evidence'],
            'UNCHANGED_SCOPE_CHANGED', 'Retain unrelated facts, existing Source/Evidence and gaps', 'CARRY_FORWARD_QA')
    changed = [a['field_id'] for a, b in zip(before['fields'], candidate['fields']) if a != b]
    require(set(changed) == set(p['changed_fields']) and len(changed) == len(p['changed_fields']),
            'UNREVIEWED_DOMAIN_DELTA', 'Only the reviewed fields may differ', 'CARRY_FORWARD_QA')
    return scope


def retained_qa(c):
    """Inspect the original successful native validator execution, without rerun."""
    retained = c['retained_candidate_qa']
    for key in ('spec', 'step', 'result', 'review', 'verified'):
        checked_bytes(retained[key])
    require(retained['verified']['sha256'] == profile(c)['reviewed_candidate_qa_sha256'],
            'CARRY_FORWARD_QA', 'Use the reviewed original candidate execution', 'CARRY_FORWARD_QA')
    evidence = doc(retained['verified'])
    artifacts = {a['path']: a['sha256'] for a in evidence['artifacts']}
    require(all(artifacts.get(retained[key]['path']) == retained[key]['sha256'] for key in ('result', 'review')),
            'CARRY_FORWARD_QA', 'Original execution and independent review must match the verified evidence', 'CARRY_FORWARD_QA')
    engine = profile(c)['retained_qa_engine']
    original_root = Path(retained['root']).resolve()
    head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=original_root, text=True).strip()
    origin = subprocess.check_output(['git', 'remote', 'get-url', 'origin'], cwd=original_root, text=True).strip().removesuffix('.git')
    require(head == engine['head'] and origin == engine['origin'] and engine['files'],
            'CARRY_FORWARD_ENGINE_CHANGED', 'Use the fixed original QA implementation', 'CARRY_FORWARD_QA')
    for name, expected in engine['files'].items():
        path = original_root/name
        require(not Path(name).is_absolute() and '..' not in Path(name).parts
                and path.is_file() and not path.is_symlink() and sha(path.read_bytes()) == expected,
                'CARRY_FORWARD_ENGINE_CHANGED', name, 'CARRY_FORWARD_QA')
    script = """import json,sys
from harness.local_qa import verified_result,revalidate
from harness.core import read_json
r=json.loads(sys.argv[1]);spec=read_json(r['spec']['path']);step=read_json(r['step']['path'])
verified_result(r['work'],spec['local_qa'],inspect_retained=True)
value=revalidate(read_json(r['verified']['path']),inspect_retained=True)
print(json.dumps(value))
"""
    # The original engine owns its original identity checks. Do not reinstate a
    # historical PATH/PYTHONPATH as the process environment.
    import os
    env = dict(os.environ)
    env.pop('PYTHONPATH', None)
    run = subprocess.run([sys.executable, '-c', "import sys;sys.path.insert(0,sys.argv.pop(1));" + script,
                          retained['root'], json.dumps(retained)], env=env,
                         capture_output=True, text=True, timeout=120)
    require(run.returncode == 0, 'CARRY_FORWARD_QA', (run.stdout + run.stderr)[-1500:], 'CARRY_FORWARD_QA')
    report = doc(c['candidate_domain_qa'])
    require(report['status'] == 'PASS' and report['blocker_count'] == 0
            and all(v == 0 for v in report['metrics'].values())
            and report['package_sha256'] == digest(doc(c['candidate_master'])),
            'CARRY_FORWARD_QA', 'Executed validator must bind the exact reviewed master', 'CARRY_FORWARD_QA')
    return report


def carry_forward(c):
    review = reviewed_delta(c)
    report = retained_qa(c)
    preserved = confirmations(c)
    info, files = package_files(c['package'])
    formal, candidate = doc(c['master']), doc(c['candidate_master'])
    expected = copy.deepcopy(candidate)
    expected['lifecycle_status'] = 'FORMAL'
    expected['product']['revision'] = c['revision']
    expected['provenance']['policy_ref'] = doc(c['formal_policy'])['policy_id']
    for field in expected['fields']:
        field['lifecycle_status'] = 'FORMAL'
    require(formal == expected and info['revision'] == c['revision']
            and files['PRODUCT_MASTER.json'] == checked_bytes(c['master'])
            and files['CANDIDATE_MASTER.json'] == checked_bytes(c['candidate_master'])
            and files['CARRIED_CONTENT_QA.json'] == checked_bytes(c['candidate_domain_qa'])
            and files['CONTROLLED_UNRESOLVED.json'] == checked_bytes(c['controlled_unresolved']),
            'FORMAL_PACKAGE_PARITY', 'Only declared lifecycle projection may follow the tested candidate', 'CARRY_FORWARD_QA')
    for item in c['sources']:
        checked_bytes(item)
    require(doc(c['scope'])['runtime_scope'] == 'NOT_INCLUDED_IN_PRODUCT_MASTER_FORMAL'
            and json.loads(files['FORMAL_CONTENT_QA.json']) == doc(c['formal_scope_qa']),
            'FORMAL_SCOPE_EXPANDED', 'Master-only package scope required', 'CARRY_FORWARD_QA')
    return {'carried_content_checks': len(candidate['handoff_tests']),
            'unchanged_cases': review['unchanged_cases'], 'changed_expected_cases': review['changed_expected_cases'],
            'formal_scope_checks': len(doc(c['formal_scope_qa'])['checks']),
            'controlled_unresolved': len(preserved), 'package': info,
            'product_qa_rerun': False, 'predecessor': 'INSPECT_ONLY'}


def formal_content_qa(c, work):
    """Use the existing post-Human shared-domain validator and policy checks."""
    path = Path(c['checkout']) / 'scripts/production/working-domain-formal.py'
    spec = importlib.util.spec_from_file_location('retained_domain_formal_validator', path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    module.setup(c['harness_root'])
    return module.formal_content_qa(c, work)
