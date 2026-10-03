import { createRecoveryRequestHandler } from "../src/server/recovery-app.mjs";
import { createSecurePublicSaaSRequestHandler } from "../src/public-saas/security-boundary.mjs";

export default createSecurePublicSaaSRequestHandler({
  delegate:createRecoveryRequestHandler({
    backend:"node:http recovery server via repository Vercel adapter",
    entrypoint:"api/index.mjs",
  }),
});
