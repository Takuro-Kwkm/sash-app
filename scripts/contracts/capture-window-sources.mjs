import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { runtimeMasterInventory, loadRegisteredRuntime } from '../../src/catalog/runtime-master/runtime-master-registry.mjs';
import { appRuntimeIntegrationRegistry } from '../../src/catalog/runtime-master/app-runtime-integration-registry.mjs';
import { loadFormalProductRuntimePackage } from '../../src/catalog/runtime-master/formal-product-runtime-loader.mjs';
import { loadManifestRuntimePackage } from '../../src/catalog/runtime-master/runtime-manifest-loader.mjs';
import { loadCanonicalWorkbookRuntimePackage } from '../../src/catalog/runtime-master/canonical-runtime-manifest-loader.mjs';
const targets = new Set(['SER-LIXIL-TW','SER-LIX-EW','SER-LIX-SAMOS2H','SER-LIX-SAMOSL','SER-YKKAP-UCHIRIMO','SER-YKK-APW430','SER-YKK-APW431']);
const root = 'contracts/window-seven';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const rows = [];
for (const product of appRuntimeIntegrationRegistry.filter(row => targets.has(row.id))) {
  const entry = runtimeMasterInventory.find(row => row.manufacturer === product.manufacturer && row.series === product.series);
  const pkg = await (entry.packageType === 'FORMAL_PRODUCT_RUNTIME' ? loadFormalProductRuntimePackage(entry) : entry.packageType === 'RUNTIME_MANIFEST_V2' ? loadCanonicalWorkbookRuntimePackage(entry) : loadManifestRuntimePackage(entry));
  const runtime = await loadRegisteredRuntime(product.manufacturer, product.series);
  const dir = `${root}/sources/${product.id}`;
  fs.mkdirSync(dir, {recursive:true});
  const documents = [];
  for (const [role, doc] of Object.entries(pkg.documents)) {
    if (role.includes('SCHEMA')) continue;
    const relative = `${dir}/${role.replaceAll(':','-')}.json.gz`;
    // One cache per existing master component; shared by its scoped Field candidates.
    const decoded = Buffer.from(JSON.stringify(doc)+'\n');
    const bytes = gzipSync(decoded);
    fs.writeFileSync(relative, bytes);
    documents.push({role, path:relative, sha256:hash(bytes), decoded_sha256:hash(decoded), bytes:bytes.length});
  }
  const manifestPath = path.relative(process.cwd(), entry.runtimeManifestPath);
  const manifestBytes = fs.readFileSync(manifestPath);
  rows.push({product_id:product.id, manufacturer:product.manufacturer, product:product.series,
    integration:product, manifest:{path:manifestPath, sha256:hash(manifestBytes), content:JSON.parse(manifestBytes.toString('utf8').replace(/^\uFEFF/,''))},
    original_source_integrity:pkg.integrity, documents,
    runtime_definitions:runtime.master?.fields??[],
    sales_request_extension:product.salesRequestExtension??null,
    frame_contract:runtime.master?.innerWindowFrameContract??null,
    cache_note:'Decoded existing Formal master projection, not newly retrieved manufacturer original. Existing loader verifies original component hashes before capture; cached serialization hash is distinct.'});
  console.log(product.id,documents.map(row=>row.bytes).reduce((a,b)=>a+b,0));
}
fs.writeFileSync(`${root}/evidence/source-index.json`,JSON.stringify({products:rows},null,2)+'\n');
