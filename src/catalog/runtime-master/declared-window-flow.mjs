import {applyGlobalWindowSelectionFlow} from './global-window-selection-flow-engine.mjs';
import {canonicalStageForSlot} from './canonical-window-semantic-schema.mjs';
const fail=code=>{throw Object.assign(new Error(code),{code});};
export function validateReviewedWindowFlow(contract){
  if(!['REVIEWED_WINDOW_FLOW_V2','REVIEWED_WINDOW_FLOW_V3'].includes(contract?.schema)||!contract.revision||!contract.sourceFlow?.sha256||contract.formalAdoption!==false)fail('WINDOW_FLOW_CONTRACT_INVALID');
  const groups=new Map();
  for(const group of contract.groups??[]){
    if(!group.id||!group.label||!Number.isFinite(group.order)||groups.has(group.id))fail('WINDOW_FLOW_GROUP_INVALID');
    groups.set(group.id,group);
  }
  const roles=contract.fields??{},context=new Set(contract.contextFields??[]);
  const deferred=(role,parent)=>contract.schema==='REVIEWED_WINDOW_FLOW_V3'&&(role.deferredEvaluationParents??[]).includes(parent);
  const visited=new Set(),visiting=new Set();
  function visit(key){
    if(visiting.has(key))fail('WINDOW_FLOW_DEPENDENCY_CYCLE');
    if(visited.has(key))return;visiting.add(key);
    for(const parent of roles[key]?.parents??[])if(roles[parent])visit(parent);
    visiting.delete(key);visited.add(key);
  }
  for(const [key,role] of Object.entries(roles)){
    if(!key||!role.meaning||!role.sourceRefs?.length||!groups.has(role.group)||!Number.isFinite(role.rank)||!Array.isArray(role.parents)||canonicalStageForSlot(role.slot)!==role.stage)fail('WINDOW_FLOW_ROLE_INVALID');
    if(role.deferredEvaluationParents!==undefined){
      if(contract.schema!=='REVIEWED_WINDOW_FLOW_V3'||!Array.isArray(role.deferredEvaluationParents))fail('WINDOW_FLOW_DEFERRED_PARENT_INVALID');
      for(const parent of role.deferredEvaluationParents){
        if(!role.parents.includes(parent)||roles[parent]?.evaluationContext!==true||roles[parent]?.stage!=='SIZE'&&roles[parent]?.stage!=='INSTALLATION_SURVEY')fail('WINDOW_FLOW_DEFERRED_PARENT_INVALID');
      }
    }
    for(const parent of role.parents){
      const before=roles[parent];
      if(!before){if(!context.has(parent))fail('WINDOW_FLOW_PARENT_UNDECLARED');continue;}
      const a=groups.get(before.group).order,b=groups.get(role.group).order;
      if((a>b||(a===b&&before.rank>=role.rank))&&!deferred(role,parent))fail('WINDOW_FLOW_DEPENDENCY_ORDER_INVALID');
    }
  }
  for(const key of Object.keys(roles))visit(key);
  return groups;
}
export function applyDeclaredWindowFlow(fields,integration){
  const contract=integration.uiFlowContract;
  if(['REVIEWED_WINDOW_FLOW_V2','REVIEWED_WINDOW_FLOW_V3'].includes(contract?.schema)){
    const groups=validateReviewedWindowFlow(contract),roles=contract.fields;
    const result=applyGlobalWindowSelectionFlow(fields,{
      uiCategory:integration.uiCategory,canonicalSlotOrder:contract.slotOrder,
      semanticSlotForField:key=>roles[key]?.slot??null,
      semanticStageForSlot:(_slot,field)=>roles[field.key]?.stage??null,
      shouldExposeField:field=>!field.internal&&!field.technical,
      presentationExtensionForField:key=>roles[key]?{slot:roles[key].group,order:groups.get(roles[key].group).order}:null,
      presentationRankForField:key=>roles[key]?.rank??null,
      standardLabelForField:(key,fallback)=>roles[key]?.label??fallback,
    });
    const positions=new Map(result.map((field,index)=>[field.key,index]));
    return result.map(field=>{
      const role=roles[field.key];
      for(const parent of field.parentFields??[]){
        if(!roles[parent]&&!contract.contextFields.includes(parent))fail('WINDOW_FLOW_PARENT_UNDECLARED');
        if(positions.has(parent)&&positions.get(parent)>=positions.get(field.key)&&!(contract.schema==='REVIEWED_WINDOW_FLOW_V3'&&(role.deferredEvaluationParents??[]).includes(parent)))fail('WINDOW_FLOW_DEPENDENCY_ORDER_INVALID');
      }
      return {...field,helpText:role.helpText??field.helpText,readOnly:Boolean(field.readOnly||role.readOnly),disabled:Boolean(field.disabled||role.readOnly),presentationGroup:groups.get(role.group),fieldMeaning:role.meaning,flowRevision:contract.revision};
    });
  }
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
