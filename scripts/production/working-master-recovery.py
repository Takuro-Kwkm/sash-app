#!/usr/bin/env python3
"""Recover native Working tables; v2 owns execution, storage and checkpoints.

This adapter has no manufacturer resolver and grants no business QA or Formal
adoption. It preserves every source row, including historical tests, as DRAFT.
"""
import argparse
import base64
import csv
import io
import json
import sys
from collections import Counter
from pathlib import Path


def setup(harness_root):
    sys.path.insert(0, str(Path(harness_root).resolve()))
    global require, read_json, write_json, sha, capture, Blocked
    from harness.core import require, read_json, write_json, sha, Blocked
    from harness.resolvers import capture


def verified(ref):
    return capture(Path('/'), ref)


def working_row(raw, profile):
    require(not raw.get('isError'), 'CURRENT_REGISTRY_UNVERIFIED', 'Registry acquisition failed', 'BASELINE')
    d = raw.get('structuredContent', raw)
    require(d.get('id') == profile['registry_id'], 'CURRENT_REGISTRY_UNVERIFIED', 'Wrong Registry ID', 'BASELINE')
    rows = list(csv.reader(io.StringIO(d['content'])))
    require(rows and {'manufacturer', 'series', 'master_status', 'package_version'}.issubset(rows[0]),
            'CURRENT_REGISTRY_UNVERIFIED', 'Complete CSV required', 'BASELINE')
    require(all(len(r) == len(rows[0]) for r in rows[1:]), 'CURRENT_REGISTRY_UNVERIFIED', 'Truncated Registry', 'BASELINE')
    matches = [dict(zip(rows[0], r)) for r in rows[1:] if dict(zip(rows[0], r)).get('manufacturer') == profile['manufacturer']
               and dict(zip(rows[0], r)).get('series') == profile['registry_series']]
    require(len(matches) == 1 and matches[0]['master_status'] in profile['working_states'],
            'WORKING_BASELINE_REQUIRED', 'One existing Working row required; never overwrite Formal', 'BASELINE')
    return matches[0]


def tables(path):
    from openpyxl import load_workbook
    book = load_workbook(path, read_only=True, data_only=False)
    result = {}
    try:
        for sheet in book:
            values = [list(row) for row in sheet.values]
            require(values and all(isinstance(h, str) and h for h in values[0])
                    and len(set(values[0])) == len(values[0]), 'NATIVE_TABLE_HEADER', sheet.title, 'RECOVERY')
            result[sheet.title] = {'columns': values[0], 'rows': [dict(zip(values[0], row)) for row in values[1:]]}
    finally:
        book.close()
    return result


