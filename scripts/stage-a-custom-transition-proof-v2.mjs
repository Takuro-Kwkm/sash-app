import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolveRuntimeAppProduct } from '../src/catalog/runtime-master/runtime-app-bridge.mjs';

const REACH=process.env.STAGE_A_CUSTOM_REACHABILITY_INPUT??'artifacts/evidence/custom-v5/stage-a-custom-selector-reachability/report.json';
const GEOMETRY=process.env.STAGE_A_CUSTOM_GEOMETRY_EQ_INPUT??'artifacts/evidence/custom-v5/stage-a-custom-runtime-geometry-equivalence/report.json';
const OUT=process.env.STAGE_A_CUSTOM_TRANSITION_OUT??'artifacts/stage-a-custom-transition-proof-v2';
const HEAD_SHA=process.env.HEAD_SHA??null;
const EVIDENCE_HEAD=process.env.CUSTOM_GEOMETRY_EVIDENCE_HEAD??null;

const stable=(value)=>Array.isArray(value)?value.map(stable):(!value||typeof value!=='object'?value:Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,stable(v)])));
const hash=(value)=>createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
const has=(value)=>value!==undefined&&value!==null&&value!==''&&(!Array.isArray(value)||value.length>0);
const same=(a,b)=>Object.is(a,b)||String(a)===String(b);

const [reach,geometry]=await Promise.all([REACH,GEOMETRY].map(async(path)=>JSON.parse(await readFile(path,'utf8'))));
if(!EVIDENCE_HEAD)throw new Error('CUSTOM_TRANSITION_V2_EVIDENCE_HEAD_MISSING');
for(const [name,row] of [['reachability',reach],['geometry',geometry]])if(row.exact_head_sha!==EVIDENCE_HEAD)throw new Error(`CUSTOM_TRANSITION_V2_${name.toUpperCase()}_EVIDENCE_HEAD_MISMATCH`);
if(reach.status!=='PASS'||reach.unique_context_count!==137||reach.unreachable_context_count!==0||reach.source_rule_count!==152)throw new Error('CUSTOM_TRANSITION_V2_REACHABILITY_NOT_READY');
if(geometry.status!=='PASS'||geometry.mismatch_count!==0||geometry.selector_context_count!==137||geometry.source_rule_count!==152||geometry.window_count!==92)throw new Error('CUSTOM_TRANSITION_V2_GEOMETRY_NOT_READY');
if(geometry.model_version!=='CUSTOM_RUNTIME_GEOMETRY_EQUIVALENCE_FULL_ARRANGEMENT_V4_NULL_SAFE_FORMAL_WRAPPER')throw new Error(`CUSTOM_TRANSITION_V2_GEOMETRY_MODEL_UNEXPECTED ${geometry.model_version}`);

