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

No Product Master artifact was modified.

## Gate status

- PERSISTENCE_RELOAD_RELOGIN_SUBGATE = PASS
- S3_PERSISTENT_DB = IN_PROGRESS

S3 remains IN_PROGRESS until the same data is confirmed after a new application deployment, per the governing Public SaaS specification.
