"""Package an unchanged reviewed UI for the normal row-table Runtime loader.

Format producer only. Shared v2 owns adoption, approvals and storage gates.
"""
import argparse,hashlib,json,shutil
from pathlib import Path
def digest(b):return hashlib.sha256(b).hexdigest()
def build(candidate,index_path,review_work,destination):
 candidate,index_path,review_work,destination=map(Path,(candidate,index_path,review_work,destination))
 if destination.exists():raise ValueError('PRESERVE_RUNTIME_PACKAGE')
 doc=json.loads(candidate.read_bytes());prior=json.loads(index_path.read_bytes())
 if len(prior['products'])!=1:raise ValueError('ONE_REVIEWED_PRODUCT_REQUIRED')
 product=prior['products'][0]
 if digest(candidate.read_bytes())!=product['sha256']:raise ValueError('REVIEWED_DOCUMENT_CHANGED')
 packet=json.loads((review_work/'review-packets/HUMAN_UI_REVIEW.json').read_bytes());decision=json.loads((review_work/'human-ui-decision.json').read_bytes());plan=json.loads((review_work/'plan.json').read_bytes())
 if decision['actor_kind']!='HUMAN' or decision['decision']!='APPROVED' or decision['payload_sha256']!=packet['payload_sha256'] or plan['product_id']!=product['id']:raise ValueError('EXPLICIT_UI_APPROVAL_REQUIRED')
 import sys;sys.path.insert(0,plan['shared_root'])
 from harness.common_development import inspected_work,ref
 inspected_work({'root':plan['shared_root'],'work':str(review_work),'spec':ref(review_work/'spec.json')},product['id'])
 if packet['native_packet']['ui_identity']['master']!=doc['source_master']['sha256']:raise ValueError('REVIEW_MASTER_CHANGED')
 if not any(f['native_path'].endswith('/candidate.json') and f['sha256']==digest(candidate.read_bytes()) for f in plan['ui_files']):raise ValueError('UNREVIEWED_DOCUMENT')
 master=Path(doc['source_master']['path']).read_bytes()
 if digest(master)!=doc['source_master']['sha256'] or json.loads(master)!=doc['master']:raise ValueError('MASTER_CHANGED')
 sources=[]
 for r in doc['ui_policy']['sales_views']['source_refs']:
  b=Path(r['path']).read_bytes()
  if digest(b)!=r['sha256']:raise ValueError('OFFICIAL_SOURCE_CHANGED')
  sources.append({**r,'bytes':len(b),'verification':'RETAINED_OFFICIAL_BYTES_SHA256_VERIFIED'})
 destination.mkdir(parents=True);(destination/'adoption').mkdir()
 write=lambda name,d:(destination/name).write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
 (destination/'reviewed-ui.json').write_bytes(candidate.read_bytes());(destination/'master.json').write_bytes(master)
 for name,source in [('adoption/ui-decision.json',review_work/'human-ui-decision.json'),('adoption/ui-packet.json',review_work/'review-packets/HUMAN_UI_REVIEW.json'),('adoption/user-source.json',Path(decision['decision_ref'])),('adoption/formal-master-receipt.json',Path(plan['master_receipt']['path']))]:shutil.copy2(source,destination/name)
 write('source-digests.json',{'schema':'VERIFIED_ROW_TABLE_SOURCE_DIGESTS_V1','product_id':product['id'],'master_sha256':doc['source_master']['sha256'],'sources':sources})
 files={p.relative_to(destination).as_posix():digest(p.read_bytes())for p in sorted(destination.rglob('*'))if p.is_file()}
 reference=lambda name:{'path':name,'sha256':files[name]}
 normal={k:v for k,v in product.items()if k not in ('path','sha256','candidate','adapterType')};normal.update(adapterType='ROW_TABLE_RUNTIME_V1',candidate=False)
 result={'schema':'ROW_TABLE_RUNTIME_INDEX_V1','packageVersion':product['packageVersion'],'product':normal,'document':reference('reviewed-ui.json'),'master':reference('master.json'),'evidence':reference('source-digests.json'),'files':files,'authoring':{'packageVersion':doc['master']['release_manifest'][0]['release_version'],'sha256':doc['source_master']['sha256'],'runtimeManifestDriveFileId':product['sourceReference']['runtimeManifestDriveFileId']},'admission':{'path':'adoption/runtime-adoption.json','required_for_production':True},'implementation_state':'IMPLEMENTED_PENDING_NATIVE_ADOPTION','ui_approval':{'decision':reference('adoption/ui-decision.json'),'packet':reference('adoption/ui-packet.json'),'source':reference('adoption/user-source.json')},'formal_master_mutations':0}
 write('runtime_index.json',result);return {'status':'PACKAGE_IMPLEMENTED','runtime_adopted':False,'index_sha256':digest((destination/'runtime_index.json').read_bytes()),'files':len(files)}
if __name__=='__main__':
 p=argparse.ArgumentParser()
 for k in ('candidate','index','review-work','destination'):p.add_argument('--'+k,required=True)
 a=p.parse_args();print(json.dumps(build(a.candidate,a.index,a.review_work,a.destination)))
