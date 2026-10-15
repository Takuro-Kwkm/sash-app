"""Project a completed shared-domain Working master into the native Formal flow.

No storage, journal, resume or approval engine lives here. The existing native
sheet-package-formal adapter owns Drive checks; shared v2 owns the transaction.
"""
import copy
import json
from pathlib import Path


def setup(shared):
    import sys
    sys.path.insert(0, str(Path(shared).resolve()))
    global read_json, require, sha, checked_bytes, digest
    from harness.core import read_json, require, sha
    from harness.changed_path import checked_bytes
    from product_master.identity import digest


def doc(ref): return json.loads(checked_bytes(ref))


def native_row(raw, manufacturer, series, allowed_states):
    import csv, io
    from harness.production import connector_document
    rows = list(csv.reader(io.StringIO(connector_document(raw))))
    header = next(r for r in rows if 'manufacturer' in r and 'series' in r)
    matches = [dict(zip(header, r)) for r in rows if len(r) == len(header)
               and dict(zip(header, r)).get('manufacturer') == manufacturer
               and dict(zip(header, r)).get('series') == series]
    require(len(matches) == 1 and matches[0]['master_status'] in allowed_states,
            'NATIVE_WORKING_IDENTITY', 'One exact admitted Working/Formal row required', 'FORMAL_REVIEW')
    return matches[0]


def baseline(c, profile):
    from harness.production import observation_fingerprint, connector_document
    row = native_row(doc(c['registry_response']), profile['manufacturer'], profile['series'], ['WORKING_RECOVERY'])
    require(row == c['registry_before'] and row['package_version'] == profile['baseline_revision'],
            'NATIVE_WORKING_DRIFT', 'Retain the actual Working row; never invent an existing Formal', 'FORMAL_REVIEW')
    previous = doc(c['predecessor']['spec']); contract = doc(previous['input'])
    require(doc(contract['inputs']['registry']) == doc(c['baseline_registry_response']),
            'WORKING_BASELINE_CHANGED', 'Original Working observation must remain exact', 'FORMAL_REVIEW')
    require(observation_fingerprint(doc(c['candidate_authoring_metadata'])) ==
            observation_fingerprint(doc(c['predecessor_authoring_metadata'])),
            'WORKING_AUTHORING_CHANGED', 'Completed Working artifact changed', 'FORMAL_REVIEW')
    meta = connector_document(doc(c['candidate_authoring_metadata']))
    require(meta['id'] == c['working_authoring_id'], 'WORKING_AUTHORING_CHANGED', 'Wrong native candidate', 'FORMAL_REVIEW')
    require(row['canonical_folder_id'] == profile['canonical_folder_id']
            and row['old_folder_id'] == profile['old_folder_id']
            and row['working_folder_id'] == profile['working_folder_id'],
            'NATIVE_FOLDER_DRIFT', 'Exact existing product folders required', 'FORMAL_REVIEW')
    return row


def normalize_formal(candidate, formal):
    expected = copy.deepcopy(candidate)
    expected['lifecycle_status'] = 'FORMAL'
    for field in expected['fields']: field['lifecycle_status'] = 'FORMAL'
    expected['product']['revision'] = formal['product']['revision']
    expected['provenance']['policy_ref'] = formal['provenance']['policy_ref']
    require(expected == formal, 'FACT_CHANGED', 'Only lifecycle/revision/policy-reference may change', 'CARRY_FORWARD_QA')


