import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
const UCHIRIMO_ROOT=fileURLToPath(new URL('../../src/catalog/runtime-master-packages/ykkap-uchirimo-v1.0-p7r1-r2',import.meta.url));
const entry=Object.freeze({
    manufacturer:'YKK AP', series:'ウチリモ 内窓', masterVersion:'v1.0-P7R1-R2', schemaVersion:'2.0', packageType:'RUNTIME_MANIFEST_V2', adapterType:'UCHIRIMO_TABULAR_V1', requireRuntimeContract:false, enforceComponentSchemaVersion:false, packageRoot:UCHIRIMO_ROOT,
    runtimeManifestPath:join(UCHIRIMO_ROOT,'runtime_manifest.json'), runtimeManifestDriveFileId:'1119yamXn21wLZd3C8LvamNWsTAx_1dt2', runtimeManifestSha256:'be4f1f77727424dc06ddf9de947201f33d4aee5219b182e37d0f178e1fb7147d',
    materializedFiles:Object.freeze({
      '1iX6-TuR7B7tUKqtGnd76IzVJzq9OH2zK':Object.freeze({codec:'brotli',paths:Object.freeze([join(UCHIRIMO_ROOT,'canonical.json.br.b64.parts/part-00')])}),
      '1c6hmvMgSLhESgmMJTRW7DN_opa1HhYlZ':Object.freeze({codec:'brotli',paths:Object.freeze([join(UCHIRIMO_ROOT,'size-installation.json.br.b64.parts/part-00')])}),
      '1TJn2-e6Sa6LcIv6FxNt0ahGSWlcgclJZ':Object.freeze({codec:'brotli',paths:Object.freeze([join(UCHIRIMO_ROOT,'vacuum-glass.json.br.b64.parts/part-00')])}),
      '1fNUukTQaDJT2iWbNk6F8gcLLt22Sg32z':Object.freeze({codec:'brotli',paths:Object.freeze([join(UCHIRIMO_ROOT,'judgment-engine.json.br.b64.parts/part-00')])}),
    }),
  });
export function getRuntimeMasterEntry(manufacturer,series){assert.equal(manufacturer,'YKK AP');assert.equal(series,'ウチリモ 内窓');return entry;}
