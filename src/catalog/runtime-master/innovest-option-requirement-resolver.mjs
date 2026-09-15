const clone=(value)=>structuredClone(value);
const supportedRequirementOps=new Set(['ANY_OF','ALL_OF']);

function requirementSatisfied(requirement,selected){
  const ids=Array.isArray(requirement?.option_ids)?requirement.option_ids:[];
  if(requirement?.op==='ANY_OF')return ids.length>0&&ids.some((id)=>selected.has(id));
  if(requirement?.op==='ALL_OF')return ids.length>0&&ids.every((id)=>selected.has(id));
  return false;
}

function requirementsSatisfied(row,selected){
  const requirements=row.requires_options??[];
  return requirements.every((requirement)=>requirementSatisfied(requirement,selected));
}

function validateRequirementSchema(options){
  for(const row of options){
    for(const requirement of row.requires_options??[]){
      if(!supportedRequirementOps.has(requirement?.op)||!Array.isArray(requirement?.option_ids)||requirement.option_ids.length===0){
        const error=new Error(`Unsupported Innovest option requirement schema: ${row.option_id}/${requirement?.op??'UNKNOWN'}`);
        error.code='RUNTIME_OPTION_REQUIREMENT_UNSUPPORTED';
        error.optionId=row.option_id;
        error.requirement=requirement;
        throw error;
      }
    }
  }
}

export function createInnovestOptionRequirementAwareResolver(data,createBaseResolver){
  const runtimeOptions=data.options.options.filter((row)=>row.runtime_selectable===true);
  validateRequirementSchema(runtimeOptions);
  const requirementFreeData={
    ...data,
    options:{
      ...data.options,
      options:data.options.options.map((row)=>({...row,requires_options:[]})),
    },
  };
  const baseResolver=createBaseResolver(requirementFreeData);
  const rowById=new Map(runtimeOptions.map((row)=>[row.option_id,row]));

  return(input={})=>{
    const result=baseResolver(input);
    const optionState=result.fields?.option;
    if(!optionState)return result;

    const selectedBefore=new Set(Array.isArray(optionState.value)?optionState.value:[]);
    const allowedBefore=Array.isArray(optionState.allowed_values)?optionState.allowed_values:[];
    const allowedAfter=allowedBefore.filter((id)=>{
      const row=rowById.get(id);
      return !row||requirementsSatisfied(row,selectedBefore);
    });
    const allowedSet=new Set(allowedAfter);
    const selectedAfter=[...selectedBefore].filter((id)=>allowedSet.has(id));
    const removed=[...selectedBefore].filter((id)=>!allowedSet.has(id));

    if(allowedAfter.length===allowedBefore.length&&removed.length===0)return result;

    const next={...result,fields:{...result.fields},cleared_fields:[...(result.cleared_fields??[])]};
    next.fields.option={...optionState,allowed_values:allowedAfter,value:selectedAfter};
    if(removed.length)next.cleared_fields.push({field:'option',reason:'OPTION_REQUIREMENT',removed:clone(removed)});
    return next;
  };
}
