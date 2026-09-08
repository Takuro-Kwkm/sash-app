import { createRecoveryRequestHandler } from "../src/server/recovery-app.mjs";

export default createRecoveryRequestHandler({
  backend:"node:http recovery server via repository Vercel adapter",
  entrypoint:"api/index.mjs",
});
