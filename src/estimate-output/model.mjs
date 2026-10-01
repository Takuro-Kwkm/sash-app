export const EstimateOutputState=Object.freeze({
  COMPLETE:'COMPLETE',
  INCOMPLETE:'INCOMPLETE',
  NEEDS_CONFIRMATION:'NEEDS_CONFIRMATION',
  INVALID:'INVALID',
});

const text=(value)=>String(value??'').trim();
const nullable=(value)=>text(value)||null;
const clone=(value)=>globalThis.structuredClone?globalThis.structuredClone(value):JSON.parse(JSON.stringify(value));

const TYPE_KEYS=new Set(['window_type','opening_type','door_type']);
const SIZE_KEYS=new Set(['size','custom_width','width','custom_height','height','size_w','size_h','order_width','order_height']);
const OMIT_MAJOR_KEYS=new Set([...TYPE_KEYS,...SIZE_KEYS]);

function summaryRows(snapshot){
  return Array.isArray(snapshot?.display_summary)
    ? snapshot.display_summary.filter((row)=>row&&row.key&&row.value!==undefined&&row.value!==null&&text(row.value))
    : [];
}

function summaryValue(snapshot,keys){
  const wanted=new Set(keys);
  return summaryRows(snapshot).find((row)=>wanted.has(row.key))?.value??null;
}

function majorSpecificationText(snapshot){
  const rows=summaryRows(snapshot);
  return rows
    .filter((row)=>!OMIT_MAJOR_KEYS.has(row.key))
    .map((row)=>`${row.label??row.key}: ${row.value}`)
    .join(' / ')||null;
}

function sizeText(snapshot){
  const size=summaryValue(snapshot,['size']);
  if(size)return text(size);
  const width=summaryValue(snapshot,['custom_width','width','size_w','order_width'])??snapshot?.configuration?.custom_width??snapshot?.configuration?.width??snapshot?.configuration?.size_w??snapshot?.configuration?.order_width??null;
  const height=summaryValue(snapshot,['custom_height','height','size_h','order_height'])??snapshot?.configuration?.custom_height??snapshot?.configuration?.height??snapshot?.configuration?.size_h??snapshot?.configuration?.order_height??null;
  if(width!==null&&height!==null)return `${text(width)} × ${text(height)}`;
  if(width!==null)return text(width);
  return null;
}

function extractPrice(snapshot){
  const candidates=[
    snapshot?.price,
    snapshot?.pricing?.price,
    snapshot?.pricing?.total,
    snapshot?.pricing?.amount,
    snapshot?.estimate_price,
  ];
  const value=candidates.find((candidate)=>candidate!==null&&candidate!==undefined&&candidate!=='');
  if(value===undefined)return null;
  const number=Number(value);
  return Number.isFinite(number)?number:null;
}

function classifyRow(opening,snapshot,price){
  const issues=[];
  if(!snapshot){
    issues.push({code:'PRODUCT_SNAPSHOT_MISSING',message:'商品仕様Snapshotが保存されていません。'});
    return {state:EstimateOutputState.INCOMPLETE,issues};
  }
  issues.push(...(snapshot.confirmation_requests??[]));
  if(snapshot.sales_request_handoff?.glass_structure==='MANUFACTURER_ESTIMATE_CONFIRMATION')issues.push({code:'GLASS_STRUCTURE_MANUFACTURER_ESTIMATE',message:'ガラスの厚みと最終仕様はメーカー見積で確認してください。'});
  if(snapshot.validation_state==='INVALID'){
    issues.push({code:'PRODUCT_SNAPSHOT_INVALID',message:'保存SnapshotがINVALIDです。'});
    return {state:EstimateOutputState.INVALID,issues};
  }
  if(opening?.status!=='COMPLETE'){
    issues.push({code:'OPENING_INCOMPLETE',message:'開口部入力が未完了です。'});
    return {state:EstimateOutputState.INCOMPLETE,issues};
  }
  if(snapshot.sales_request_state==='READY_FOR_MANUFACTURER_ESTIMATE'){
    return {state:EstimateOutputState.NEEDS_CONFIRMATION,issues};
  }
  if(snapshot.validation_state&&snapshot.validation_state!=='VALID'){
    issues.push({code:'SNAPSHOT_REVALIDATION_REQUIRED',message:'商品仕様Snapshotの再確認が必要です。'});
    return {state:EstimateOutputState.NEEDS_CONFIRMATION,issues};
  }
  if(snapshot.confirmation_requests?.length)return {state:EstimateOutputState.NEEDS_CONFIRMATION,issues};
  if(price===null){
    issues.push({code:'PRICE_NOT_STORED',message:'金額は保存Snapshotに保持されていません。0円には置換せず要確認として出力します。'});
    return {state:EstimateOutputState.NEEDS_CONFIRMATION,issues};
  }
  return {state:EstimateOutputState.COMPLETE,issues};
}

