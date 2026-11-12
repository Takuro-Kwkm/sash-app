#!/usr/bin/env python3
"""Read back an adopted master for a new connection Work."""

import argparse
import json
import sys
from pathlib import Path


def verify(shared, input_path):
    sys.path.insert(0, str(shared))
    from harness.changed_path import validate_plan, verify_decision
    from harness.common_adoption import original_engine
    from harness.common_development import (
        document, inspected_work, validate_original_decision, work_repository,
    )
    from harness.core import read_json, require
    from harness.production import connector_document, native_registry
    from harness.resolvers import capture

    source = read_json(input_path)
    require(source.get('schema') == 'SASH_FORMAL_RECONNECT_V1',
            'FORMAL_RECONNECT_SCOPE', 'Bound Formal reconnect input required')
    upstream = source['original_formal']
    original_engine(upstream)
    spec, _, workflow, journal = inspected_work(upstream, source['product_id'])
    require(work_repository(spec) == source['repository'] == 'Takuro-Kwkm/sash-app'
            and spec['target_gate'] == 'FORMAL_CHANGE_ADOPTION',
            'FORMAL_RECONNECT_SCOPE', 'Use the original completed Sash Formal Work')
    steps = [step for step in workflow['steps'] if step['kind'] == 'formal-save']
    require(len(steps) == 1, 'NATIVE_FORMAL_RECEIPT', 'One completed Formal save required')
    step = steps[0]
    plan = document(step['plan'])
    transaction = validate_plan(plan)
    packet, decision = validate_original_decision(upstream, spec, 'HUMAN_ADOPTION')
    decision_ref = verify_decision(packet, decision)
    events = [row['evidence'] for row in journal if row['gate'] == step['id']]
    require(len(events) == 1, 'NATIVE_FORMAL_RECEIPT', 'Original Formal journal event required')
    evidence = events[0]
    receipt = document(source['formal_save'])
    require(receipt == evidence['formal_save'] and receipt['status'] == 'PASS'
            and source['formal_save'] in evidence['artifacts']
            and packet['native_packet']['proposed_formal_plan_sha256'] == transaction
            and receipt['transaction_sha256'] == transaction
            and receipt['decision_ref'] == decision_ref
            and plan['work_id'] == spec['workflow_id'],
            'NATIVE_FORMAL_RECEIPT', 'Use the original approved Formal save event')

    master = document(source['formal'])
    product = master['product']
    digest = source['formal']['sha256']
    artifacts = [item for item in plan['artifacts'] if item['role'] == 'PRODUCT_MASTER']
    require(len(artifacts) == 1 and artifacts[0]['source']['sha256'] == digest
            and master['lifecycle_status'] == 'FORMAL'
            and product['product_id'] == spec['target'] == plan['product_id']
            and product['revision'] == plan['revision'],
            'MASTER_NOT_BOUND', 'Use the exact adopted product and master revision')
    saved_path = (Path(spec['storage_root']) / artifacts[0]['destination']).resolve()
    saved = [item for item in evidence['artifacts'] if Path(item['path']).resolve() == saved_path]
    require(len(saved) == 1 and saved[0]['sha256'] == digest,
            'MASTER_NOT_BOUND', 'Master must appear in the original Formal save')
    capture('/', saved[0])

    readback = receipt['native_receipt']
    metadata = connector_document(document(source['master_metadata']))
    row = native_registry(document(source['registry']), product['manufacturer'], source['series'])
    require(row == plan['native_registry_after'] == readback['registry_entry']
            and row['package_version'] == product['revision']
            and metadata['id'] == row['authoring_file_id']
            and metadata['parent_ids'] == [row['canonical_folder_id']]
            and metadata['title'] == row['authoring_file_name']
            and readback['status'] == 'POST_SAVE_VERIFIED'
            and readback['plan_sha256'] == transaction and readback['decision_ref'] == decision_ref
            and readback['downloaded_artifact_hashes'] == plan['native_artifact_hashes']
            and readback['downloaded_artifact_hashes'][metadata['id']] == digest,
            'NATIVE_FORMAL_READBACK', 'Live Registry and canonical master must match the original readback')
    return {
        'status': 'PASS', 'role': 'PRODUCT_MASTER', 'mode': 'EXISTING_FORMAL_CARRY_FORWARD',
        'repository': source['repository'], 'product_id': source['product_id'],
        'master_sha256': digest, 'current': receipt['current'],
        'original_formal_work': upstream, 'original_formal_save': source['formal_save'],
        'written_files': 0, 'new_human_decisions': 0,
    }


