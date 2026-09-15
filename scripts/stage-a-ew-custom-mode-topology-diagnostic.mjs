import { readFile } from 'node:fs/promises';
import { resolveRuntimeAppProduct } from '../src/catalog/runtime-master/runtime-app-bridge.mjs';
const REACH=process.env.STAGE_A_CUSTOM_REACHABILITY_INPUT??'artifacts/evidence/custom-v5/stage-a-custom-selector-reachability/report.json';
const reach=JSON.parse(await readFile(REACH,'utf8'));
const rows=[];
for(const context of (reach.contexts??[]).filter((row)=>row.series==='EW')){
  const input={...(context.selection_prefix??{})};
  delete input.size_mode;delete input[context.custom_width_field];delete input[context.custom_height_field];delete input.size;
  const result=await resolveRuntimeAppProduct(context.product_id,input);
  const mode=result.fields?.find((field)=>field.key==='size_mode');
  const modes=(mode?.values??[]).filter((choice)=>choice.disabled!==true).map((choice)=>choice.value);
  rows.push({context_index:context.context_index,window_id:context.window_id,window_spec:input.window_spec,modes,selection:result.selection});
}
const customOnly=rows.filter((row)=>row.modes.length===1&&row.modes[0]==='CUSTOM');
if(rows.length!==6)throw new Error(`EW_CUSTOM_TOPOLOGY_CONTEXT_DRIFT ${rows.length}`);
if(customOnly.length!==6)throw new Error(`EW_CUSTOM_TOPOLOGY_NOT_CUSTOM_ONLY ${JSON.stringify(rows)}`);
console.log(JSON.stringify({exact_head_sha:process.env.HEAD_SHA??null,rows},null,2));
console.log('EW_CUSTOM_MODE_TOPOLOGY_GATE=PASS contexts=6 custom_only=6');
console.log('EW_STANDARD_TRANSITION_OBLIGATION=NOT_APPLICABLE_FOR_THESE_FORMAL_CUSTOM_CONTEXTS');
