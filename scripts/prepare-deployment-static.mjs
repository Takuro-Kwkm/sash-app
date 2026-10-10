import {copyFile,mkdir,readFile,readdir,rm,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,dirname} from 'node:path';

// Preserve repository-relative paths; public routes remain owned by the
// existing function. No catalog package is removed from its src/** bundle.
export const staticFiles=[
  ...['index.html','app.js','theme.js','product-configuration-editor.mjs','estimate-output-integration.mjs','styles.css','styles-wave3.css','work-management.css','estimate-output.css','theme.css'].map(p=>'src/ui/web/'+p),
  ...['domain.mjs','storage.mjs','repositories.mjs','service.mjs','field-workflow-scope.mjs'].map(p=>'src/work-management/'+p),
  ...['model.mjs','pdf-renderer.mjs','xlsx-renderer.mjs'].map(p=>'src/estimate-output/'+p),
];
const output=resolve('artifacts/deployment-static');
await rm(output,{recursive:true,force:true});
const receipts=[];
for(const file of staticFiles) {
  const target=resolve(output,file);await mkdir(dirname(target),{recursive:true});await copyFile(file,target);
  const source=await readFile(file),copied=await readFile(target);
  if(!source.equals(copied))throw new Error('STATIC_COPY_CHANGED:'+file);
  receipts.push({path:file,bytes:source.length,sha256:createHash('sha256').update(source).digest('hex')});
}
await writeFile('artifacts/deployment-static-receipt.json',JSON.stringify({schema:'SASH_STATIC_OUTPUT_RECEIPT_V1',file_count:receipts.length,bytes:receipts.reduce((s,r)=>s+r.bytes,0),files:receipts},null,2)+'\n');
console.log(JSON.stringify({static_files:receipts.length,static_bytes:receipts.reduce((s,r)=>s+r.bytes,0),function_catalog:'src/** retained',output}));