def recover(contract, profile):
    for ref in contract['inputs'].values():
        verified(ref)
    row = working_row(read_json(contract['inputs']['registry']['path']), profile)
    legacy = read_json(contract['inputs']['legacy']['path'])
    require(legacy['manufacturer'] == profile['manufacturer'] and legacy['product_node'] == profile['legacy_product_node'],
            'NATIVE_PRODUCT_IDENTITY', 'Legacy product differs', 'BASELINE')
    require(row['authoring_file_id'] == profile['authoring_file_id']
            and row['working_folder_id'] == profile['working_folder_id'], 'NATIVE_WORKING_IDENTITY', 'Registry location differs', 'BASELINE')
    observed = read_json(contract['inputs']['authoring_metadata']['path']).get('structuredContent', {})
    require(observed.get('id') == profile['authoring_file_id'] and observed.get('parent_ids') == [row['working_folder_id']],
            'NATIVE_WORKING_LOCATION', 'Acquire actual authoring File ID and parent', 'BASELINE')
    local_tables = tables(contract['inputs']['authoring']['path'])
    native = read_json(contract['inputs']['canonical_sheet']['path'])
    require(native['spreadsheet_id'] == profile['authoring_file_id'], 'NATIVE_WORKING_IDENTITY', 'Wrong native Sheet', 'BASELINE')
    restored = {}
    for sheet in native['sheets']:
        require(not sheet['response'].get('isError'), 'NATIVE_SHEET_ACQUISITION', sheet['title'], 'BASELINE')
        values = sheet['response']['structuredContent']['values']
        require(values and sheet['title'] not in restored, 'NATIVE_SHEET_ACQUISITION', 'Missing or duplicate native sheet', 'BASELINE')
        columns = values[0]
        require(all(len(r) <= len(columns) for r in values[1:]), 'NATIVE_TABLE_WIDTH', 'Values without declared columns: '+sheet['title'], 'BASELINE')
        restored[sheet['title']] = {'columns':columns, 'rows':[dict(zip(columns,list(r)+[None]*(len(columns)-len(r)))) for r in values[1:]]}
    normalize = lambda v: None if v == '' or v is None else v
    require(set(restored) == set(local_tables), 'NATIVE_AUTHORING_PARITY', 'Native/local table inventory differs', 'BASELINE')
    representation_differences = []
    for name, table in restored.items():
        local = local_tables[name]
        native_rows = [[normalize(r.get(k)) for k in table['columns']] for r in table['rows']]
        local_rows = [[normalize(r.get(k)) for k in local['columns']] for r in local['rows']]
        require(table['columns'] == local['columns'], 'NATIVE_AUTHORING_PARITY', 'Headers differ: '+name, 'BASELINE')
        if native_rows != local_rows and name in profile.get('history_representation_tables', []):
            representation_differences.append({'table':name, 'native_rows':native_rows, 'local_rows':local_rows,
                                                'policy':'Native Sheet is authoritative; history representation difference retained explicitly'})
            continue
        require(native_rows == local_rows,
                'NATIVE_AUTHORING_PARITY', 'Native/local row values differ: '+name, 'BASELINE')
    cloud = read_json(contract['inputs']['legacy_cloud_response']['path']).get('structuredContent', {})
    require(cloud.get('id') == profile['legacy_file_id'] and cloud.get('parent_ids') == [row['working_folder_id']]
            and base64.b64decode(cloud['b64_string']) == verified(contract['inputs']['legacy']),
            'NATIVE_LEGACY_BYTE_IDENTITY', 'Acquire same-byte native legacy payload and actual parent', 'BASELINE')
    require(set(profile['required_tables']).issubset(restored), 'NATIVE_TABLE_MISSING', 'Required legacy sheets missing', 'RECOVERY')
    return {'schema_version': '1.0', 'product_id': profile['product_id'], 'manufacturer': profile['manufacturer'],
            'series': profile['registry_series'], 'revision': contract['revision'], 'lifecycle_status': 'DRAFT',
            'work_type': 'EXISTING_WORKING_RECOVERY', 'source_revision': row['package_version'],
            'fact_status': 'NOT_REAUDITED_UNDER_CURRENT_GOVERNANCE', 'automatic_orderability': False,
            'formal_pass': False, 'qa_ready': False, 'runtime_integration_ready': False,
            'tables': restored, 'baseline_refs': contract['inputs'],
            'native_authoring_readback':'ALL_FACT_SHEETS_MATCH_LOCAL_ROWS; history representation differences recorded',
            'representation_differences':representation_differences,
            'historical_payload': legacy,
            'historical_status_policy': 'Rows and legacy PASS labels retained as history only; no new acceptance or Human Decision',
            'unknown_policy': ['HOLD', 'MANUAL_CHECK', 'ESTIMATE_CONFIRM_REQUIRED'],
            'output_boundary': 'WORKING_CANDIDATE_ONLY; no Registry/Formal/Runtime/UI/Release writes'}


