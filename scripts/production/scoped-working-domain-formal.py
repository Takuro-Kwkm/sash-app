"""Native scoped projection of an immutable completed Working into Formal.

The existing sheet-package Formal worker, Shared Human gate, transaction and
connector readback own execution. This adapter admits no writes or decisions.
"""
import copy
import json
from pathlib import Path


def setup(shared):
    import sys
    sys.path.insert(0, str(Path(shared).resolve()))
    global require, sha, checked_bytes, digest, read_json
    from harness.core import require, sha, read_json
    from harness.changed_path import checked_bytes
    from product_master.identity import digest


def doc(ref):
    return json.loads(checked_bytes(ref))


def native_row(raw, manufacturer, series, allowed_states):
    import csv, io
    from harness.production import connector_document
    rows = list(csv.reader(io.StringIO(connector_document(raw))))
    header = next(r for r in rows if 'manufacturer' in r and 'series' in r)
    matches = [dict(zip(header, r)) for r in rows if len(r) == len(header)
               and dict(zip(header, r)).get('manufacturer') == manufacturer
               and dict(zip(header, r)).get('series') == series]
    require(len(matches) == 1 and matches[0]['master_status'] in allowed_states,
            'NATIVE_WORKING_IDENTITY', 'One exact profile-bound Working/Formal row required', 'FORMAL_REVIEW')
    return matches[0]


def metadata(ref):
    raw = doc(ref)
    require(not raw.get('isError'), 'METADATA_ACQUISITION', 'Metadata read failed', 'FORMAL_REVIEW')
    data = raw.get('structuredContent', raw)
    require(isinstance(data, dict) and data.get('id') and data.get('mime_type')
            and isinstance(data.get('parent_ids'), list), 'METADATA_IDENTITY',
            'Use actual structured metadata; readable content is not file identity', 'FORMAL_REVIEW')
    size = data.get('file_size_bytes', data.get('size'))
    return dict(id=data['id'], mime_type=data['mime_type'], parent_ids=data['parent_ids'],
                modified_time=data.get('modified_time'), size=int(size) if size is not None else None)


def baseline(c, profile):
    row = native_row(doc(c['registry_response']), profile['manufacturer'], profile['series'], profile['baseline_states'])
    require(row == c['registry_before'] and row['package_version'] == profile['baseline_revision'],
            'NATIVE_WORKING_DRIFT', 'Retain the exact Working R2 row; no assumed existing Formal', 'FORMAL_REVIEW')
    for key in ('canonical_folder_id', 'old_folder_id', 'working_folder_id'):
        require(row[key] == profile[key], 'NATIVE_FOLDER_DRIFT', key, 'FORMAL_REVIEW')
    previous = doc(c['predecessor']['spec']); contract = doc(previous['input'])
    require(doc(contract['inputs']['registry']) == doc(c['baseline_registry_response']),
            'WORKING_BASELINE_CHANGED', 'Original captured Registry changed', 'FORMAL_REVIEW')
    current = metadata(c['candidate_authoring_metadata'])
    require(current == metadata(c['predecessor_authoring_metadata'])
            and current['id'] == c['working_authoring_id']
            and current['parent_ids'] == [profile['working_folder_id']],
            'WORKING_AUTHORING_CHANGED', 'Completed R3 Savepoint identity changed', 'FORMAL_REVIEW')
    return row


def scope_partition(candidate, scope):
    known = [f['field_id'] for f in candidate['fields'] if f['knowledge_status'] == 'KNOWN']
    unresolved = [f['field_id'] for f in candidate['fields'] if f['knowledge_status'] in ('UNKNOWN', 'UNRESOLVED')]
    require(scope['field_ids'] == known and scope['excluded_field_ids'] == unresolved
            and set(known).isdisjoint(unresolved) and len(known) + len(unresolved) == len(candidate['fields'])
            and scope['runtime_scope'] == 'NOT_INCLUDED_IN_PRODUCT_MASTER_FORMAL'
            and scope['automatic_orderability'] is False,
            'FORMAL_SCOPE_PARTITION', 'All known fields and every preserved unresolved field must be explicit', 'CARRY_FORWARD_QA')
    return known, unresolved


