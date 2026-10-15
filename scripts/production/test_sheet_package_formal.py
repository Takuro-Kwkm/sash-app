"""Synthetic boundary fixtures only; these are never manufacturer or Human evidence."""
import copy
import importlib.util
import json
import os
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

SHARED = Path(os.environ.get('SHARED_HARNESS_ROOT', '/private/tmp/giesta2-formal-connect-20261015-central'))
sys.path.insert(0, str(SHARED))
from harness.core import Blocked, fingerprint, sha
from harness.changed_path import validate_plan

definition = importlib.util.spec_from_file_location('native_formal', Path(__file__).with_name('sheet-package-formal.py'))
worker = importlib.util.module_from_spec(definition); definition.loader.exec_module(worker); worker.setup(SHARED)


class FormalBoundaries(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(); self.root = Path(self.temp.name)
        self.addCleanup(self.temp.cleanup)
        def file(name, value):
            path = self.root/name; path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(value if isinstance(value, bytes) else (json.dumps(value)+'\n').encode())
            return {'path': str(path), 'sha256': sha(path.read_bytes())}
        self.file = file
        before = {'manufacturer':'TEST', 'series':'FIXTURE', 'package_version':'R3', 'master_status':'FORMAL_PASS'}
        after = {**before, 'package_version':'R4'}
        roles = ('PRODUCT_MASTER','FIELD_STATE','EVIDENCE','PROMOTION','FORMAL_REGISTRY','AUTHORITY','SOURCE_BASELINE')
        arts = [{'role':r, 'source':file(r+'.json', {'fixture_role':r}), 'destination':'formal/'+r+'.json'} for r in roles]
        self.source = arts[0]['source']
        self.plan = {'work_id':'SYNTHETIC_TEST_ONLY','product_id':'TEST','revision':'R4',
                     'current_before':None,'current_selector':'current/TEST.json',
                     'current_after':{'product_id':'TEST','revision':'R4','lifecycle_state':'FORMAL',
                                      'artifacts':{a['destination']:a['source']['sha256'] for a in arts}},
                     'artifacts':arts, 'native_registry_after':after,
                     'native_artifact_hashes':{'new':self.source['sha256']}}
        native = {'proposed_formal_plan_sha256':validate_plan(self.plan)}
        native['payload_sha256'] = fingerprint(native)
        self.packet = {'gate':'HUMAN_ADOPTION','work_binding_sha256':'f'*64,'native_packet':native}
        self.packet['payload_sha256'] = fingerprint({'work_binding_sha256':'f'*64,'native_packet':native})
        self.decision = {'actor_kind':'HUMAN','decision':'APPROVED','gate':'HUMAN_ADOPTION',
                         'decision_ref':'SYNTHETIC_TEST_DECISION_NOT_LIVE','payload_sha256':self.packet['payload_sha256']}
        def csv(row):
            return 'manufacturer,series,package_version,master_status\n'+','.join(row.values())+'\nOTHER,KEEP,R1,FORMAL_PASS\n'
        self.registry_before = file('registry-before.json', {'content':csv(before)})
        self.registry_after = file('registry-after.json', {'content':csv(after)})
        meta = lambda id,parent,name: {'id':id,'mime_type':'application/json','parent_ids':[parent],'title':name,
                                      'size':'23','modified_time':'2026-01-01T00:00:00Z'}
        old_before = file('old-before.json',meta('old','canonical','old-name'))
        self.c = {'product_id':'TEST','revision':'R4','registry_before':before,'registry_after':after,
                  'formal_plan':file('plan.json',self.plan),
                  'native_storage':{'canonical_folder_id':'canonical','old_folder_id':'old-folder','working_folder_id':'working',
                    'new_artifacts':[{'file_id':'new','before_name':'staged-name','after_name':'new-name','source':self.source}],
                    'old_artifacts':[{'file_id':'old','before_name':'old-name','after_name':'old-name','before_metadata':old_before}]},
                  'decision_path':str(self.root/'decision.json'),'execution_observations_path':str(self.root/'execution.json'),
                  'native_registry_id':'TEST_REGISTRY'}
        self.raw = {'registry_before':self.registry_before,'registry_after':self.registry_after,
                    'registry':self.registry_before,
                    'canonical_listing':file('canonical.json',{'files':[{'id':'new'}]}),
                    'old_listing':file('old.json',{'files':[{'id':'old'}]}),
                    'metadata':{'new':file('new-meta.json',meta('new','canonical','new-name')),
                                'old':file('old-meta.json',meta('old','old-folder','old-name'))},
                    'downloaded':{'new':self.source},'raw_connector_refs':[file('raw-connector.json',{'fixture':True})]}
        self.file('decision.json', self.decision)
        self.file('review-packets/HUMAN_ADOPTION.json', self.packet)
        self.execution = {'registry':self.registry_before,'metadata':{'old':old_before,
             'new':file('staged-meta.json',meta('new','working','staged-name'))},'downloaded':{'new':self.source}}
        self.file('execution.json',self.execution)
        self.c['registry_location']={'headers':list(before),'row_index':1,'sheet_id':1,'before_values':list(before.values())}
        self.refresh_binding()

    def refresh_binding(self):
        self.plan.update(native_storage=self.c['native_storage'],native_registry_before=self.c['registry_before'],
                         native_registry_after=self.c['registry_after'],native_registry_id=self.c['native_registry_id'],
                         registry_location=self.c['registry_location'])
        self.c['formal_plan']=self.file('plan.json',self.plan)
        native={'proposed_formal_plan_sha256':validate_plan(self.plan)}
        native['payload_sha256']=fingerprint(native)
        self.packet={'gate':'HUMAN_ADOPTION','work_binding_sha256':'f'*64,'native_packet':native}
        self.packet['payload_sha256']=fingerprint({'work_binding_sha256':'f'*64,'native_packet':native})
        self.decision['payload_sha256']=self.packet['payload_sha256']
        self.file('decision.json',self.decision)
        self.file('review-packets/HUMAN_ADOPTION.json',self.packet)

    def rejected(self, raw=None, decision=None, code=None):
        with self.assertRaises(Blocked) as caught:
            worker.verify_native_readback(self.c, raw or self.raw, self.packet, decision or self.decision)
        if code:self.assertEqual(caught.exception.data['code'],code)

    def test_complete_actual_bytes_are_required(self):
        result=worker.verify_native_readback(self.c,self.raw,self.packet,self.decision)
        self.assertEqual(result['status'],'POST_SAVE_VERIFIED')
        self.assertEqual(result['downloaded_artifact_hashes'],self.plan['native_artifact_hashes'])

    def test_stale_decision(self):
        decision={**self.decision,'payload_sha256':'0'*64}
        self.rejected(decision=decision,code='HUMAN_DECISION_REQUIRED')

    def test_ai_decision_is_not_human(self):
        self.rejected(decision={**self.decision,'actor_kind':'AI'},code='HUMAN_DECISION_REQUIRED')

    def test_unrelated_registry_row_change(self):
        raw=copy.deepcopy(self.raw)
        raw['registry_after']=self.file('wrong-others.json',{'content':'manufacturer,series,package_version,master_status\nTEST,FIXTURE,R4,FORMAL_PASS\nOTHER,CHANGED,R1,FORMAL_PASS\n'})
        self.rejected(raw,code='UNRELATED_REGISTRY_CHANGED')

    def test_wrong_registry_revision(self):
        raw=copy.deepcopy(self.raw);raw['registry_after']=self.registry_before
        self.rejected(raw,code='NATIVE_REGISTRY_READBACK')

    def test_partial_parent_move(self):
        raw=copy.deepcopy(self.raw);raw['metadata']['new']=self.execution['metadata']['new']
        self.rejected(raw,code='NATIVE_FILE_READBACK')

    def test_wrong_file_id(self):
        raw=copy.deepcopy(self.raw);raw['metadata']['new']=self.file('wrong-id.json',{'id':'foreign','parent_ids':['canonical'],'title':'new-name'})
        self.rejected(raw,code='NATIVE_FILE_READBACK')

    def test_unapproved_canonical_duplicate(self):
        raw=copy.deepcopy(self.raw);raw['canonical_listing']=self.file('extra.json',{'files':[{'id':'new'},{'id':'extra'}]})
        self.rejected(raw,code='CANONICAL_DUPLICATE')

    def test_old_artifact_must_be_retained(self):
        raw=copy.deepcopy(self.raw);raw['old_listing']=self.file('empty.json',{'files':[]})
        self.rejected(raw,code='OLD_ARCHIVE_MISSING')

    def test_downloaded_bytes_must_match(self):
        raw=copy.deepcopy(self.raw);raw['downloaded']['new']=self.file('wrong-bytes.json',{'changed':True})
        self.rejected(raw,code='NATIVE_BYTES_READBACK')

    def test_source_tamper_is_rejected(self):
        Path(self.source['path']).write_text('tampered')
        self.rejected(code='CONTENT_DRIFT')

    def test_native_requests_are_bounded_after_human(self):
        result=worker.requests(self.c,self.root)
        self.assertEqual(len(result['moves']),2)
        self.assertTrue(result['registry_update']['preserve_unrelated_rows'])

    def test_no_requests_without_human_decision(self):
        self.file('decision.json',{**self.decision,'actor_kind':'AI'})
        with self.assertRaises(Blocked):worker.requests(self.c,self.root)

    def test_predecessor_content_drift_before_move(self):
        self.execution['metadata']['old']=self.file('changed-old.json',{'id':'old','parent_ids':['canonical'],
            'title':'old-name','mime_type':'application/json','size':'23','modified_time':'2026-02-01T00:00:00Z'})
        self.file('execution.json',self.execution)
        with self.assertRaises(Blocked) as caught:worker.requests(self.c,self.root)
        self.assertEqual(caught.exception.data['code'],'NATIVE_FILE_DRIFT')

    def test_carry_forward_needs_execution_not_label(self):
        master=self.file('candidate.json',{})
        authoring=self.file('authoring.xlsx',b'fixture')
        qa=self.file('qa.json',{'status':'PASS','executed':False,'failed':0})
        inp=self.file('input.json',{'candidate_master':master,'candidate_authoring':authoring,'sources':[]})
        spec=self.file('spec.json',{'target':'TEST','input':inp})
        c={'product_id':'TEST','sources':[],'predecessor':{'spec':spec,'root':str(self.root),'work':str(self.root),
                                                        'qa':qa,'master':master,'authoring':authoring}}
        with patch('harness.workflow.inspect',return_value=({'state':'COMPLETED'},None,None)):
            with self.assertRaises(Blocked) as caught:worker.carry_forward(c)
        self.assertEqual(caught.exception.data['code'],'CARRY_FORWARD_QA')

    def test_registry_request_is_exact_single_row(self):
        result=worker.registry_request(self.c,self.raw,self.packet,self.decision)
        update=result['arguments']['requests'][0]['updateCells']
        self.assertEqual(update['start'],{'sheetId':1,'rowIndex':1,'columnIndex':0})
        self.assertEqual(len(update['rows']),1)
        self.assertEqual(update['rows'][0]['values'][2],{'userEnteredValue':{'stringValue':'R4'}})

    def test_registry_request_waits_for_complete_move_readback(self):
        raw=copy.deepcopy(self.raw);raw['metadata']['new']=self.execution['metadata']['new']
        with self.assertRaises(Blocked):worker.registry_request(self.c,raw,self.packet,self.decision)

    def test_readable_csv_index_never_shifts_native_columns(self):
        self.c['registry_before']={'':'0',**self.c['registry_before']}
        self.c['registry_after']={'':'0',**self.c['registry_after']}
        self.refresh_binding()
        raw=copy.deepcopy(self.raw)
        raw['registry']=self.file('indexed.json',{'content':',manufacturer,series,package_version,master_status\n0,TEST,FIXTURE,R3,FORMAL_PASS\n'})
        result=worker.registry_request(self.c,raw,self.packet,self.decision)
        cells=result['arguments']['requests'][0]['updateCells']['rows'][0]['values']
        self.assertEqual(len(cells),4)
        self.assertEqual(cells[0],{'userEnteredValue':{'stringValue':'TEST'}})

    def test_registry_request_rejects_row_drift_after_moves(self):
        raw=copy.deepcopy(self.raw);raw['registry']=self.registry_after
        with self.assertRaises(Blocked) as caught:worker.registry_request(self.c,raw,self.packet,self.decision)
        self.assertEqual(caught.exception.data['code'],'REGISTRY_HEAD_DRIFT')

    def test_approved_packet_cannot_be_reused_for_other_file(self):
        self.c['native_storage']=copy.deepcopy(self.c['native_storage'])
        self.c['native_storage']['new_artifacts'][0]['file_id']='foreign'
        with self.assertRaises(Blocked) as caught:worker.requests(self.c,self.root)
        self.assertEqual(caught.exception.data['code'],'STALE_DECISION')


if __name__=='__main__':unittest.main()
