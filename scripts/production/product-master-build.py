#!/usr/bin/env python3
"""Native planning boundary. The shared v2 workflow owns execution and adoption."""
import argparse
import csv
import io
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def plan(harness_root, instruction, registry_observation, work_root):
    sys.path.insert(0, str(Path(harness_root).resolve()))
    from harness.architecture import route_instruction
    from harness.core import require, sha
    from product_master.domain import plan as domain_plan
    route = route_instruction(harness_root, {'Takuro-Kwkm/sash-app': str(ROOT)}, instruction)
    require(route.get('operation') == 'NEW_PRODUCT_BOOTSTRAP', 'EXISTING_PRODUCT_ROUTING',
            'Use the resolved existing product path', 'PLANNING')
    raw = json.loads(Path(registry_observation).read_text())
    require(not raw.get('isError'), 'CURRENT_REGISTRY_UNVERIFIED', 'Registry retrieval failed', 'PLANNING')
    document = raw.get('structuredContent', {})
    profile = route['profile']
    require(document.get('id') == profile['contracts']['registry_bootstrap']['authority_id'],
            'CURRENT_REGISTRY_UNVERIFIED', 'Wrong native Registry', 'PLANNING')
    text = document.get('content')
    require(isinstance(text, str) and text.strip(), 'CURRENT_REGISTRY_UNVERIFIED', 'Complete native CSV required', 'PLANNING')
    rows = list(csv.reader(io.StringIO(text)))
    require(rows and {'manufacturer', 'series', 'master_status', 'package_version'}.issubset(rows[0]),
            'CURRENT_REGISTRY_UNVERIFIED', 'Native header missing', 'PLANNING')
    require(all(len(r) == len(rows[0]) for r in rows[1:]),
            'CURRENT_REGISTRY_UNVERIFIED', 'Truncated or malformed Registry', 'PLANNING')
    records = [dict(zip(rows[0], r)) for r in rows[1:]]
    require(records and all(r.get('manufacturer') and r.get('series') for r in records),
            'CURRENT_REGISTRY_UNVERIFIED', 'Complete populated identity rows required', 'PLANNING')
    identities = [(r['manufacturer'], r['series']) for r in records]
    require(len(set(identities)) == len(identities), 'PRODUCT_REGISTRY_DRIFT', 'Duplicate native identity', 'PLANNING')
    label = route['requested_product']
    existing = [r for r in records if label == (r['manufacturer'] + ' ' + r['series'])]
    require(len(existing) <= 1, 'PRODUCT_REGISTRY_DRIFT', 'Duplicate native identity', 'PLANNING')
    require(not existing, 'EXISTING_PRODUCT_REQUIRES_NATIVE_ROUTE',
            'Native Registry already contains this label; acquire its Formal/Working adapter', 'PLANNING')
    candidate_id = route['product_id']
    context = {'registry_state': 'ABSENT', 'intent': 'build', 'dry_run': True, 'target_gate': 'QA_READY'}
    selection = domain_plan(context)
    candidate = {'product_id': candidate_id, 'requested_label': label, 'master_state': 'ABSENT',
                 'lifecycle_state': 'DRAFT', 'identity_state': 'PROVISIONAL_NOT_MANUFACTURER_FACT'}
    destination = Path(work_root).resolve() / candidate_id / 'DRAFT'
    return {'status': 'PASS', 'operation': 'NEW_PRODUCT_BOOTSTRAP', 'mode': 'DRY_RUN_PLANNING',
            'repository': route['repository'], 'profile_id': profile['profile_id'], 'route': route,
            'domain_plan': selection, 'registry_bootstrap_candidate': {'products': [candidate]},
            'native_registry_observation': {'id': document['id'], 'sha256': sha(text.encode()),
                'response_sha256': sha(Path(registry_observation).read_bytes()), 'rows': len(records), 'match': 'ABSENT'},
            'source_requests': [{'operation': 'DISCOVER_OFFICIAL_SOURCE', 'requested_label': label,
                'scope': 'Acquire manufacturer identity and product family from official source; no Window fields inferred',
                'local_first': True, 'required_identity': profile['contracts']['source_identity']['required']}],
            'destinations': {k: str(destination / profile['contracts']['storage'][k]) for k in
                ('candidate', 'source', 'evidence', 'qa', 'formal_candidate', 'checkpoint')},
            'validators': {k: v for k, v in profile['refs'].items() if 'validator' in k or 'schema' in k},
            'formal_adoption': 'NOT_REQUESTED', 'product_master_created': False, 'native_registry_writes': 0,
            'runtime_ui_writes': 0, 'release_writes': 0,
            'next_action': 'Execute official-source requests, freeze reviewed observations and native project QA, then bind existing shared workflow'}


def main():
    # Production execution is shared; this repository only supplies native planning/QA.
    parser = argparse.ArgumentParser(add_help=False)
    parser.add_argument('--harness-root', required=True)
    parser.add_argument('--plan-only', action='store_true')
    known, remaining = parser.parse_known_args()
    sys.path.insert(0, str(Path(known.harness_root).resolve()))
    if known.plan_only:
        p = argparse.ArgumentParser()
        for key in ('instruction', 'registry-observation', 'work-root', 'out'):
            p.add_argument('--' + key, required=True)
        a = p.parse_args(remaining)
        result = plan(known.harness_root, a.instruction, a.registry_observation, a.work_root)
        output = Path(a.out).resolve()
        if output.is_symlink() or not output.is_relative_to(Path(a.work_root).resolve()) or output.is_relative_to(ROOT):
            raise ValueError('External Work output required')
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
        return 0
    from product_master.execution import main as shared_execution
    return shared_execution(['--harness-root', known.harness_root, '--checkout', str(ROOT)] + remaining)

if __name__ == '__main__':
    raise SystemExit(main())