def normalize_formal(candidate, formal, scope):
    known, unresolved = scope_partition(candidate, scope)
    expected = copy.deepcopy(candidate)
    expected['lifecycle_status'] = 'FORMAL'
    for field in expected['fields']:
        if field['field_id'] in known: field['lifecycle_status'] = 'FORMAL'
    expected['product']['revision'] = formal['product']['revision']
    expected['provenance']['policy_ref'] = formal['provenance']['policy_ref']
    require(expected == formal, 'FACT_CHANGED',
            'Only selected known lifecycles/revision/policy-reference may change; unresolved stays exact', 'CARRY_FORWARD_QA')


def verify_carried_qa(candidate, qa, scope):
    _, unresolved = scope_partition(candidate, scope)
    from product_master.validators.validate import METRICS
    require(qa['status'] == 'PASS' and qa['qa_ready'] is True and qa['formal'] is False
            and qa['blocker_count'] == 0 and qa['package_sha256'] == digest(candidate)
            and qa['executed_test_count'] == len(candidate['handoff_tests'])
            and set(qa['metrics']) == set(METRICS)
            and qa['metrics']['UNKNOWN'] == len(unresolved)
            and all(type(v) is int and v == 0 for k, v in qa['metrics'].items() if k != 'UNKNOWN')
            and len(qa['findings']) == len(unresolved)
            and {f['target'] for f in qa['findings']} == set(unresolved)
            and all(f['code'] == 'UNKNOWN' and f['blocking'] is False for f in qa['findings']),
            'CARRY_FORWARD_QA', 'Only exact out-of-scope unresolved findings may survive executed QA', 'CARRY_FORWARD_QA')
    for fid in unresolved:
        gaps = [g for g in candidate['gaps'] if fid in g['field_ids']]
        require(gaps and all(g['classification'] != 'Blocker' and g['result_in_scope'] is False
                and g['confirmation_in_scope'] is True for g in gaps),
                'UNRESOLVED_NOT_ISOLATED', fid, 'CARRY_FORWARD_QA')


def document_policy(c):
    policy = doc(c['formal_policy'])
    require(policy['policy_id'] == doc(c['master'])['provenance']['policy_ref']
            and policy['human_required'] is True and policy['evidence_acceptance_required'] is False,
            'FORMAL_POLICY', 'Exact authority-bound Human adoption policy required', 'FORMAL_REVIEW')
    for source in policy['authority_refs']: checked_bytes(source)
    return policy


