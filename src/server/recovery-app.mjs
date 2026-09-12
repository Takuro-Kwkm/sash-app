import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createCatalog, catalogInventory } from "../catalog/catalog-adapter.mjs";
import { stabilizeSelection } from "../catalog/catalog-resolver.mjs";
import { CURRENT_WINDOW_SERIES_MODULES } from "../catalog/modules/current-window-series.mjs";
import { resolveRuntimeAppProduct, runtimeAppIntegrationInventory } from "../catalog/runtime-master/runtime-app-bridge.mjs";
import { WORK_SCHEMA_VERSION } from "../work-management/domain.mjs";

const HERE=dirname(fileURLToPath(import.meta.url));
const root=join(HERE,"../..");
const webRoot=join(root,"src","ui","web");
const estimateOutputRoot=join(root,"src","estimate-output");
const catalog=createCatalog(CURRENT_WINDOW_SERIES_MODULES);
const runtimeIntegrationDeclarations=runtimeAppIntegrationInventory();
const runtimeMasterIntegrations=runtimeIntegrationDeclarations.filter((row)=>row.status==='READY'&&row.selectable);
const buildTimestamp=new Date().toISOString();
const buildIdentity={appVersion:"work-management-v1.0+estimate-output-v1.0",workSchemaVersion:WORK_SCHEMA_VERSION,catalog,runtimeMasterIntegrations:runtimeIntegrationDeclarations.map(({id,packageVersion,sourceHash,status,selectable})=>({id,packageVersion,sourceHash,status,selectable}))};
const buildId=`SASH-WORK-V1-${createHash("sha256").update(JSON.stringify(buildIdentity)).digest("hex").slice(0,12)}`;
const catalogVersion="V4.3 RECOVERY + WAVE3-1 THERMOS-L + LIXIL EW v1.1 + LIXIL TW integrated-v0.2 + YKK AP ウチリモ v1.0-P7R1-R2";

export const releaseBuildMetadata=Object.freeze({buildId,buildTimestamp,catalogVersion});

const json=(res,status,body)=>{
  res.writeHead(status,{"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-sash-build-id":buildId});
  res.end(JSON.stringify(body));
};

const staticFileAt=async(res,path,type)=>{
  try{const body=await readFile(path);res.writeHead(200,{"content-type":type,"cache-control":"no-store","x-sash-build-id":buildId});res.end(body);}
  catch{res.writeHead(404,{"cache-control":"no-store","x-sash-build-id":buildId});res.end("Not found");}
};
const staticFile=(res,name,type)=>staticFileAt(res,join(webRoot,name),type);

const requestUrl=(req)=>{
  const url=new URL(req.url??"/",`http://${req.headers?.host??"localhost"}`);
  const rewrittenPath=url.searchParams.get("__path");
  if(rewrittenPath!==null){url.pathname=`/${rewrittenPath}`;url.searchParams.delete("__path");}
  return url;
};
const parseSelection=(url)=>{const raw=url.searchParams.get("selection");if(!raw)return {};try{return JSON.parse(raw);}catch{return {};}};

export function createRecoveryRequestHandler({backend="node:http recovery server",entrypoint="scripts/start-step8-ui.mjs"}={}){
  return async function recoveryRequestHandler(req,res){
    const url=requestUrl(req);
    if(url.pathname==="/health"||url.pathname==="/api/health"){
      return json(res,200,{ok:true,buildId,buildTimestamp,catalogVersion,entrypoint,frontendRoot:"src/ui/web",backend,
        features:{estimateOutput:"1.0"},persistence:{type:"BROWSER_LOCAL_STORAGE",schemaVersion:WORK_SCHEMA_VERSION,key:"sash.work-management.v1",multiDevice:false},databasePath:null,
        inventory:catalogInventory(catalog),runtimeMasterIntegrations});
    }
    if(url.pathname==="/api/catalog/products") return json(res,200,catalog.products);
    if(url.pathname==="/api/catalog/fields"){
      const productId=url.searchParams.get("productId");return json(res,200,catalog.specificationDefinitions.filter((x)=>!productId||x.productId===productId));
    }
    if(url.pathname==="/api/catalog/allowed-values"){
      const productId=url.searchParams.get("productId"),key=url.searchParams.get("key");
      return json(res,200,catalog.allowedValues.filter((x)=>(!productId||x.productId===productId)&&(!key||x.specificationKey===key)));
    }
    if(url.pathname==="/api/catalog/resolve"){
      const productId=url.searchParams.get("productId");if(!productId)return json(res,400,{error:"productId required"});
      return json(res,200,stabilizeSelection(catalog,productId,parseSelection(url)));
    }
    if(url.pathname==="/api/runtime-master/integrations") return json(res,200,runtimeIntegrationDeclarations);
    if(url.pathname==="/api/runtime-master/resolve"){
      const productId=url.searchParams.get("productId");if(!productId)return json(res,400,{error:"productId required"});
      try{return json(res,200,await resolveRuntimeAppProduct(productId,parseSelection(url)));}
      catch(error){return json(res,400,{error:error?.message??String(error),code:error?.code??"RUNTIME_RESOLVE_FAILED"});}
    }
    if(url.pathname==="/api/catalog") return json(res,200,catalog);
    if(url.pathname==="/app.js") return staticFile(res,"app.js","text/javascript; charset=utf-8");
    if(url.pathname==="/product-configuration-editor.mjs") return staticFile(res,"product-configuration-editor.mjs","text/javascript; charset=utf-8");
    if(url.pathname==="/estimate-output-integration.mjs") return staticFile(res,"estimate-output-integration.mjs","text/javascript; charset=utf-8");
    if(url.pathname==="/styles.css") return staticFile(res,"styles.css","text/css; charset=utf-8");
    if(url.pathname==="/styles-wave3.css") return staticFile(res,"styles-wave3.css","text/css; charset=utf-8");
    if(url.pathname==="/work-management.css") return staticFile(res,"work-management.css","text/css; charset=utf-8");
    if(url.pathname==="/estimate-output.css") return staticFile(res,"estimate-output.css","text/css; charset=utf-8");
    const workModule=url.pathname.match(/^\/work-management\/(domain|storage|repositories|service)\.mjs$/)?.[1];
    if(workModule)return staticFileAt(res,join(root,"src","work-management",`${workModule}.mjs`),"text/javascript; charset=utf-8");
    const estimateModule=url.pathname.match(/^\/estimate-output\/(model|pdf-renderer|xlsx-renderer)\.mjs$/)?.[1];
    if(estimateModule)return staticFileAt(res,join(estimateOutputRoot,`${estimateModule}.mjs`),"text/javascript; charset=utf-8");
    return staticFile(res,"index.html","text/html; charset=utf-8");
  };
}
