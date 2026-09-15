import { runtimeAppIntegrationInventory, resolveRuntimeAppProduct } from '../src/catalog/runtime-master/runtime-app-bridge.mjs';

const HEAD_SHA=process.env.HEAD_SHA??null;
const integrations=runtimeAppIntegrationInventory();
const bySeries=(manufacturer,series)=>{
  const row=integrations.find((x)=>x.manufacturer===manufacturer&&x.series===series&&x.selectable!==false);
  if(!row)throw new Error(`INTEGRATION_MISSING ${manufacturer}/${series}`);
  return row.id;
};
const enabled=(field)=>(field?.values??[]).filter((v)=>v.disabled!==true);
const compactChoice=(choice)=>({
  value:choice?.value,
  label:choice?.displayLabel,
  runtime_specification_key:choice?.runtimeValueRow?.specificationKey??null,
  runtime_value:choice?.runtimeValueRow?.value??null,
  specific_spec:choice?.runtimeValueRow?.metadata?.specific_spec??null,
  formal_name:choice?.runtimeValueRow?.metadata?.formalName??null,
  selector:choice?.runtimeValueRow?.selector??null,
});

async function dumpPath(series,windowId,maxSteps=5){
  const productId=bySeries('LIXIL',series);
  let selection={window_type:windowId};
  const trace=[];
  for(let step=0;step<maxSteps;step+=1){
    const result=await resolveRuntimeAppProduct(productId,selection);
    const canonical={...(result.selection??{})};
    trace.push({
      step,
      selection:canonical,
      fields:(result.fields??[]).map((field)=>({
        key:field.key,required:field.required,readOnly:field.readOnly,dataType:field.dataType,
        values:enabled(field).slice(0,30).map(compactChoice),
      })),
    });
    const next=(result.fields??[]).find((f)=>f.required&&!f.readOnly&&f.key!=='window_type'&&f.key!=='size_mode'&&f.key!=='size'&&!canonical[f.key]&&enabled(f).length);
    if(!next)break;
    const choice=enabled(next)[0];
    selection={...canonical,[next.key]:next.dataType==='MULTI_ENUM'?[choice.value]:choice.value};
  }
  return{series,window_id:windowId,trace};
}

const probes=[
  await dumpPath('サーモスⅡ-H','WT-S2H-SHUTTER-HIKI'),
  await dumpPath('サーモスⅡ-H','WT-S2H-KATTEGUCHI-VENT-FS'),
  await dumpPath('サーモスL','WT-SL-SHUTTER-HIKI'),
  await dumpPath('サーモスL','WT-SL-TATE-SUBERI'),
  await dumpPath('サーモスL','WT-SL-MENKOSHI-HIKI'),
];
console.log(JSON.stringify({exact_head_sha:HEAD_SHA,probes},null,2));
console.log(`TARGETED_THERMOS_FIELD_DUMP probes=${probes.length}`);
