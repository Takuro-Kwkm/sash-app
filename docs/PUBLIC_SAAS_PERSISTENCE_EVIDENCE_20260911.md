# Public SaaS Persistence Evidence — 2026-09-11

Task Classification: NON-PRODUCT-MASTER
PRODUCT_MASTER_MUTATION = 0
Public Stage: DEVELOPMENT / PREVIEW

## Browser evidence

A real authenticated user completed the following flow on the Public SaaS Preview:

1. Sign in with Supabase Auth
2. Create/select a Workspace
3. Create Project + initial Estimate
4. Create Opening
5. Reload the page
6. Sign out
7. Sign in again
8. Re-open the same Workspace
9. Confirm the same Project / Estimate / Opening are restored

Result:

- PAGE_RELOAD_RESTORE = PASS
- LOGOUT_RELOGIN_RESTORE = PASS

## Database readback

A server-side readback of the non-production Supabase project confirmed the latest active Workspace contains:

- Projects: 1
- Estimates: 1
- Openings: 1
- Active memberships: 1

## Deployment continuity evidence

After the records above had already been created, a new exact-head Vercel Preview deployment was generated from commit `2a545177264b3fe01a099b45e486a476d76720a7`.

The authenticated user then opened the new deployment, logged in, selected the existing Workspace and confirmed the same Project / Estimate / Opening were still present.

Result:

- NEW_DEPLOYMENT_RESTORE = PASS
- PERSISTENCE_DEPLOY_CONTINUITY_SUBGATE = PASS

No Product Master artifact was modified.

## Gate status

- PERSISTENCE_RELOAD_RELOGIN_SUBGATE = PASS
- PERSISTENCE_DEPLOY_CONTINUITY_SUBGATE = PASS
- S3_PERSISTENT_DB = PASS

This PASS applies to the Development / Preview persistent database gate only. It does not imply Authentication, Tenant Isolation E2E, Security, Backup/Restore, Monitoring, Staging or Private Alpha gates are complete.
