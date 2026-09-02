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

const base=JSON.parse(p1+p2+p3+p4+p5+p6+p7+p8+p9+p10+p11+p12+p13+p14);
if(base.sizes.length!==delta.expectedBefore.masterSizeRows||base.sizes.filter((row)=>row.active).length!==delta.expectedBefore.selectableSizeRows)throw new Error('Thermos L base Runtime source drift before v1.8 regeneration');
const mergedSizes=[...base.sizes,...delta.sizes];
if(mergedSizes.length!==delta.expectedAfter.masterSizeRows||mergedSizes.filter((row)=>row.active).length!==delta.expectedAfter.selectableSizeRows)throw new Error('Thermos L v1.8 Runtime source inventory drift');

export const THERMOSL_SOURCE={
  ...base,
  master:{...base.master,modifiedTime:delta.formalMaster.modifiedTime,sizeBytes:delta.formalMaster.sizeBytes,revisionId:delta.formalMaster.revisionId,sha256:delta.formalMaster.sha256},
  sourceInventory:{...base.sourceInventory,masterSizeRows:delta.expectedAfter.masterSizeRows,selectableSizeRows:delta.expectedAfter.selectableSizeRows},
  sizes:mergedSizes,
  runtimeRegeneration:{version:'v1.8',formalMaster:delta.formalMaster,addedSizeRows:delta.sizes.length}
};
