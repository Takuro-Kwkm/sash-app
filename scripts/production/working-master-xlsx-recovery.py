#!/usr/bin/env python3
"""Lossless XLSX/bundle boundary for the existing native Working recovery DAG.

Product identities, header locations and module inventory are profile data.
This adapter parses native bytes only; Shared v2 owns execution and persistence.
"""
import argparse
import importlib.util
import json
import sys
from collections import Counter
from pathlib import Path


def setup(harness_root):
    sys.path.insert(0, str(Path(harness_root).resolve()))
    global require, read_json, write_json, sha, capture, Blocked, inherited
    from harness.core import require, read_json, write_json, sha, Blocked
    from harness.resolvers import capture
    definition = importlib.util.spec_from_file_location('native_recovery', Path(__file__).with_name('working-master-recovery.py'))
    inherited = importlib.util.module_from_spec(definition)
    definition.loader.exec_module(inherited)
    inherited.setup(harness_root)


def working_row(raw, profile):
    return inherited.working_row(raw, profile)


def tables(path, header_row):
    from openpyxl import load_workbook
    book = load_workbook(path, read_only=True, data_only=False)
    result = {}
    try:
        for sheet in book:
            # XLSX files can contain stale dimension metadata. Read actual cells.
            sheet.reset_dimensions()
            rows = [list(row) for row in sheet.values]
            require(len(rows) >= header_row, 'NATIVE_TABLE_HEADER', sheet.title, 'RECOVERY')
            columns = rows[header_row - 1]
            width = max((i + 1 for i, value in enumerate(columns) if value is not None), default=0)
            columns = columns[:width]
            require(columns and all(isinstance(h, str) and h for h in columns)
                    and len(set(columns)) == len(columns), 'NATIVE_TABLE_HEADER', sheet.title, 'RECOVERY')
            require(all(not any(v is not None for v in row[width:]) for row in rows[header_row:]),
                    'NATIVE_TABLE_WIDTH', sheet.title, 'RECOVERY')
            result[sheet.title] = {'columns': columns, 'rows': [dict(zip(columns, row[:width]))
                for row in rows[header_row:] if any(v is not None for v in row)],
                'preamble': rows[:header_row - 1]}
    finally:
        book.close()
    return result


