#!/usr/bin/env python3
"""Native package/Drive identity checks. Shared v2 owns Human, DAG and Formal save."""
import argparse
import importlib.util
import json
import sys
from pathlib import Path

STAGES = ('CURRENT_FORMAL_RESOLUTION', 'CARRY_FORWARD_QA', 'FORMAL_REVIEW')


def setup(shared):
    sys.path.insert(0, str(Path(shared).resolve()))
    global read_json, write_json, require, sha, fingerprint, Blocked, checked_bytes
    from harness.core import read_json, write_json, require, sha, fingerprint, Blocked
    from harness.changed_path import checked_bytes


def document(ref):
    return json.loads(checked_bytes(ref))


def frozen_profile(c):
    p = document(c['profile'])
    require(p['product_id'] == c['product_id'], 'NATIVE_PRODUCT', 'Wrong native Formal product', 'FORMAL_REVIEW')
    checkout = Path(c['checkout'])
    connection = next(x for x in read_json(checkout/'contracts/production/work-connections.v2.json')['products']
                      if x['product_id'] == p['product_id'])
    require(connection['formal_profile'] == {'path': str(Path(c['profile']['path']).relative_to(checkout)),
                                            'sha256': c['profile']['sha256']},
            'NATIVE_PROFILE_CHANGED', 'Formal profile differs from the admitted connection', 'FORMAL_REVIEW')
    require(p['target_gate'] == 'FORMAL_CHANGE_ADOPTION' and p['human_gate'] == 'HUMAN_ADOPTION'
            and p['runtime_ui_mutations'] == 0 and p['automatic_orderability'] is False,
            'FORMAL_SCOPE_EXPANDED', 'Use the admitted Master-only Human/native-save profile', 'FORMAL_REVIEW')
    return p


