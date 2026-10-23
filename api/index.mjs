import { createRecoveryRequestHandler } from "../src/server/recovery-app.mjs";

console.info(JSON.stringify({event:"node_runtime",node:process.version,commit:process.env.VERCEL_GIT_COMMIT_SHA}));

export default createRecoveryRequestHandler({
  backend:"node:http recovery server via repository Vercel adapter",
  entrypoint:"api/index.mjs",
});
