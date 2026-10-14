import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {validateReviewedWindowFlow} from '../../src/catalog/runtime-master/declared-window-flow.mjs';
const path=resolve(process.argv[2]),root=dirname(path),index=JSON.parse(readFileSync(path));
const reviewed=JSON.parse(readFileSync(resolve(root,'flow/reviewed-global-selection-flow.v7.json')));
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
for(const row of index.products){
  const document=JSON.parse(readFileSync(resolve(root,row.path)));
  const contract=reviewed.contracts?.[document.baseline.component_id];
  validateReviewedWindowFlow(contract);
  if(digest(readFileSync(resolve(root,contract.sourceFlow.path)))!==contract.sourceFlow.sha256)throw new Error('WINDOW_FLOW_SOURCE_BYTES_CHANGED');
  for(const field of document.product_module.specificationDefinitions){
    if(!contract.fields[field.key])throw new Error('WINDOW_UI_FIELD_UNMAPPED');
  }
  row.uiFlowContract=contract;
}
writeFileSync(path,JSON.stringify(index,null,2)+'\n');
console.log('REVIEWED_FIELD_ROLES_BOUND',index.products.map(row=>[row.id,Object.keys(row.uiFlowContract.fields).length]));
