#!/usr/bin/env python3
"""Native XLSX predecessor + Sheets delta reader; existing v2 owns the DAG.

Pure recovery can inspect a connection candidate. Production stages require an
admitted profile and the existing native prepare/router. This module owns no
storage, lifecycle engine, Rule evaluator or manufacturer-specific branches.
"""
import argparse
import importlib.util
import json
import re
import sys
from pathlib import Path


def setup(harness_root):
    sys.path.insert(0, str(Path(harness_root).resolve()))
    global require, read_json, write_json, sha, capture, Blocked, xlsx
    from harness.core import require, read_json, write_json, sha, Blocked
    from harness.resolvers import capture
    spec = importlib.util.spec_from_file_location('xlsx_recovery', Path(__file__).with_name('working-master-xlsx-recovery.py'))
    xlsx = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(xlsx)
    xlsx.setup(harness_root)


def working_row(raw, profile):
    return xlsx.working_row(raw, profile)


def metadata(raw, file_id, folder_id, mime_type):
    data = raw.get('structuredContent', raw)
    require(not raw.get('isError') and data.get('id') == file_id
            and data.get('parent_ids') == [folder_id] and data.get('mime_type') == mime_type,
            'NATIVE_WORKING_LOCATION', 'File identity, MIME and actual parent must match', 'BASELINE')
    return data


def sheet_tables(snapshot, book, profile):
    require(snapshot['spreadsheet_id'] == book['spreadsheetId'] == profile['authoring_file_id'],
            'NATIVE_WORKING_IDENTITY', 'Wrong delta spreadsheet', 'RECOVERY')
    expected = profile['delta_sheets']
    declared = {s['properties']['title']: s['properties']['sheetId'] for s in book['sheets']}
    require(len(declared) == len(book['sheets']) and declared == {k: v['sheet_id'] for k, v in expected.items()},
            'NATIVE_TABLE_MISSING', 'Acquire the complete delta tab inventory', 'RECOVERY')
    # A profile's old range is insufficient when the live sheet grows. Check
    # the full acquired grid, including otherwise empty trailing columns/rows.
    for item in book['sheets']:
        properties = item['properties']
        title = properties['title']
        grid = properties.get('gridProperties', {})
        extent = re.fullmatch(r'A1:([A-Z]+)([1-9][0-9]*)', expected[title]['response_range'].rsplit('!', 1)[-1])
        columns = 0
        if extent:
            for char in extent[1]:
                columns = columns * 26 + ord(char) - ord('A') + 1
        require(properties.get('sheetType') == 'GRID' and extent
                and type(grid.get('rowCount')) is int and type(grid.get('columnCount')) is int
                and int(extent[2]) == grid['rowCount'] and columns == grid['columnCount'],
                'NATIVE_GRID_COVERAGE', 'Snapshot must cover the complete live grid: ' + title, 'RECOVERY')
    restored = {}
    for sheet in snapshot['sheets']:
        title, response = sheet['title'], sheet['response']
        require(title in expected and title not in restored and sheet['sheet_id'] == expected[title]['sheet_id']
                and not response.get('isError'), 'NATIVE_SHEET_ACQUISITION', title, 'RECOVERY')
        data = response['structuredContent']
        values = data['values']
        require(data['range'] == expected[title]['response_range'] and data.get('majorDimension') == 'ROWS'
                and values and values[0] == expected[title]['columns'],
                'NATIVE_TABLE_HEADER', 'Bounded range and exact header required: ' + title, 'RECOVERY')
        columns = values[0]
        require(columns and all(isinstance(c, str) and c for c in columns) and len(columns) == len(set(columns)),
                'NATIVE_TABLE_HEADER', title, 'RECOVERY')
        require(all(isinstance(r, list) and len(r) <= len(columns) for r in values[1:]),
                'NATIVE_TABLE_WIDTH', title, 'RECOVERY')
        restored[title] = {'columns': columns, 'rows': [dict(zip(columns, r + [None] * (len(columns) - len(r))))
                                                       for r in values[1:]], 'raw_cells': values}
    require(set(restored) == set(expected), 'NATIVE_TABLE_MISSING', 'Missing delta tab', 'RECOVERY')
    return restored


def values(table):
    columns = table['columns']
    return {r[columns[0]]: r[columns[1]] for r in table['rows']}


