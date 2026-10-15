import {selectorMatches,buildCatalogContext} from '../selector.mjs';
const has=value=>value!==undefined&&value!==null&&value!=='';
const number=value=>has(value)&&String(value).trim()!==''&&Number.isFinite(Number(value))?Number(value):null;

// The master declares the input basis and the measured/finished relationship.
// Only the selected input is authoritative; saved or submitted derived values are ignored.
export function resolveDeclaredNumericPairs(module,input={}){
 const selection={...input},fields=new Map(),context=buildCatalogContext(module,module.product.id);
 for(const set of module.ruleSets??[]){
  if(set.type!=='NUMERIC_INPUT_PAIRS'||set.status==='INACTIVE')continue;
  for(const rule of set.payload){
   if(!selectorMatches(rule.applicability,selection,context))continue;
   if(!has(selection[rule.basisField])&&rule.legacyBasis&&rule.pairs.every(pair=>!has(selection[pair.measuredField]))&&rule.pairs.some(pair=>has(selection[pair.finishedField])))selection[rule.basisField]=rule.legacyBasis;
   const basis=selection[rule.basisField],measured=basis===rule.measuredBasis,finished=basis===rule.finishedBasis;
   if(measured||finished)Object.assign(selection,rule.evaluationAssignments??{});
   for(const pair of rule.pairs){
    if(!Number.isFinite(pair.offset))throw new Error('NUMERIC_PAIR_OFFSET_INVALID');
    const source=measured?pair.measuredField:pair.finishedField,target=measured?pair.finishedField:pair.measuredField;
    delete selection[target];
    if(!measured&&!finished){delete selection[source];}
    else {
     const value=number(selection[source]);
     if(value===null)delete selection[source];
     else{selection[source]=value;selection[target]=Number((value+(measured?pair.offset:-pair.offset)).toFixed(6));}
    }
    for(const key of [pair.measuredField,pair.finishedField])fields.set(key,{readOnly:(!measured&&!finished)||key===target,required:(measured||finished)&&key===source,selectionMode:(!measured&&!finished)||key===target?'DERIVED':'USER_INPUT',emptyLabel:'寸法の入力後に表示',feedback:key===target?{severity:'info',message:pair.message}:undefined});
   }
  }
 }
 return{selection,fields};
}

export function decorateDeclaredNumericPairs(fields,policy){
 return fields.map(field=>policy.fields.has(field.key)?{...field,...policy.fields.get(field.key),disabled:policy.fields.get(field.key).readOnly}:field);
}
