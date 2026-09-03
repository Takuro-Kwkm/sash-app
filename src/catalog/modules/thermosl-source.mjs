import p1 from "./thermosl-data/part-01.mjs";
import p2 from "./thermosl-data/part-02.mjs";
import p3 from "./thermosl-data/part-03.mjs";
import p4 from "./thermosl-data/part-04.mjs";
import p5 from "./thermosl-data/part-05.mjs";
import p6 from "./thermosl-data/part-06.mjs";
import p7 from "./thermosl-data/part-07.mjs";
import p8 from "./thermosl-data/part-08.mjs";
import p9 from "./thermosl-data/part-09.mjs";
import p10 from "./thermosl-data/part-10.mjs";
import p11 from "./thermosl-data/part-11.mjs";
import p12 from "./thermosl-data/part-12.mjs";
import p13 from "./thermosl-data/part-13.mjs";
import p14 from "./thermosl-data/part-14.mjs";
import{THERMOSL_RUNTIME_FORMAL_DELTA_V18 as delta}from'./thermosl-runtime-formal-delta-v18.mjs';
import{THERMOSL_RUNTIME_FORMAL_DIMENSION_DELTA_V19 as dimensionDelta}from'./thermosl-runtime-formal-dimension-delta-v19.mjs';

const base=JSON.parse(p1+p2+p3+p4+p5+p6+p7+p8+p9+p10+p11+p12+p13+p14);
if(base.sizes.length!==delta.expectedBefore.masterSizeRows||base.sizes.filter((row)=>row.active).length!==delta.expectedBefore.selectableSizeRows)throw new Error('Thermos L base Runtime source drift before v1.8 regeneration');
const mergedSizes=[...base.sizes,...delta.sizes];
if(mergedSizes.length!==delta.expectedAfter.masterSizeRows||mergedSizes.filter((row)=>row.active).length!==delta.expectedAfter.selectableSizeRows)throw new Error('Thermos L v1.8 Runtime source inventory drift');

if(base.dimensionRules.length!==dimensionDelta.expectedRuleCount)throw new Error('Thermos L dimension rule inventory drift before v1.9 regeneration');
const previousDimensionRule=base.dimensionRules.find((row)=>row.id===dimensionDelta.targetRuleId);
if(!previousDimensionRule||previousDimensionRule.type!=='AUTO_PIECEWISE'||previousDimensionRule.condition!=='240<=W<=870:350<=H<=943; 870<W<=1690:350<=H<=500')throw new Error('Thermos L CR-SL-036 base rule drift before v1.9 regeneration');
const mergedDimensionRules=base.dimensionRules.map((row)=>row.id===dimensionDelta.targetRuleId?{...row,...dimensionDelta.rule}:row);
if(mergedDimensionRules.length!==dimensionDelta.expectedRuleCount||mergedDimensionRules.filter((row)=>row.id===dimensionDelta.targetRuleId).length!==1)throw new Error('Thermos L v1.9 dimension rule regeneration drift');

export const THERMOSL_SOURCE={
  ...base,
  master:{
    ...base.master,
    modifiedTime:dimensionDelta.formalMaster.modifiedTime,
    sizeBytes:dimensionDelta.formalMaster.sizeBytes,
    revisionId:dimensionDelta.formalMaster.revisionId,
    sha256:dimensionDelta.formalMaster.sha256
  },
  sourceInventory:{...base.sourceInventory,masterSizeRows:delta.expectedAfter.masterSizeRows,selectableSizeRows:delta.expectedAfter.selectableSizeRows},
  sizes:mergedSizes,
  dimensionRules:mergedDimensionRules,
  runtimeRegeneration:{
    version:'v1.9',formalMaster:dimensionDelta.formalMaster,
    addedSizeRows:delta.sizes.length,dimensionRuleUpdates:1,targetRuleId:dimensionDelta.targetRuleId,
    proposalId:dimensionDelta.proposalId,proposalFingerprint:dimensionDelta.proposalFingerprint
  }
};
