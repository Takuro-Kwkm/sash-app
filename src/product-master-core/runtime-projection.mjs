const matchesWhen=(when,nodeId,state)=>{
  if(when?.productNodeId&&when.productNodeId!==nodeId)return false;
  for(const [field,expected]of Object.entries(when?.fields??{})){
    const actual=state[field];
    if(expected&&typeof expected==='object'&&'$in'in expected){if(!expected.$in.includes(actual))return false;}
    else if(actual!==expected)return false;
  }
  return true;
};

export function projectRuntimeSelection(master,productNodeId,initialSelection={}){
  const node=(master?.productNodes??[]).find((row)=>row.id===productNodeId);
  if(!node)throw new Error(`Unknown Product Node: ${productNodeId}`);
  const selection={...initialSelection};
  const trace=[];
  for(const rule of master?.dependencyRules??[]){
    if(rule.status==='INACTIVE'||!matchesWhen(rule.when,productNodeId,selection))continue;
    for(const effect of rule.effects??[]){
      const before=selection[effect.field];
      if(effect.operation==='SET')selection[effect.field]=effect.value;
      else if(effect.operation==='CLEAR')delete selection[effect.field];
      else if(effect.operation==='NOT_APPLICABLE')selection[effect.field]='NOT_APPLICABLE';
      trace.push({ruleId:rule.id,field:effect.field,operation:effect.operation,before,after:selection[effect.field]});
    }
  }
  return{productNode:node,selection,trace};
}
