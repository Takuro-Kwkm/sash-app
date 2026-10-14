import {applyGlobalWindowSelectionFlow} from './global-window-selection-flow-engine.mjs';
export function applyDeclaredWindowFlow(fields,integration){
  const contract=integration.uiFlowContract;
  if(contract?.schema!=='DECLARED_WINDOW_FLOW_V1')throw Object.assign(new Error('WINDOW_FLOW_CONTRACT_INVALID'),{code:'WINDOW_FLOW_CONTRACT_INVALID'});
  const roles=contract.fields;
  return applyGlobalWindowSelectionFlow(fields,{
    uiCategory:integration.uiCategory,
    canonicalSlotOrder:contract.slotOrder,
    semanticSlotForField:key=>roles[key]?.slot??null,
    semanticStageForSlot:(_slot,field)=>roles[field.key]?.stage??null,
    shouldExposeField:field=>!field.internal&&!field.technical,
  });
}
