import { source, PRODUCT_ID, master, ev, value, windowValues, specValues } from './samos2h-base-core.mjs';
import { handingValues, constructionMap, sizeValues, handingScopes, activeStandardSizeRecords, deactivatedStandardSizeRecords, newInactiveStandardSizeRecords, patchFormalStandardInactiveRecord, SAMOS2H_STANDARD_FORMAL_DELTA_V11 as standardDelta } from './samos2h-size.mjs';
import { SAMOS2H_INACTIVE_SIZE_RECORDS } from './samos2h-inactive-sizes.mjs';
import { extMap, intMap } from './samos2h-color.mjs';
import { screenPresenceValues, screenFormValues, midrailValues, netValues } from './samos2h-screen.mjs';
import { glassBase, glassDetails, glassGas, glassSpacer, glassAdditional, glassTypes } from './samos2h-glass.mjs';
import { optionValues } from './samos2h-option.mjs';
import { definitions } from './samos2h-schema.mjs';
import { dependencies } from './samos2h-dependencies.mjs';
import { SAMOS2H_RUNTIME_FORMAL_DIMENSION_DELTA_V10 as dimensionDelta } from './samos2h-runtime-formal-dimension-delta-v10.mjs';

const dimensionRules=dimensionDelta.rules.map((row)=>({...row,productId:PRODUCT_ID,evidenceIds:ev('EV-S2H-CUSTOM')}));
if(dimensionRules.length!==17)throw new Error('Samos2H formal CUSTOM dimension rule inventory drift');
if(dimensionRules.filter((row)=>row.automatic).length!==0)throw new Error('Samos2H CUSTOM rules must not final-auto-pass at v1.0');
if(dimensionRules.filter((row)=>row.type==='COMPOUND_GATE').length!==7||dimensionRules.filter((row)=>row.type==='SOURCE_GRAPH_GATE').length!==10)throw new Error('Samos2H CUSTOM exact/review classification drift');

const patchedLegacyInactive=SAMOS2H_INACTIVE_SIZE_RECORDS.map(patchFormalStandardInactiveRecord);
const standardSizeRecords=[...activeStandardSizeRecords,...patchedLegacyInactive,...deactivatedStandardSizeRecords,...newInactiveStandardSizeRecords];
if(standardSizeRecords.length!==2309)throw new Error(`Samos2H formal STANDARD row inventory drift: ${standardSizeRecords.length}`);
if(standardSizeRecords.filter((r)=>r.selectable).length!==2140)throw new Error('Samos2H formal STANDARD selectable inventory drift');
if(standardSizeRecords.filter((r)=>!r.selectable).length!==169)throw new Error('Samos2H formal STANDARD inactive inventory drift');
if(Object.keys(standardDelta.hActualOverrides).length!==310||standardDelta.deactivatedIds.length!==2||standardDelta.activeAdds.length!==11||standardDelta.inactiveAdds.length!==1)throw new Error('Samos2H formal STANDARD delta payload drift');

export const requiredFieldRules=definitions.filter(d=>d.key!=='options').map(d=>({id:`${PRODUCT_ID}:required:${d.key}`,productId:PRODUCT_ID,specificationKey:d.key,required:true,selector:d.selector??{},priority:d.displayOrder,evidenceIds:d.evidenceIds}));
const sizeModeValues=[
  value('size_mode','STANDARD','規格サイズ',1,{evidenceIds:ev('EV-S2H-001')}),
  value('size_mode','CUSTOM','特注寸法',2,{evidenceIds:ev('EV-S2H-CUSTOM')})
];
const leafConfigurationValues=[
  value('leaf_configuration','2枚建','2枚建',1,{selector:{size_mode:'CUSTOM',window_type:'WT-S2H-HIKICHIGAI'},evidenceIds:ev('EV-S2H-CUSTOM')}),
  value('leaf_configuration','4枚建','4枚建',2,{selector:{size_mode:'CUSTOM',window_type:'WT-S2H-HIKICHIGAI'},evidenceIds:ev('EV-S2H-CUSTOM')})
];

