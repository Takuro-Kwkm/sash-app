"""Materialize reviewed immutable Git dependency in isolation; install nothing."""
import hashlib,json,subprocess,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
def unpack(root,destination):
 root=Path(root).resolve();destination=Path(destination).resolve()
 assert not destination.exists() and not destination.is_relative_to(root),'ISOLATED_DESTINATION_REQUIRED'
 m=json.loads((root/'contracts/production/shared-product-master-conditions.v1.json').read_text())
 bundle=root/'contracts/production/shared-product-master-conditions.v1.bundle'
 assert m['schema']=='SHARED_PRODUCT_MASTER_CONDITIONS_GIT_CARRIER_V1' and hashlib.sha256(bundle.read_bytes()).hexdigest()==m['sha256'] and bundle.stat().st_size==m['bytes'],'CARRIER_IDENTITY'
 selection=json.loads((root/'contracts/production/current-authority-successor.json').read_text());assert selection['implementation_sha']==m['source_commit'],'UNSELECTED_CARRIER'
 destination.mkdir(parents=True)
 git=lambda *a:subprocess.check_output(['git',*a],cwd=destination,stderr=subprocess.PIPE)
 git('init','-q');git('bundle','verify',str(bundle));git('fetch','--quiet',str(bundle),m['source_commit']);git('checkout','--quiet','--detach',m['source_commit']);git('remote','add','origin','https://github.com/Takuro-Kwkm/product-ui-contracts.git')
 sys.path.insert(0,str(destination))
 from harness.current_authority import compatibility
 assert compatibility(destination,root)['status']=='PASS'
 return {'status':'PASS','source_commit':m['source_commit'],'scope':'ISOLATED_ADOPTED_DEPENDENCY_ONLY; NOT_LIVE_CURRENT'}
if __name__=='__main__':print(json.dumps(unpack(ROOT,sys.argv[1])))
