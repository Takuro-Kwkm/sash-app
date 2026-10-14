import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
const p=resolve(process.argv[2]),root=dirname(p),index=JSON.parse(readFileSync(p)),hash=b=>createHash('sha256').update(b).digest('hex');
if(index.schema!=='CANDIDATE_RUNTIME_INDEX_V1'||index.adoption!=='CANDIDATE_ONLY')throw new Error('CANDIDATE_INDEX_REQUIRED');
const ids=new Set();
for(const row of index.products){
 if(ids.has(row.id))throw new Error('DUPLICATE_PRODUCT');ids.add(row.id);
 const bytes=readFileSync(resolve(root,row.path));if(hash(bytes)!==row.sha256)throw new Error('CANDIDATE_BYTES_CHANGED');
 const d=JSON.parse(bytes);if(d.formal_adoption||d.source_adoption||d.pricing.price!==null)throw new Error('CANDIDATE_SCOPE_EXPANDED');
 const values=d.product_module.allowedValues;if(values.some(v=>!v.displayLabel||!v.evidenceIds?.length))throw new Error('CHOICE_EVIDENCE_MISSING');
 const definitions=d.product_module.specificationDefinitions;if(definitions.some(f=>!row.uiFlowContract.fields[f.key]))throw new Error('UI_FIELD_ROLE_UNMAPPED');
}
console.log(JSON.stringify({status:'LOCAL_CANDIDATE_SCHEMA_PASS',components:ids.size,formal_adoption:false,current_native_admission:false}));