def carry_forward(c):
    """Prove an existing execution; never turn a PASS label into new product QA."""
    from harness.workflow import inspect
    from harness.core import package_members, inspect_package
    from jsonschema import Draft202012Validator
    prior = c['predecessor']
    spec = document(prior['spec'])
    state = inspect(prior['root'], prior['work'], spec)[0]
    require(state['state'] == 'COMPLETED' and spec['target'] == c['product_id'],
            'PREDECESSOR_NOT_COMPLETED', 'Inspect the complete native Working Work', 'CARRY_FORWARD_QA')
    qa = document(prior['qa'])
    master = document(prior['master'])
    before_contract = json.loads(checked_bytes(spec['input']))
    require(before_contract['candidate_master'] == prior['master']
            and before_contract['candidate_authoring'] == prior['authoring']
            and before_contract['sources'] == c['sources'],
            'CARRY_FORWARD_BINDING', 'Actual Source/scope/model/authoring binding changed', 'CARRY_FORWARD_QA')
    for item in c['sources']:
        checked_bytes(item)
    require(qa['status'] == 'PASS' and qa['executed'] is True and qa['failed'] == 0
            and qa['product_master_sha256'] == prior['master']['sha256']
            and qa['candidate_sha256'] == prior['authoring']['sha256']
            and qa['passed'] == len(qa['tests']) and all(t['status'] == 'PASS' for t in qa['tests']),
            'CARRY_FORWARD_QA', 'Same-input executed native QA required', 'CARRY_FORWARD_QA')
    package = checked_bytes(c['package'])
    info = inspect_package(package)
    _, files = package_members(package)
    proposed = json.loads(files['PRODUCT_MASTER.json'])
    manifest = json.loads(files['PRODUCT_MASTER_MANIFEST.json'])
    scope = json.loads(files['FORMAL_SELECTION_SCOPE.json'])
    schema = json.loads(files['PRODUCT_MASTER.schema.json'])
    report = json.loads(files['FORMAL_CONTENT_QA.json'])
    require(info['revision'] == c['revision'] == proposed['metadata']['package_version']
            and scope['runtime_scope'] == manifest['runtime_scope'] == 'NOT_INCLUDED_IN_PRODUCT_MASTER_FORMAL',
            'FORMAL_IDENTITY', 'Exact Master/Scope/revision required', 'CARRY_FORWARD_QA')
    # Lifecycle fields may be proposed; manufacturer facts and all historical tables stay exact.
    for key in set(master) - {'metadata', 'source_registry', 'evidence_registry'}:
        require(proposed[key] == master[key], 'FACT_CHANGED', key, 'CARRY_FORWARD_QA')
    expected_metadata = {**master['metadata'], **c['lifecycle_metadata_after']}
    require(set(c['lifecycle_metadata_after']) ==
            {'package_version', 'status', 'formal_pass', 'canonical_mutation', 'registry_mutation', 'adoption_effective'}
            and expected_metadata['package_version'] == c['revision']
            and expected_metadata['status'] == 'FORMAL_PASS'
            and all(expected_metadata[k] is True for k in ('formal_pass', 'canonical_mutation', 'registry_mutation')),
            'UNREVIEWED_METADATA', 'Only the fixed lifecycle fields may be proposed', 'CARRY_FORWARD_QA')
    require(proposed['metadata'] == expected_metadata, 'UNREVIEWED_METADATA', 'Lifecycle delta changed', 'CARRY_FORWARD_QA')
    for key, allowed, after in [('source_registry', ('role', 'status'), {'role': 'CURRENT_ADOPTED', 'status': 'ADOPTED'}),
                                ('evidence_registry', ('formal_adoption',), {'formal_adoption': 'ADOPTED'})]:
        require(len(master[key]) == len(proposed[key]) and
                proposed[key] == [{**row, **after} for row in master[key]],
                'FACT_CHANGED', key+': only reviewed adoption status may change', 'CARRY_FORWARD_QA')
    errors = list(Draft202012Validator(schema).iter_errors(proposed))
    require(not errors, 'FORMAL_SCHEMA', '; '.join(x.message for x in errors[:3]), 'CARRY_FORWARD_QA')
    require(report['product_master_sha256'] == sha(files['PRODUCT_MASTER.json'])
            and report['scope_id'] == scope['scope_id']
            and sha(files['AUTHORING_SNAPSHOT.xlsx']) == prior['authoring']['sha256']
            and files['CARRIED_CONTENT_QA.json'] == checked_bytes(prior['qa']),
            'FORMAL_QA_BINDING', 'Package differs from fixed proof/authoring', 'CARRY_FORWARD_QA')
    require(proposed['confirmations'] == master['confirmations']
            and all(g['status'] == 'ESTIMATE_CONFIRM_REQUIRED' and g['automatic_orderability'] is False
                    and g['confirmation_owner'] and g['handoff_question'] for g in proposed['confirmations'])
            and all(proposed['commercial_policy'][k] is None for k in ('price', 'bom', 'final_set_code'))
            and proposed['commercial_policy']['automatic_pricing'] is False
            and proposed['commercial_policy']['automatic_orderability'] is False,
            'CONTROLLED_UNRESOLVED_CHANGED', 'Keep unknowns and non-automatic handoff exact', 'CARRY_FORWARD_QA')
    require(document(c['formal_scope_qa']) == report, 'FORMAL_QA_BINDING', 'Formal QA changed', 'CARRY_FORWARD_QA')
    return {'carried_content_checks': qa['passed'], 'formal_scope_checks': len(report['checks']),
            'controlled_unresolved': len(proposed['confirmations']), 'package': info,
            'product_qa_rerun': False, 'predecessor': 'INSPECT_ONLY'}


def baseline(c):
    from harness.production import native_registry, connector_document, observation_fingerprint
    p = frozen_profile(c)
    native = native_registry(document(c['registry_response']), p['manufacturer'], p['series'])
    require(native == c['registry_before'] and native['package_version'] == p['baseline_revision'],
            'NATIVE_FORMAL_DRIFT', 'Current row differs from fixed predecessor', 'CURRENT_FORMAL_RESOLUTION')
    previous = document(c['baseline_contract'])
    require(previous['native_registry']['sha256'] == c['baseline_registry_sha256'],
            'BASELINE_BINDING', 'Inspect the original complete baseline capture', 'CURRENT_FORMAL_RESOLUTION')
    require(native == native_registry(document(previous['native_registry']), p['manufacturer'], p['series']),
            'NATIVE_FORMAL_DRIFT', 'Current baseline is no longer the reviewed Formal', 'CURRENT_FORMAL_RESOLUTION')
    module = importlib.util.spec_from_file_location('native_sheet_baseline',
                                                    Path(c['checkout'])/'scripts/production/sheet-package-change.py')
    worker = importlib.util.module_from_spec(module); module.loader.exec_module(worker); worker.setup(c['harness_root'])
    worker.baseline(previous, document(c['baseline_profile']))
    require(checked_bytes(c['baseline_live_manifest']) == checked_bytes(previous['baseline_manifest']),
            'NATIVE_FORMAL_DRIFT', 'Live predecessor Manifest bytes changed', 'CURRENT_FORMAL_RESOLUTION')
    for name, source in previous['baseline_documents'].items():
        require(checked_bytes(c['baseline_live_documents'][name]) == checked_bytes(source),
                'NATIVE_FORMAL_DRIFT', 'Live predecessor bytes changed: '+name, 'CURRENT_FORMAL_RESOLUTION')
    old_meta = document(previous['baseline_authoring_metadata'])
    require(observation_fingerprint(old_meta) == observation_fingerprint(document(c['baseline_authoring_metadata'])),
            'AUTHORING_CHANGED', 'Current Formal authoring changed', 'CURRENT_FORMAL_RESOLUTION')
    require(connector_document(document(c['candidate_authoring_metadata']))['id'] == c['working_authoring_id'],
            'AUTHORING_CHANGED', 'Wrong native Working authoring', 'CURRENT_FORMAL_RESOLUTION')
    require(observation_fingerprint(document(c['candidate_authoring_metadata'])) ==
            observation_fingerprint(document(c['predecessor_authoring_metadata'])),
            'AUTHORING_CHANGED', 'Working authoring changed after executed QA', 'CURRENT_FORMAL_RESOLUTION')
    return native


