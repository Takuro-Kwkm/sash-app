import { createServer } from "node:http";
import { createRecoveryRequestHandler, releaseBuildMetadata } from "../src/server/recovery-app.mjs";
import { createPublicSaaSRequestHandler } from "../src/public-saas/http-handler.mjs";

const server=createServer(createPublicSaaSRequestHandler({
  delegate:createRecoveryRequestHandler({
    backend:"node:http recovery server",
    entrypoint:"scripts/start-step8-ui.mjs",
  }),
}));

const host=process.env.HOST??"127.0.0.1";
const port=Number(process.env.PORT??4173);
server.listen(port,host,()=>{
  console.log(`Sash V2 recovery runtime: http://${host}:${port}`);
  console.log(`${releaseBuildMetadata.buildId} | ${releaseBuildMetadata.catalogVersion}`);
});
