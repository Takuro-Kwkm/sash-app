import { createRecoveryRequestHandler } from "../src/server/recovery-app.mjs";
import { createPublicSaaSRequestHandler } from "../src/public-saas/http-handler.mjs";

export default createPublicSaaSRequestHandler({
  delegate:createRecoveryRequestHandler({
    backend:"node:http recovery server via repository Vercel adapter",
    entrypoint:"api/index.mjs",
  }),
});