def review(c, work):
    from harness.changed_path import validate_plan
    from harness.core import package_members
    proof = carry_forward(c)
    plan = document(c['formal_plan'])
    require(plan['product_id'] == c['product_id'] and plan['revision'] == c['revision']
            and plan['native_registry_after'] == c['registry_after'],
            'FORMAL_PLAN', 'Exact native identity and row required', 'FORMAL_REVIEW')
    transaction = validate_plan(plan)
    _, files = package_members(checked_bytes(c['package']))
    require(checked_bytes(c['master']) == files['PRODUCT_MASTER.json']
            and checked_bytes(c['master_manifest']) == files['PRODUCT_MASTER_MANIFEST.json'],
            'PACKAGE_PARITY', 'Loose staged Master/Manifest must equal packaged bytes', 'FORMAL_REVIEW')
    for role, member in c['required_package_roles'].items():
        artifact = next(a for a in plan['artifacts'] if a['role'] == role)
        require(checked_bytes(artifact['source']) == files[member],
                'PACKAGE_PARITY', role+': every Formal sidecar is real packaged content', 'FORMAL_REVIEW')
    storage = c['native_storage']
    require(plan['native_storage'] == storage and plan['native_registry_before'] == c['registry_before']
            and plan['native_registry_id'] == c['native_registry_id'] and plan['registry_location'] == c['registry_location'],
            'FORMAL_PLAN', 'Displayed native request and reviewed transaction must be identical', 'FORMAL_REVIEW')
    from harness.production import connector_document
    actual_old = connector_document(document(c['canonical_listing']))
    require({x['file_id'] for x in storage['old_artifacts']} == {x['id'] for x in actual_old['files']},
            'OLD_ARCHIVE_PLAN', 'Archive exactly the acquired predecessor canonical set', 'FORMAL_REVIEW')
    before, after = c['registry_before'], c['registry_after']
    by_id = {x['file_id']: x for x in storage['new_artifacts']}
    require(c['master_file_id'] in by_id and c['manifest_file_id'] in by_id
            and by_id[c['master_file_id']]['source']['sha256'] == c['master']['sha256']
            and by_id[c['manifest_file_id']]['source']['sha256'] == c['master_manifest']['sha256'],
            'NATIVE_ARTIFACT_ROLE', 'Registry IDs must select the actual Master and Manifest bytes', 'FORMAL_REVIEW')
    require(storage['canonical_folder_id'] == before['canonical_folder_id']
            and storage['old_folder_id'] == before['old_folder_id']
            and storage['working_folder_id'] == before['working_folder_id']
            and len({x['file_id'] for x in storage['new_artifacts']}) == len(storage['new_artifacts'])
            and len({x['file_id'] for x in storage['old_artifacts']}) == len(storage['old_artifacts'])
            and set(plan['native_artifact_hashes']) == {x['file_id'] for x in storage['new_artifacts']},
            'NATIVE_STORAGE_PLAN', 'Exact product folders and staged IDs required', 'FORMAL_REVIEW')
    require(after['authoring_file_id'] == c['master_file_id'] and after['documentation_file_id'] == c['manifest_file_id']
            and after['runtime_status'] == 'NOT_INCLUDED_IN_PRODUCT_MASTER_FORMAL'
            and after['runtime_manifest_id'] == '' and after['runtime_file_count'] == '0',
            'RUNTIME_SCOPE_EXPANDED', 'Master Formal only; no fake Runtime', 'FORMAL_REVIEW')
    for artifact in storage['new_artifacts']:
        checked_bytes(artifact['source'])
        require(plan['native_artifact_hashes'][artifact['file_id']] == artifact['source']['sha256'],
                'NATIVE_STORAGE_PLAN', 'Staged bytes differ from the saved plan', 'FORMAL_REVIEW')
    result = {'status': 'PASS', 'product_id': c['product_id'], 'baseline_revision': before['package_version'],
              'candidate_revision': c['revision'], 'proposed_formal_plan_sha256': transaction,
              'native_registry_before': before, 'native_registry_after': after, 'native_storage': storage,
              'qa': proof, 'scope': document(c['scope']), 'controlled_unresolved': document(c['master'])['confirmations'],
              'predecessor_packet_sha256': c['predecessor_packet_sha256'],
              'formal_adoption': False, 'runtime_ui_mutations': 0, 'human_decision': 'NOT_ACCEPTED'}
    result['payload_sha256'] = fingerprint(result)
    return result


