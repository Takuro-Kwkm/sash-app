import{createHash}from"node:crypto";
import{mkdir,readFile,writeFile}from"node:fs/promises";
import{dirname,join,resolve}from"node:path";
import{fileURLToPath}from"node:url";
import{createCatalog,catalogInventory}from"../src/catalog/catalog-adapter.mjs";
import{CURRENT_WINDOW_SERIES_MODULES}from"../src/catalog/modules/current-window-series.mjs";
import{CONCORDS30_MODULE}from"../src/catalog/modules/concords30-module.mjs";

const here=dirname(fileURLToPath(import.meta.url));
const root=join(here,"..");
const webRoot=join(root,"src","ui","web");
const output=resolve(process.argv[2]??join(root,"artifacts","size-ui-review-r2","index.html"));
const catalog=createCatalog([...CURRENT_WINDOW_SERIES_MODULES,CONCORDS30_MODULE]);
const webFiles=await Promise.all(["index.html","app.js","size-presentation.js","styles.css","styles-wave3.css"].map(async(name)=>[name,await readFile(join(webRoot,name),"utf8")]));
const web=Object.fromEntries(webFiles);
const buildId=`RECOVERY-${createHash("sha256").update(JSON.stringify(catalog)).update(webFiles.map(([,body])=>body).join("\n")).digest("hex").slice(0,12)}`;
const buildTimestamp=new Date().toISOString();
const catalogVersion="V4.5 SIZE-MASTER-FORMAL + CONCORD-S30";
const inventory=catalogInventory(catalog);
const sizeProductIds=new Set(catalog.standardSizeRecords.map((row)=>row.productId));
const previewProducts=catalog.products.filter((product)=>sizeProductIds.has(product.id));
const previewInventory=inventory.filter((row)=>sizeProductIds.has(row.productId));

const moduleFiles=[
  "src/catalog/selector-ops.mjs",
  "src/catalog/selector.mjs",
  "src/catalog/size-resolver.mjs",
  "src/catalog/resolver-values.mjs",
  "src/catalog/resolver-auto.mjs",
  "src/catalog/resolver-fields.mjs",
  "src/catalog/dimension-resolver.mjs",
  "src/catalog/catalog-runtime.mjs",
  "src/catalog/catalog-resolver.mjs",
  "src/ui/web/size-presentation.js"
];
const modules=Object.fromEntries(await Promise.all(moduleFiles.map(async(path)=>[path,await readFile(join(root,path),"utf8")])));
const moduleOrder=[...moduleFiles];
const jsonForScript=(value)=>JSON.stringify(value).replaceAll("</script","<\\/script");
const bootstrap=`
const catalog=${jsonForScript(catalog)};
const products=${jsonForScript(previewProducts)};
const inventory=${jsonForScript(previewInventory)};
const moduleSources=${jsonForScript(modules)};
const moduleOrder=${jsonForScript(moduleOrder)};
const moduleUrls={};
const normalize=(path)=>{
  const parts=[];
  for(const part of path.split("/")){if(part==="..")parts.pop();else if(part!==".")parts.push(part);}
  return parts.join("/");
};
for(const path of moduleOrder){
  let source=moduleSources[path];
  const base=path.split("/").slice(0,-1).join("/");
  source=source.replace(/from\\s*(["'])(\\.\\.?\\/[^"']+)\\1/g,(match,quote,specifier)=>{
    const target=normalize(base+"/"+specifier);
    if(!moduleUrls[target])throw new Error("Preview module dependency is not ready: "+path+" -> "+target);
    return "from "+quote+moduleUrls[target]+quote;
  });
  moduleUrls[path]=URL.createObjectURL(new Blob([source],{type:"text/javascript"}));
}
const resolver=await import(moduleUrls["src/catalog/catalog-resolver.mjs"]);
const health={ok:true,buildId:${jsonForScript(buildId)},buildTimestamp:${jsonForScript(buildTimestamp)},catalogVersion:${jsonForScript(catalogVersion)},entrypoint:"STATIC_REVIEW_BUILD_USING_FORMAL_RUNTIME",frontendRoot:"src/ui/web",backend:"embedded formal resolver",inventory};
const reply=(body,status=200)=>Promise.resolve(new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-sash-build-id":health.buildId}}));
window.fetch=(input)=>{
  const url=new URL(typeof input==="string"?input:input.url,location.href);
  if(url.pathname==="/api/health"||url.pathname==="/health")return reply(health);
  if(url.pathname==="/api/catalog/products")return reply(products);
  if(url.pathname==="/api/catalog/resolve"){
    const productId=url.searchParams.get("productId");
    if(!productId)return reply({error:"productId required"},400);
    let selection={};try{selection=JSON.parse(url.searchParams.get("selection")??"{}");}catch{}
    return reply(resolver.stabilizeSelection(catalog,productId,selection));
  }
  return reply({error:"Review Preview endpoint not found"},404);
};
const appSource=${jsonForScript(web["app.js"])}.replace('from"/size-presentation.js"','from"'+moduleUrls["src/ui/web/size-presentation.js"]+'"');
await import(URL.createObjectURL(new Blob([appSource],{type:"text/javascript"})));
`;

const reviewBanner=`<section class="card compact review-build-note"><h2>Size UI R2 Review Build</h2><p class="lead"><strong>REVIEW IN PROGRESS</strong> — 正式Catalog / Resolver / Dynamic UIをこのHTML内で直接実行しています。保存・外部API通信は行いません。</p></section>`;
let html=web["index.html"]
  .replace('<link rel="stylesheet" href="/styles.css">',`<style>${web["styles.css"]}</style>`)
  .replace('<link rel="stylesheet" href="/styles-wave3.css">',`<style>${web["styles-wave3.css"]}.review-build-note strong{color:#9b6210}</style>`)
  .replace("<main>",`<main>${reviewBanner}`)
  .replace('<script type="module" src="/app.js"></script>',`<script type="module">${bootstrap}</script>`);

await mkdir(dirname(output),{recursive:true});
await writeFile(output,html);
console.log(JSON.stringify({output,buildId,buildTimestamp,catalogVersion,products:previewProducts.length,windows:previewProducts.reduce((sum,product)=>sum+catalog.allowedValues.filter((row)=>row.productId===product.id&&row.specificationKey==="window_type"&&row.status!=="INACTIVE").length,0),sizeRecords:catalog.standardSizeRecords.filter((row)=>sizeProductIds.has(row.productId)&&row.selectable!==false&&row.status!=="INACTIVE").length}));
