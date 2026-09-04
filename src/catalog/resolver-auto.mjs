import{selectorMatches}from'./selector.mjs';import{depMode,depAction,getAllowedValues}from'./resolver-values.mjs';
const finite=v=>Number.isFinite(Number(v));
const round=(value,precision=6)=>Number(Number(value).toFixed(precision));
function deriveValue(spec,selection){
 if(!spec||typeof spec!=='object')return undefined;
 const precision=Number.isInteger(spec.precision)?spec.precision:6;
 if(spec.op==='copy')return selection[spec.field];
 if(spec.op==='min'){
  const values=(spec.fields??[]).map(k=>selection[k]);
  return values.length&&values.every(finite)?round(Math.min(...values.map(Number)),precision):undefined;
 }
 if(spec.op==='linear'){
  const value=selection[spec.field];
  return finite(value)?round(Number(value)*(spec.factor??1)+(spec.offset??0),precision):undefined;
 }
 if(spec.op==='linear_combination'){
  const terms=spec.terms??[];
  if(!terms.length||!terms.every(t=>finite(selection[t.field])))return undefined;
  return round(terms.reduce((n,t)=>n+Number(selection[t.field])*(t.factor??1),Number(spec.offset??0)),precision);
 }
 if(spec.op==='today_yyyymmdd'){
  const d=new Date(),yyyy=d.getFullYear(),mm=String(d.getMonth()+1).padStart(2,'0'),dd=String(d.getDate()).padStart(2,'0');
  return Number(`${yyyy}${mm}${dd}`);
 }
 return undefined;
}
export function applyAuto(catalog,productId,selection,context,notices){let changed=false;for(const d of catalog.dependencies.filter(x=>x.productId===productId&&depMode(x)==='AUTO').sort((a,b)=>(a.priority??9999)-(b.priority??9999))){if(!selectorMatches(d.when,selection,context))continue;const a=depAction(d);if(['force_value','FORCE_CANDIDATE'].includes(a)){const key=d.effect?.key??d.targetField,val=d.effect?.value??d.targetValue,allowed=getAllowedValues(catalog,productId,key,selection,context);if(allowed.some(x=>x.value===val)&&selection[key]!==val){selection[key]=val;changed=true;}}else if(a==='clear_value'){const key=d.effect?.key;if(key&&selection[key]!==undefined){delete selection[key];changed=true;}}else if(a==='derive_value'){
 const key=d.effect?.key??d.targetField;if(!key)continue;
 if(d.effect?.allowOverride&&selection[key]!==undefined)continue;
 const proposed=deriveValue(d.effect?.formula,selection);
 if(proposed===undefined){if(d.effect?.clearWhenUnavailable&&selection[key]!==undefined){delete selection[key];changed=true;}}
 else if(selection[key]!==proposed){selection[key]=proposed;changed=true;}
 }else if(a==='notice'&&d.effect?.message)notices.push(d.effect.message);}return changed;}
