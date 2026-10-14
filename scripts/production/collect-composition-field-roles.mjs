import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {resolveRuntimeAppProduct} from '../../src/catalog/runtime-master/runtime-app-bridge.mjs';
const path=resolve(process.argv[2]),root=dirname(path),index=JSON.parse(readFileSync(path));
function stageFor(key){
 if(key==='referenced_series_id')return'PRODUCT';
 if(key==='window_type'||key==='referenced_window_id')return'OPENING';
 if(key.startsWith('spec_')||key==='frame_type')return'CONFIGURATION';
 if(['size_mode','custom_width','custom_height','survey_w','survey_h'].includes(key))return'SIZE';
 if(key.includes('color'))return'FINISH';
 if(key==='screen')return'SCREEN';
 if(key==='glass')return'GLAZING';
 if(key==='options')return'OPTION';
 return'INSTALLATION_SURVEY';
}
for(const row of index.products){
 const d=JSON.parse(readFileSync(resolve(root,row.path))),fields={};
 for(const f of d.product_module.specificationDefinitions)fields[f.key]={slot:f.key,stage:stageFor(f.key)};
 if(d.composition){
  for(const b of d.composition.bindings.filter(b=>b.executable)){
   let selection={window_type:b.window_id};
   for(let pass=0;pass<35;pass++){
    const result=await resolveRuntimeAppProduct(b.consumer_product_id,selection);
    for(const f of result.fields){
     if(f.key==='window_type')continue;
     if(!f.semanticSlot||!f.semanticStage)throw new Error('SOURCE_FIELD_ROLE_UNMAPPED');
     fields[d.composition.prefix+f.key]={slot:d.composition.prefix+f.semanticSlot,stage:f.semanticStage};
    }
    selection={...result.selection};
    const next=result.fields.find(f=>f.required&&selection[f.key]===undefined&&f.dataType!=='NUMBER'&&f.values?.length);
    if(!next)break;
    selection[next.key]=next.values[0].value;
   }
  }
 }
 row.uiFlowContract={schema:'DECLARED_WINDOW_FLOW_V1',fields,slotOrder:[...new Set(Object.values(fields).map(f=>f.slot))]};
}
writeFileSync(path,JSON.stringify(index,null,2)+'\n');
console.log('EXPLICIT_FIELD_ROLES_BOUND',index.products.map(r=>[r.id,Object.keys(r.uiFlowContract.fields).length]));
