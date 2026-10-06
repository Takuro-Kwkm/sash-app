"""Adversarial binding checks and isolated, explicitly synthetic promotion rehearsal."""
import copy
import hashlib
import json
import sys
import tarfile
import tempfile
import unittest
from pathlib import Path
from window_adoption import apply_decisions,check_acceptance_binding
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'contracts/window-seven'
def read(p):return json.loads(Path(p).read_text())
def digest(x):return hashlib.sha256(json.dumps(x,sort_keys=True,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()
class GovernanceBinding(unittest.TestCase):
    def setUp(self):
        self.registry=read(OUT/'evidence-acceptance.json');self.candidates=read(OUT/'evidence/evidence-candidates.json')['candidates']
        self.decisions=read(OUT/'evidence/human-acceptance-decisions.json')['decisions'];self.packet=read(OUT/'human-review-packet.json')['packet_content_sha256']
    def verify(self):check_acceptance_binding(self.registry,self.candidates,self.decisions,self.packet)
    def test_real_human_acceptance_is_bound(self):self.verify()
    def test_extra_claim_cannot_hide_behind_accepted_status(self):
        self.registry['evidence'][0]['claims'].append('PRODUCT_FACT')
        with self.assertRaises(AssertionError):self.verify()
    def test_reference_purpose_cannot_become_application_acceptance(self):
        self.registry['evidence'][0]['scope']['purpose']='CONTRACT_REFERENCE'
        with self.assertRaises(AssertionError):self.verify()
    def test_new_candidate_cannot_inherit_old_human_decision(self):
        self.decisions[0]['original_candidate_payload_sha256']='0'*64
        with self.assertRaises(AssertionError):self.verify()
    def test_missing_field_evidence_is_detected(self):
        self.registry['evidence'].pop()
        with self.assertRaises(AssertionError):self.verify()
    def test_isolated_promotion_rehearsal_and_tampering(self):
        with tempfile.TemporaryDirectory() as td:
            stage=Path(td);a=read(OUT/'adoption.json')
            with tarfile.open(ROOT/a['archive']) as t:t.extractall(stage,filter='data')
            sys.path.insert(0,str(stage/'scripts'))
            from contracts import load_bundle,validate_bundle
            bundle=apply_decisions(load_bundle(stage),ROOT,stage)
            prepared=read(OUT/'promotion-review-packet.json')['fields']
            # Fixtures below are not admitted to the application registry.
            name='TEST_ONLY_SYNTHETIC_NOT_HUMAN_PROMOTION'
            records=[{'decision_id':'TEST-'+str(i),'status':'APPROVED','payload':r['proposed_approval_payload']} for i,r in enumerate(prepared)]
            path=Path('fixtures/window7-test-only-decisions.json');(stage/path).write_text(json.dumps({'scope':'SYNTHETIC_TEST_ONLY_NEVER_APPLICATION_AUTHORIZATION','decisions':records}))
            h=hashlib.sha256((stage/path).read_bytes()).hexdigest()
            bundle['field_evidence']['authorities'].append({'authority_id':name,'kind':'REVIEW_AUTHORITY','status':'CURRENT','identity':{'path':str(path),'pointer':'','sha256':h},'source_classes':[],'purposes':['APPLICATION_FIELD']})
            targets={r['field_id']:r['target_contract'] for r in prepared}
            bundle['fields']=[copy.deepcopy(targets.get(f['field_id'],f)) for f in bundle['fields']]
            for i,r in enumerate(prepared):
                approval=copy.deepcopy(r['proposed_approval_payload']);approval['review']={'authority_id':name,'decision_id':records[i]['decision_id'],'decision_ref':{'path':str(path),'pointer':'/decisions/'+str(i),'sha256':h}}
                bundle['field_promotions']['approvals'].append(approval);bundle['field_promotions']['dossiers'].append(copy.deepcopy(r['dossier']))
            result=validate_bundle(bundle)
            self.assertEqual(result['error_count'],0,result['validators'])
            # A stale evidence hash must fail even if status says FORMAL.
            bundle['field_promotions']['approvals'][-1]['evidence_sha256']='0'*64
            result=validate_bundle(bundle)
            self.assertTrue(any(e['code']=='INVALID_PROMOTION_APPROVAL' for e in result['validators']['formal-promotion']))
if __name__=='__main__':unittest.main()
