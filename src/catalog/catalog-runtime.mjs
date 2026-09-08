import { buildCatalogContext, selectorMatches } from "./selector.mjs";
import { buildFields } from "./resolver-fields.mjs";

const rows=(catalog,productId,type)=>catalog.ruleSets
  .filter(r=>r.productId===productId&&r.type===type&&r.status!=="INACTIVE")
  .flatMap(r=>Array.isArray(r.payload)?r.payload:(r.payload?.rules??[]));

const clone=v=>structuredClone(v);
const render=(template,values)=>template.replace(/\{([a-z0-9_]+)\}/gi,(_,key)=>String(values[key]??""));
const finite=v=>Number.isFinite(Number(v));
const derive=(spec,selection)=>{
  if(!spec||typeof spec!=="object")return undefined;
  if(spec.op==="copy")return selection[spec.field];
  if(spec.op==="linear"){
    const value=selection[spec.field];
    return finite(value)?Number(value)*(spec.factor??1)+(spec.offset??0):undefined;
  }
  if(spec.op==="sum"){
    const values=(spec.fields??[]).map(k=>selection[k]);
    return values.every(finite)?values.reduce((n,v)=>n+Number(v),0)+(spec.offset??0):undefined;
  }
  if(spec.op==="compare"){
    const left=selection[spec.leftField],right=spec.rightField?selection[spec.rightField]:spec.value;
    if(!finite(left)||!finite(right))return undefined;
    if(spec.comparator==="gte")return Number(left)>=Number(right);
    if(spec.comparator==="lte")return Number(left)<=Number(right);
    if(spec.comparator==="gt")return Number(left)>Number(right);
    if(spec.comparator==="lt")return Number(left)<Number(right);
  }
  return undefined;
};

export function resolveRuntimeFields(catalog,productId,selection={}){
  const context=buildCatalogContext(catalog,productId);
  const resolved={...selection};
  const rules=rows(catalog,productId,"RESOLUTION_RULES").sort((a,b)=>(a.priority??9999)-(b.priority??9999));
  for(let pass=0;pass<12;pass++){
    let changed=false;
    for(const rule of rules){
      if(!selectorMatches(rule.when??{},resolved,context))continue;
      for(const [key,value] of Object.entries(rule.set??{})){
        if(resolved[key]!==value){resolved[key]=clone(value);changed=true;}
      }
      for(const [key,spec] of Object.entries(rule.derive??{})){
        const value=derive(spec,resolved);
        if(value!==undefined&&resolved[key]!==value){resolved[key]=value;changed=true;}
      }
    }
    if(!changed)break;
  }
  return resolved;
}

export function evaluateRuntimeValidation(catalog,productId,rawSelection={},resolvedSelection={}){
  const context=buildCatalogContext(catalog,productId);
  const errors=rows(catalog,productId,"VALIDATION_RULES")
    .filter(rule=>selectorMatches(rule.when??{},rule.scope==="resolved"?resolvedSelection:rawSelection,context))
    .sort((a,b)=>(a.priority??9999)-(b.priority??9999))
    .map(rule=>({
      ruleId:rule.id,errorCode:rule.errorCode,severity:rule.severity??"ERROR",message:rule.message
    }));
  const missing=buildFields(catalog,productId,resolvedSelection,context)
    .filter(f=>f.required&&(resolvedSelection[f.key]===undefined||resolvedSelection[f.key]===null||resolvedSelection[f.key]===""))
    .map(f=>f.key);
  return {
    status:errors.length?"INVALID":missing.length?"INCOMPLETE":"VALID",
    errors,missingRequiredFields:missing
  };
}

export function resolveProductSymbols(catalog,productId,resolvedSelection={}){
  const context=buildCatalogContext(catalog,productId);
  const schemas=rows(catalog,productId,"PRODUCT_SYMBOL_SCHEMAS");
  const out=new Map();
  for(const schema of schemas){
    if(!selectorMatches(schema.when??{},resolvedSelection,context))continue;
    out.set(schema.id,render(schema.template,resolvedSelection));
  }
  return out;
}

export function resolveOrderConfiguration(catalog,productId,resolvedSelection={}){
  const context=buildCatalogContext(catalog,productId);
  const symbols=resolveProductSymbols(catalog,productId,resolvedSelection);
  const components=[];
  for(const rule of rows(catalog,productId,"ORDER_COMPONENT_RULES")){
    if(!selectorMatches(rule.when??{},resolvedSelection,context))continue;
    components.push({
      componentType:rule.componentType,
      requiredStatus:rule.requiredStatus??"REQUIRED",
      productSymbol:rule.symbol??(rule.symbolSchemaId?symbols.get(rule.symbolSchemaId)??null:null),
      quantity:rule.quantity??1,
      sourceRuleId:rule.id,
      ...(rule.orderAttributes?{orderAttributes:clone(rule.orderAttributes)}:{})
    });
  }
  if(resolvedSelection.size_type==="special_order"){
    const attrs={
      frame_width_mm:resolvedSelection.frame_width_mm,
      frame_height_mm:resolvedSelection.frame_height_mm,
      door_leaf_width_mm:resolvedSelection.door_leaf_width_mm,
      door_leaf_height_mm:resolvedSelection.door_leaf_height_mm
    };
    for(const component of components){
      if(["door_set","frame_unit","door_leaf_unit"].includes(component.componentType)){
        component.orderAttributes={...(component.orderAttributes??{}),...attrs};
      }
    }
  }
  if(resolvedSelection.screen_type==="horizontal_roll_screen_xmd_flat_single"){
    const screen=components.find(x=>x.componentType==="screen_unit");
    if(screen)screen.orderAttributes={
      ...(screen.orderAttributes??{}),
      screen_mw:resolvedSelection.screen_mw,
      screen_mh:resolvedSelection.screen_mh,
      screen_body_color:resolvedSelection.screen_body_color,
      screen_net_color:resolvedSelection.screen_net_color
    };
  }
  return {strategy:resolvedSelection.order_strategy??null,components,symbols:Object.fromEntries(symbols)};
}

export function resolveCatalogRuntime(catalog,productId,rawSelection={},stabilizedSelection={}){
  const resolvedFields=resolveRuntimeFields(catalog,productId,stabilizedSelection);
  const validation=evaluateRuntimeValidation(catalog,productId,rawSelection,resolvedFields);
  const orderConfiguration=validation.status==="VALID"
    ?resolveOrderConfiguration(catalog,productId,resolvedFields)
    :{strategy:null,components:[],symbols:{}};
  return {resolvedFields,validation,orderConfiguration};
}