def prepare(shared, checkout, input_path, destination):
    sys.path.insert(0, str(shared))
    from harness.common_adoption import verify as verify_connection
    from harness.common_development import document, ref
    from harness.core import read_json, require, write_json

    verify_connection(shared, checkout)
    source = read_json(input_path)
    proof = verify(shared, input_path)
    config = read_json(checkout / 'contracts/production/work-connections.v2.json')
    row = next(item for item in config['products'] if item['product_id'] == proof['product_id'])
    worker = Path(__file__).resolve()
    require(row['adapters']['ProductMaster'] == worker.relative_to(checkout).as_posix(),
            'FORMAL_RECONNECT_SCOPE', 'Use the registered native ProductMaster adapter')
    require(not destination.exists() and not destination.is_relative_to(shared)
            and not destination.is_relative_to(checkout),
            'CHECKPOINT_SCOPE', 'Use a new checkpoint outside the source repositories')
    upstream = document(source['original_formal']['spec'])
    destination.mkdir(parents=True)
    workflow_path = destination / 'workflow.json'
    write_json(workflow_path, {
        'workflow_id': 'NATIVE_FORMAL_RECONNECT_V1', 'version': '1', 'status': 'ACTIVE',
        'work_skill': 'product-change-work',
        'steps': [{
            'id': 'FORMAL_CARRY_FORWARD', 'kind': 'validator', 'needs': [],
            'script': ref(worker),
            'args': ['--shared', str(shared), '--input', '{input}', '--stage', 'FORMAL_ADOPTION',
                     '--out', '{work}/formal-carry-forward.json'],
            'output': '{work}/formal-carry-forward.json',
            'result_path': ['status'], 'expected_result': 'PASS',
        }],
        'targets': {'NATIVE_FORMAL_RECONNECT_READY': ['FORMAL_CARRY_FORWARD']},
    })
    authority = {
        **ref(workflow_path), 'authority_id': 'NATIVE_FORMAL_RECONNECT_V1',
        'authority_type': 'WORKFLOW', 'repository': source['repository'], 'version': '1',
        'status': 'ACTIVE', 'scope_axis': 'EXISTING_FORMAL_CARRY_FORWARD',
        'resolution_source': 'Original Formal journal and live native readback',
    }
    index = document(upstream['authority_index'])
    index['entries'].append(authority)
    index_path = destination / 'authority-index.json'
    write_json(index_path, index)
    spec = {
        **upstream, 'workflow_id': source['work_id'], 'repository': source['repository'],
        'target_gate': 'NATIVE_FORMAL_RECONNECT_READY', 'skill_root': str(shared),
        'workflow': ref(workflow_path), 'input': ref(input_path),
        'authority_index': ref(index_path), 'authorities': upstream['authorities'] + [authority],
        'storage_root': str(destination / 'saved'),
        'runtime_refs': [
            ref(worker), ref(checkout / 'contracts/production/work-connections.v2.json'),
            ref(shared / 'harness/workflow.py'), ref(shared / 'harness/common_development.py'),
            source['original_formal']['spec'], source['formal'], source['formal_save'],
            source['registry'], source['master_metadata'],
        ],
    }
    for key in ('production_binding', 'decisions', 'formal_receipt'):
        spec.pop(key, None)
    write_json(destination / 'spec.json', spec)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--shared', required=True, type=Path)
    parser.add_argument('--input', required=True, type=Path)
    parser.add_argument('--stage', choices=['FORMAL_ADOPTION'])
    parser.add_argument('--out', type=Path)
    parser.add_argument('--checkout', type=Path)
    parser.add_argument('--destination', type=Path)
    args = parser.parse_args()
    if args.stage:
        result = verify(args.shared.resolve(), args.input.resolve())
        args.out.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    else:
        prepare(args.shared.resolve(), args.checkout.resolve(), args.input.resolve(), args.destination.resolve())
