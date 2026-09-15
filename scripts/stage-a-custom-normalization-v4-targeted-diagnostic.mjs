import { runtimeAppIntegrationInventory, resolveRuntimeAppProduct } from '../src/catalog/runtime-master/runtime-app-bridge.mjs';

const HEAD_SHA=process.env.HEAD_SHA??null;
const integrations=runtimeAppIntegrationInventory();
const product=(series)=>{
  const row=integrations.find((item)=>item.manufacturer==='YKK AP'&&item.series===series&&item.selectable!==false);
  if(!row)throw new Error(`${series}_INTEGRATION_MISSING`);
  return row.id;
};
const APW430=product('APW430');
const APW431=product('APW431');

async function witness(productId,label,selection,w,h){
  const result=await resolveRuntimeAppProduct(productId,{...selection,size_mode:'CUSTOM',custom_width:w,custom_height:h});
  return{
    label,
    product_id:productId,
    input:{...selection,size_mode:'CUSTOM',custom_width:w,custom_height:h},
    selection:result.selection,
    internal_selection:result.internalSelection??null,
    dimension_result:result.dimensionResult??null,
    validation:result.validation??null,
    order_ready:result.orderReady??null,
  };
}

const rows=[];
// APW430 formal outer-guard probes: one bounded rule, one multi-component rule, one unbounded review rule.
rows.push(await witness(APW430,'APW430_CR001_inside_guard',{window_type:'SWT-YKK-APW430-TATE-GREMON-SINGLE'},600,1000));
rows.push(await witness(APW430,'APW430_CR001_outside_guard',{window_type:'SWT-YKK-APW430-TATE-GREMON-SINGLE'},787,1360));
rows.push(await witness(APW430,'APW430_CR009_inside_component',{window_type:'SWT-YKK-APW430-SUBERI-GREMON-SINGLE'},500,500));
rows.push(await witness(APW430,'APW430_CR009_inside_merged_outer_but_component_gap',{window_type:'SWT-YKK-APW430-SUBERI-GREMON-SINGLE'},1600,1400));
rows.push(await witness(APW430,'APW430_CR016_unbounded_review',{window_type:'SWT-YKK-APW430-HIGH-ENDOP-SINGLE'},5000,5000));

// APW431 residual-context probes. These use exact V4 reachability prefixes and inside/outside points.
const c119={window_type:'W431-001',region_standard:'本州',panel_count:'2枚建',window_configuration:'標準'};
rows.push(await witness(APW431,'APW431_C119_inside_overlap',c119,1500,1800));
rows.push(await witness(APW431,'APW431_C119_outside_all',c119,2800,2600));
const c124={window_type:'W431-003',region_standard:'北海道',panel_count:'片引き',window_configuration:'偏芯タイプ'};
rows.push(await witness(APW431,'APW431_C124_inside',c124,2000,1800));
rows.push(await witness(APW431,'APW431_C124_outside',c124,3100,1800));
const c128={window_type:'W431-004',region_standard:'北海道',panel_count:'単窓',window_configuration:'ドアW060'};
rows.push(await witness(APW431,'APW431_C128_inside',c128,700,1800));
rows.push(await witness(APW431,'APW431_C128_outside',c128,1000,1800));
const c131={window_type:'W431-005',region_standard:'本州',panel_count:'単窓',window_configuration:'ドアW060'};
rows.push(await witness(APW431,'APW431_C131_inside_zairai',c131,700,1520));
rows.push(await witness(APW431,'APW431_C131_overlap_zairai_2x4',c131,700,1600));
rows.push(await witness(APW431,'APW431_C131_outside',c131,1000,1800));
const c134={window_type:'W431-006',region_standard:'本州',panel_count:'単窓',window_configuration:'中桟無/断熱腰パネル共通'};
rows.push(await witness(APW431,'APW431_C134_inside_zairai',c134,700,1520));
rows.push(await witness(APW431,'APW431_C134_overlap_zairai_2x4',c134,700,1600));
rows.push(await witness(APW431,'APW431_C134_outside',c134,1000,1800));

console.log(JSON.stringify({exact_head_sha:HEAD_SHA,rows},null,2));
for(const row of rows)console.log(`TARGETED_APW_GEOMETRY label=${row.label} status=${row.dimension_result?.status??'NONE'} code=${row.dimension_result?.code??'NONE'} rule_ids=${JSON.stringify(row.dimension_result?.matchedRuleIds??row.dimension_result?.candidateRuleIds??[])}`);
console.log(`TARGETED_APW_GEOMETRY_DIAGNOSTIC=PASS witnesses=${rows.length}`);
console.log('APP_INTEGRATION_READY=false');
console.log('RELEASE_INPUT_GATE=BLOCKED');
