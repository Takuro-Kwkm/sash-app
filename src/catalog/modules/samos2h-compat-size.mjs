export function normalizeSizes(raw){
  const rows=raw.sizes??[];
  const uniq=a=>[...new Set(a.filter(v=>v!==null&&v!==undefined&&v!==''))];
  const d={
    windows:uniq(rows.map(r=>r.windowTypeId)),
    specs:uniq(rows.map(r=>r.specId)),
    constructions:uniq(rows.map(r=>r.construction)),
    classes:uniq(rows.map(r=>r.windowClass)),
    frames:uniq(rows.map(r=>r.frameType)),
    glassSymbols:uniq(rows.map(r=>r.glassMark))
  };
  const ix=(a,v)=>v===null||v===undefined||v===''?-1:a.indexOf(v);
  const sizesPacked=rows.map(r=>[
    Number(String(r.id).match(/(\d+)$/)?.[1]??0),
    ix(d.windows,r.windowTypeId),ix(d.specs,r.specId),
    String(r.nominalW??''),String(r.nominalH??''),r.actualW,r.actualH,
    ix(d.constructions,r.construction),ix(d.classes,r.windowClass),
    r.code??null,r.innerCode??null,ix(d.frames,r.frameType),r.page??null,
    ix(d.glassSymbols,r.glassMark),Boolean(r.glassPatternAllowed),
    r.handing==='L/R',r.row??null
  ]);
  return{sizeDictionaries:d,sizesPacked};
}