function outputAddress(project){
  const canonical=nullable(project?.address);
  if(canonical)return canonical;
  const parts=[project?.postal_code?`〒${text(project.postal_code)}`:null,project?.prefecture,project?.city,project?.street,project?.building].map(nullable).filter(Boolean);
  return parts.join(' ')||null;
}

export function createEstimateOutputModel({project,estimate,openings,generatedAt}={}){
  if(!project?.project_id)throw new TypeError('project is required');
  if(!estimate?.estimate_id)throw new TypeError('estimate is required');
  if(estimate.project_id&&estimate.project_id!==project.project_id)throw new TypeError('estimate does not belong to project');
  const source=Array.isArray(openings)?openings:[];
  const rows=source.map((opening,index)=>{
    const snapshot=opening?.product_configuration_snapshot??null;
    const price=extractPrice(snapshot);
    const classification=classifyRow(opening,snapshot,price);
    const audit=snapshot?{
      product_id:nullable(snapshot.product_id),
      source_mode:nullable(snapshot.source_mode),
      package_version:nullable(snapshot.package_version),
      runtime_manifest_identity:nullable(snapshot.runtime_manifest_identity),
      runtime_integrity_hash:nullable(snapshot.runtime_integrity_hash),
      validation_state:nullable(snapshot.validation_state),
      captured_at:nullable(snapshot.captured_at),
    }:null;
    return {
      opening_id:opening?.opening_id??`row-${index+1}`,
      opening_no:Number(opening?.opening_no??index+1),
      floor:nullable(opening?.floor),
      room_name:nullable(opening?.room_name),
      location:nullable(opening?.location),
      memo:nullable(opening?.memo),
      manufacturer:nullable(snapshot?.manufacturer),
      series:nullable(snapshot?.series),
      product_variant:nullable(summaryValue(snapshot,['product_variant'])??snapshot?.configuration?.product_variant),
      opening_type:nullable(summaryValue(snapshot,['window_type','opening_type','door_type'])),
      major_specifications:majorSpecificationText(snapshot),
      size:sizeText(snapshot),
      request_quantity:Number(snapshot?.configuration?.quantity??snapshot?.sales_request_handoff?.quantity??1),
      price,
      state:classification.state,
      issues:classification.issues,
      audit,
      display_summary:clone(summaryRows(snapshot)),
      configuration:snapshot?.configuration?clone(snapshot.configuration):null,
    };
  });

  const counts={
    total:rows.length,
    complete:rows.filter((row)=>row.state===EstimateOutputState.COMPLETE).length,
    incomplete:rows.filter((row)=>row.state===EstimateOutputState.INCOMPLETE).length,
    needs_confirmation:rows.filter((row)=>row.state===EstimateOutputState.NEEDS_CONFIRMATION).length,
    invalid:rows.filter((row)=>row.state===EstimateOutputState.INVALID).length,
  };
  let state=EstimateOutputState.COMPLETE;
  if(!rows.length||counts.incomplete)state=EstimateOutputState.INCOMPLETE;
  if(counts.needs_confirmation)state=EstimateOutputState.NEEDS_CONFIRMATION;
  if(counts.invalid)state=EstimateOutputState.INVALID;

  return {
    schema_version:'1.0',
    generated_at:generatedAt??new Date().toISOString(),
    document_type:'PRODUCT_SPEC_ESTIMATE_REQUEST',
    state,
    counts,
    project:{
      project_id:project.project_id,
      project_name:nullable(project.project_name),
      request_company:nullable(project.request_company),
      request_company_contact:nullable(project.request_company_contact),
      sales_person:nullable(project.sales_person),
      customer_name:nullable(project.customer_name),
      address:outputAddress(project),
    },
    estimate:{
      estimate_id:estimate.estimate_id,
      estimate_no:Number(estimate.estimate_no??1),
      revision_no:Number(estimate.revision_no??0),
      estimate_title:nullable(estimate.estimate_title),
      status:nullable(estimate.status),
      requested_at:estimate.requested_at??null,
      due_date:estimate.due_date??null,
    },
    rows,
  };
}

export function outputStateLabel(state){
  return ({
    COMPLETE:'完了',
    INCOMPLETE:'未入力',
    NEEDS_CONFIRMATION:'要確認',
    INVALID:'無効',
  })[state]??state;
}

export function estimateOutputFileStem(model){
  const project=text(model?.project?.project_name||'案件').replace(/[\\/:*?"<>|]/g,'_');
  const estimate=Number(model?.estimate?.estimate_no??1);
  const revision=Number(model?.estimate?.revision_no??0);
  return `${project}_見積${estimate}_R${revision}`;
}
