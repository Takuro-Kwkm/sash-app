import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {dirname,join,resolve,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {candidateRuntimeEntries,readCandidateModule} from '../src/catalog/runtime-master/candidate-runtime-registry.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),web=join(root,'src/ui/web');
const output=resolve(process.argv[2]),entry=candidateRuntimeEntries[0];
if(candidateRuntimeEntries.length!==1)throw Error('ONE_FIXED_CANDIDATE_REQUIRED');
const runtimeDocument=readCandidateModule(entry);
if(runtimeDocument.composition?.bindings?.some(row=>row.executable))throw Error('REFERENCE_PREVIEW_BUNDLE_NOT_ADMITTED');
const json=value=>JSON.stringify(value).replaceAll('<','\\u003c');
const modules={},overrides={
  'src/catalog/runtime-master/runtime-app-bridge.mjs':`export const getRuntimeAppIntegration=()=>null;`,
};
const pattern=/\b(?:from\s*|import\s*\()(['"])([^'"]+)\1/g;
function target(spec,parent){
  if(spec.startsWith('/work-management/')||spec.startsWith('/estimate-output/'))return 'src'+spec;
  if(spec.startsWith('/'))return relative(root,join(web,spec.slice(1)));
  if(spec.startsWith('.'))return relative(root,resolve(root,dirname(parent),spec));
  throw Error('BROWSER_MODULE_NOT_BUNDLED:'+spec);
}
async function collect(id){
  if(modules[id])return;
  let source=overrides[id]??await readFile(join(root,id),'utf8');
  if(id.endsWith('.json'))source='export default '+source.trim()+';';
  if(id==='src/ui/web/app.js'||id==='src/ui/web/estimate-output-integration.mjs')source=source.replaceAll('location.pathname',"(new URLSearchParams(location.search).get('route')||'/runtime-lab')");
  if(id==='src/ui/web/estimate-output-integration.mjs')source=source.replaceAll('url.pathname',"(url.searchParams.get('route')||url.pathname)");
  const deps=[];source=source.replace(pattern,(whole,quote,spec)=>{const dep=target(spec,id),token='PREVIEW_MODULE_'+deps.length+'_END';deps.push({token,dep});return whole.replace(spec,token);}).replace(/\s+with\s*\{\s*type\s*:\s*['"]json['"]\s*\}/g,'');
  modules[id]={source,deps};for(const {dep}of deps)await collect(dep);
}
for(const id of ['src/catalog/runtime-master/composed-product-runtime-adapter.mjs','src/catalog/runtime-master/declared-window-flow.mjs','src/ui/web/app.js','src/ui/web/estimate-output-integration.mjs'])await collect(id);
const generatedAt=new Date().toISOString(),codeSha256={};
for(const id of Object.keys(modules))if(!overrides[id])codeSha256[id]=createHash('sha256').update(await readFile(join(root,id))).digest('hex');
const buildId='CANDIDATE-HTML-'+createHash('sha256').update(json({modules,indexSha:entry.candidateRuntimeReference.indexSha256})).digest('hex').slice(0,16);
const bundledEntry={...entry};delete bundledEntry.modulePath;
const bootstrap=`
const modules=${json(modules)},entry=${json(bundledEntry)},runtimeDocument=${json(runtimeDocument)};
const urls=new Map(),building=new Set();
function moduleUrl(id){if(urls.has(id))return urls.get(id);if(building.has(id))throw Error('CYCLIC_PREVIEW_MODULE:'+id);building.add(id);const item=modules[id];let source=item.source;for(const{token,dep}of item.deps)source=source.replaceAll(token,moduleUrl(dep));const url=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));urls.set(id,url);building.delete(id);return url;}
for(const name of ['pushState','replaceState']){const original=history[name].bind(history);history[name]=(state,title,path)=>{const isUrl=path instanceof URL||/^https?:/.test(String(path));const url=isUrl?new URL(String(path),location.href):new URL(location.href);if(!isUrl){url.searchParams.set('route',String(path));url.searchParams.delete('estimateOutput');}return original(state,title,url.href);};}
const {adaptComposedProductRuntime}=await import(moduleUrl('src/catalog/runtime-master/composed-product-runtime-adapter.mjs'));
const {applyDeclaredWindowFlow}=await import(moduleUrl('src/catalog/runtime-master/declared-window-flow.mjs'));
const reader=await adaptComposedProductRuntime(runtimeDocument,entry,()=>{throw Error('UNBOUND_PREVIEW_REFERENCE');});
const product={...entry,status:'CANDIDATE_LOCAL_READY',selectable:true,source:'RUNTIME_MASTER',candidateOnly:true};
function resolveSelection(input){const result=reader.uiResolver(input);return {...result,productId:entry.id,manufacturer:entry.manufacturer,series:entry.series,source:'RUNTIME_MASTER',status:'CANDIDATE_LOCAL_READY',fields:applyDeclaredWindowFlow(result.fields,entry)};}
const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8'}});
window.fetch=async input=>{const url=new URL(typeof input==='string'?input:input.url,location.href);if(url.pathname==='/api/health')return reply({ok:true,buildId:${json(buildId)},buildTimestamp:${json(generatedAt)},catalogVersion:'営業見積依頼 フロー確認候補',inventory:[],runtimeMasterIntegrations:[product]});if(url.pathname==='/api/catalog/products')return reply([]);if(url.pathname==='/api/runtime-master/integrations')return reply([product]);if(url.pathname==='/api/runtime-master/resolve'){try{if(url.searchParams.get('productId')!==entry.id)throw Error('UNBOUND_PREVIEW_PRODUCT');return reply(resolveSelection(JSON.parse(url.searchParams.get('selection')??'{}')));}catch(error){return reply({error:error.message},400);}}return reply({error:'Unavailable preview endpoint'},404);};
window.__ComposedCandidatePreview={buildId:${json(buildId)},indexSha256:entry.candidateRuntimeReference.indexSha256,resolve:resolveSelection,moduleUrl,product};
await import(moduleUrl('src/ui/web/app.js'));await import(moduleUrl('src/ui/web/estimate-output-integration.mjs'));
`;
let html=await readFile(join(web,'index.html'),'utf8');
for(const name of ['styles.css','styles-wave3.css','work-management.css','estimate-output.css','theme.css']){
  const css=await readFile(join(web,name),'utf8');html=html.replace(`<link rel="stylesheet" href="/${name}">`,()=>`<style>${css}</style>`);
}
const theme=await readFile(join(web,'theme.js'),'utf8');
html=html.replace('<script src="/theme.js"></script>',()=>`<script>${theme}</script>`).replace('<script type="module" src="/app.js"></script>',()=>`<script type="module">${bootstrap}</script>`).replace('<script type="module" src="/estimate-output-integration.mjs"></script>','');
html=html.replace('<body>','<body><aside style="padding:12px 20px;background:#fff4cf;color:#624b16;font-size:13px">営業見積依頼のフロー確認候補です。商品仕様・判定・保存・帳票は現在の実装と共通です。入力はこのブラウザ内に保存されます。正式採用・公開は後続の承認後に行います。</aside>');
await mkdir(dirname(output),{recursive:true});await writeFile(output,html);
const result={output,buildId,generatedAt,bytes:Buffer.byteLength(html),actualSourceModules:Object.keys(modules).length,
  sourceCommit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),
  indexSha256:entry.candidateRuntimeReference.indexSha256,moduleSha256:entry.sha256,codeSha256,
  fidelity:'SAME_RUNTIME_MASTER_ADAPTER_FLOW_UI_SNAPSHOT_STORAGE_OUTPUT; API_TRANSPORT_IN_FILE; SINGLE_NONREFERENCING_CANDIDATE_ONLY',formal_adoption:false,release:false};
await writeFile(output.replace(/\.html$/,'.build.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({...result,codeSha256:undefined}));