def approved_plan(c, packet, decision):
    from harness.changed_path import verify_decision, validate_plan
    decision_ref = verify_decision(packet, decision)
    plan = document(c['formal_plan'])
    require(packet['native_packet']['proposed_formal_plan_sha256'] == validate_plan(plan)
            and plan['native_storage'] == c['native_storage']
            and plan['native_registry_before'] == c['registry_before']
            and plan['native_registry_after'] == c['registry_after']
            and plan['native_registry_id'] == c['native_registry_id']
            and plan['registry_location'] == c['registry_location'],
            'STALE_DECISION', 'Requests and readback must use exactly the approved transaction', 'NATIVE_SAVE_REQUESTS')
    return decision_ref, plan


def requests(c, work):
    """After the real same-wrapper Human Gate, expose bounded host connector requests."""
    from harness.production import connector_document, native_registry
    packet = read_json(Path(work)/'review-packets/HUMAN_ADOPTION.json')
    decision = read_json(c['decision_path'])
    decision_ref, _ = approved_plan(c, packet, decision)
    observation_path = Path(c['execution_observations_path'])
    require(observation_path.is_file(), 'EXECUTION_OBSERVATIONS_REQUIRED',
            'Acquire fresh native Registry and old/new metadata after Human approval', 'NATIVE_SAVE_REQUESTS')
    observations = read_json(observation_path)
    require(native_registry(document(observations['registry']), c['registry_before']['manufacturer'],
                            c['registry_before']['series']) == c['registry_before'],
            'REGISTRY_HEAD_DRIFT', 'Native row changed before mutation', 'NATIVE_SAVE_REQUESTS')
    storage = c['native_storage']
    steps = []
    for group, destination in [('old_artifacts', storage['old_folder_id']), ('new_artifacts', storage['canonical_folder_id'])]:
        for item in storage[group]:
            meta = connector_document(document(observations['metadata'][item['file_id']]))
            expected_parent = storage['canonical_folder_id'] if group == 'old_artifacts' else storage['working_folder_id']
            require(meta['id'] == item['file_id'] and meta['parent_ids'] == [expected_parent]
                    and meta['title'] == item['before_name'], 'NATIVE_FILE_DRIFT', item['file_id'], 'NATIVE_SAVE_REQUESTS')
            if group == 'old_artifacts':
                from harness.production import observation_fingerprint
                require(observation_fingerprint(meta) ==
                        observation_fingerprint(document(item['before_metadata'])),
                        'NATIVE_FILE_DRIFT', item['file_id']+': predecessor content revision changed', 'NATIVE_SAVE_REQUESTS')
            if group == 'new_artifacts':
                require(checked_bytes(observations['downloaded'][item['file_id']]) == checked_bytes(item['source']),
                        'NATIVE_FILE_DRIFT', item['file_id']+': freshly download staged bytes', 'NATIVE_SAVE_REQUESTS')
            steps.append({'tool': 'google_drive.update_file', 'arguments':
                          {'fileId': item['file_id'], 'addParents': destination, 'removeParents': expected_parent,
                           'name': item['after_name']}})
    return {'status': 'PASS', 'decision_ref': decision_ref, 'moves': steps,
            'registry_update': {'tool': 'google_drive.batch_update_spreadsheet',
                                'file_id': c['native_registry_id'], 'before': c['registry_before'],
                                'after': c['registry_after'], 'preserve_unrelated_rows': True,
                                'policy': 'Reacquire the row/CAS after moves; do not replace the whole spreadsheet'},
            'next_action': 'Execute moves with raw authenticated receipts, then native row CAS and complete readback',
            'formal_adoption': False}


