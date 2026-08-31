import{selectorMatches,buildCatalogContext}from'./selector.mjs';

const active=(row)=>row.selectable!==false&&row.status!=='INACTIVE';
const label=(row)=>row.displayLabel??`${row.sizeCode??`${row.nominalW??''}${row.nominalH??''}`} ｜ ${row.actualW??'?'}×${row.actualH??'?'}mm`;
const order=(a,b)=>(a.displayOrder??999999)-(b.displayOrder??999999)||String(label(a)).localeCompare(String(label(b)),'ja');

export function standardSizeRecords(catalog,productId,{includeInactive=false}={}){
  const rows=(catalog.standardSizeRecords??[]).filter((row)=>row.productId===productId);
  return includeInactive?rows:rows.filter(active);
}

export function resolveStandardSizes(catalog,productId,selection={},context=buildCatalogContext(catalog,productId)){
  return standardSizeRecords(catalog,productId).filter((row)=>selectorMatches(row.selector??{},selection,context)).sort(order);
}

export function sizeAllowedValues(catalog,productId,selection={},context=buildCatalogContext(catalog,productId)){
  return resolveStandardSizes(catalog,productId,selection,context).map((row,index)=>({
    id:`${row.productId}:resolved-size:${row.id}`,
    productId:row.productId,specificationKey:'size',value:row.id,
    displayLabel:label(row),displayOrder:row.displayOrder??index+1,status:row.status??'ACTIVE',
    selector:row.selector??{},evidenceIds:row.evidenceIds??[],metadata:{
      ...(row.metadata??{}),sourceSizeId:row.sourceSizeId??row.id,
      actualW:row.actualW,actualH:row.actualH,callW:row.nominalW,callH:row.nominalH,
      callCode:row.sizeCode,innerCode:row.innerCode,construction:row.construction,
      windowClass:row.windowClass,frameType:row.frameType,configuration:row.configuration
    }
  }));
}

export function distinctNominalWidths(rows){return[...new Set(rows.map((row)=>row.nominalW).filter((value)=>value!==undefined&&value!==null&&value!==''))];}
export function distinctNominalHeights(rows,nominalW){return[...new Set(rows.filter((row)=>nominalW===undefined||String(row.nominalW)===String(nominalW)).map((row)=>row.nominalH).filter((value)=>value!==undefined&&value!==null&&value!==''))];}
export function findSizeCode(catalog,productId,query,selection={}){const needle=String(query??'').trim().toLowerCase();if(!needle)return[];return resolveStandardSizes(catalog,productId,selection).filter((row)=>[row.sizeCode,row.nominalW,row.nominalH,row.actualW,row.actualH,label(row)].some((value)=>String(value??'').toLowerCase().includes(needle)));}

export function sizeCoverage(catalog,productId){
  const all=standardSizeRecords(catalog,productId,{includeInactive:true});
  const selectable=all.filter(active);
  const canonical=Number(catalog.products.find((row)=>row.id===productId)?.sourceInventory?.selectableSizeRows??selectable.length);
  const baseId=(row)=>row.baseSizeId??row.sourceSizeId??row.id;
  return{
    standardSizeRows:new Set(all.map(baseId)).size,selectableSizeRows:selectable.length,
    inactiveSizeRows:new Set(all.filter((row)=>!active(row)).map(baseId)).size,
    canonicalSelectableRows:canonical,missing:Math.max(0,canonical-selectable.length),extra:Math.max(0,selectable.length-canonical),
    coverage:canonical===0?(selectable.length===0?1:0):selectable.length/canonical
  };
}
