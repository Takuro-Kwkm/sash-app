import { source, master, ev, value } from './samos2h-base-core.mjs';
import { SAMOS2H_RUNTIME_FORMAL_STANDARD_DELTA_V11 as standardDelta } from './samos2h-runtime-formal-standard-delta-v11.mjs';

const d=source.sizeDictionaries;
const baseSizes=source.sizesPacked.map(p=>{
  const[n,wi,si,callW,callH,actualW,actualH,ci,cli,callCode,innerCode,fi,page,gi,patternAllowed,handingRequired,sourceRow]=p;
  return{id:`SZ-S2H-${String(n).padStart(5,'0')}`,window:d.windows[wi],spec:si>=0?d.specs[si]:null,callW:String(callW),callH:String(callH),actualW,actualH,construction:d.constructions[ci],windowClass:d.classes[cli],callCode,innerCode,frameType:fi>=0?d.frames[fi]:null,page,glassSymbol:gi>=0?d.glassSymbols[gi]:null,patternAllowed:Boolean(patternAllowed),handingRequired:Boolean(handingRequired),sourceRow};
});
const deactivatedIdSet=new Set(standardDelta.deactivatedIds);
const patchRaw=(r)=>{
  const h=standardDelta.hActualOverrides[r.id];
  return h===undefined?r:{...r,actualH:h,formalStandardCorrection:true};
};
const formalizeAdd=(r)=>({...r,formalStandardCorrection:true});

export const sizes=[
  ...baseSizes.filter(r=>!deactivatedIdSet.has(r.id)).map(patchRaw),
  ...standardDelta.activeAdds.map(formalizeAdd),
];
if(sizes.length!==2140)throw new Error(`Samos2H formal STANDARD active inventory drift: ${sizes.length}`);

export const handingScopes=[];const seen=new Set();for(const r of sizes.filter(r=>r.handingRequired)){const k=`${r.window}|${r.spec??''}`;if(seen.has(k))continue;seen.add(k);handingScopes.push(r.spec?{window_type:r.window,specific_spec:r.spec}:{window_type:r.window});}
export const handingSelector={any:handingScopes};
export const handingValues=[value('handing','L','L（左吊元）',1,{selector:handingSelector,evidenceIds:ev('EV-S2H-001'),metadata:{sourceFile:master.title,sourceSheet:'06_サイズ',sourceKey:'吊元=L/R'}}),value('handing','R','R（右吊元）',2,{selector:handingSelector,evidenceIds:ev('EV-S2H-001'),metadata:{sourceFile:master.title,sourceSheet:'06_サイズ',sourceKey:'吊元=L/R'}})];
export const constructionMap=new Map();for(const r of sizes){const selector={window_type:r.window,...(r.spec?{specific_spec:r.spec}:{})},k=JSON.stringify([r.window,r.spec,r.construction]);if(!constructionMap.has(k))constructionMap.set(k,value('construction',r.construction,r.construction==='在来・204'?'在来・2×4共通':r.construction,constructionMap.size+1,{selector,evidenceIds:ev('EV-S2H-001'),metadata:{sourceFile:r.formalStandardCorrection?standardDelta.formalMaster.title:master.title,sourceSheet:'06_サイズ'}}));}
export const sizeValues=sizes.map((r,i)=>value('size',r.id,`${r.callCode??`${r.callW}${r.callH}`} ｜ ${r.actualW}×${r.actualH}mm`,i+1,{selector:{window_type:r.window,construction:r.construction,...(r.spec?{specific_spec:r.spec}:{}),...(r.handingRequired?{handing:{$in:['L','R']}}:{})},evidenceIds:r.formalStandardCorrection?ev('EV-S2H-STANDARD-FORMAL'):ev('EV-S2H-001'),metadata:{actualW:r.actualW,actualH:r.actualH,callW:r.callW,callH:r.callH,callCode:r.callCode,innerCode:r.innerCode,construction:r.construction,windowClass:r.windowClass,frameType:r.frameType,glassSymbol:r.glassSymbol,patternAllowed:r.patternAllowed,handingRequired:r.handingRequired,sourceFile:r.formalStandardCorrection?standardDelta.formalMaster.title:master.title,sourceSheet:'06_サイズ',sourceRow:r.sourceRow,...(r.formalStandardCorrection?{formalStandardCorrectionProposalId:standardDelta.proposalId,formalMasterSha256:standardDelta.formalMaster.sha256}:{})}}));
export const activeStandardSizeRecords=sizeValues.map((row)=>({
 id:row.value,productId:row.productId,windowTypeId:row.selector.window_type,
 specificationId:row.selector.specific_spec??null,construction:row.metadata.construction,
 nominalW:row.metadata.callW,nominalH:row.metadata.callH,actualW:row.metadata.actualW,actualH:row.metadata.actualH,
 sizeCode:row.metadata.callCode,innerCode:row.metadata.innerCode,windowClass:row.metadata.windowClass,
 frameType:row.metadata.frameType,selectable:true,status:'ACTIVE',selector:row.selector,
 displayLabel:row.displayLabel,displayOrder:row.displayOrder,evidenceIds:row.evidenceIds,metadata:row.metadata
}));

