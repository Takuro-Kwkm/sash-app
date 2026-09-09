import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCanonicalWorkbookRuntimePackage } from '../src/catalog/runtime-master/canonical-runtime-manifest-loader.mjs';
import { getRuntimeAppIntegration } from '../src/catalog/runtime-master/runtime-app-bridge.mjs';
import { getRuntimeMasterEntry } from '../src/catalog/runtime-master/runtime-master-registry.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const webRoot = join(root, 'src', 'ui', 'web');
const output = resolve(process.argv[2] ?? join(root, 'artifacts', 'uchirimo-runtime-ui-preview', 'index.html'));
const entry = getRuntimeMasterEntry('YKK AP', 'ウチリモ 内窓');
const runtimePackage = await loadCanonicalWorkbookRuntimePackage(entry);
const integration = getRuntimeAppIntegration('SER-YKKAP-UCHIRIMO');
const [htmlSource, appSource, styles, waveStyles, adapterSource] = await Promise.all([
  readFile(join(webRoot, 'index.html'), 'utf8'),
  readFile(join(webRoot, 'app.js'), 'utf8'),
  readFile(join(webRoot, 'styles.css'), 'utf8'),
  readFile(join(webRoot, 'styles-wave3.css'), 'utf8'),
  readFile(join(root, 'src/catalog/runtime-master/uchirimo-tabular-v1-adapter.mjs'), 'utf8'),
]);
const generatedAt = new Date().toISOString();
const buildId = `UCHIRIMO-UI-${createHash('sha256').update(appSource).update(adapterSource).update(JSON.stringify(runtimePackage.manifest)).digest('hex').slice(0, 12)}`;
const json = (value) => JSON.stringify(value).replaceAll('</script', '<\\/script');
const order = {
  room_specification:25, window_type:30, sash_configuration:32, size_class:34, reverse_handing:36,
  three_panel_layout:37, hinge_side:38, glass_family:40, glass_structure:42, low_e_type:50,
  glass_coating_color:52, glass_surface_type:54, safety_treatment:56, grille_type:57,
  grille_material:58, muntin_type:59, vacuum_glass_product:59.5, spacer_type:60, gas_fill:70,
  cavity_thickness_mm:72, frame_color:80, frame_installation_mode:90, frame_projection:91,
  extension_frame_type:92, extension_frame_reinforcement:93, bathroom_installation_type:94,
  size_mode:100, size_w:101, size_h:102, sash_width_allocation:103, sash_w1:104, sash_w2:105,
  sash_w3:106, sash_w4:107,
};
const browserAdapter = adapterSource.replace(
  "import { innerWindowDisplayOrder } from './inner-window-runtime-ui-contract.mjs';",
  `const PREVIEW_ORDER=${json(order)};\nconst innerWindowDisplayOrder=(field,index=0)=>PREVIEW_ORDER[field.field_name]??(field.domain==="INSTALLATION"?95+index/1000:["HARDWARE","OPTION"].includes(field.domain)?110+index/1000:109+index/1000);`,
);
const bootstrap = `
const runtimePackage=${json(runtimePackage)};
const integration=${json(integration)};
const adapterUrl=URL.createObjectURL(new Blob([${json(browserAdapter)}],{type:"text/javascript"}));
const {adaptUchirimoTabularV1}=await import(adapterUrl);
const adapted=adaptUchirimoTabularV1(runtimePackage);
const master=adapted.master;
const label=(row,fallback)=>row?.display_label??row?.displayLabel??row?.display_name??row?.label??fallback;
const valuesFor=(name)=>master.values.filter(row=>row.field_name===name&&row.status==="CURRENT"&&row.runtime_selectable!==false);
function toUi(state){
  const fields=master.fields.flatMap((def,index)=>{
    const fieldState=state.fields[def.field_name];
    if(!fieldState||fieldState.visibility==="HIDE"||def.runtime_included===false)return [];
    if((def.selection_mode==="DERIVED"||def.selection_mode==="FIXED")&&def.show_read_only!==true)return [];
    const byValue=new Map(valuesFor(def.field_name).map(row=>[JSON.stringify(row.canonical_value),row]));
    return [{key:def.field_name,displayLabel:fieldState.display_label??label(def,def.field_name),displayOrder:Number(def.display_order??index+1),dataType:["integer","number"].includes(def.data_type)?"NUMBER":def.data_type==="array"?"MULTI_ENUM":def.data_type==="string"?"TEXT":"ENUM",unit:fieldState.unit??def.unit??null,required:Boolean(fieldState.required),values:(fieldState.allowed_values??[]).filter(value=>{const row=byValue.get(JSON.stringify(value));return row?.user_selectable!==false||fieldState.readOnly||def.show_read_only===true;}).map(value=>{const row=byValue.get(JSON.stringify(value));return{value,displayLabel:label(row,String(value)),manualCheck:Boolean(row?.manual_check),disabled:row?.user_selectable===false};}),selectionMode:def.selection_mode,runtimeState:fieldState.state,readOnly:Boolean(fieldState.readOnly),parentFields:def.parent_fields??[]}];
  }).sort((a,b)=>a.displayOrder-b.displayOrder||a.key.localeCompare(b.key,"ja"));
  const selection=Object.fromEntries(Object.entries(state.fields).filter(([,row])=>row.value!==null&&row.value!==undefined).map(([name,row])=>[name,row.value]));
  return{productId:integration.id,manufacturer:integration.manufacturer,series:integration.series,source:"RUNTIME_MASTER",status:"READY",selection,dependencyFields:master.fields.map(def=>({key:def.field_name,parentFields:def.parent_fields??[]})),fields,notices:["ORDER_READY = false：営業見積入力用です。発注確定にはメーカー確認が必要です。",...(state.warnings??[])],manualWarnings:state.manual_warnings??[],validation:{status:state.status,errors:(state.errors??[]).map(error=>({errorCode:error.code??"RUNTIME_VALIDATION_ERROR",field:error.field??null,message:error.field?error.field+": "+(error.code??"入力値が成立しません"):String(error.code??error)})),missingRequiredFields:state.missing_required_fields??[]},derivedEntities:[],derivedComponents:state.derived_components??[],derivedOptions:state.derived_options??[],clearedFields:state.cleared_fields??[],optionCodeResults:[],optionCodeLinkageCount:0,runtimeCapabilities:master.capabilities,dimensionResult:state.dimension_result,orderReady:false,runtimeMaster:{masterVersion:integration.masterVersion,packageVersion:integration.packageVersion,schemaVersion:integration.schemaVersion,adapterType:integration.adapterType,sourceHash:integration.sourceHash,canonicalRuntimeReference:integration.canonicalRuntimeReference,sourcePackageIntegrity:runtimePackage.integrity}};
}
const reply=(body,status=200)=>Promise.resolve(new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8"}}));
window.fetch=(input)=>{const url=new URL(typeof input==="string"?input:input.url,location.href);
  if(url.pathname==="/api/health")return reply({ok:true,buildId:${json(buildId)},buildTimestamp:${json(generatedAt)},catalogVersion:"YKK AP ウチリモ v1.0-P7R1-R2 Review Build",inventory:[],runtimeMasterIntegrations:[integration]});
  if(url.pathname==="/api/catalog/products")return reply([]);
  if(url.pathname==="/api/runtime-master/integrations")return reply([integration]);
  if(url.pathname==="/api/runtime-master/resolve"){let selection={};try{selection=JSON.parse(url.searchParams.get("selection")??"{}");}catch{}return reply(toUi(adapted.resolver(selection)));}
  return reply({error:"Review Preview endpoint not found"},404);
};
await import(URL.createObjectURL(new Blob([${json(appSource)}],{type:"text/javascript"})));
`;
const banner = `<section class="card compact review-build-note"><h2>ウチリモ Runtime UI Review Build</h2><p class="lead"><strong>REVIEW IN PROGRESS</strong> — YKK AP ウチリモ 内窓 / INNER_WINDOW / v1.0-P7R1-R2 / UI Standard v1.6</p><p class="lead">生成: ${generatedAt} · データ: 正式RuntimeのRepository transport fixture（4 component SHA検証済み） · APIのみブラウザ内stub。保存・外部通信は行いません。</p><p class="lead">Build Identity: ${buildId} · Manifest SHA-256: ${entry.runtimeManifestSha256}</p></section>`;
const html = htmlSource
  .replace('<link rel="stylesheet" href="/styles.css">', `<style>${styles}</style>`)
  .replace('<link rel="stylesheet" href="/styles-wave3.css">', `<style>${waveStyles}.review-build-note strong{color:#9b6210}</style>`)
  .replace('<main>', `<main>${banner}`)
  .replace('<script type="module" src="/app.js"></script>', `<script type="module">${bootstrap}</script>`);
await mkdir(dirname(output), { recursive:true });
await writeFile(output, html);
console.log(JSON.stringify({ output, buildId, generatedAt, bytes:Buffer.byteLength(html), fields:Object.values(runtimePackage.documents).find((document)=>document?.field_registry)?.field_registry.length ?? 0, components:runtimePackage.manifest.runtimeFiles.length }));
