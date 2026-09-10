import { createServer } from "node:http";
import { releaseBuildMetadata } from "../src/server/recovery-app.mjs";
import { createPublicSaaSRequestHandler } from "../src/public-saas/http-handler.mjs";

const server=createServer(createPublicSaaSRequestHandler());

const host=process.env.HOST??"127.0.0.1";
const port=Number(process.env.PORT??4173);
server.listen(port,host,()=>{
  console.log(`Sash V2 recovery runtime: http://${host}:${port}`);
  console.log(`${releaseBuildMetadata.buildId} | ${releaseBuildMetadata.catalogVersion}`);
});