const geometryByContext=new Map((geometry.contexts??[]).map((row)=>[row.context_index,row]));
const enabled=(field)=>(field?.values??[]).filter((choice)=>choice.disabled!==true);
const field=(result,key)=>(result?.fields??[]).find((row)=>row.key===key)??null;
const hasChoice=(result,key,value)=>enabled(field(result,key)).some((choice)=>same(choice.value,value));
const status=(result)=>{
  const direct=String(result?.dimensionResult?.status??result?.dimension_result?.status??'');
  if(direct==='BLOCKED')return'BLOCK';
  if(['PASS','REVIEW_REQUIRED','BLOCK','PENDING'].includes(direct))return direct;
  const validation=String(result?.validation?.status??'');
  if(['BLOCKED','INVALID'].includes(validation))return'BLOCK';
  if(['MANUAL_CHECK','REVIEW_REQUIRED'].includes(validation))return'REVIEW_REQUIRED';
  return direct||validation||'NONE';
};
function fail(code,details={}){const error=new Error(`${code} ${JSON.stringify(details)}`);error.code=code;error.details=details;throw error;}
function assertCondition(ok,code,details={}){if(!ok)fail(code,details);}
function traceOrder(context){
  const keys=(context.trace??[]).map((step)=>String(step).split(' [',1)[0].split('=',1)[0]);
  const modeIndex=keys.indexOf('size_mode');
  assertCondition(modeIndex>=0,'CUSTOM_TRANSITION_V2_TRACE_MODE_MISSING',{context:context.context_index,trace:context.trace});
  return{pre:new Set(keys.slice(0,modeIndex)),post:keys.slice(modeIndex+1)};
}
function assertContextStable(context,result,phase,postKeys,{includePost=true}={}){
  assertCondition(same(result?.selection?.window_type,context.window_id),'CUSTOM_TRANSITION_V2_WINDOW_ID_DRIFT',{context:context.context_index,phase,expected:context.window_id,actual:result?.selection?.window_type});
  const post=new Set(postKeys);
  for(const desired of context.desired_status??[]){
    if(desired.status!=='SATISFIED'||!desired.field||!has(desired.selected_value))continue;
    if(!includePost&&post.has(desired.field))continue;
    assertCondition(same(result?.selection?.[desired.field],desired.selected_value),'CUSTOM_TRANSITION_V2_SELECTOR_DRIFT',{context:context.context_index,phase,field:desired.field,expected:desired.selected_value,actual:result?.selection?.[desired.field]});
  }
}
function assertCustomInputs(context,result,phase){
  const wf=field(result,context.custom_width_field),hf=field(result,context.custom_height_field);
  assertCondition(Boolean(wf),'CUSTOM_TRANSITION_V2_WIDTH_FIELD_MISSING',{context:context.context_index,phase,key:context.custom_width_field});
  assertCondition(Boolean(hf),'CUSTOM_TRANSITION_V2_HEIGHT_FIELD_MISSING',{context:context.context_index,phase,key:context.custom_height_field});
  assertCondition(wf.required===true,'CUSTOM_TRANSITION_V2_WIDTH_NOT_REQUIRED',{context:context.context_index,phase});
  assertCondition(hf.required===true,'CUSTOM_TRANSITION_V2_HEIGHT_NOT_REQUIRED',{context:context.context_index,phase});
}
function assertNoCustomInputs(context,result,phase){
  assertCondition(!field(result,context.custom_width_field),'CUSTOM_TRANSITION_V2_WIDTH_FIELD_STALE',{context:context.context_index,phase});
  assertCondition(!field(result,context.custom_height_field),'CUSTOM_TRANSITION_V2_HEIGHT_FIELD_STALE',{context:context.context_index,phase});
  assertCondition(!has(result?.selection?.[context.custom_width_field]),'CUSTOM_TRANSITION_V2_WIDTH_VALUE_STALE',{context:context.context_index,phase,value:result?.selection?.[context.custom_width_field]});
  assertCondition(!has(result?.selection?.[context.custom_height_field]),'CUSTOM_TRANSITION_V2_HEIGHT_VALUE_STALE',{context:context.context_index,phase,value:result?.selection?.[context.custom_height_field]});
}

let resolverCalls=0,evaluationCount=0,postModeReplayEvaluationCount=0;
async function resolve(productId,selection){resolverCalls++;evaluationCount++;return resolveRuntimeAppProduct(productId,selection);}
async function replayPostMode(context,start,postKeys,phase){
  let result=start;
  for(const key of postKeys){
    const wanted=context.selection_prefix?.[key];
    assertCondition(has(wanted),'CUSTOM_TRANSITION_V2_POST_MODE_TARGET_MISSING',{context:context.context_index,phase,key});
    const targetField=field(result,key);
    assertCondition(Boolean(targetField),'CUSTOM_TRANSITION_V2_POST_MODE_FIELD_MISSING',{context:context.context_index,phase,key,fields:(result.fields??[]).map((row)=>row.key)});
    if((targetField.values??[]).length)assertCondition(hasChoice(result,key,wanted),'CUSTOM_TRANSITION_V2_POST_MODE_VALUE_NOT_ADVERTISED',{context:context.context_index,phase,key,wanted,choices:enabled(targetField).map((choice)=>choice.value)});
    result=await resolve(context.product_id,{...(result.selection??{}),[key]:wanted});postModeReplayEvaluationCount++;
    assertCondition(same(result?.selection?.[key],wanted),'CUSTOM_TRANSITION_V2_POST_MODE_SELECTION_FAILED',{context:context.context_index,phase,key,wanted,actual:result?.selection?.[key]});
  }
  return result;
}

