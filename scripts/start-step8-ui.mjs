import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createCatalog, catalogInventory } from "../src/catalog/catalog-adapter.mjs";
import { stabilizeSelection } from "../src/catalog/catalog-resolver.mjs";
import { CURRENT_WINDOW_SERIES_MODULES } from "../src/catalog/modules/current-window-series.mjs";
import { CONCORDS30_MODULE } from "../src/catalog/modules/concords30-module.mjs";

const __dirname=dirname(fileURLToPath(import.meta.url));
const root=join(__dirname,"..");
const webRoot=join(root,"src","ui","web");
const catalog=createCatalog([...CURRENT_WINDOW_SERIES_MODULES,CONCORDS30_MODULE]);
const buildTimestamp=new Date().toISOString();
const buildId=`RECOVERY-${createHash("sha256").update(JSON.stringify(catalog)).digest("hex").slice(0,12)}`;
const catalogVersion="V4.5 SIZE-MASTER-FORMAL + CONCORD-S30";

const json=(res,status,body)=>{
  res.writeHead(status,{"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-sash-build-id":buildId});
  res.end(JSON.stringify(body));
};
const staticFile=async(res,name,type)=>{
  try{
    const body=await readFile(join(webRoot,name));
    res.writeHead(200,{"content-type":type,"cache-control":"no-store","x-sash-build-id":buildId});
    res.end(body);
  }catch{res.writeHead(404);res.end("Not found");}
};
const parseSelection=(url)=>{
  const raw=url.searchParams.get("selection");
  if(!raw) return {};
  try{return JSON.parse(raw);}catch{return {};}
};

const server=createServer(async(req,res)=>{
  const url=new URL(req.url??"/",`http://${req.headers.host??"localhost"}`);
  if(url.pathname==="/health"||url.pathname==="/api/health"){
    return json(res,200,{
      ok:true,buildId,buildTimestamp,catalogVersion,
      entrypoint:"scripts/start-step8-ui.mjs",frontendRoot:"src/ui/web",
      backend:"node:http recovery server",databasePath:process.env.SASH_UI_DATABASE??"data/runtime/sash-v2.sqlite",
      inventory:catalogInventory(catalog)
    });
  }
  if(url.pathname==="/api/catalog/products") return json(res,200,catalog.products);
  if(url.pathname==="/api/catalog/fields"){
    const productId=url.searchParams.get("productId");
    return json(res,200,catalog.specificationDefinitions.filter((x)=>!productId||x.productId===productId));
  }
  if(url.pathname==="/api/catalog/allowed-values"){
    const productId=url.searchParams.get("productId"), key=url.searchParams.get("key");
    return json(res,200,catalog.allowedValues.filter((x)=>(!productId||x.productId===productId)&&(!key||x.specificationKey===key)));
  }
  if(url.pathname==="/api/catalog/resolve"){
    const productId=url.searchParams.get("productId");
    if(!productId) return json(res,400,{error:"productId required"});
    return json(res,200,stabilizeSelection(catalog,productId,parseSelection(url)));
  }
  if(url.pathname==="/api/catalog") return json(res,200,catalog);
  if(url.pathname==="/app.js") return staticFile(res,"app.js","text/javascript; charset=utf-8");
  if(url.pathname==="/styles.css") return staticFile(res,"styles.css","text/css; charset=utf-8");
  if(url.pathname==="/styles-wave3.css") return staticFile(res,"styles-wave3.css","text/css; charset=utf-8");
  return staticFile(res,"index.html","text/html; charset=utf-8");
});
const host=process.env.HOST??"127.0.0.1";
const port=Number(process.env.PORT??4173);
server.listen(port,host,()=>{
  console.log(`Sash V2 recovery runtime: http://${host}:${port}`);
  console.log(`${buildId} | ${catalogVersion}`);
});
