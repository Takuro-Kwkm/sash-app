import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRegisteredRuntime } from '../src/catalog/runtime-master/runtime-master-registry.mjs';
import { getRuntimeAppIntegration } from '../src/catalog/runtime-master/runtime-app-bridge.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const webRoot = join(root, 'src', 'ui', 'web');
const output = resolve(process.argv[2] ?? join(root, 'artifacts', 'tw-runtime-ui-preview', 'index.html'));
const runtime = await loadRegisteredRuntime('LIXIL', 'TW');
const integration = getRuntimeAppIntegration('SER-LIXIL-TW');
const [htmlSource, appSource, styles, waveStyles, engineSource] = await Promise.all([
  readFile(join(webRoot, 'index.html'), 'utf8'), readFile(join(webRoot, 'app.js'), 'utf8'),
  readFile(join(webRoot, 'styles.css'), 'utf8'), readFile(join(webRoot, 'styles-wave3.css'), 'utf8'),
  readFile(join(root, 'src/catalog/runtime-master/canonical-workbook-runtime-engine.mjs'), 'utf8'),
]);
const generatedAt = new Date().toISOString();
const buildId = `TW-UI-${createHash('sha256').update(appSource).update(engineSource).update(JSON.stringify(runtime.master)).digest('hex').slice(0, 12)}`;
const json = (value) => JSON.stringify(value).replaceAll('</script', '<\\/script');
const browserEngine = engineSource.replace('export function evaluateCanonicalWorkbookRuntime', 'export function evaluateCanonicalWorkbookRuntime');
const bootstrap = `
const master=${json(runtime.master)};
const integration=${json(integration)};
const integrity=${json(runtime.sourcePackageIntegrity)};
const engineUrl=URL.createObjectURL(new Blob([${json(browserEngine)}],{type:"text/javascript"}));
const {evaluateCanonicalWorkbookRuntime}=await import(engineUrl);
const label=(row,fallback)=>row?.display_label??row?.displayLabel??row?.label??fallback;
const valuesFor=(name)=>master.values.filter(row=>row.field_name===name&&row.status==="CURRENT"&&row.runtime_selectable!==false);
function toUi(state){
  const fields=master.fields.flatMap((def,index)=>{
    const fieldState=state.fields[def.field_name];
    if(!fieldState||fieldState.visibility==="HIDE"||def.runtime_included===false)return [];
    const byValue=new Map(valuesFor(def.field_name).map(row=>[JSON.stringify(row.canonical_value),row]));
    return [{key:def.field_name,displayLabel:label(def,def.field_name),displayOrder:Number(def.display_order??index+1),dataType:def.data_type==="array"?"MULTI_ENUM":"ENUM",required:Boolean(fieldState.required),values:(fieldState.allowed_values??[]).map(value=>{const row=byValue.get(JSON.stringify(value));return{value,displayLabel:label(row,String(value)),manualCheck:Boolean(row?.manual_check),disabled:row?.user_selectable===false};}),selectionMode:def.selection_mode,runtimeState:fieldState.state,readOnly:def.selection_mode==="AUTO_RESOLVE"&&(fieldState.allowed_values??[]).length===1,parentFields:def.parent_fields??[]}];
  }).sort((a,b)=>a.displayOrder-b.displayOrder);
  const visible=new Set(fields.map(field=>field.key));
  const selection=Object.fromEntries(Object.entries(state.fields).filter(([name,row])=>visible.has(name)&&row.value!==null&&row.value!==undefined).map(([name,row])=>[name,row.value]));
  return{productId:integration.id,manufacturer:"LIXIL",series:"TW",source:"RUNTIME_MASTER",status:"READY",selection,fields,notices:(state.warnings??[]).map(row=>row.message??String(row)),manualWarnings:[],validation:{status:state.status,errors:(state.errors??[]).map(error=>({errorCode:error.code,field:error.field,message:(error.field?error.field+": ":"")+(error.code??"入力値が成立しません")})),missingRequiredFields:state.missing_required_fields??[]},derivedEntities:[],derivedComponents:[],derivedOptions:state.derived_options??[],clearedFields:state.cleared_fields??[],optionCodeResults:state.option_code_results??[],optionCodeLinkageCount:state.option_code_linkage_count??0,runtimeCapabilities:master.capabilities,runtimeMaster:{masterVersion:"integrated-v0.2",packageVersion:"integrated-v0.2",schemaVersion:"2.0",adapterType:"CANONICAL_WORKBOOK_REFERENCE_V1",sourceHash:integration.sourceHash,canonicalRuntimeReference:integration.canonicalRuntimeReference,sourcePackageIntegrity:integrity}};
}
const reply=(body,status=200)=>Promise.resolve(new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8"}}));
window.fetch=(input)=>{const url=new URL(typeof input==="string"?input:input.url,location.href);
  if(url.pathname==="/api/health")return reply({ok:true,buildId:${json(buildId)},buildTimestamp:${json(generatedAt)},catalogVersion:"TW integrated-v0.2 Review Build",inventory:[],runtimeMasterIntegrations:[integration]});
  if(url.pathname==="/api/catalog/products")return reply([]);
  if(url.pathname==="/api/runtime-master/integrations")return reply([integration]);
  if(url.pathname==="/api/runtime-master/resolve"){let selection={};try{selection=JSON.parse(url.searchParams.get("selection")??"{}");}catch{}return reply(toUi(evaluateCanonicalWorkbookRuntime(master,selection)));}
  return reply({error:"Review Preview endpoint not found"},404);
};
await import(URL.createObjectURL(new Blob([${json(appSource)}],{type:"text/javascript"})));
`;
const banner = `<section class="card compact review-build-note"><h2>TW Runtime UI Review Build</h2><p class="lead"><strong>REVIEW IN PROGRESS</strong> — LIXIL TW / 新築系外窓（一般サッシ） / integrated-v0.2 / UI Standard v1.5</p><p class="lead">生成: ${generatedAt} · データ: 正式RuntimeのRepository transport fixture（SHA検証済み） · APIのみブラウザ内stub。保存・外部通信は行いません。</p></section>`;
const html = htmlSource
  .replace('<link rel="stylesheet" href="/styles.css">', `<style>${styles}</style>`)
  .replace('<link rel="stylesheet" href="/styles-wave3.css">', `<style>${waveStyles}.review-build-note strong{color:#9b6210}</style>`)
  .replace('<main>', `<main>${banner}`)
  .replace('<script type="module" src="/app.js"></script>', `<script type="module">${bootstrap}</script>`);
await mkdir(dirname(output), { recursive:true });
await writeFile(output, html);
console.log(JSON.stringify({ output, buildId, generatedAt, bytes:Buffer.byteLength(html), windowTypes:runtime.master.provider.windows.length, sizes:runtime.master.provider.sizes.length, optionCodeLinkages:runtime.master.optionCodeLinkages.length }));