const contexts=[];
let negativeEvaluationCount=0,reviewPositiveCount=0,passPositiveCount=0,unboundedNegativeNaCount=0,failure=null;
try{
  for(const context of reach.contexts??[]){
    const geo=geometryByContext.get(context.context_index);
    assertCondition(Boolean(geo),'CUSTOM_TRANSITION_V2_GEOMETRY_CONTEXT_MISSING',{context:context.context_index});
    assertCondition(Boolean(geo.positive_witness),'CUSTOM_TRANSITION_V2_POSITIVE_WITNESS_MISSING',{context:context.context_index});
    const widthKey=context.custom_width_field,heightKey=context.custom_height_field;
    const order=traceOrder(context);
    const baselineInput={...(context.selection_prefix??{})};
    delete baselineInput.size_mode;delete baselineInput[widthKey];delete baselineInput[heightKey];delete baselineInput.size;
    for(const key of order.post)delete baselineInput[key];

    // 1. Resolve the same pre-mode selector frontier in STANDARD and prove both modes remain advertised.
    const baseline=await resolve(context.product_id,baselineInput);
    assertContextStable(context,baseline,'BASELINE_STANDARD',order.post,{includePost:false});
    assertCondition(hasChoice(baseline,'size_mode','STANDARD'),'CUSTOM_TRANSITION_V2_STANDARD_MODE_NOT_ADVERTISED',{context:context.context_index,selection:baseline.selection});
    assertCondition(hasChoice(baseline,'size_mode','CUSTOM'),'CUSTOM_TRANSITION_V2_CUSTOM_MODE_NOT_ADVERTISED',{context:context.context_index,selection:baseline.selection});

    // 2. STANDARD -> CUSTOM, then replay any selectors that formally appear only after CUSTOM is chosen.
    let customStart=await resolve(context.product_id,{...(baseline.selection??baselineInput),size_mode:'CUSTOM'});
    assertContextStable(context,customStart,'ENTER_CUSTOM_PRE_POST_SELECTOR',order.post,{includePost:false});
    assertCondition(same(customStart?.selection?.size_mode,'CUSTOM'),'CUSTOM_TRANSITION_V2_ENTER_CUSTOM_FAILED',{context:context.context_index,selection:customStart.selection});
    customStart=await replayPostMode(context,customStart,order.post,'ENTER_CUSTOM_POST_SELECTOR_REPLAY');
    assertContextStable(context,customStart,'ENTER_CUSTOM_COMPLETE',order.post);
    assertCustomInputs(context,customStart,'ENTER_CUSTOM_COMPLETE');
    assertCondition(!has(customStart?.selection?.[widthKey])&&!has(customStart?.selection?.[heightKey]),'CUSTOM_TRANSITION_V2_ENTER_CUSTOM_STALE_VALUES',{context:context.context_index,selection:customStart.selection});

    // 3. Positive formal witness must resolve exactly as the geometry proof established.
    const [positiveW,positiveH]=geo.positive_witness.point;
    const positive=await resolve(context.product_id,{...(customStart.selection??{}),[widthKey]:positiveW,[heightKey]:positiveH});
    assertContextStable(context,positive,'CUSTOM_POSITIVE',order.post);assertCustomInputs(context,positive,'CUSTOM_POSITIVE');
    const positiveStatus=status(positive);
    assertCondition(positiveStatus===geo.positive_witness.expected_status,'CUSTOM_TRANSITION_V2_POSITIVE_STATUS_MISMATCH',{context:context.context_index,point:geo.positive_witness.point,expected:geo.positive_witness.expected_status,actual:positiveStatus});
    if(positiveStatus==='REVIEW_REQUIRED'){reviewPositiveCount++;assertCondition(positive.orderReady!==true,'CUSTOM_TRANSITION_V2_REVIEW_ORDER_READY_FORBIDDEN',{context:context.context_index});}
    else if(positiveStatus==='PASS')passPositiveCount++;

    // 4. Formal outside witnesses block; unbounded rules remain explicit N/A.
    let negative=null;
    if(geo.negative_witness){
      const [negativeW,negativeH]=geo.negative_witness.point;
      negative=await resolve(context.product_id,{...(customStart.selection??{}),[widthKey]:negativeW,[heightKey]:negativeH});negativeEvaluationCount++;
      assertContextStable(context,negative,'CUSTOM_NEGATIVE',order.post);
      assertCondition(status(negative)==='BLOCK','CUSTOM_TRANSITION_V2_NEGATIVE_NOT_BLOCKED',{context:context.context_index,point:geo.negative_witness.point,actual:status(negative)});
      assertCondition(negative.orderReady!==true,'CUSTOM_TRANSITION_V2_NEGATIVE_ORDER_READY_FORBIDDEN',{context:context.context_index});
    }else unboundedNegativeNaCount++;

    // 5. Clearing W clears the value and any stale positive dimension decision.
    const clearWInput={...(positive.selection??{})};delete clearWInput[widthKey];
    const clearW=await resolve(context.product_id,clearWInput);
    assertContextStable(context,clearW,'CLEAR_WIDTH',order.post);assertCustomInputs(context,clearW,'CLEAR_WIDTH');
    assertCondition(!has(clearW?.selection?.[widthKey]),'CUSTOM_TRANSITION_V2_WIDTH_CLEAR_FAILED',{context:context.context_index,value:clearW?.selection?.[widthKey]});
    assertCondition(!['PASS','REVIEW_REQUIRED'].includes(status(clearW)),'CUSTOM_TRANSITION_V2_WIDTH_CLEAR_STALE_POSITIVE',{context:context.context_index,status:status(clearW)});

    // 6. Clearing H is symmetric.
    const clearHInput={...(positive.selection??{})};delete clearHInput[heightKey];
    const clearH=await resolve(context.product_id,clearHInput);
    assertContextStable(context,clearH,'CLEAR_HEIGHT',order.post);assertCustomInputs(context,clearH,'CLEAR_HEIGHT');
    assertCondition(!has(clearH?.selection?.[heightKey]),'CUSTOM_TRANSITION_V2_HEIGHT_CLEAR_FAILED',{context:context.context_index,value:clearH?.selection?.[heightKey]});
    assertCondition(!['PASS','REVIEW_REQUIRED'].includes(status(clearH)),'CUSTOM_TRANSITION_V2_HEIGHT_CLEAR_STALE_POSITIVE',{context:context.context_index,status:status(clearH)});

    // 7. CUSTOM -> STANDARD removes W/H; re-enter CUSTOM and replay CUSTOM-only selectors without stale numeric values.
    const toStandard=await resolve(context.product_id,{...(positive.selection??{}),size_mode:'STANDARD'});
    assertCondition(same(toStandard?.selection?.size_mode,'STANDARD'),'CUSTOM_TRANSITION_V2_RETURN_STANDARD_FAILED',{context:context.context_index,selection:toStandard.selection});
    assertNoCustomInputs(context,toStandard,'RETURN_STANDARD');
    let backCustom=await resolve(context.product_id,{...(toStandard.selection??baselineInput),size_mode:'CUSTOM'});
    assertContextStable(context,backCustom,'REENTER_CUSTOM_PRE_POST_SELECTOR',order.post,{includePost:false});
    assertCondition(same(backCustom?.selection?.size_mode,'CUSTOM'),'CUSTOM_TRANSITION_V2_REENTER_CUSTOM_FAILED',{context:context.context_index,selection:backCustom.selection});
    backCustom=await replayPostMode(context,backCustom,order.post,'REENTER_CUSTOM_POST_SELECTOR_REPLAY');
    assertContextStable(context,backCustom,'REENTER_CUSTOM_COMPLETE',order.post);assertCustomInputs(context,backCustom,'REENTER_CUSTOM_COMPLETE');
    assertCondition(!has(backCustom?.selection?.[widthKey])&&!has(backCustom?.selection?.[heightKey]),'CUSTOM_TRANSITION_V2_REENTER_CUSTOM_STALE_VALUES',{context:context.context_index,selection:backCustom.selection});

    contexts.push({context_index:context.context_index,manufacturer:context.manufacturer,series:context.series,product_id:context.product_id,window_id:context.window_id,width_field:widthKey,height_field:heightKey,post_mode_selector_keys:order.post,positive_witness:geo.positive_witness,negative_witness:geo.negative_witness??null,positive_status:positiveStatus,negative_status:negative?status(negative):'NOT_APPLICABLE_UNBOUNDED',clear_width_status:status(clearW),clear_height_status:status(clearH),return_standard_status:status(toStandard),reenter_custom_status:status(backCustom),status:'PASS'});
  }
}catch(error){failure={code:error.code??'CUSTOM_TRANSITION_V2_UNKNOWN_FAILURE',message:error.message,details:error.details??null,completed_context_count:contexts.length,evaluation_count:evaluationCount,resolver_call_count:resolverCalls};}

