"""Install a completed native receipt into a NEW package copy, never an old Work."""
import argparse,hashlib,json,shutil,sys
from pathlib import Path
def install(shared,work,spec,source,destination):
 shared,work,spec,source,destination=map(lambda x:Path(x).resolve(),(shared,work,spec,source,destination));sys.path.insert(0,str(shared))
 from harness.core import require,read_json,write_json,sha
 from harness.common_development import inspected_work,ref
 s=read_json(spec);_,state,_,rows=inspected_work({'root':str(shared),'work':str(work),'spec':ref(spec)},s['target']);require(state['state']=='COMPLETED'and s['target_gate']=='RUNTIME_UI_ADOPTED','ADOPTION_REQUIRED','Completed native Work required')
 matches=[a for row in rows for a in row['evidence'].get('artifacts',[])if Path(a['path']).name=='RUNTIME_UI_ADOPTION.json'];require(bool(matches),'ADOPTION_REQUIRED','Actual saved native result required')
 receipt=read_json(matches[-1]['path']);require(receipt['state']=='RUNTIME_UI_ADOPTED'and receipt['package_index_sha256']==sha((source/'runtime_index.json').read_bytes())and receipt['product_id']==s['target'],'PACKAGE_CHANGED','Use the exact adopted package')
 require(not destination.exists(),'PRESERVE_RUNTIME_PACKAGE','Install into an immutable successor only');shutil.copytree(source,destination)
 for key,name in [('main_readback','native-main.json'),('formal_readback','formal-readback.json')]:
  old=receipt[key];require(sha(Path(old['path']).read_bytes())==old['sha256'],'ADOPTION_PROOF_CHANGED','Native receipt differs');new=destination/'adoption'/name;shutil.copy2(old['path'],new);receipt[key]={'path':'adoption/'+name,'sha256':sha(new.read_bytes())}
 write_json(destination/'adoption/runtime-adoption.json',receipt)
 contract=read_json(s['input']['path']);profile=read_json(contract['profile']['path']);index_path=Path(profile['runtime_package']).relative_to('src/catalog').as_posix()
 binding={'schema':'ROW_TABLE_RUNTIME_REGISTRY_BINDING_V1','native_work':{'root':str(shared),'work':str(work),'spec':ref(spec)},'registry':'src/catalog/runtime-master/row-table-runtime-registry.json','entry':{'path':index_path,'sha256':receipt['package_index_sha256'],'adoption':{'path':'adoption/runtime-adoption.json','sha256':sha((destination/'adoption/runtime-adoption.json').read_bytes()),'work_id':receipt['work_id']}}}
 write_json(destination/'adoption/registry-binding.json',binding)
 return {'state':'ADOPTED_PACKAGE_COPY_PREPARED','destination':str(destination),'registry_binding':ref(destination/'adoption/registry-binding.json'),'registry_changed':False,'release':False}
if __name__=='__main__':
 a=argparse.ArgumentParser()
 for k in ('shared','work','spec','source','destination'):a.add_argument('--'+k,required=True)
 x=a.parse_args();print(json.dumps(install(x.shared,x.work,x.spec,x.source,x.destination)))
