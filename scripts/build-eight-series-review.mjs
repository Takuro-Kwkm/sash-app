import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,dirname,posix} from 'node:path';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {runtimeMasterInventory,loadRegisteredRuntime} from '../src/catalog/runtime-master/runtime-master-registry.mjs';
import {loadCanonicalWorkbookRuntimePackage} from '../src/catalog/runtime-master/canonical-runtime-manifest-loader.mjs';
import {loadManifestRuntimePackage} from '../src/catalog/runtime-master/runtime-manifest-loader.mjs';
import {loadFormalProductRuntimePackage} from '../src/catalog/runtime-master/formal-product-runtime-loader.mjs';

const series=new Set(['TW','EW','サーモスⅡ-H','サーモスL','APW430','APW431','ウチリモ 内窓','インプラス']);
const entries=runtimeMasterInventory.filter(e=>series.has(e.series));
if(entries.length!==8)throw new Error('EIGHT_SERIES_INVENTORY_MISMATCH');
const packages={};
for(const entry of entries){
 await loadRegisteredRuntime(entry.manufacturer,entry.series);
 packages[entry.series]=entry.packageType==='RUNTIME_MANIFEST_V2'?await loadCanonicalWorkbookRuntimePackage(entry):entry.packageType==='RUNTIME_MANIFEST_V1'?await loadManifestRuntimePackage(entry):await loadFormalProductRuntimePackage(entry);
}
const modules={},dependencies={};
const registryPath='src/catalog/runtime-master/runtime-master-registry.mjs';
let registry=readFileSync(registryPath,'utf8');
const imports=registry.split('\n').filter(l=>l.startsWith('import ')&&!l.includes('node:')&&!l.includes('loader.mjs')).join('\n');
registry=imports+'\nexport const runtimeMasterInventory='+JSON.stringify(entries)+';\n'+
 'const loadCanonicalWorkbookRuntimePackage=async entry=>window.__eightPackages[entry.series];\n'+
 'const loadManifestRuntimePackage=loadCanonicalWorkbookRuntimePackage;const loadFormalProductRuntimePackage=loadCanonicalWorkbookRuntimePackage;\n'+
 'const loadFormalProductRuntimeV2Package=loadCanonicalWorkbookRuntimePackage;\n'+
 registry.slice(registry.indexOf('export function getRuntimeMasterEntry'));
