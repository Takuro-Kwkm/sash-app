"""Validate captured native Drive observations with existing Shared capture semantics."""
import json,io,zipfile
from pathlib import Path

def verify_capture(shared,record,expected,product_id,formal_product_id,work_id,folder_id):
 import sys;sys.path.insert(0,str(shared))
 from harness.core import require,sha
 from harness.resolvers import capture
 gate='STORAGE_READBACK'
 def check(ok,reason):require(ok,'PRIVATE_RUNTIME_READBACK_INVALID',reason,gate)
 def data(ref):return capture(Path('/'),ref)
 def doc(ref):
  raw=json.loads(data(ref));check(not raw.get('isError'),'Connector error');value=raw.get('structuredContent',raw);check(isinstance(value,dict),'Structured native metadata required');return value
 check(record.get('schema')=='PRIVATE_RUNTIME_NATIVE_CAPTURE_V1'and record.get('source')=='CONNECTED_GOOGLE_DRIVE_TOOL','Native host capture required')
 check(record.get('product_id')==product_id and record.get('formal_product_id')==formal_product_id and record.get('work_id')==work_id and record.get('folder_id')==folder_id,'Wrong target/work/destination')
 rows=record.get('files',[]);check(isinstance(rows,list)and len(rows)==3 and {x.get('kind')for x in rows}=={'index','module','package'},'Exactly index/module/package required')
 values={};out={}
 for row in rows:
  kind=row['kind'];fixed=expected[kind];meta=doc(row['metadata']);download=doc(row['download']);payload=data(row['bytes'])
  check(not json.loads(data(row['metadata'])).get('isError') and not json.loads(data(row['download'])).get('isError'),'Connector error')
  check(meta['id']==download['id']==row['file_id'] and meta.get('parent_ids')==[folder_id]and download.get('parent_ids')==[folder_id],'Native ID/folder mismatch')
  check(meta.get('title')==fixed['name'] and int(meta.get('size',-1))==fixed['bytes']and int(download.get('file_size_bytes',-1))==fixed['bytes'],'Native name/bytes mismatch')
  check(len(payload)==fixed['bytes']and sha(payload)==fixed['sha256'],'Downloaded bytes differ from fixed approved artifact')
  values[kind]=payload;out[kind]=dict(path=fixed['package_path'],file_id=row['file_id'],bytes=len(payload),sha256=sha(payload))
 check(len({x['file_id']for x in rows})==3,'Duplicate native file IDs')
 index=json.loads(values['index']);module=json.loads(values['module'])
 check(index['schema']=='FORMAL_COMPOSED_RUNTIME_INDEX_V1'and len(index['products'])==1 and index['products'][0]['id']==formal_product_id,'Wrong runtime product')
 check(index['products'][0]['sha256']==sha(values['module'])and module['product_module']['product']['id']==formal_product_id,'Index/module target mismatch')
 wanted=expected['members'];check(isinstance(wanted,dict)and bool(wanted),'Exact package member set required')
 with zipfile.ZipFile(io.BytesIO(values['package']))as archive:
  names=archive.namelist();check(len(names)==len(set(names))and set(names)==set(wanted),'Archive member set differs')
  for name in names:
   check(not Path(name).is_absolute()and '..'not in Path(name).parts,'Unsafe archive member')
   value=archive.read(name);fixed=wanted[name];check(len(value)==fixed['bytes']and sha(value)==fixed['sha256'],'Archive member bytes differ: '+name)
  check(archive.read(expected['index']['package_path'])==values['index']and archive.read(expected['module']['package_path'])==values['module'],'Saved standalone files differ from saved package')
 out['package']['files']=[dict(path=name,**meta)for name,meta in sorted(wanted.items())]
 return dict(schema='NATIVE_PRIVATE_RUNTIME_READBACK_V1',status='FORMAL_RUNTIME_BYTES_READBACK_PASS',source='CONNECTED_GOOGLE_DRIVE_TOOL',product_id=product_id,formal_product_id=formal_product_id,work_id=work_id,folder_id=folder_id,index=out['index'],module=out['module'],package=out['package'],product_master_mutations=0,release=False,full_bytes_verified=True)
