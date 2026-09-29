import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const sourcePath=new URL('./stage-a-custom-transition-proof-v2.mjs',import.meta.url);
let source=await readFile(sourcePath,'utf8');

const oldBaseline=`    assertCondition(hasChoice(baseline,'size_mode','STANDARD'),'CUSTOM_TRANSITION_V2_STANDARD_MODE_NOT_ADVERTISED',{context:context.context_index,selection:baseline.selection});
    assertCondition(hasChoice(baseline,'size_mode','CUSTOM'),'CUSTOM_TRANSITION_V2_CUSTOM_MODE_NOT_ADVERTISED',{context:context.context_index,selection:baseline.selection});`;
const newBaseline=`    const standardAdvertised=hasChoice(baseline,'size_mode','STANDARD');
    const customAdvertised=hasChoice(baseline,'size_mode','CUSTOM');
    assertCondition(customAdvertised,'CUSTOM_TRANSITION_V3_CUSTOM_MODE_NOT_ADVERTISED',{context:context.context_index,selection:baseline.selection});
    if(!standardAdvertised)assertCondition(context.series==='EW'&&[62,63,64,65,66,67].includes(context.context_index),'CUSTOM_TRANSITION_V3_UNEXPECTED_CUSTOM_ONLY_TOPOLOGY',{context:context.context_index,series:context.series,selection:baseline.selection});`;
if(!source.includes(oldBaseline))throw new Error('CUSTOM_TRANSITION_V3_BASELINE_PATCH_TARGET_MISSING');
source=source.replace(oldBaseline,newBaseline);

const oldStandardBlock=`    const toStandard=await resolve(context.product_id,{...(positive.selection??{}),size_mode:'STANDARD'});
    assertCondition(same(toStandard?.selection?.size_mode,'STANDARD'),'CUSTOM_TRANSITION_V2_RETURN_STANDARD_FAILED',{context:context.context_index,selection:toStandard.selection});
    assertNoCustomInputs(context,toStandard,'RETURN_STANDARD');
    let backCustom=await resolve(context.product_id,{...(toStandard.selection??baselineInput),size_mode:'CUSTOM'});
    assertContextStable(context,backCustom,'REENTER_CUSTOM_PRE_POST_SELECTOR',order.post,{includePost:false});
    assertCondition(same(backCustom?.selection?.size_mode,'CUSTOM'),'CUSTOM_TRANSITION_V2_REENTER_CUSTOM_FAILED',{context:context.context_index,selection:backCustom.selection});
    backCustom=await replayPostMode(context,backCustom,order.post,'REENTER_CUSTOM_POST_SELECTOR_REPLAY');
    assertContextStable(context,backCustom,'REENTER_CUSTOM_COMPLETE',order.post);assertCustomInputs(context,backCustom,'REENTER_CUSTOM_COMPLETE');
    assertCondition(!has(backCustom?.selection?.[widthKey])&&!has(backCustom?.selection?.[heightKey]),'CUSTOM_TRANSITION_V2_REENTER_CUSTOM_STALE_VALUES',{context:context.context_index,selection:backCustom.selection});`;
const newStandardBlock=`    let toStandard=null,backCustom=null,standardTransitionStatus='NOT_APPLICABLE_CUSTOM_ONLY_RUNTIME';
    if(standardAdvertised){
      toStandard=await resolve(context.product_id,{...(positive.selection??{}),size_mode:'STANDARD'});
      assertCondition(same(toStandard?.selection?.size_mode,'STANDARD'),'CUSTOM_TRANSITION_V3_RETURN_STANDARD_FAILED',{context:context.context_index,selection:toStandard.selection});
      assertNoCustomInputs(context,toStandard,'RETURN_STANDARD');
      backCustom=await resolve(context.product_id,{...(toStandard.selection??baselineInput),size_mode:'CUSTOM'});
      assertContextStable(context,backCustom,'REENTER_CUSTOM_PRE_POST_SELECTOR',order.post,{includePost:false});
      assertCondition(same(backCustom?.selection?.size_mode,'CUSTOM'),'CUSTOM_TRANSITION_V3_REENTER_CUSTOM_FAILED',{context:context.context_index,selection:backCustom.selection});
      backCustom=await replayPostMode(context,backCustom,order.post,'REENTER_CUSTOM_POST_SELECTOR_REPLAY');
      assertContextStable(context,backCustom,'REENTER_CUSTOM_COMPLETE',order.post);assertCustomInputs(context,backCustom,'REENTER_CUSTOM_COMPLETE');
      assertCondition(!has(backCustom?.selection?.[widthKey])&&!has(backCustom?.selection?.[heightKey]),'CUSTOM_TRANSITION_V3_REENTER_CUSTOM_STALE_VALUES',{context:context.context_index,selection:backCustom.selection});
      standardTransitionStatus='PASS';
    }`;
