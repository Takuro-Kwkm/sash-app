"""Execute only after the human independently approves the named promotion Packet."""
import argparse
import hashlib
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'contracts/window-seven'
def read(p):return json.loads(Path(p).read_text())
def digest(x):return hashlib.sha256(json.dumps(x,sort_keys=True,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def write(p,x):Path(p).write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n')
def ref(path,pointer=''):return {'path':path,'pointer':pointer,'sha256':sha(ROOT/path)}
parser=argparse.ArgumentParser();parser.add_argument('--human-approved-packet-sha',required=True);parser.add_argument('--recorded-at-utc',required=True);args=parser.parse_args()
packet=read(OUT/'promotion-review-packet.json');bound=packet.pop('packet_content_sha256')
assert bound==args.human_approved_packet_sha and digest(packet)==bound
assert sha(OUT/'evidence-acceptance.json')==packet['accepted_evidence_sha256']
if (OUT/'formal-promotions.json').exists():raise SystemExit('Existing promotion preserved; duplicate execution refused.')
current={f['field_id']:f for f in read(OUT/'selection-contracts.json')['fields']}
assert len(current)==len(packet['fields'])==217
evidence={e['evidence_id']:e for e in read(OUT/'evidence-acceptance.json')['evidence']}
review_id='WINDOW7-HUMAN-INDEPENDENT-PROMOTION'
approvals=[];dossiers=[];decisions=[];targets=[]
for row in packet['fields']:
    d,a,target=row['dossier'],row['proposed_approval_payload'],row['target_contract']
    prior=current[d['field_id']]
    assert prior['status']=='PROVISIONAL' and target['status']=='FORMAL'
    assert {k:v for k,v in prior.items() if k!='status'}=={k:v for k,v in target.items() if k!='status'}
    assert digest(prior)==d['transition']['previous_contract_sha256'] and digest(target)==d['contract_sha256']==a['contract_sha256']
    assert digest(d)==a['dossier_sha256'] and digest([evidence[eid] for eid in d['evidence_ids']])==a['evidence_sha256']
    assert all(evidence[eid]['status']=='ACCEPTED' for eid in d['evidence_ids'])
    decisions.append({'decision_id':a['approval_id']+'-HUMAN-APPROVE','status':'APPROVED','payload':a.copy(),'approved_promotion_packet_content_sha256':bound})
    dossiers.append(d);approvals.append(a.copy());targets.append(target)
path='contracts/window-seven/evidence/human-promotion-decisions.json'
write(ROOT/path,{'version':'0.1','human_review_authority':'Direct human user in this Codex chat','human_statement':'217件の独立Promotion Approvalを承認',
 'interpreted_scope':'Independent approval of 217 fixed promotion dossiers, target Contracts and ordered Accepted Evidence hashes.',
 'recorded_at_utc':args.recorded_at_utc,'approved_packet_content_sha256':bound,'attestation_type':'HUMAN_MESSAGE_RECORD_NOT_CRYPTOGRAPHIC_IDENTITY','decisions':decisions})
for i,a in enumerate(approvals):a['review']={'authority_id':review_id,'decision_id':decisions[i]['decision_id'],'decision_ref':ref(path,'/decisions/'+str(i))}
write(OUT/'promotion-review-authorities.json',{'version':'0.1','authorities':[{'authority_id':review_id,'kind':'REVIEW_AUTHORITY','status':'CURRENT','identity':ref(path),'source_classes':[],'purposes':['APPLICATION_FIELD']}]})
write(OUT/'formal-promotions.json',{'version':'0.1','approvals':approvals,'dossiers':dossiers,'blockers':[]})
write(OUT/'selection-contracts.json',{'fields':targets})
state=read(OUT/'promotion-eligibility.json')
for f in state['fields']:f.update({'status':'FORMAL','eligible':True,'governance':'PASS','promotion_readiness':'FORMAL_PROMOTED'})
state['eligible_count']=217;state['ready_for_independent_approval']=0;write(OUT/'promotion-eligibility.json',state)
summary=read(OUT/'summary.json');summary.update({'status':'FORMAL_PROMOTED_PENDING_MERGE','after':{'FORMAL':217,'PROVISIONAL':0},'pending_fields':0,'promotion_approval_count':217})
write(OUT/'summary.json',summary)
print(json.dumps({'formal':217,'provisional':0,'promotion_approvals':217,'packet_content_sha256':bound}))
