"""Safety boundaries for XLSX predecessor and native Sheets delta recovery."""
import copy
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

import harness
from openpyxl import Workbook

spec = importlib.util.spec_from_file_location('delta', Path(__file__).with_name('working-master-delta-recovery.py'))
adapter = importlib.util.module_from_spec(spec)
spec.loader.exec_module(adapter)
adapter.setup(Path(harness.__file__).resolve().parents[1])


class DeltaRecoverySafety(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        self.root = Path(temp.name)
        self.profile = {'status': 'CANDIDATE_REVIEW_ONLY', 'scope': 'STRUCTURAL_DRAFT_RECOVERY_ONLY',
            'product_id': 'P1', 'registry_id': 'registry', 'manufacturer': 'Maker', 'registry_series': 'Window',
            'working_states': ['WORKING_ATOMIC_RECOVERY'], 'source_revision': 'SR3', 'authoring_file_id': 'delta',
            'working_folder_id': 'working', 'authoring_mime_type': 'application/vnd.google-apps.spreadsheet',
            'governance_table': 'Governance', 'predecessor_link_field': 'previous',
            'lineage_fields': {'series': 'Window', 'package_version': 'SR3'},
            'evidence_table': {'name': 'Evidence', 'id_column': 'evidence_id'},
            'predecessor': {'authoring_file_id': 'base', 'mime_type': 'xlsx', 'header_row': 1,
                'required_tables': ['Governance', 'Nodes'], 'governance_table': 'Governance',
                'identity_fields': {'series': 'Window'}, 'node_table': {'name': 'Nodes', 'id_column': 'node'}}}
        tabs = {'Governance': [['field', 'value'], ['series', 'Window'], ['package_version', 'SR3'], ['previous', 'base']],
                'Delta': [['id', 'node', 'evidence', 'status', 'quantity', 'formula'], ['D1', 'N1', 'E1', 'HOLD', 1.5, '=1+1']],
                'Evidence': [['evidence_id', 'status'], ['E1', 'HISTORICAL_NOT_READOPTED']]}
        self.snapshot = {'spreadsheet_id': 'delta', 'sheets': []}
        self.book = {'spreadsheetId': 'delta', 'sheets': []}
        self.profile['delta_sheets'] = {}
        for index, (title, cells) in enumerate(tabs.items()):
            location = title + '!A1:F100'
            self.snapshot['sheets'].append({'title': title, 'sheet_id': index,
                'response': {'structuredContent': {'range': location, 'majorDimension': 'ROWS', 'values': cells}}})
            self.book['sheets'].append({'properties': {'title': title, 'sheetId': index, 'sheetType': 'GRID',
                'gridProperties': {'rowCount': 100, 'columnCount': 6}}})
            self.profile['delta_sheets'][title] = {'sheet_id': index, 'columns': cells[0],
                'response_range': location, 'id_column': cells[0][0]}
        self.profile['delta_sheets']['Delta'].update(node_column='node', evidence_column='evidence')
        self.contract = {'product_id': 'P1', 'revision': 'candidate', 'inputs': {}}
        self.save('registry', {'structuredContent': {'id': 'registry', 'content':
            'manufacturer,series,master_status,package_version,authoring_file_id,working_folder_id\n'
            'Maker,Window,WORKING_ATOMIC_RECOVERY,SR3,delta,working\n'}})
        self.save('authoring_metadata', {'id': 'delta', 'parent_ids': ['working'],
                                        'mime_type': self.profile['authoring_mime_type']})
        self.save('predecessor_metadata', {'id': 'base', 'parent_ids': ['working'], 'mime_type': 'xlsx'})
        self.save('sheet_metadata', {'structuredContent': self.book})
        self.save('sheet_metadata_readback', {'structuredContent': self.book})
        book = Workbook()
        sheet = book.active
        sheet.title = 'Governance'
        sheet.append(['field', 'value'])
        sheet.append(['series', 'Window'])
        sheet = book.create_sheet('Nodes')
        sheet.append(['node', 'status'])
        sheet.append(['N1', 'UNKNOWN'])
        original = self.root / 'original.xlsx'
        book.save(original)
        book.close()
        for key in ['predecessor_authoring', 'predecessor_readback']:
            path = self.root / (key + '.xlsx')
            path.write_bytes(original.read_bytes())
            self.contract['inputs'][key] = self.ref(path)
        self.save_snapshots()

    def ref(self, path):
        return {'path': str(path), 'sha256': adapter.sha(path.read_bytes())}

    def save(self, key, value):
        path = self.root / (key + '.json')
        path.write_text(json.dumps(value))
        self.contract['inputs'][key] = self.ref(path)

    def save_snapshots(self):
        self.save('delta_snapshot', self.snapshot)
        self.save('delta_readback', self.snapshot)

    def recover(self):
        return adapter.recover(self.contract, self.profile)

    def rejected(self, code):
        with self.assertRaises(adapter.Blocked) as caught:
            self.recover()
        self.assertEqual(caught.exception.data['code'], code)

    def test_preserves_namespaces_statuses_fractional_raw_input_and_formulas(self):
        candidate = self.recover()
        self.assertEqual(candidate['predecessor_tables']['Nodes']['rows'][0]['status'], 'UNKNOWN')
        row = candidate['delta_tables']['Delta']['rows'][0]
        self.assertEqual((row['status'], row['quantity'], row['formula']), ('HOLD', 1.5, '=1+1'))
        self.assertIn('Governance', candidate['predecessor_tables'])
        self.assertIn('Governance', candidate['delta_tables'])
        for key in ['qa_ready', 'formal_pass', 'runtime_integration_ready', 'automatic_orderability']:
            self.assertFalse(candidate[key])
        self.assertFalse(adapter.audit(candidate)['qa_ready'])

    def test_wrong_product_is_rejected(self):
        self.contract['product_id'] = 'P2'
        self.rejected('NATIVE_PROFILE_SCOPE')

    def test_formal_registry_is_not_working(self):
        path = Path(self.contract['inputs']['registry']['path'])
        value = json.loads(path.read_text())
        value['structuredContent']['content'] = value['structuredContent']['content'].replace('WORKING_ATOMIC_RECOVERY', 'FORMAL_PASS')
        self.save('registry', value)
        self.rejected('WORKING_BASELINE_REQUIRED')

    def test_changed_revision_is_rejected(self):
        self.profile['source_revision'] = 'SR4'
        self.rejected('NATIVE_WORKING_IDENTITY')

    def test_wrong_parent_is_rejected(self):
        self.save('authoring_metadata', {'id': 'delta', 'parent_ids': ['formal'], 'mime_type': self.profile['authoring_mime_type']})
        self.rejected('NATIVE_WORKING_LOCATION')

    def test_predecessor_readback_drift_is_rejected(self):
        p = Path(self.contract['inputs']['predecessor_readback']['path'])
        p.write_bytes(p.read_bytes() + b'drift')
        self.contract['inputs']['predecessor_readback'] = self.ref(p)
        self.rejected('NATIVE_AUTHORING_BYTE_PARITY')

    def test_captured_byte_drift_is_rejected(self):
        Path(self.contract['inputs']['registry']['path']).write_text('{}')
        self.rejected('REFERENCE_CHANGED')

    def test_delta_readback_drift_is_rejected(self):
        changed = copy.deepcopy(self.snapshot)
        changed['sheets'][1]['response']['structuredContent']['values'][1][4] = 9
        self.save('delta_readback', changed)
        self.rejected('NATIVE_AUTHORING_ROW_PARITY')

    def test_delta_missing_tab_is_rejected(self):
        self.snapshot['sheets'].pop()
        self.save_snapshots()
        self.rejected('NATIVE_TABLE_MISSING')

    def test_truncated_range_is_rejected(self):
        self.snapshot['sheets'][1]['response']['structuredContent']['range'] = 'Delta!A1:F4'
        self.save_snapshots()
        self.rejected('NATIVE_TABLE_HEADER')

    def test_extended_row_grid_is_rejected_even_when_readbacks_match(self):
        self.book['sheets'][0]['properties']['gridProperties']['rowCount'] = 101
        self.save('sheet_metadata', {'structuredContent': self.book})
        self.save('sheet_metadata_readback', {'structuredContent': self.book})
        self.rejected('NATIVE_GRID_COVERAGE')

    def test_extended_column_grid_is_rejected_even_when_readbacks_match(self):
        self.book['sheets'][0]['properties']['gridProperties']['columnCount'] = 7
        self.save('sheet_metadata', {'structuredContent': self.book})
        self.save('sheet_metadata_readback', {'structuredContent': self.book})
        self.rejected('NATIVE_GRID_COVERAGE')

    def test_changed_metadata_between_reads_is_rejected(self):
        changed = copy.deepcopy(self.book)
        changed['sheets'][0]['properties']['gridProperties']['rowCount'] = 101
        self.save('sheet_metadata_readback', {'structuredContent': changed})
        self.rejected('NATIVE_GRID_CHANGED')

    def test_duplicate_id_is_rejected(self):
        cells = self.snapshot['sheets'][1]['response']['structuredContent']['values']
        cells.append(list(cells[1]))
        self.save_snapshots()
        self.rejected('NATIVE_DUPLICATE_ID')

    def test_cells_outside_header_are_not_dropped(self):
        self.snapshot['sheets'][1]['response']['structuredContent']['values'][1].append('extra')
        self.save_snapshots()
        self.rejected('NATIVE_TABLE_WIDTH')

    def test_missing_node_reference_is_rejected(self):
        self.snapshot['sheets'][1]['response']['structuredContent']['values'][1][1] = 'N2'
        self.save_snapshots()
        self.rejected('NATIVE_NODE_REFERENCE')

    def test_missing_evidence_reference_is_rejected(self):
        self.snapshot['sheets'][1]['response']['structuredContent']['values'][1][2] = 'E2'
        self.save_snapshots()
        self.rejected('NATIVE_EVIDENCE_REFERENCE')

    def test_wrong_predecessor_lineage_is_rejected(self):
        self.snapshot['sheets'][0]['response']['structuredContent']['values'][3][1] = 'other'
        self.save_snapshots()
        self.rejected('NATIVE_LINEAGE')

    def test_candidate_profile_cannot_execute_production_stage(self):
        profile = self.root / 'profile.json'
        profile.write_text(json.dumps(self.profile))
        self.contract['profile'] = self.ref(profile)
        contract = self.root / 'contract.json'
        contract.write_text(json.dumps(self.contract))
        with self.assertRaises(adapter.Blocked) as caught:
            adapter.execute(contract, 'RECOVERY', self.root, self.root / 'result.json')
        self.assertEqual(caught.exception.data['code'], 'NATIVE_PROFILE_SCOPE')
        self.assertFalse((self.root / 'product-master.json').exists())
