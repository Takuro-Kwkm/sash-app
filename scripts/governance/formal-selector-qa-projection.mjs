import {toRuntimeUiResult} from '../../src/catalog/runtime-master/runtime-app-bridge.mjs';
import {INNER_WINDOW_INTERNAL_SELECTION_FIELDS} from '../../src/catalog/runtime-master/inner-window-runtime-ui-contract.mjs';

// Test-only projection. Internal Formal selectors remain available to the
// factorized QA driver even though UI v1.9 deliberately hides them from sales.
// This never runs in HTTP, the editor, or the Global Flow engine.
export function toFormalSelectorQaResult(master,state,integration,integrity){
 const result=toRuntimeUiResult(master,state,integration,integrity);
 for(const key of INNER_WINDOW_INTERNAL_SELECTION_FIELDS){
  const field=state.fields[key],definition=master.fields.find(d=>d.field_name===key);
  if(!field||!definition||field.visibility==='HIDE'||result.fields.some(f=>f.key===key))continue;
  result.fields.push({key,displayLabel:definition.display_label??key,dataType:'ENUM',required:Boolean(field.required),readOnly:Boolean(field.readOnly||field.derived_by_rule||field.resolved_by_rule),semanticStage:'SIZE',semanticSlot:key,values:(field.allowed_values??[]).map(value=>({value,displayLabel:String(value),disabled:false,manualCheck:false}))});
 }
 return result;
}