def verify_native_files(c, raw):
    from harness.production import connector_document
    plan = document(c['formal_plan'])
    require(raw.get('raw_connector_refs'), 'NATIVE_FORMAL_READBACK_REQUIRED', 'Retain authenticated raw results', 'NATIVE_FORMAL_READBACK')
    for ref in raw['raw_connector_refs']: checked_bytes(ref)
    storage = c['native_storage']; downloaded = {}
    listing = connector_document(document(raw['canonical_listing']))
    require({f['id'] for f in listing['files']} == {x['file_id'] for x in storage['new_artifacts']},
            'CANONICAL_DUPLICATE', 'Canonical folder must contain exactly the approved package artifacts', 'NATIVE_FORMAL_READBACK')
    old_listing = connector_document(document(raw['old_listing']))
    require({x['file_id'] for x in storage['old_artifacts']}.issubset({f['id'] for f in old_listing['files']}),
            'OLD_ARCHIVE_MISSING', 'Retain every predecessor artifact', 'NATIVE_FORMAL_READBACK')
    for group, parent in [('new_artifacts', storage['canonical_folder_id']), ('old_artifacts', storage['old_folder_id'])]:
        for item in storage[group]:
            meta = connector_document(document(raw['metadata'][item['file_id']]))
            require(meta['id'] == item['file_id'] and meta['parent_ids'] == [parent] and meta['title'] == item['after_name'],
                    'NATIVE_FILE_READBACK', item['file_id'], 'NATIVE_FORMAL_READBACK')
            if group == 'new_artifacts':
                actual = checked_bytes(raw['downloaded'][item['file_id']])
                require(sha(actual) == item['source']['sha256'], 'NATIVE_BYTES_READBACK', item['file_id'], 'NATIVE_FORMAL_READBACK')
                downloaded[item['file_id']] = sha(actual)
    require(downloaded == plan['native_artifact_hashes'], 'NATIVE_BYTES_READBACK',
            'Every canonical native artifact requires actual downloaded bytes', 'NATIVE_FORMAL_READBACK')
    return downloaded


def registry_request(c, raw, packet, decision):
    import csv, io
    from harness.production import connector_document, native_registry
    approved_plan(c, packet, decision)
    verify_native_files(c, raw)
    current = document(raw['registry'])
    require(native_registry(current, c['registry_before']['manufacturer'], c['registry_before']['series']) ==
            c['registry_before'], 'REGISTRY_HEAD_DRIFT', 'CAS failed after moves; do not write', 'NATIVE_REGISTRY_REQUEST')
    rows = list(csv.reader(io.StringIO(connector_document(current))))
    location = c['registry_location']; headers = location['headers']
    # Drive readable CSV adds an empty-header index column; it is not a native Sheet cell.
    require([h for h in rows[0] if h] == headers
            and dict(zip(rows[0], rows[location['row_index']])) == c['registry_before'],
            'REGISTRY_LOCATION_DRIFT', 'Reacquire the native row location', 'NATIVE_REGISTRY_REQUEST')
    values = []
    require(len(headers) == len(location['before_values']), 'REGISTRY_LOCATION_DRIFT',
            'Capture actual native cells, never write the CSV export index', 'NATIVE_REGISTRY_REQUEST')
    for key, previous in zip(headers, location['before_values']):
        value = c['registry_after'][key]
        entered = {'numberValue': float(value)} if type(previous) in (int, float) else {'stringValue': value}
        values.append({'userEnteredValue': entered})
    return {'status': 'PASS', 'tool': 'google_drive.batch_update_spreadsheet',
            'arguments': {'spreadsheet_id': c['native_registry_id'], 'requests': [
                {'updateCells': {'start': {'sheetId': location['sheet_id'], 'rowIndex': location['row_index'],
                                          'columnIndex': 0}, 'rows': [{'values': values}], 'fields': 'userEnteredValue'}}]},
            'before_row_sha256': fingerprint(c['registry_before']), 'preserve_unrelated_rows': True,
            'policy': 'Execute immediately against this acquired CAS; retain raw request/result and final complete Registry'}


