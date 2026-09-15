import { runtimeAppIntegrationInventory, resolveRuntimeAppProduct } from '../src/catalog/runtime-master/runtime-app-bridge.mjs';

const HEAD_SHA=process.env.HEAD_SHA??null;
const integrations=runtimeAppIntegrationInventory();
const productId=integrations.find((row)=>row.manufacturer==='YKK AP'&&row.series==='APW431'&&row.selectable!==false)?.id;
if(!productId)throw new Error('APW431_INTEGRATION_MISSING');
const enabled=(field)=>(field?.values??[]).filter((value)=>value.disabled!==true);
const same=(a,b)=>String(a)===String(b);

async function route(windowId,region,panel,preferredConfiguration=null){
  let selection={window_type:windowId};
  const trace=[];
  for(let step=0;step<12;step+=1){
    const result=await resolveRuntimeAppProduct(productId,selection);
    const canonical={...(result.selection??{})};
    const fields=new Map((result.fields??[]).map((field)=>[field.key,field]));
    trace.push({step,selection:canonical,fields:(result.fields??[]).map((field)=>({key:field.key,required:field.required,readOnly:field.readOnly,values:enabled(field).map((choice)=>choice.value)}))});
    const sizeMode=fields.get('size_mode');
    if(sizeMode){
      const sizeModes=enabled(sizeMode).map((choice)=>choice.value);
      return{window_id:windowId,region,panel,preferred_configuration:preferredConfiguration,selection:canonical,size_modes:sizeModes,trace};
    }
    const forced=[
      ['region_standard',region],
      ['panel_count',panel],
      ['window_configuration',preferredConfiguration],
    ].find(([key,value])=>value!==null&&value!==undefined&&fields.has(key)&&!canonical[key]&&enabled(fields.get(key)).some((choice)=>same(choice.value,value)));
    if(forced){selection={...canonical,[forced[0]]:forced[1]};continue;}
    const next=(result.fields??[]).find((field)=>field.required&&!field.readOnly&&field.key!=='window_type'&&!canonical[field.key]&&enabled(field).length);
    if(!next)throw new Error(`APW431_ROUTE_STALLED ${windowId}/${region}/${panel}`);
    selection={...canonical,[next.key]:enabled(next)[0].value};
  }
  throw new Error(`APW431_ROUTE_STEP_LIMIT ${windowId}/${region}/${panel}`);
}

const routes=[];
for(const panel of ['単窓','2連窓','3連窓'])routes.push(await route('W431-004','北海道',panel));
for(const panel of ['単窓','2連窓','3連窓'])routes.push(await route('W431-005','本州',panel));
routes.push(await route('W431-006','本州','単窓'));
routes.push(await route('W431-006','北海道','単窓'));

const missingCustom=routes.filter((row)=>!row.size_modes.includes('CUSTOM'));
if(missingCustom.length)throw new Error(`APW431_CUSTOM_VISIBILITY_MISSING ${JSON.stringify(missingCustom.map((row)=>[row.window_id,row.region,row.panel,row.selection.window_configuration]))}`);

async function verifyReview(row,width,height){
  const result=await resolveRuntimeAppProduct(productId,{...row.selection,size_mode:'CUSTOM',custom_width:width,custom_height:height});
  const status=result.dimensionResult?.status??null;
  if(status==='PASS')throw new Error(`APW431_CUSTOM_ORDER_READY_PASS_FORBIDDEN ${row.window_id}`);
  if(result.orderReady!==false)throw new Error(`APW431_CUSTOM_ORDER_READY_MUST_BE_FALSE ${row.window_id}`);
  if(!['REVIEW_REQUIRED','BLOCK','BLOCKED'].includes(String(status)))throw new Error(`APW431_CUSTOM_STATUS_UNEXPECTED ${row.window_id}/${status}`);
  return{window_id:row.window_id,selection:result.selection,dimension_result:result.dimensionResult,validation:result.validation,order_ready:result.orderReady};
}

const witnesses=[
  await verifyReview(routes.find((row)=>row.window_id==='W431-004'&&row.panel==='単窓'),800,1200),
  await verifyReview(routes.find((row)=>row.window_id==='W431-005'&&row.panel==='単窓'),800,1200),
  await verifyReview(routes.find((row)=>row.window_id==='W431-006'&&row.region==='本州'),700,1800),
];

const w431003Offset=await route('W431-003','本州','単窓','偏芯タイプ');
const w431003Equal=await route('W431-003','本州','単窓','均等タイプ');
if(!w431003Offset.size_modes.includes('CUSTOM')||!w431003Equal.size_modes.includes('CUSTOM'))throw new Error('APW431_W431003_TYPE_SEMANTICS_REGRESSION');

console.log(JSON.stringify({exact_head_sha:HEAD_SHA,routes,witnesses,w431003:[w431003Offset,w431003Equal]},null,2));
console.log(`APW431_TARGETED_CUSTOM_VISIBILITY_GATE=PASS routes=${routes.length}`);
console.log(`APW431_TARGETED_REVIEW_REQUIRED_GATE=PASS witnesses=${witnesses.length}`);
console.log('APW431_TYPE_SEMANTICS_REGRESSION_GATE=PASS');
console.log('APP_INTEGRATION_READY=false');
console.log('RELEASE_INPUT_GATE=BLOCKED');