def audit(candidate, profile):
    tabs = candidate['tables']
    evidence_rows = tabs[profile['evidence_table']]['rows']
    evidence_ids = {r['evidence_id'] for r in evidence_rows}
    references = {}
    duplicates = {}
    for name, table in tabs.items():
        ids = [r.get(table['columns'][0]) for r in table['rows']]
        repeated = [k for k,v in Counter(ids).items() if v > 1]
        if name in profile['unique_id_tables'] and repeated:
            duplicates[name] = repeated
        for r in table['rows']:
            for ev in str(r.get('evidence_id') or '').split('|'):
                if ev and ev not in evidence_ids:
                    references.setdefault(ev, []).append({'table':name, 'id':r.get(table['columns'][0])})
    fields = tabs[profile['field_table']]['rows']
    by_field = {r['field_id']: r for r in fields}
    internal = {r['evidence_id'] for r in evidence_rows if not r.get('source_url')}
    internal_fact_refs = [{'field_id':r['field_id'], 'evidence_id':r['evidence_id']}
                          for r in fields if r['evidence_id'] in internal]
    recovered_only = [m for m in profile['json_module_map'] if m not in candidate['historical_payload']]
    parity = {}
    for module, table in profile['json_module_map'].items():
        if module in candidate['historical_payload']:
            json_rows = candidate['historical_payload'][module]
            native_rows = tabs[table]['rows']
            native_values = [[r[c] for c in tabs[table]['columns']] for r in native_rows]
            # Both count and actual row payload are checked; None/empty differs
            # explicitly and is never silently converted to NOT_APPLICABLE.
            blank_normalized = lambda rows:[[None if v == '' else v for v in r] for r in rows]
            parity[module] = {'json_kind':type(json_rows).__name__, 'json_count':len(json_rows), 'authoring_count':len(native_rows),
                              'exact_row_equal':json_rows == native_values,
                              'blank_normalized_row_equal':isinstance(json_rows,list) and blank_normalized(json_rows) == blank_normalized(native_values)}
    source_evidence = [r for r in evidence_rows if r.get('source_url')]
    return {'status': 'PASS' if not references and not duplicates else 'FAIL',
            'scope': 'STRUCTURAL_RECOVERY_ONLY', 'candidate_revision':candidate['revision'],
            'table_counts': {n:len(t['rows']) for n,t in tabs.items()},
            'field_count':len(by_field), 'evidence_count':len(evidence_rows),
            'duplicate_identifiers':duplicates, 'dangling_evidence_ids':references,
            'internal_history_used_as_fact_evidence':internal_fact_refs,
            'restored_modules_absent_from_legacy_json':recovered_only, 'legacy_authoring_parity':parity,
            'source_review_queue':[{'evidence_id':r['evidence_id'], 'source_url':r['source_url'],
                                   'pdf_page':r['pdf_page'], 'printed_page':r['printed_page'],
                                   'target_table':r['target_master'], 'status':'REVIEW_REQUIRED'} for r in source_evidence],
            'historical_tests': 'NOT_REEXECUTED; static PASS is not current QA',
            'business_qa':'NOT_EXECUTED', 'qa_ready':False, 'formal':False,
            'next_action':'Acquire current official source versions; review row-level facts and critical dependencies; execute native business QA on this candidate'}


def execute(contract_path, stage, work, out):
    contract = read_json(contract_path)
    profile = json.loads(verified(contract['profile']))
    work = Path(work).resolve()
    require(Path(out).resolve().is_relative_to(work) and not Path(out).is_symlink()
            and not (work/'product-master.json').is_symlink(), 'OUTPUT_PATH', 'Work-owned regular output required', stage)
    candidate = recover(contract, profile)
    if stage == 'RECOVERY':
        write_json(work/'product-master.json', candidate)
        result = {'status':'PASS', 'lifecycle_status':'DRAFT', 'candidate_sha256':sha((work/'product-master.json').read_bytes()),
                  'identity':{k:candidate[k] for k in ('product_id','manufacturer','series','revision')}}
    else:
        saved = read_json(work/'product-master.json')
        require(saved == candidate, 'CANDIDATE_CHANGED', 'Recovery output differs from captured baseline', stage)
        result = audit(saved, profile)
        require(stage == 'STRUCTURAL_AUDIT', 'NATIVE_GATE_SCOPE', 'Business QA/Formal is not admitted by this recovery profile', stage)
    write_json(out, result)
    return result


def main():
    p = argparse.ArgumentParser()
    for key in ('harness-root', 'contract', 'stage', 'work', 'out'):
        p.add_argument('--'+key, required=True)
    a = p.parse_args()
    setup(a.harness_root)
    try:
        result = execute(a.contract,a.stage,a.work,a.out)
    except (Blocked, OSError, ValueError, KeyError, TypeError) as e:
        result = {'status':'FAIL', 'blocking_reason':getattr(e,'data',{'reason':str(e)})}
        write_json(a.out,result)
    return 0 if result['status'] == 'PASS' else 2


if __name__ == '__main__':
    raise SystemExit(main())
