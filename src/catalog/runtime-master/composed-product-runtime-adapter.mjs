import {adaptProductModuleRuntimeV1} from './product-module-runtime-adapter.mjs';
import {applyDeclaredSelectionLinks} from './declared-selection-policy.mjs';
import {resolveDeclaredSelectionViews, declaredSelectionErrors, attachDeclaredSalesHandoff} from './declared-selection-views.mjs';

const has=value=>value!==undefined&&value!==null&&value!=='';
const own=(object,key)=>Object.prototype.hasOwnProperty.call(object,key);
function declaredDimensionReview(document){
  const review=document.dimension_review;
  if(!review)return null;
  const definitions=new Map(document.product_module.specificationDefinitions.map(row=>[row.key,row]));
  const valid=review.mode_value==='CUSTOM'
    && definitions.get(review.mode_field)?.dataType==='ENUM'
    && definitions.get(review.width_field)?.dataType==='NUMBER'
    && definitions.get(review.height_field)?.dataType==='NUMBER'
    && review.width_field!==review.height_field
    && typeof review.pending_message==='string'&&review.pending_message.length>0
    && typeof review.review_message==='string'&&review.review_message.length>0
    && Array.isArray(review.evidence_ids)&&review.evidence_ids.length>0;
  if(!valid)throw Object.assign(new Error('DIMENSION_REVIEW_CONTRACT_INVALID'),{code:'DIMENSION_REVIEW_CONTRACT_INVALID'});
  return review;
}
function applyDeclaredDimensionReview(result,review){
  if(!review||result.selection[review.mode_field]!==review.mode_value)return;
  if(result.dimensionResult&&result.dimensionResult.status!=='PENDING')return;
  const fields=[review.width_field,review.height_field];
  const entered=fields.every(key=>has(result.selection[key])&&Number.isFinite(Number(result.selection[key])));
  result.dimensionResult={status:entered?'REVIEW_REQUIRED':'PENDING',
    code:entered?'DECLARED_DIMENSION_REVIEW_REQUIRED':'DECLARED_DIMENSION_INPUT_PENDING',
    message:entered?review.review_message:review.pending_message,
    fields,evidenceIds:review.evidence_ids,matchedRuleIds:[],ruleTypes:[]};
}
export function migrateCandidateSelection(input,migrations=[]){
  const selection={...input};
  for(const migration of migrations){
    const match = migration.match === 'CONTAINS' ? Array.isArray(input?.[migration.source]) && input[migration.source].includes(migration.value) : input?.[migration.source]===migration.value;
    if(!match)continue;
    if(migration.clearValue)selection[migration.source]=selection[migration.source].filter(value=>value!==migration.value);
    else if(migration.clearSource)delete selection[migration.source];
    for(const [key,value] of Object.entries(migration.assign)){
      if(!own(selection,key))selection[key]=value;
      else if(migration.mergeArrays&&Array.isArray(selection[key])&&Array.isArray(value))selection[key]=[...new Set([...selection[key],...value])];
    }
  }
  return selection;
}
export function resolveMigratedCandidateSelection(reader,input,migrations=[]){
  const migrated=migrateCandidateSelection(input,migrations);
  // Only defaults from the existing resolver supply prerequisite context.
  const prepared=reader.uiResolver(migrated).selection;
  return reader.uiResolver({...prepared,...migrated});
}
export async function adaptComposedProductRuntime(document,entry,loadReference){
  const formal=document.schema==='FORMAL_COMPOSED_PRODUCT_MODULE_V1'&&document.formal_adoption===true&&entry.packageType==='FORMAL_COMPOSED_PRODUCT_RUNTIME';
  const candidate=document.schema==='PRODUCT_MODULE_CANDIDATE_V1'&&document.formal_adoption===false;
  if((!formal&&!candidate)||document.source_adoption!==false)throw Object.assign(new Error('CANDIDATE_SCOPE_INVALID'),{code:'CANDIDATE_SCOPE_INVALID'});
  const references=new Map();
  for(const b of document.composition?.bindings??[]){
    if(!b.executable)continue;
    if(!references.has(b.consumer_product_id))references.set(b.consumer_product_id,await loadReference(b.consumer_product_id));
    const reader=references.get(b.consumer_product_id),required=b.bound_files.filter(f=>f.key.endsWith('_runtime')||f.key.endsWith('_schema'));
    if(!required.length)throw Object.assign(new Error('REFERENCE_CRITICAL_BYTES_REQUIRED'),{code:'REFERENCE_CRITICAL_BYTES_REQUIRED'});
    for(const fixed of required){
      const actual=reader.sourcePackageIntegrity?.files?.find(f=>f.fileId===fixed.id);
      if(!actual?.match||actual.actual!==fixed.sha256||actual.bytes!==fixed.bytes)throw Object.assign(new Error('REFERENCE_BYTES_CHANGED'),{code:'REFERENCE_BYTES_CHANGED'});
    }
  }
  const bridge=await import('./runtime-app-bridge.mjs');
  const {applyRuntimeUiCategoryOrder}=await import('./new-construction-sash-runtime-ui-contract.mjs');
  const dimensionReview=declaredDimensionReview(document);
  const primary=adaptProductModuleRuntimeV1({documents:{RUNTIME_JSON_PACKAGE:document}},entry);
  return {...primary,uiResolver:input=>{
    const contract=document.composition,prefix=contract?.prefix;
    const localInput=Object.fromEntries(Object.entries(input??{}).filter(([key])=>!prefix||!key.startsWith(prefix)));
    const result=resolveDeclaredSelectionViews(primary,document,localInput);
    applyDeclaredDimensionReview(result,dimensionReview);
    result.dependencyFields=result.fields.map(field=>({key:field.key,parentFields:document.product_module.specificationDefinitions.find(d=>d.key===field.key)?.parentFields??[]}));
    for(const field of result.fields)field.parentFields=result.dependencyFields.find(d=>d.key===field.key).parentFields;
    const errors=[...(result.validation?.errors??[]),...declaredSelectionErrors(document.product_module,localInput,result.selection)],warnings=[...(result.manualWarnings??[])],missing=[...(result.validation?.missingRequiredFields??[])];
    const transforms={};
    for(const rule of document.linear_transforms??[]){
      const value=result.selection[rule.input];
      if(has(value)&&Number.isFinite(Number(value)))transforms[rule.output]={value:Number(value)+rule.offset,evidenceIds:rule.evidenceIds,ruleId:rule.id};
      const definition=document.product_module.specificationDefinitions.find(d=>d.key===rule.output);
      if(definition?.selectionMode==='DERIVED'){
        delete result.selection[rule.output];
        const field=result.fields.find(f=>f.key===rule.output);
        if(field){field.readOnly=true;field.disabled=true;field.selectionMode='DERIVED';field.emptyLabel='採寸寸法の入力後に表示';if(transforms[rule.output])result.selection[rule.output]=transforms[rule.output].value;}
      }
    }
    for(const rule of document.numeric_constraints??[]){
      const value=result.selection[rule.field];if(!has(value))continue;
      const outside=(typeof rule.min==='number'&&Number(value)<rule.min)||(typeof rule.max==='number'&&Number(value)>rule.max);
      if(!outside)continue;
      if(rule.outside==='BLOCK')errors.push({errorCode:'NATIVE_NUMERIC_BOUNDARY',field:rule.field,ruleId:rule.id,message:'原本の適用範囲外です。'});
      else warnings.push('寸法の補正・スペーサー・取付条件を個別確認してください。');
    }
    if(contract){
      const series=result.selection[contract.series_field],window=result.selection[contract.window_field];
      const binding=contract.bindings.find(r=>r.series_id===series&&r.window_id===window);
      if(has(window)&&!binding)errors.push({errorCode:'REFERENCE_SCOPE_UNBOUND',message:'固定した参照範囲に含まれません。'});
      if(binding&&!binding.executable)errors.push({errorCode:'REFERENCE_ADAPTER_PENDING',message:'参照先の共通Runtime接続が未完了です。自動判定できません。'});
      if(binding?.executable){
        const scopeChanged=has(input?.[prefix+'window_type'])&&input[prefix+'window_type']!==window;
        const childSelection=scopeChanged?{}:Object.fromEntries(Object.entries(input??{}).filter(([key])=>key.startsWith(prefix)).map(([key,value])=>[key.slice(prefix.length),value]));
        childSelection.window_type=window;
        const reference=references.get(binding.consumer_product_id),integration=bridge.getRuntimeAppIntegration(binding.consumer_product_id);
        const child=reference.uiResolver?reference.uiResolver(childSelection):bridge.toRuntimeUiResult(reference.master,reference.resolver(bridge.normalizeRuntimeSelection(reference.master,childSelection)),integration,reference.sourcePackageIntegrity);
        child.fields=applyRuntimeUiCategoryOrder(child.fields,integration);
        child.runtimeMaster??={packageVersion:integration.packageVersion,sourceHash:integration.sourceHash,sourcePackageIntegrity:reference.sourcePackageIntegrity};
        if(child.selection.window_type!==window)errors.push({errorCode:'REFERENCE_WINDOW_NOT_ACTIVE',message:'固定参照先の窓種を解決できません。'});
        else{
          const allowedSpecs=binding.active_specs_at_fixed_revision??[];
          const specValues=new Set(allowedSpecs.map(r=>r.id??r.specific_spec_id??r.solid_spec_id??r));
          const spec=child.selection.specific_spec;
          if(has(spec)&&specValues.size&&!specValues.has(spec))errors.push({errorCode:'REFERENCE_SPEC_NOT_BOUND',message:'固定参照先の固有仕様範囲外です。'});
          for(const [key,value] of Object.entries(child.selection))result.selection[prefix+key]=value;
          for(const field of child.fields){
            if(field.key==='window_type')continue;
            const values=field.key==='specific_spec'&&specValues.size?field.values.filter(v=>specValues.has(v.value)):field.values;
            const key=prefix+field.key,parents=[contract.series_field,contract.window_field,...(field.parentFields??[]).map(k=>prefix+k)];
            result.fields.push({...field,key,displayLabel:'新設サッシ：'+field.displayLabel,values,parentFields:parents});
            result.dependencyFields.push({key,parentFields:parents});
          }
          errors.push(...child.validation.errors.map(e=>({...e,field:e.field?prefix+e.field:undefined})));
          missing.push(...(child.validation.missingRequiredFields??[]).map(key=>prefix+key));
          warnings.push(...(child.manualWarnings??[]));
          result.referenceResult={productId:binding.consumer_product_id,windowId:window,runtimeIdentity:child.runtimeMaster,dimensionResult:child.dimensionResult,validation:child.validation};
        }
      }
    }
    result.manualWarnings=warnings;
    applyDeclaredSelectionLinks(result, document.product_module);
    result.clearedFields=Object.keys(input??{}).filter(key=>!own(result.selection,key));
    result.manualWarnings=[...new Set(warnings)];result.derivedMeasurements=transforms;
    result.validation.errors=errors;
    result.validation.missingRequiredFields=[...new Set(missing)];
    result.validation.status=errors.length||result.dimensionResult?.status==='BLOCK'?'INVALID':missing.length?'INCOMPLETE':'MANUAL_CHECK';
    result.orderReady=false;result.pricing={price:null,bom:null,set_code:null};
    attachDeclaredSalesHandoff(result,document);
    result.runtimeMaster={masterVersion:entry.masterVersion,packageVersion:entry.packageVersion,schemaVersion:entry.schemaVersion,adapterType:entry.adapterType,sourceHash:entry.sha256,canonicalRuntimeReference:entry.canonicalRuntimeReference,candidateOnly:!formal,candidateRuntimeReference:entry.candidateRuntimeReference,sourcePackageIntegrity:{expected:entry.sha256,actual:entry.sha256,match:true}};
    result.runtimeCapabilities={candidateOnly:!formal,automaticManufacturing:false,automaticPricing:false,sourceAdoption:false,formalAdoption:formal};
    return result;
  }};
}