def carry_forward(c):
    from harness.workflow import inspect
    from harness.core import package_members, inspect_package
    prior = c['predecessor']; spec = doc(prior['spec'])
    require(inspect(prior['root'], prior['work'], spec)[0]['state'] == 'COMPLETED'
            and spec['target'] == c['product_id'], 'PREDECESSOR_NOT_COMPLETED', 'Inspect the exact completed Work', 'CARRY_FORWARD_QA')
    before = doc(spec['input']); candidate = doc(prior['master']); qa = doc(prior['qa'])
    require(before['inputs']['review'] == c['review'] and before['inputs']['baseline'] == c['baseline']
            and prior['master']['path'] in [a['path'] for e in __import__('harness.workflow', fromlist=['events']).events(prior['work'])
                                          for a in e['evidence'].get('artifacts', [])],
            'CARRY_FORWARD_BINDING', 'Use actual completed outputs and observations', 'CARRY_FORWARD_QA')
    require(qa['status'] == 'PASS' and qa['qa_ready'] is True and qa['blocker_count'] == 0
            and qa['package_sha256'] == digest(candidate)
            and qa['executed_test_count'] == len(candidate['handoff_tests'])
            and all(type(v) is int and v == 0 for v in qa['metrics'].values()),
            'CARRY_FORWARD_QA', 'Require exact executed native Scope QA', 'CARRY_FORWARD_QA')
    review = doc(c['review'])
    require(review['candidate_sha256'] == digest(candidate), 'CARRY_FORWARD_BINDING', 'Review hash differs', 'CARRY_FORWARD_QA')
    for source in c['sources']: checked_bytes(source)
    require([(s['identity'],s['version'],s['sha256']) for s in c['sources']] ==
            [(s['identity'],s['version'],s['content_identifier']['value']) for s in candidate['sources']],
            'SOURCE_CHANGED', 'Source bytes/version must remain identical', 'CARRY_FORWARD_QA')
    package = checked_bytes(c['package']); info = inspect_package(package); _, files = package_members(package)
    formal = json.loads(files['PRODUCT_MASTER.json']); normalize_formal(candidate, formal)
    require(formal['product']['revision'] == c['revision'] == info['revision']
            and files['CARRIED_CONTENT_QA.json'] == checked_bytes(prior['qa'])
            and files['SOURCE_REVIEW.json'] == checked_bytes(c['review'])
            and files['WORKING_SNAPSHOT.json'] == checked_bytes(prior['master']),
            'FORMAL_QA_BINDING', 'Package does not contain the exact tested predecessor', 'CARRY_FORWARD_QA')
    manifest = json.loads(files['PRODUCT_MASTER_MANIFEST.json']); scope = json.loads(files['FORMAL_SELECTION_SCOPE.json'])
    require(scope['runtime_scope'] == manifest['runtime_scope'] == 'NOT_INCLUDED_IN_PRODUCT_MASTER_FORMAL'
            and scope['field_ids'] == [f['field_id'] for f in candidate['fields']]
            and json.loads(files['CONTROLLED_UNRESOLVED.json']) == review['confirmation_requests']
            and all(x['automatic_resolution'] is False for x in review['confirmation_requests'])
            and document_policy(c)['human_required'] is True,
            'FORMAL_SCOPE_EXPANDED', 'Keep exact Scope and confirmation boundaries', 'CARRY_FORWARD_QA')
    require(doc(c['formal_scope_qa']) == json.loads(files['FORMAL_CONTENT_QA.json'])
            and doc(c['master']) == formal,
            'FORMAL_QA_BINDING', 'Loose and packaged proofs differ', 'CARRY_FORWARD_QA')
    return {'carried_content_checks': qa['executed_test_count'], 'formal_scope_checks': len(doc(c['formal_scope_qa'])['checks']),
            'controlled_unresolved': len(review['confirmation_requests']), 'package': info,
            'product_qa_rerun': False, 'predecessor': 'INSPECT_ONLY'}


def document_policy(c):
    policy = doc(c['formal_policy'])
    require(policy['policy_id'] == doc(c['master'])['provenance']['policy_ref']
            and policy['human_required'] is True and policy['evidence_acceptance_required'] is False,
            'FORMAL_POLICY', 'Fixed native human adoption policy required', 'FORMAL_REVIEW')
    for source in policy['authority_refs']: checked_bytes(source)
    return policy


def formal_content_qa(c, work):
    """After the shared Human Gate, validate the actual proposed Formal payload."""
    from harness.changed_path import verify_decision
    from product_master.validators.validate import validate
    packet = read_json(Path(work)/'review-packets/HUMAN_ADOPTION.json')
    actual = read_json(c['decision_path']); decision_ref = verify_decision(packet, actual)
    master = doc(c['master']); policy = document_policy(c)
    require(packet['native_packet']['proposed_master_sha256'] == c['master']['sha256']
            and packet['native_packet']['proposed_domain_digest'] == digest(master),
            'STALE_DECISION', 'Human-approved content differs', 'FORMAL_CONTENT_QA')
    admitted = {'policy_id': policy['policy_id'], 'actor_kind': 'HUMAN', 'decision': 'ADOPT',
                'decision_ref': decision_ref, 'payload_sha256': digest(master),
                'field_ids': [f['field_id'] for f in master['fields']],
                'source_workflow_payload_sha256': actual['payload_sha256']}
    report = validate(master, doc(c['baseline']), policy, admitted)
    require(report['status'] == 'PASS', 'FORMAL_CONTENT_QA', 'Shared domain Formal QA failed', 'FORMAL_CONTENT_QA')
    return {'status': 'PASS', 'executed': True, 'report': report, 'decision_ref': decision_ref,
            'formal_registry': 'NOT_WRITTEN'}