def carry_forward(c):
    from harness.workflow import inspect, events
    from harness.core import package_members, inspect_package
    import zipfile, io
    profile = doc(c['profile']); prior = c['predecessor']; spec = doc(prior['spec'])
    require(inspect(prior['root'], prior['work'], spec)[0]['state'] == 'COMPLETED'
            and spec['target'] == c['product_id'] and spec['workflow_id'] == profile['completed_work_id'],
            'PREDECESSOR_NOT_COMPLETED', 'Inspect the exact completed R3 Work', 'CARRY_FORWARD_QA')
    contract = doc(spec['input']); candidate = doc(prior['master']); qa = doc(prior['qa']); scope = doc(c['scope'])
    require(sha(checked_bytes(prior['master'])) == profile['working_master_sha256']
            and sha(checked_bytes(prior['qa'])) == profile['working_qa_sha256']
            and contract['inputs']['review'] == c['review'] and contract['inputs']['baseline'] == c['baseline']
            and prior['master']['path'] in [a['path'] for e in events(prior['work']) for a in e['evidence'].get('artifacts', [])],
            'CARRY_FORWARD_BINDING', 'Only actual pinned R3 outputs and source review may be carried', 'CARRY_FORWARD_QA')
    require(scope['field_ids'] == profile['formal_scope_field_ids']
            and scope['excluded_field_ids'] == profile['excluded_field_ids'],
            'FORMAL_SCOPE_PARTITION', 'Scope differs from independently admitted profile', 'CARRY_FORWARD_QA')
    verify_carried_qa(candidate, qa, scope)
    working = checked_bytes(c['working_package'])
    require(sha(working) == profile['working_package_sha256'], 'WORKING_PACKAGE_CHANGED', 'Actual Drive R3 ZIP differs', 'CARRY_FORWARD_QA')
    with zipfile.ZipFile(io.BytesIO(working)) as z:
        require(z.read('product-master.json') == checked_bytes(prior['master'])
                and z.read('BUSINESS_QA.json') == checked_bytes(prior['qa'])
                and json.loads(z.read('WORKING_SAVEPOINT.json'))['content_gate'] == 'QA_READY',
                'WORKING_PACKAGE_CHANGED', 'Downloaded R3 members differ from completed Work', 'CARRY_FORWARD_QA')
    for source in c['sources']: checked_bytes(source)
    require([(s['identity'], s['version'], s['sha256']) for s in c['sources']] ==
            [(s['identity'], s['version'], s['content_identifier']['value']) for s in candidate['sources']],
            'SOURCE_CHANGED', 'Source bytes and versions must remain exact', 'CARRY_FORWARD_QA')
    review = doc(c['review'])
    require(review['candidate_sha256'] == digest(candidate), 'CARRY_FORWARD_BINDING', 'Review identity changed', 'CARRY_FORWARD_QA')
    package = checked_bytes(c['package']); info = inspect_package(package); _, files = package_members(package)
    formal = json.loads(files['PRODUCT_MASTER.json']); normalize_formal(candidate, formal, scope)
    boundary = json.loads(files['CONTROLLED_UNRESOLVED_BOUNDARY.json'])
    require(files['CARRIED_CONTENT_QA.json'] == checked_bytes(prior['qa'])
            and files['WORKING_SNAPSHOT.json'] == checked_bytes(prior['master'])
            and files['SOURCE_REVIEW.json'] == checked_bytes(c['review'])
            and json.loads(files['CONTROLLED_UNRESOLVED.json']) == review['confirmation_requests']
            and set(boundary) == {r['id'] for r in review['confirmation_requests']}
            and all(v == {'automatic_resolution': False, 'automatic_orderability': False} for v in boundary.values()),
            'CONTROLLED_UNRESOLVED_CHANGED', 'Keep all original confirmations and non-automatic behavior', 'CARRY_FORWARD_QA')
    require(doc(c['formal_scope_qa']) == json.loads(files['FORMAL_CONTENT_QA.json'])
            and doc(c['master']) == formal and doc(c['scope']) == json.loads(files['FORMAL_SELECTION_SCOPE.json'])
            and formal['product']['revision'] == c['revision'] == info['revision']
            and json.loads(files['PRODUCT_MASTER_MANIFEST.json'])['runtime_scope'] == scope['runtime_scope'],
            'FORMAL_QA_BINDING', 'Loose/packaged Scope, Master and QA differ', 'CARRY_FORWARD_QA')
    document_policy(c)
    return dict(carried_content_checks=qa['executed_test_count'], formal_scope_checks=len(doc(c['formal_scope_qa'])['checks']),
                known_fields=len(scope['field_ids']), excluded_unresolved=len(scope['excluded_field_ids']),
                controlled_unresolved=len(review['confirmation_requests']), package=info,
                product_qa_rerun=False, predecessor='INSPECT_ONLY')


def formal_content_qa(c, work):
    from harness.changed_path import verify_decision
    from product_master.validators.validate import validate
    packet = read_json(Path(work) / 'review-packets/HUMAN_ADOPTION.json')
    actual = read_json(c['decision_path']); decision_ref = verify_decision(packet, actual)
    master = doc(c['master']); policy = document_policy(c); scope = doc(c['scope'])
    require(packet['native_packet']['proposed_master_sha256'] == c['master']['sha256']
            and packet['native_packet']['proposed_domain_digest'] == digest(master),
            'STALE_DECISION', 'Admitted packet does not bind these Formal bytes', 'FORMAL_CONTENT_QA')
    admitted = dict(policy_id=policy['policy_id'], actor_kind='HUMAN', decision='ADOPT', decision_ref=decision_ref,
                    payload_sha256=digest(master), field_ids=scope['field_ids'],
                    source_workflow_payload_sha256=actual['payload_sha256'])
    report = validate(master, doc(c['baseline']), policy, admitted)
    require(report['status'] == 'PASS' and report['blocker_count'] == 0,
            'FORMAL_CONTENT_QA', 'Shared domain Formal QA failed', 'FORMAL_CONTENT_QA')
    return dict(status='PASS', executed=True, report=report, decision_ref=decision_ref, formal_registry='NOT_WRITTEN')