def recover(contract, profile):
    require(contract['product_id'] == profile['product_id']
            and profile['status'] in ('CANDIDATE_REVIEW_ONLY', 'ADOPTED')
            and profile['scope'] == 'STRUCTURAL_DRAFT_RECOVERY_ONLY',
            'NATIVE_PROFILE_SCOPE', 'One fixed structural recovery profile required', 'BASELINE')
    for ref in contract['inputs'].values():
        capture('/', ref)
    load = lambda key: read_json(contract['inputs'][key]['path'])
    row = working_row(load('registry'), profile)
    require(row['package_version'] == profile['source_revision'] and row['authoring_file_id'] == profile['authoring_file_id']
            and row['working_folder_id'] == profile['working_folder_id'],
            'NATIVE_WORKING_IDENTITY', 'Keep the selected Working revision', 'BASELINE')
    metadata(load('authoring_metadata'), row['authoring_file_id'], row['working_folder_id'], profile['authoring_mime_type'])
    previous = profile['predecessor']
    metadata(load('predecessor_metadata'), previous['authoring_file_id'], row['working_folder_id'], previous['mime_type'])
    original = capture('/', contract['inputs']['predecessor_authoring'])
    require(original == capture('/', contract['inputs']['predecessor_readback']),
            'NATIVE_AUTHORING_BYTE_PARITY', 'Independent predecessor byte readback differs', 'BASELINE')
    old = xlsx.tables(contract['inputs']['predecessor_authoring']['path'], previous['header_row'])
    require(set(old) == set(previous['required_tables']), 'NATIVE_TABLE_MISSING', 'Complete predecessor workbook required', 'RECOVERY')
    snapshot, readback = load('delta_snapshot'), load('delta_readback')
    require(snapshot == readback, 'NATIVE_AUTHORING_ROW_PARITY', 'Independent delta readback differs', 'BASELINE')
    book = load('sheet_metadata')
    require(not book.get('isError') and book == load('sheet_metadata_readback'),
            'NATIVE_GRID_CHANGED', 'Independent sheet metadata readback differs', 'BASELINE')
    delta = sheet_tables(snapshot, book['structuredContent'], profile)
    governance = values(delta[profile['governance_table']])
    for key, expected in profile['lineage_fields'].items():
        require(governance.get(key) == expected, 'NATIVE_LINEAGE', key, 'RECOVERY')
    require(governance[profile['predecessor_link_field']] == previous['authoring_file_id'],
            'NATIVE_LINEAGE', 'Delta must name the acquired predecessor', 'RECOVERY')
    for key, expected in previous['identity_fields'].items():
        require(values(old[previous['governance_table']]).get(key) == expected,
                'NATIVE_PRODUCT_IDENTITY', key, 'RECOVERY')
    # Validate namespace-local references; never collapse colliding table names.
    node = previous['node_table']
    node_ids = {r[node['id_column']] for r in old[node['name']]['rows']}
    evidence = profile['evidence_table']
    evidence_ids = {r[evidence['id_column']] for r in delta[evidence['name']]['rows']}
    for title, definition in profile['delta_sheets'].items():
        rows = delta[title]['rows']
        ids = [r[definition['id_column']] for r in rows]
        require(all(v is not None and v != '' for v in ids) and len(ids) == len(set(ids)),
                'NATIVE_DUPLICATE_ID', title, 'RECOVERY')
        if definition.get('node_column'):
            require(all(r[definition['node_column']] in node_ids for r in rows),
                    'NATIVE_NODE_REFERENCE', title, 'RECOVERY')
        if definition.get('evidence_column'):
            require(all(r[definition['evidence_column']] in evidence_ids for r in rows),
                    'NATIVE_EVIDENCE_REFERENCE', title, 'RECOVERY')
    return {'schema_version': '1.0', 'product_id': profile['product_id'], 'manufacturer': profile['manufacturer'],
            'series': profile['registry_series'], 'revision': contract['revision'], 'source_revision': row['package_version'],
            'work_type': 'EXISTING_WORKING_RECOVERY', 'lifecycle_status': 'DRAFT',
            'predecessor_tables': old, 'delta_tables': delta, 'baseline_refs': contract['inputs'],
            'historical_status_policy': 'Original statuses are history; not current business QA or manufacturer verification',
            'composition_policy': 'Separate complete predecessor and delta namespaces; no inferred overwrite, union or resolution',
            'qa_ready': False, 'formal_pass': False, 'runtime_integration_ready': False, 'automatic_orderability': False,
            'output_boundary': 'WORKING_CANDIDATE_ONLY; no Registry/Formal/Runtime/UI/Release writes'}


def audit(candidate):
    return {'status': 'PASS', 'scope': 'STRUCTURAL_DRAFT_RECOVERY_ONLY', 'qa_ready': False, 'formal': False,
            'predecessor_table_counts': {k: len(v['rows']) for k, v in candidate['predecessor_tables'].items()},
            'delta_table_counts': {k: len(v['rows']) for k, v in candidate['delta_tables'].items()},
            'historical_tests': 'NOT_REEXECUTED; SOURCE_REVIEW_AND_BUSINESS_QA_REQUIRED',
            'byte_and_row_parity': 'PASS', 'semantic_composition': 'NOT_PERFORMED'}


def execute(contract_path, stage, work, out):
    contract = read_json(contract_path)
    profile = json.loads(capture('/', contract['profile']))
    require(profile['status'] == 'ADOPTED' and profile['scope'] == 'STRUCTURAL_DRAFT_RECOVERY_ONLY',
            'NATIVE_PROFILE_SCOPE', 'Candidate profiles cannot execute a native production stage', stage)
    work, out = Path(work).resolve(), Path(out).resolve()
    require(out.is_relative_to(work) and not out.is_symlink() and not (work / 'product-master.json').is_symlink(),
            'OUTPUT_PATH', 'Regular Work-owned outputs required', stage)
    candidate = recover(contract, profile)
    if stage == 'RECOVERY':
        write_json(work / 'product-master.json', candidate)
        result = {'status': 'PASS', 'candidate_sha256': sha((work / 'product-master.json').read_bytes()),
                  'qa_ready': False, 'formal': False}
    else:
        require(stage == 'STRUCTURAL_AUDIT' and read_json(work / 'product-master.json') == candidate,
                'CANDIDATE_CHANGED', 'Use the fixed native recovery output', stage)
        result = audit(candidate)
    write_json(out, result)
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    for key in ('harness-root', 'contract', 'stage', 'work', 'out'):
        parser.add_argument('--' + key, required=True)
    args = parser.parse_args()
    setup(args.harness_root)
    try:
        result = execute(args.contract, args.stage, args.work, args.out)
    except (Blocked, OSError, ValueError, KeyError, TypeError) as error:
        result = {'status': 'FAIL', 'blocking_reason': getattr(error, 'data', {'reason': str(error)})}
        write_json(args.out, result)
    raise SystemExit(0 if result['status'] == 'PASS' else 2)