const rawToInactive=(r,displayOrder,reason)=>({
  id:r.id,productId:'SER-LIX-SAMOS2H',windowTypeId:r.window,specificationId:r.spec??null,construction:r.construction,
  nominalW:r.callW,nominalH:r.callH,actualW:r.actualW,actualH:r.actualH,sizeCode:r.callCode,innerCode:r.innerCode,
  windowClass:r.windowClass,frameType:r.frameType,selectable:false,status:'INACTIVE',
  selector:{window_type:r.window,construction:r.construction,...(r.spec?{specific_spec:r.spec}:{})},
  displayLabel:`${r.callCode??`${r.callW}${r.callH}`} ｜ ${r.actualW}×${r.actualH}mm`,displayOrder,
  evidenceIds:ev('EV-S2H-STANDARD-FORMAL'),metadata:{sourceFile:standardDelta.formalMaster.title,sourceSheet:'06_サイズ',sourceRow:r.sourceRow,registrationStatus:reason,glassSymbol:r.glassSymbol,actualH:r.actualH,formalStandardCorrectionProposalId:standardDelta.proposalId,formalMasterSha256:standardDelta.formalMaster.sha256}
});
const correctedBaseSizes=baseSizes.map(patchRaw);
export const deactivatedStandardSizeRecords=correctedBaseSizes.filter(r=>deactivatedIdSet.has(r.id)).map((r,i)=>rawToInactive(r,2300+i,'公式価格表注記：16524サイズは製作不可'));
export const newInactiveStandardSizeRecords=standardDelta.inactiveAdds.map((r,i)=>rawToInactive(formalizeAdd(r),2302+i,r.registrationStatus??'雨戸設定可否確認済み／選択不可'));
if(deactivatedStandardSizeRecords.length!==2||newInactiveStandardSizeRecords.length!==1)throw new Error('Samos2H formal STANDARD inactive delta inventory drift');

export const patchFormalStandardInactiveRecord=(row)=>{
  const h=standardDelta.hActualOverrides[row.id];
  if(h===undefined)return row;
  return {...row,actualH:h,displayLabel:`${row.sizeCode??`${row.nominalW}${row.nominalH}`} ｜ ${row.actualW}×${h}mm`,evidenceIds:ev('EV-S2H-STANDARD-FORMAL'),metadata:{...row.metadata,actualH:h,formalStandardCorrectionProposalId:standardDelta.proposalId,formalMasterSha256:standardDelta.formalMaster.sha256}};
};
export {standardDelta as SAMOS2H_STANDARD_FORMAL_DELTA_V11};