export const SAMOS2H_MODULE={product:{id:PRODUCT_ID,manufacturer:'LIXIL',displayName:'サーモスⅡ-H',category:'サッシ',status:'ACTIVE',recoveryStatus:'CANONICAL_MASTER_CONNECTED',source:master,sourceInventory:{activeWindows:17,standardSizeRows:2309,selectableSizeRows:2140,inactiveSizeRows:169,dimensionRules:17,dimensionAuto:0,dimensionReview:17},notices:['要求耐風圧等級（S-1〜S-4）は通常見積UIへ表示しません。特殊サイズ・高耐風圧案件はMANUAL_CHECKです。','CUSTOMは正式Master 06E_特注寸法範囲に接続済みです。W/Hだけでは最終AUTO PASSせず、複合条件・原本グラフはREVIEW_REQUIREDです。','STANDARDは2026年5月価格掲載版の公式Source完全列挙に基づく正式Master補正v1.1へ接続済みです。']},specificationDefinitions:definitions,allowedValues:[...windowValues,...specValues,...handingValues,...constructionMap.values(),...sizeModeValues,...leafConfigurationValues,...sizeValues,...extMap.values(),...intMap.values(),...screenPresenceValues,...screenFormValues,...midrailValues,...netValues,...glassBase,...glassDetails,...glassGas,...glassSpacer,...glassAdditional,...glassTypes,...optionValues],standardSizeRecords,requiredFieldRules,ruleSets:[{id:`${PRODUCT_ID}:app-control`,productId:PRODUCT_ID,type:'SOURCE_ROUTING',selector:{},payload:source.appControl,status:'ACTIVE',evidenceIds:ev('EV-S2H-012')},{id:`${PRODUCT_ID}:dimension-rules`,productId:PRODUCT_ID,type:'DIMENSION_RULES',selector:{},payload:dimensionRules,status:'ACTIVE',evidenceIds:ev('EV-S2H-CUSTOM')},{id:`${PRODUCT_ID}:screen-rules`,productId:PRODUCT_ID,type:'MASTER_RULE_TABLE',selector:{},payload:source.screenLimits,status:'ACTIVE',evidenceIds:ev('EV-S2H-006')},{id:`${PRODUCT_ID}:manual-check`,productId:PRODUCT_ID,type:'MANUAL_CHECK_POLICY',selector:{},payload:{blocksNormalEstimate:false,windPressureInputVisible:false},status:'ACTIVE',evidenceIds:ev('EV-S2H-001')}],dependencies,evidence:[{id:`${PRODUCT_ID}:master-source`,productId:PRODUCT_ID,sourceType:'PRODUCT_MASTER',title:master.title,sourceId:master.id,version:master.version,sourceFolder:master.folder,status:'VERIFIED_SOURCE',sha256:master.sha256,modifiedTime:master.modifiedTime},{id:'EV-S2H-CUSTOM',productId:PRODUCT_ID,sourceType:'MASTER_SHEET',title:'寸法特注範囲',sourceId:master.id,sourceSheet:'06E_特注寸法範囲',status:'VERIFIED_SOURCE',proposalId:dimensionDelta.proposalId,proposalFingerprint:dimensionDelta.proposalFingerprint,sha256:dimensionDelta.formalMaster.sha256},{id:'EV-S2H-STANDARD-FORMAL',productId:PRODUCT_ID,sourceType:'FORMAL_PRODUCT_MASTER_DELTA',title:standardDelta.formalMaster.title,sourceId:standardDelta.formalMaster.driveFileId,sourceSheet:'06_サイズ / 06B_雨戸設定可否 / 08A_サイズ別ガラス条件',status:'VERIFIED_SOURCE',proposalId:standardDelta.proposalId,proposalFingerprint:standardDelta.proposalFingerprint,sha256:standardDelta.formalMaster.sha256,modifiedTime:standardDelta.formalMaster.modifiedTime},...source.evidence.map(r=>({id:r.evidence_id,productId:PRODUCT_ID,sourceType:'MASTER_EVIDENCE',domain:r['領域'],title:r['確認内容'],status:r['状態'],source:r['カタログ根拠'],url:r['公式URL'],note:r['備考'],sourceSheet:r._sourceSheet,sourceRow:r._sourceRow}))],goldenTests:source.goldenTests,stats:{activeWindows:17,masterSizeRows:2309,selectableSizeRows:2140,handingScopes:handingScopes.length,dimensionRules:17,dimensionAuto:0,dimensionReview:17},runtimeRegeneration:{version:'v1.0',formalMaster:dimensionDelta.formalMaster,dimensionRuleAdds:17,proposalId:dimensionDelta.proposalId,proposalFingerprint:dimensionDelta.proposalFingerprint},standardRuntimeRegeneration:{version:'v1.1',formalMaster:standardDelta.formalMaster,hActualDimensionCorrections:310,deactivatedRows:2,newStandardRows:12,proposalId:standardDelta.proposalId,proposalFingerprint:standardDelta.proposalFingerprint,directManufacturerValueEditToGenericCore:false}};

export {dimensionRules as SAMOS2H_DIMENSION_RULES};
