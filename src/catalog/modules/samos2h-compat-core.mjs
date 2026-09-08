const at=(r,sheet,fields)=>({...fields,_sourceSheet:sheet,_sourceRow:r.row??null});
export function normalizeCoreTables(raw){
  const windows=(raw.windows??[]).map(r=>at(r,'03_窓種',{window_type_id:r.id,'窓種表示名':r.label,'固有仕様種別':r.specKind,'固有仕様必須':r.specRequired,'網戸設定':r.screenSetting,'中桟選択':r.midrail,'ネット種類選択':r.netSelection}));
  const specs=(raw.specs??[]).map(r=>at(r,'04_窓種固有仕様',{spec_id:r.id,'窓種ID':r.windowTypeId,'固有仕様種別':r.kind,'表示名':r.label,'メーカー正式名称':r.officialName,'サイズ連動キー':r.sizeKey,'表示順':r.order,'出典':r.source}));
  const colors=(raw.colors??[]).map(r=>at(r,'07_色',{'外観色ID':r.exteriorId,'外観色表示名':r.exteriorLabel,'内観色ID':r.interiorId,'内観色表示名':r.interiorLabel}));
  const glass=(raw.glasses??[]).map(r=>at(r,'08_ガラス',{glass_id:r.id,'ガラス大分類':r.category,'Low-E区分':r.lowE,'見え方':r.appearance,'中空層':r.gas,'スペーサー':r.spacer,'合わせ':r.laminated,'強化':r.tempered,'代表構成':r.composition,'出典':r.source}));
  return{windows,specs,colors,glass};
}
