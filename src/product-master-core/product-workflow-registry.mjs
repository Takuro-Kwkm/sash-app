const error=(code,message,details={})=>({code,message,...details});

export function validateProductWorkflowProfile(profile){
  const errors=[];
  if(!profile||typeof profile!=='object'||Array.isArray(profile))return{pass:false,errors:[error('WORKFLOW_PROFILE_INVALID','Workflow profile must be an object')]};
  if(profile.workflowSchemaVersion!=='1.0')errors.push(error('WORKFLOW_SCHEMA_INVALID',`Unsupported workflowSchemaVersion: ${profile.workflowSchemaVersion}`));
  if(profile.recordType!=='PRODUCT_MASTER_WORKFLOW_PROFILE')errors.push(error('WORKFLOW_RECORD_TYPE_INVALID','recordType must be PRODUCT_MASTER_WORKFLOW_PROFILE'));
  if(!profile.productId)errors.push(error('WORKFLOW_PRODUCT_REQUIRED','productId is required'));
  if(profile.status!=='ACTIVE')errors.push(error('WORKFLOW_STATUS_INVALID','Only ACTIVE workflow profiles can be registered'));
  if(!profile.capabilities||typeof profile.capabilities!=='object')errors.push(error('WORKFLOW_CAPABILITIES_REQUIRED','capabilities are required'));
  if(profile.capabilities?.evidenceRoundTrip){
    const round=profile.evidenceRoundTrip;
    if(!round?.rawPath||!round?.knownFields||!round?.nodeIds||!round?.adjudicationPlan)errors.push(error('WORKFLOW_EVIDENCE_ROUNDTRIP_INVALID','Evidence round-trip capability requires rawPath, knownFields, nodeIds and adjudicationPlan'));
  }
  if(profile.capabilities?.technicalFacts&&!Array.isArray(profile.technicalFacts))errors.push(error('WORKFLOW_TECHNICAL_FACTS_INVALID','Technical Fact capability requires technicalFacts array'));
  if(profile.capabilities?.standardSizeSourceAudit){
    const audit=profile.standardSizeSourceAudit;
    if(!Array.isArray(audit?.sourceRecords)||audit.sourceRecords.length===0||!Array.isArray(audit?.canonicalRecords))errors.push(error('WORKFLOW_STANDARD_SIZE_SOURCE_AUDIT_INVALID','Standard-size source audit requires sourceRecords and canonicalRecords arrays'));
  }
  if(profile.capabilities?.formalWorkbookMutation===true)errors.push(error('WORKFLOW_AUTO_WORKBOOK_MUTATION_FORBIDDEN','Workflow profile cannot enable automatic formal Workbook mutation'));
  if(profile.capabilities?.runtimeAutoWrite===true)errors.push(error('WORKFLOW_RUNTIME_AUTO_WRITE_FORBIDDEN','Workflow profile cannot enable automatic Runtime writes'));
  return{pass:errors.length===0,errors};
}

export function createProductWorkflowRegistry(profiles=[]){
  const map=new Map();
  const errors=[];
  for(const profile of profiles){
    const validation=validateProductWorkflowProfile(profile);
    errors.push(...validation.errors.map((row)=>({...row,productId:profile?.productId??null})));
    if(profile?.productId&&map.has(profile.productId))errors.push(error('WORKFLOW_PRODUCT_DUPLICATE',`Duplicate workflow productId: ${profile.productId}`,{productId:profile.productId}));
    if(validation.pass&&!map.has(profile.productId))map.set(profile.productId,profile);
  }
  if(errors.length)return{pass:false,errors,registry:null};
  return{
    pass:true,errors:[],registry:{
      productIds:()=>[...map.keys()],
      has:(productId)=>map.has(productId),
      get:(productId)=>map.get(productId)??null,
      require:(productId)=>{
        const profile=map.get(productId);
        if(!profile)throw new Error(`Product Master workflow is not registered: ${productId}`);
        return profile;
      }
    }
  };
}
