const has=(value)=>value!==undefined&&value!==null&&value!=='';
const same=(a,b)=>Object.is(a,b)||String(a)===String(b);
const selectorOf=(rule)=>rule?.selector_json??rule?.selector??{};
const geometryOf=(rule)=>rule?.geometry_rule_json??rule?.geometryRule??{};
const windowOf=(rule)=>{
  const selector=selectorOf(rule);
  if(has(selector.window_type))return selector.window_type;
  const node=rule?.product_node??rule?.productNode??rule?.windowId;
  return has(node)?String(node).split('::')[0]:null;
};
const uiSelectorKey=(rawKey)=>rawKey==='variant'?'configuration_variant':rawKey;
const rawSelectorValue=(rawKey,value)=>{
  if(rawKey==='panel_count'&&value==='NULL(HKK)')return null;
  if(rawKey==='panel_count'&&/^\d+$/.test(String(value??'')))return Number(value);
  return value;
};
function appendError(state,error){
  state.errors??=[];
  const key=JSON.stringify([error.code,error.field,error.value,error.message]);
  if(!(state.errors??[]).some((row)=>JSON.stringify([row.code,row.field,row.value,row.message])===key))state.errors.push(error);
}
function recompute(state){
  if((state.errors??[]).length){state.status='INVALID';state.order_ready=false;}
  return state;
}
function selectorDimensions(model){
  return (model?.selectorModel?.dimensions??[]).map((row)=>typeof row==='string'?row:row?.key).filter(Boolean);
}
function exactSelectorCombo(model,selection){
  const keys=selectorDimensions(model);
  if(!keys.length)return null;
  const raw={};
  for(const key of keys){
    const uiKey=uiSelectorKey(key);
    if(!has(selection?.[uiKey]))return null;
    raw[key]=rawSelectorValue(key,selection[uiKey]);
  }
  return (model.selectorCombos??[]).find((row)=>keys.every((key)=>{
    const expected=raw[key],actual=row?.[key];
    if(expected===null||actual===null)return expected===actual;
    return same(expected,actual);
  }))??null;
}
function rectBounds(value){
  if(Array.isArray(value)&&value.length>=4)return{minW:Number(value[0]),maxW:Number(value[1]),minH:Number(value[2]),maxH:Number(value[3])};
  if(Array.isArray(value?.bounds)&&value.bounds.length>=4)return rectBounds(value.bounds);
  const source=value?.bounds??value;
  if(typeof source==='string'){
    const w=source.match(/(-?\d+(?:\.\d+)?)\s*<=?\s*W\s*<=?\s*(-?\d+(?:\.\d+)?)/i);
    const h=source.match(/(-?\d+(?:\.\d+)?)\s*<=?\s*H\s*<=?\s*(-?\d+(?:\.\d+)?)/i);
    if(w&&h)return{minW:Number(w[1]),maxW:Number(w[2]),minH:Number(h[1]),maxH:Number(h[2])};
  }
  if(source&&typeof source==='object'){
    const minW=Number(source.W_min??source.minW??source.w_min),maxW=Number(source.W_max??source.maxW??source.w_max),minH=Number(source.H_min??source.minH??source.h_min),maxH=Number(source.H_max??source.maxH??source.h_max);
    if([minW,maxW,minH,maxH].every(Number.isFinite))return{minW,maxW,minH,maxH};
  }
  return null;
}
function pointInPolygon(points,w,h){
  if(!Array.isArray(points)||points.length<3)return null;
  let inside=false;
  for(let i=0,j=points.length-1;i<points.length;j=i++){
    const [xi,yi]=points[i].map(Number),[xj,yj]=points[j].map(Number);
    if(![xi,yi,xj,yj].every(Number.isFinite))return null;
    const cross=(w-xi)*(yj-yi)-(h-yi)*(xj-xi);
    if(Math.abs(cross)<=1e-7&&w>=Math.min(xi,xj)&&w<=Math.max(xi,xj)&&h>=Math.min(yi,yj)&&h<=Math.max(yi,yj))return true;
    if(((yi>h)!==(yj>h))&&(w<(xj-xi)*(h-yi)/(yj-yi)+xi))inside=!inside;
  }
  return inside;
}
function evaluateGeometry(geometry,w,h){
  if(!geometry||typeof geometry!=='object')return null;
  const type=geometry.type??geometry.geometry_type;
  if(type==='AUTO_RECT'){
    const b=rectBounds(geometry); if(!b)return null;
    return w>=b.minW&&w<=b.maxW&&h>=b.minH&&h<=b.maxH;
  }
  if(type==='AUTO_POLYGON')return pointInPolygon(geometry.points,w,h);
  return null;
}
function contextFor(shutterEntry,combo){
  const contexts=shutterEntry?.contexts??shutterEntry;
  if(!contexts||typeof contexts!=='object')return null;
  const opening=combo?.opening_class,sill=combo?.sill;
  const candidates=[opening&&sill?`${opening}_${sill}`:null,opening==='TERRACE'&&sill==='L40'?'TERRACE_L40':null,opening].filter(Boolean);
  for(const key of candidates)if(contexts[key]!==undefined)return contexts[key];
  return null;
}
function compositeRules(model,selection){
  return (model.document?.working_extensions?.custom_dimension_rules?.rules??[]).filter((rule)=>same(windowOf(rule),selection.window_type)&&geometryOf(rule)?.type==='COMPOSITE_INTERSECTION');
}
function evaluateComposite(model,selection,rule){
  const w=Number(selection.custom_w),h=Number(selection.custom_h);
  if(!Number.isFinite(w)||!Number.isFinite(h))return{ok:null,code:'CUSTOM_COMPOSITE_RUNTIME_UNRESOLVED',message:'Formal composite geometry requires numeric W/H.'};
  const combo=exactSelectorCombo(model,selection);
  if(!combo)return{ok:null,code:'MISSING_SELECTOR',message:'Formal composite geometry requires an exact declared selector tuple.'};
  const rules=model.document?.working_extensions?.custom_dimension_rules?.rules??[];
  const baseRule=rules.find((candidate)=>same(selectorOf(candidate)?.selector_id,combo.selector_id)&&['AUTO_RECT','AUTO_POLYGON'].includes(geometryOf(candidate)?.type));
  if(!baseRule)return{ok:null,code:'CUSTOM_COMPOSITE_RUNTIME_UNRESOLVED',message:'Formal composite geometry base selector rule is missing.'};
  const base=evaluateGeometry(geometryOf(baseRule),w,h);
  if(base===null)return{ok:null,code:'CUSTOM_COMPOSITE_RUNTIME_UNRESOLVED',message:'Formal composite base geometry type is unsupported.'};
  const composite=geometryOf(rule);
  const selector=selectorOf(rule);
  const spec=selection.window_spec;
  const allowedSpecs=Array.isArray(selector.shutter_specs)?selector.shutter_specs:[];
  if(!has(spec)||!allowedSpecs.some((value)=>same(value,spec)))return{ok:null,code:'CUSTOM_COMPOSITE_RUNTIME_UNRESOLVED',message:'Formal composite geometry requires a declared shutter specification.'};
  const extension=model.document?.working_extensions?.shutter_intersection_model??{};
  const shutterGeometry=composite.shutter_geometry??extension.geometry??extension.intersections??{};
  const shutterEntry=shutterGeometry?.[spec]??(Array.isArray(shutterGeometry)?shutterGeometry.find((row)=>same(row?.spec_id??row?.id,spec)):null);
  if(!shutterEntry)return{ok:null,code:'CUSTOM_COMPOSITE_RUNTIME_UNRESOLVED',message:'Formal shutter geometry is missing for the selected specification.'};
  const context=contextFor(shutterEntry,combo);
  const bounds=rectBounds(context);
  if(!bounds)return{ok:null,code:'CUSTOM_COMPOSITE_RUNTIME_UNRESOLVED',message:'Formal shutter geometry context is missing for the selector tuple.'};
  const shutter=w>=bounds.minW&&w<=bounds.maxW&&h>=bounds.minH&&h<=bounds.maxH;
  return{ok:base&&shutter,code:base&&shutter?null:'CUSTOM_SIZE_OUT_OF_RANGE',message:base&&shutter?null:'Input dimensions are outside the formal base-and-shutter intersection.'};
}

export function withCanonicalWorkbookReferenceV1FormalGeometry(adapted){
  const master=adapted?.master,baseResolver=adapted?.resolver,model=master?.canonicalWorkbook;
  if(!model||typeof baseResolver!=='function')return adapted;
  const resolver=(selection={})=>{
    const state=baseResolver(selection);
    if(selection.size_mode!=='CUSTOM'||!has(selection.custom_w)||!has(selection.custom_h))return state;
    for(const rule of compositeRules(model,selection)){
      const result=evaluateComposite(model,selection,rule);
      if(result.ok!==true)appendError(state,{code:result.code,field:'size',value:{w:selection.custom_w,h:selection.custom_h},message:result.message,ruleId:rule.rule_id??rule.id??null});
    }
    return recompute(state);
  };
  return Object.freeze({...adapted,resolver});
}