const importsRe=/\b(?:from\s*|import\s*\(?\s*)['"]([^'"]+)['"]/g;
function sourcePath(importer,specifier){
 if(specifier.startsWith('.'))return posix.normalize(posix.join(posix.dirname(importer),specifier));
 if(specifier.startsWith('/work-management/'))return 'src'+specifier;
 if(specifier.startsWith('/'))return 'src/ui/web'+specifier;
 throw new Error('NON_BROWSER_DEPENDENCY:'+specifier+' in '+importer);
}
function collect(path){
 if(Object.hasOwn(modules,path))return;
 let source=path===registryPath?registry:readFileSync(path,'utf8');
 if(path==='src/catalog/runtime-master/uchirimo-glass-rule-model.mjs')source=source.replace("import { createHash } from 'node:crypto';","const createHash=()=>{throw new Error('Authoring normalization is not part of this read-only preview');};");
 if(path==='src/ui/web/app.js')source=source.replace("const parts=location.pathname.split('/').filter(Boolean);","const parts=['runtime-lab'];").replace('{showInventory:true});await activeProductEditor.mount();','{showInventory:true});await activeProductEditor.mount();window.__eightPreviewEditor=activeProductEditor;');
 modules[path]=source;dependencies[path]={};
 for(const match of source.matchAll(importsRe)){
  const target=sourcePath(path,match[1]);dependencies[path][match[1]]=target;collect(target);
 }
}
collect('src/catalog/runtime-master/runtime-app-bridge.mjs');collect('src/ui/web/app.js');
const packed=gzipSync(JSON.stringify(packages)).toString('base64');
const identity=createHash('sha256').update(JSON.stringify(modules)).update(packed).digest('hex');
const exactHead=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const generatedAt=new Date().toISOString();
const safe=x=>JSON.stringify(x).replaceAll('</script','<\\/script');
const bootstrap=`
const bytes=Uint8Array.from(atob(${safe(packed)}),c=>c.charCodeAt(0));
window.__eightPackages=JSON.parse(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text());
const sources=${safe(modules)},deps=${safe(dependencies)},urls={};
function moduleUrl(path){if(urls[path])return urls[path];let s=sources[path];for(const [spec,target]of Object.entries(deps[path])){const u=moduleUrl(target);s=s.split("'"+spec+"'").join("'"+u+"'").split('"'+spec+'"').join('"'+u+'"');}return urls[path]=URL.createObjectURL(new Blob([s],{type:'text/javascript'}));}
const api=await import(moduleUrl('src/catalog/runtime-master/runtime-app-bridge.mjs'));
const inventory=api.runtimeAppIntegrationInventory().filter(x=>x.selectable);
window.__eightPreviewIdentity=${safe(identity)};
window.fetch=async(input)=>{const u=new URL(typeof input==='string'?input:input.url,location.href);let data;
if(u.pathname==='/api/health')data={ok:true,buildId:'EIGHT-SLIM-'+window.__eightPreviewIdentity.slice(0,12),catalogVersion:'8シリーズ / 内窓 共通枠仕様 R3',inventory:[],runtimeMasterIntegrations:inventory};
else if(u.pathname==='/api/catalog/products')data=[];
else if(u.pathname==='/api/runtime-master/integrations')data=inventory;
else if(u.pathname==='/api/runtime-master/resolve')data=await api.resolveRuntimeAppProduct(u.searchParams.get('productId'),JSON.parse(u.searchParams.get('selection')??'{}'));
else return new Response(JSON.stringify({error:'Preview supports product selection only'}),{status:404});
return new Response(JSON.stringify(data),{headers:{'content-type':'application/json'}});};
await import(moduleUrl('src/ui/web/app.js'));
await new Promise((resolve,reject)=>{const deadline=Date.now()+10000;function ready(){if(window.__eightPreviewEditor)return resolve();if(Date.now()>deadline)return reject(new Error('Preview editor did not mount'));setTimeout(ready,10);}ready();});
const editor=window.__eightPreviewEditor;
const manufacturer=document.querySelector('#manufacturer');manufacturer.value='YKK AP';await editor.handleChange({target:manufacturer});
const product=document.querySelector('#product');product.value='SER-YKKAP-UCHIRIMO';await editor.handleChange({target:product});
editor.state.selection={room_specification:'residential',window_type:'sliding_window',sash_configuration:'two_panel',frame_color:'white',glass_family:'insulating_glass',sales_glass_design:'grid',sales_glass_pattern:'wa01_resin',fukashi_presence:'none',size_w:1000,size_h:1000};
await editor.resolve();
`;
let html=readFileSync('src/ui/web/index.html','utf8');
html=html.replace(/<link rel="stylesheet" href="\/([^\"]+)">/g,(_,name)=>'<style>'+readFileSync('src/ui/web/'+name,'utf8')+'</style>');
html=html.replace('<main id="appMain" aria-live="polite"></main>',`<section class="card compact"><h2>ウチリモ — ガラスデザイン・R6オプション確認</h2><p>8シリーズの配置版と同じマスター・Adapter・選択処理を使用。</p><p>このHTMLは商品選定の確認用です。API通信をブラウザ内処理に置き換えています。案件保存・見積出力は配置版で利用できます。</p><small>App 0.2.0-recovery | Product Master v1.0-P7R1-R6 / Runtime v1.0-P7R1-R5 | Preview Build: ${identity.slice(0,16)}<br>HEAD: ${exactHead}<br>生成: ${generatedAt}</small></section><main id="appMain" aria-live="polite"></main>`);
html=html.replace('<script type="module" src="/app.js"></script>',()=>'<script type="module">'+bootstrap+'</script>').replace('<script type="module" src="/estimate-output-integration.mjs"></script>','');
const out=resolve(process.argv[2]??'artifacts/eight-series-review/index.html');mkdirSync(dirname(out),{recursive:true});writeFileSync(out,html);
writeFileSync(dirname(out)+'/identity.json',JSON.stringify({identity,exactHead,generatedAt,productMasterVersion:'v1.0-P7R1-R6',uchirimoRuntimeVersion:'v1.0-P7R1-R5',series:[...series],runtimeIdentities:entries.map(e=>({series:e.series,manifestSha256:e.runtimeManifestSha256})),bytes:Buffer.byteLength(html)},null,2)+'\n');
console.log(JSON.stringify({out,identity,bytes:Buffer.byteLength(html),modules:Object.keys(modules).length}));