if(!source.includes(oldStandardBlock))throw new Error('CUSTOM_TRANSITION_V3_STANDARD_BLOCK_PATCH_TARGET_MISSING');
source=source.replace(oldStandardBlock,newStandardBlock);

const oldPush=`    contexts.push({context_index:context.context_index,manufacturer:context.manufacturer,series:context.series,product_id:context.product_id,window_id:context.window_id,width_field:widthKey,height_field:heightKey,post_mode_selector_keys:order.post,positive_witness:geo.positive_witness,negative_witness:geo.negative_witness??null,positive_status:positiveStatus,negative_status:negative?status(negative):'NOT_APPLICABLE_UNBOUNDED',clear_width_status:status(clearW),clear_height_status:status(clearH),return_standard_status:status(toStandard),reenter_custom_status:status(backCustom),status:'PASS'});`;
const newPush=`    contexts.push({context_index:context.context_index,manufacturer:context.manufacturer,series:context.series,product_id:context.product_id,window_id:context.window_id,width_field:widthKey,height_field:heightKey,mode_topology:standardAdvertised?'STANDARD_AND_CUSTOM':'CUSTOM_ONLY',standard_transition_status:standardTransitionStatus,post_mode_selector_keys:order.post,positive_witness:geo.positive_witness,negative_witness:geo.negative_witness??null,positive_status:positiveStatus,negative_status:negative?status(negative):'NOT_APPLICABLE_UNBOUNDED',clear_width_status:status(clearW),clear_height_status:status(clearH),return_standard_status:toStandard?status(toStandard):'NOT_APPLICABLE_CUSTOM_ONLY_RUNTIME',reenter_custom_status:backCustom?status(backCustom):'NOT_APPLICABLE_CUSTOM_ONLY_RUNTIME',status:'PASS'});`;
if(!source.includes(oldPush))throw new Error('CUSTOM_TRANSITION_V3_CONTEXT_PATCH_TARGET_MISSING');
source=source.replace(oldPush,newPush);

source=source.replace("model_version:'CUSTOM_TRANSITION_FULL_SELECTOR_CONTEXT_V2_TRACE_ORDERED'","model_version:'CUSTOM_TRANSITION_FULL_SELECTOR_CONTEXT_V3_RUNTIME_MODE_TOPOLOGY'");
source=source.replace("const report={exact_head_sha:HEAD_SHA",`const dualModeContextCount=contexts.filter((row)=>row.mode_topology==='STANDARD_AND_CUSTOM').length;
const customOnlyContextCount=contexts.filter((row)=>row.mode_topology==='CUSTOM_ONLY').length;
const report={dual_mode_context_count:dualModeContextCount,custom_only_context_count:customOnlyContextCount,exact_head_sha:HEAD_SHA`);
source=source.replace("assertCondition(evaluationCount===1093,'CUSTOM_TRANSITION_V2_EVALUATION_COUNT_DRIFT',{evaluationCount});","assertCondition(evaluationCount===1081,'CUSTOM_TRANSITION_V3_EVALUATION_COUNT_DRIFT',{evaluationCount});\n  assertCondition(dualModeContextCount===131&&customOnlyContextCount===6,'CUSTOM_TRANSITION_V3_MODE_TOPOLOGY_DRIFT',{dualModeContextCount,customOnlyContextCount});");
source=source.replaceAll('CUSTOM_TRANSITION_V2_','CUSTOM_TRANSITION_V3_');
source=source.replaceAll('CUSTOM_TRANSITION_FULL_SELECTOR_CONTEXT_V2_TRACE_ORDERED','CUSTOM_TRANSITION_FULL_SELECTOR_CONTEXT_V3_RUNTIME_MODE_TOPOLOGY');
source=source.replaceAll('stage-a-custom-transition-proof-v2','stage-a-custom-transition-proof-v3');
source=source.replaceAll('CUSTOM_TRANSITION_V2_GATE','CUSTOM_TRANSITION_V3_GATE');
source=source.replaceAll('CUSTOM_TRANSITION_V2_EVIDENCE_DIGEST','CUSTOM_TRANSITION_V3_EVIDENCE_DIGEST');
source=source.replace('contexts=${contexts.length} evaluations=${evaluationCount} post_mode_replay=${postModeReplayEvaluationCount}', 'contexts=${contexts.length} dual_mode=${dualModeContextCount} custom_only=${customOnlyContextCount} evaluations=${evaluationCount} post_mode_replay=${postModeReplayEvaluationCount}');

const generated=new URL('./.stage-a-custom-transition-proof-v3-runner.mjs',import.meta.url);
await writeFile(generated,source,'utf8');
await import(`${pathToFileURL(generated.pathname).href}?head=${encodeURIComponent(process.env.HEAD_SHA??'')}`);