def recover(contract, profile):
    for ref in contract['inputs'].values():
        capture(Path('/'), ref)
    row = working_row(read_json(contract['inputs']['registry']['path']), profile)
    require(row['authoring_file_id'] == profile['authoring_file_id']
            and row['working_folder_id'] == profile['working_folder_id'],
            'NATIVE_WORKING_IDENTITY', 'Preserve the selected Working', 'BASELINE')
    for key in ('authoring_metadata', 'authoring_readback_metadata'):
        raw = read_json(contract['inputs'][key]['path'])
        d = raw.get('structuredContent', raw)
        require(not raw.get('isError') and d.get('id') == row['authoring_file_id']
                and d.get('parent_ids') == [row['working_folder_id']]
                and d.get('mime_type') == profile['authoring_mime_type'],
                'NATIVE_WORKING_LOCATION', 'Actual XLSX File ID/parent required', 'BASELINE')
    original = capture(Path('/'), contract['inputs']['authoring'])
    readback = capture(Path('/'), contract['inputs']['authoring_readback'])
    require(original == readback, 'NATIVE_AUTHORING_BYTE_PARITY', 'Independent Working byte readback differs', 'BASELINE')
    restored = tables(contract['inputs']['authoring']['path'], profile['header_row'])
    require(set(restored) == set(profile['required_tables']), 'NATIVE_TABLE_MISSING', 'Complete native inventory required', 'RECOVERY')
    modules, history = {}, {}
    normalize = lambda value: None if value == '' or value is None else value
    for key, file_id in profile['runtime_bundle'].items():
        blob = read_json(contract['inputs'][key]['path'])
        raw = read_json(contract['inputs'][key + '_metadata']['path'])
        metadata = raw.get('structuredContent', raw)
        require(not raw.get('isError') and metadata.get('id') == file_id
                and metadata.get('parent_ids') == [row['working_folder_id']],
                'NATIVE_BUNDLE_IDENTITY', key, 'BASELINE')
        require(blob['manufacturer'] == profile['manufacturer'] and blob['series'] == profile['registry_series']
                and blob['package_version'] == row['package_version'], 'NATIVE_PRODUCT_IDENTITY', key, 'BASELINE')
        require(not set(modules).intersection(blob['modules']), 'NATIVE_MODULE_DUPLICATE', key, 'RECOVERY')
        history[key] = blob
        for name, data in blob['modules'].items():
            require(name in restored, 'NATIVE_TABLE_MISSING', name, 'RECOVERY')
            table = restored[name]
            expected = [[normalize(r.get(k)) for k in table['columns']] for r in table['rows']]
            actual = [[normalize(r.get(k)) for k in table['columns']] for r in data]
            require(expected == actual, 'NATIVE_AUTHORING_PARITY', name + ': row payload differs', 'RECOVERY')
            modules[name] = data
    require(set(modules) == set(profile['required_runtime_tables']), 'NATIVE_MODULE_MISSING', 'Full runtime bundle required', 'RECOVERY')
    return {'schema_version': '1.0', 'product_id': profile['product_id'], 'manufacturer': profile['manufacturer'],
        'series': profile['registry_series'], 'revision': contract['revision'], 'source_revision': row['package_version'],
        'work_type': 'EXISTING_WORKING_RECOVERY', 'lifecycle_status': 'DRAFT', 'qa_ready': False, 'formal_pass': False,
        'automatic_orderability': False, 'runtime_integration_ready': False, 'tables': restored,
        'historical_payload': history, 'baseline_refs': contract['inputs'],
        'native_authoring_readback': 'INDEPENDENT_XLSX_BYTES_MATCH; ALL_BUNDLE_ROW_VALUES_MATCH',
        'historical_status_policy': 'Original values and legacy PASS labels are history only; business QA is separate',
        'output_boundary': 'WORKING_CANDIDATE_ONLY; no Registry/Formal/Runtime/UI/Release writes'}


def execute(contract_path, stage, work, out):
    contract = read_json(contract_path)
    profile = json.loads(capture(Path('/'), contract['profile']))
    work, out = Path(work).resolve(), Path(out).resolve()
    require(out.is_relative_to(work) and not out.is_symlink(), 'OUTPUT_PATH', 'Regular Work output required', stage)
    candidate = recover(contract, profile)
    if stage == 'RECOVERY':
        write_json(work / 'product-master.json', candidate)
        result = {'status': 'PASS', 'candidate_sha256': sha((work / 'product-master.json').read_bytes()),
                  'qa_ready': False, 'formal': False}
    else:
        require(stage == 'STRUCTURAL_AUDIT' and read_json(work / 'product-master.json') == candidate,
                'CANDIDATE_CHANGED', 'Inspect the fixed structural recovery', stage)
        duplicates = {name: [k for k, n in Counter(r.get(candidate['tables'][name]['columns'][0])
            for r in candidate['tables'][name]['rows']).items() if n > 1] for name in profile['unique_id_tables']}
        require(not any(duplicates.values()), 'NATIVE_DUPLICATE_ID', json.dumps(duplicates), stage)
        result = {'status': 'PASS', 'scope': profile['scope'], 'qa_ready': False, 'formal': False,
                  'table_counts': {n: len(t['rows']) for n, t in candidate['tables'].items()},
                  'historical_tests': 'NOT_REUSED_AS_CURRENT_QA', 'byte_and_row_parity': 'PASS'}
    write_json(out, result)
    return result


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    for key in ('harness-root', 'contract', 'stage', 'work', 'out'):
        p.add_argument('--' + key, required=True)
    a = p.parse_args()
    setup(a.harness_root)
    try:
        result = execute(a.contract, a.stage, a.work, a.out)
    except (Blocked, OSError, ValueError, KeyError, TypeError) as error:
        result = {'status': 'FAIL', 'blocking_reason': getattr(error, 'data', {'reason': str(error)})}
        write_json(a.out, result)
    raise SystemExit(0 if result['status'] == 'PASS' else 2)
