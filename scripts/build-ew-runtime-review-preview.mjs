import {loadCanonicalWorkbookRuntimePackage} from '../src/catalog/runtime-master/canonical-runtime-manifest-loader.mjs';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {dirname,join,resolve,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {getRuntimeMasterEntry} from '../src/catalog/runtime-master/runtime-master-registry.mjs';
import {getRuntimeAppIntegration} from '../src/catalog/runtime-master/runtime-app-bridge.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),web=join(root,'src/ui/web');
const output=resolve(process.argv[2]??join(root,'artifacts/ew-runtime-ui-preview/index.html'));
const json=x=>JSON.stringify(x).replaceAll('</script','<\\/script');
const runtime=await loadCanonicalWorkbookRuntimePackage(getRuntimeMasterEntry('LIXIL','EW'));
const document=runtime.documents.runtime_master,manifest=runtime.manifest,integrity=runtime.integrity,integration=getRuntimeAppIntegration('SER-LIX-EW');
const modules={},entry={manufacturer:'LIXIL',series:'EW',masterVersion:document.package_version,schemaVersion:'2.0',packageType:'RUNTIME_MANIFEST_V2',adapterType:'CANONICAL_WORKBOOK_REFERENCE_V1'};
const overrides={
 'src/catalog/runtime-master/runtime-master-registry.mjs':`import {adaptCanonicalWorkbookReferenceV1} from './canonical-workbook-reference-v1-adapter.mjs';\nimport {withCanonicalWorkbookReferenceV1Behavior} from './canonical-workbook-reference-v1-behavior-normalizer.mjs';\nconst adapted=withCanonicalWorkbookReferenceV1Behavior(adaptCanonicalWorkbookReferenceV1({documents:{runtime_master:${json(document)}},manifest:${json(manifest)}}));\nconst entry=${json(entry)};\nexport const runtimeMasterInventory=[entry];\nexport const getRuntimeMasterEntry=(manufacturer,series)=>manufacturer==='LIXIL'&&series==='EW'?entry:null;\nexport async function loadRegisteredRuntime(manufacturer,series){return getRuntimeMasterEntry(manufacturer,series)?{...adapted,sourcePackageIntegrity:${json(integrity)}}:null;}`,
 'src/catalog/runtime-master/app-runtime-integration-registry.mjs':`export const appRuntimeIntegrationRegistry=[${json(integration)}];`,
};
const specPattern=/\b(?:from\s*|import\s*\()(['"])([^'"]+)\1/g;
function target(spec,parent){
 if(spec.startsWith('node:'))throw Error('Node-only module in browser preview: '+spec);
 if(spec.startsWith('/work-management/')||spec.startsWith('/estimate-output/'))return 'src'+spec;
 if(spec.startsWith('/'))return relative(root,join(web,spec.slice(1)));
 if(spec.startsWith('.'))return relative(root,resolve(root,dirname(parent),spec));
 throw Error('Unbundled external module in browser preview: '+spec);
}
async function collect(id){
 if(modules[id])return;
 let source=overrides[id]??await readFile(join(root,id),'utf8');
 if(id.endsWith('.json'))source='export default '+source.trim()+';';
 // File-only routing adapter; product/UI/save/output logic stays in actual modules.
 if(id==='src/ui/web/app.js'||id==='src/ui/web/estimate-output-integration.mjs')source=source.replaceAll('location.pathname',"(new URLSearchParams(location.search).get('route')||'/runtime-lab')");
 if(id==='src/ui/web/estimate-output-integration.mjs')source=source.replaceAll('url.pathname',"(url.searchParams.get('route')||url.pathname)");
 const deps=[];source=source.replace(specPattern,(whole,quote,spec)=>{const dep=target(spec,id),token='EW_MODULE_'+deps.length+'_END';deps.push({token,dep});return whole.replace(spec,token);}).replace(/\s+with\s*\{\s*type\s*:\s*['"]json['"]\s*\}/g,'');
 modules[id]={source,deps};for(const{dep}of deps)await collect(dep);
}
for(const path of ['src/catalog/runtime-master/runtime-app-bridge.mjs','src/ui/web/app.js','src/ui/web/estimate-output-integration.mjs'])await collect(path);
const generatedAt=new Date().toISOString(),buildId='EW-202610-'+createHash('sha256').update(json(modules)).digest('hex').slice(0,12);
const bootstrap=`const modules=${json(modules)};\nconst urls=new Map(),building=new Set();\nfunction moduleUrl(id){if(urls.has(id))return urls.get(id);if(building.has(id))throw Error('Cyclic preview module: '+id);building.add(id);const item=modules[id];let source=item.source;for(const{token,dep}of item.deps)source=source.replaceAll(token,moduleUrl(dep));const url=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));urls.set(id,url);building.delete(id);return url;}\nfor(const name of ['pushState','replaceState']){const original=history[name].bind(history);history[name]=(state,title,path)=>{const isUrl=path instanceof URL||/^https?:/.test(String(path));const url=isUrl?new URL(String(path),location.href):new URL(location.href);if(!isUrl){url.searchParams.set('route',String(path));url.searchParams.delete('estimateOutput');}return original(state,title,url.href);};}\nconst bridge=await import(moduleUrl('src/catalog/runtime-master/runtime-app-bridge.mjs'));\nconst integrations=bridge.runtimeAppIntegrationInventory();\nconst reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8'}});\nwindow.fetch=async input=>{const url=new URL(typeof input==='string'?input:input.url,location.href);if(url.pathname==='/api/health')return reply({ok:true,buildId:${json(buildId)},buildTimestamp:${json(generatedAt)},catalogVersion:${json('EW '+document.package_version+' / 2026-10 Source Delta')},inventory:[],runtimeMasterIntegrations:integrations});if(url.pathname==='/api/catalog/products')return reply([]);if(url.pathname==='/api/runtime-master/integrations')return reply(integrations);if(url.pathname==='/api/runtime-master/resolve'){try{return reply(await bridge.resolveRuntimeAppProduct(url.searchParams.get('productId'),JSON.parse(url.searchParams.get('selection')??'{}')));}catch(e){return reply({error:e.message},400);}}return reply({error:'Unavailable preview endpoint'},404);};\nwindow.__EWPreview={buildId:${json(buildId)},integrity:${json(integrity)},resolve:selection=>bridge.resolveRuntimeAppProduct('SER-LIX-EW',selection),moduleUrl};\nawait import(moduleUrl('src/ui/web/app.js'));await import(moduleUrl('src/ui/web/estimate-output-integration.mjs'));`;
let html=await readFile(join(web,'index.html'),'utf8');
for(const name of ['styles.css','styles-wave3.css','work-management.css','estimate-output.css','theme.css'])html=html.replace(`<link rel="stylesheet" href="/${name}">`,`<style>${await readFile(join(web,name),'utf8')}</style>`);
html=html.replace('<script src="/theme.js"></script>',`<script>${await readFile(join(web,'theme.js'),'utf8')}</script>`).replace('<script type="module" src="/app.js"></script>',`<script type="module">${bootstrap}</script>`).replace('<script type="module" src="/estimate-output-integration.mjs"></script>','');
const note=`<aside style="padding:12px 20px;background:#eef5f2;color:#214d3c;font-size:13px;border-bottom:1px solid #c8ded2">App 0.2.0-recovery · LIXIL EW · 2026年10月カタログ改訂 · ${document.package_version} · 正式Runtime<br>実装のUI・商品判定・保存・帳票を収録。EWのみ表示。APIはファイル内で処理し、入力はこのブラウザに保存されます。 ${buildId} · ${generatedAt}</aside>`;
html=html.replace('</head>','<style>footer{position:static!important}</style></head>').replace('<body>','<body>'+note);await mkdir(dirname(output),{recursive:true});await writeFile(output,html);
const result={output,buildId,generatedAt,bytes:Buffer.byteLength(html),actualSourceModules:Object.keys(modules).length,windowTypes:document.provider.windows.length,sizes:document.provider.sizes.length,optionCodeLinkages:document.provider.options.length,sourcePackageIntegrity:integrity};
await writeFile(output.replace(/\.html$/,'.build.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