def verify_native_readback(c, raw, packet, decision):
    from harness.changed_path import validate_plan
    from harness.production import connector_document, native_registry
    decision_ref, plan = approved_plan(c, packet, decision)
    downloaded = verify_native_files(c, raw)
    before = native_registry(document(raw['registry_before']), c['registry_before']['manufacturer'], c['registry_before']['series'])
    after = native_registry(document(raw['registry_after']), c['registry_before']['manufacturer'], c['registry_before']['series'])
    require(before == c['registry_before'] and after == c['registry_after'],
            'NATIVE_REGISTRY_READBACK', 'Wrong pre-write or post-write native row', 'NATIVE_FORMAL_READBACK')
    def others(ref):
        import csv, io
        rows = list(csv.reader(io.StringIO(connector_document(document(ref)))))
        return [r for r in rows if not (len(r) == len(rows[0]) and
                 dict(zip(rows[0], r)).get('manufacturer') == c['registry_before']['manufacturer']
                 and dict(zip(rows[0], r)).get('series') == c['registry_before']['series'])]
    require(others(raw['registry_before']) == others(raw['registry_after']), 'UNRELATED_REGISTRY_CHANGED',
            'Preserve every unrelated row/header exactly', 'NATIVE_FORMAL_READBACK')
    return {'status': 'POST_SAVE_VERIFIED', 'plan_sha256': validate_plan(plan), 'decision_ref': decision_ref,
            'registry_entry': after, 'downloaded_artifact_hashes': downloaded,
            'raw_connector_refs': raw['raw_connector_refs'], 'unrelated_registry_rows': 'UNCHANGED',
            'runtime_scope': 'NOT_INCLUDED_IN_PRODUCT_MASTER_FORMAL'}


def run(c, stage, work):
    frozen_profile(c)
    if stage == 'CURRENT_FORMAL_RESOLUTION':
        return {'status': 'PASS', 'native_registry': baseline(c), 'formal_mutations': 0}
    if stage == 'CARRY_FORWARD_QA':
        return {'status': 'PASS', **carry_forward(c)}
    if stage == 'FORMAL_REVIEW': return review(c, work)
    if stage == 'NATIVE_SAVE_REQUESTS': return requests(c, work)
    if stage == 'NATIVE_REGISTRY_REQUEST':
        path = Path(c['move_readback_path'])
        require(path.is_file(), 'MOVE_READBACK_REQUIRED', 'Verify all native moves before Registry CAS', stage)
        return registry_request(c, read_json(path), read_json(Path(work)/'review-packets/HUMAN_ADOPTION.json'),
                                read_json(c['decision_path']))
    if stage == 'NATIVE_FORMAL_READBACK':
        path = Path(c['native_readback_path'])
        require(path.is_file(), 'NATIVE_FORMAL_READBACK_REQUIRED', 'Execute the bounded native requests and actual readback',
                'NATIVE_FORMAL_READBACK')
        result = verify_native_readback(c, read_json(path), read_json(Path(work)/'review-packets/HUMAN_ADOPTION.json'),
                                        read_json(c['decision_path']))
        write_json(Path(work)/'native-formal-readback.json', result)
        return {'status': 'PASS', 'native_receipt': result}
    if stage == 'FORMAL_COMPLETION':
        saved = read_json(Path(work)/'FORMAL_SAVE.json')
        require(saved['status'] == 'PASS' and saved['current']['revision'] == c['revision'],
                'FORMAL_SAVE_REQUIRED', 'Existing Shared Formal save must complete', stage)
        return {'status': 'PASS', 'formal': 'FORMAL_PASS', 'revision': c['revision'],
                'controlled_unresolved': len(document(c['master'])['confirmations']), 'runtime_ui_release': 'NOT_EXECUTED'}
    raise ValueError('Unsupported native Formal stage '+stage)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    for key in ('harness-root', 'contract', 'stage', 'work', 'out'): parser.add_argument('--'+key, required=True)
    args = parser.parse_args(); setup(args.harness_root)
    try: result = run(read_json(args.contract), args.stage, args.work)
    except (Blocked, OSError, ValueError, KeyError, StopIteration) as error:
        result = {'status': 'FAIL', 'blocking_reason': getattr(error, 'data', {'reason': str(error)})}
    write_json(args.out, result)