const report={exact_head_sha:HEAD_SHA,evidence_head_sha:EVIDENCE_HEAD,task_classification:'NON-PRODUCT-MASTER',product_master_mutation:0,model_version:'CUSTOM_TRANSITION_FULL_SELECTOR_CONTEXT_V2_TRACE_ORDERED',selector_context_count:contexts.length,source_rule_count:reach.source_rule_count,geometry_partition_digest:geometry.partition_digest,selector_reachability_digest:reach.evidence_digest,geometry_equivalence_digest:geometry.evidence_digest,evaluation_count:evaluationCount,resolver_call_count:resolverCalls,post_mode_replay_evaluation_count:postModeReplayEvaluationCount,negative_evaluation_count:negativeEvaluationCount,unbounded_negative_not_applicable_count:unboundedNegativeNaCount,positive_status_counts:{PASS:passPositiveCount,REVIEW_REQUIRED:reviewPositiveCount},contexts,status:failure?'FAIL':'PASS',failure,gate_status:{custom_selector_reachability_gate:'PASS',custom_runtime_geometry_equivalence_gate:'PASS',custom_transition_gate:failure?'BLOCKED':'PASS',custom_size_coverage_gate:failure?'BLOCKED_TRANSITION':'PASS',automated_test_gate:failure?'BLOCKED_CUSTOM_TRANSITION':'PASS_CUSTOM_SYMBOLIC_PENDING_BROWSER',full_browser_qa_gate:'NOT_STARTED',app_integration_ready:false,release_input_gate:'BLOCKED'}};
report.evidence_digest=hash({head:HEAD_SHA,evidenceHead:EVIDENCE_HEAD,reach:reach.evidence_digest,geometry:geometry.evidence_digest,contexts,failure});
await mkdir(OUT,{recursive:true});await writeFile(`${OUT}/report.json`,JSON.stringify(report,null,2)+'\n','utf8');
if(failure){console.error(`CUSTOM_TRANSITION_V2_GATE=BLOCKED code=${failure.code} completed=${failure.completed_context_count} evaluations=${failure.evaluation_count}`);console.error(`CUSTOM_TRANSITION_V2_EVIDENCE_DIGEST=${report.evidence_digest}`);process.exitCode=2;}
else{
  assertCondition(contexts.length===137,'CUSTOM_TRANSITION_V2_CONTEXT_COUNT_DRIFT',{count:contexts.length});
  assertCondition(evaluationCount===1093,'CUSTOM_TRANSITION_V2_EVALUATION_COUNT_DRIFT',{evaluationCount});
  assertCondition(postModeReplayEvaluationCount===22,'CUSTOM_TRANSITION_V2_POST_MODE_REPLAY_COUNT_DRIFT',{postModeReplayEvaluationCount});
  assertCondition(negativeEvaluationCount===112&&unboundedNegativeNaCount===25,'CUSTOM_TRANSITION_V2_NEGATIVE_PARTITION_DRIFT',{negativeEvaluationCount,unboundedNegativeNaCount});
  assertCondition(passPositiveCount===26&&reviewPositiveCount===111,'CUSTOM_TRANSITION_V2_POSITIVE_STATUS_DRIFT',{passPositiveCount,reviewPositiveCount});
  console.log(`CUSTOM_TRANSITION_V2_GATE=PASS contexts=${contexts.length} evaluations=${evaluationCount} post_mode_replay=${postModeReplayEvaluationCount} negative=${negativeEvaluationCount} unbounded_negative_na=${unboundedNegativeNaCount} positive_pass=${passPositiveCount} positive_review=${reviewPositiveCount}`);
  console.log(`CUSTOM_TRANSITION_V2_EVIDENCE_DIGEST=${report.evidence_digest}`);
  console.log('CUSTOM_SIZE_COVERAGE_GATE=PASS');console.log('AUTOMATED_TEST_GATE=PASS_CUSTOM_SYMBOLIC_PENDING_BROWSER');console.log('FULL_BROWSER_QA_GATE=NOT_STARTED');console.log('APP_INTEGRATION_READY=false');console.log('RELEASE_INPUT_GATE=BLOCKED');
}
