# Public SaaS Foundation｜STAGE A-1 Inventory

Date: 2026-09-10
Task Classification: NON-PRODUCT-MASTER
PRODUCT_MASTER_MUTATION = 0

## Governing spec

- Title: `サッシ情報管理アプリ_Public_SaaS一般公開共通仕様書_v1.0`
- Drive File ID: `1RhntN2QQAT6afuby2G0rJk6K7RNdASKj0fvxXS39Vzw`
- Revision ID: `ANLCKQkxNHLXIaJo6zwFxLwU0ZuI3EFy0hCood-_PxjEYp_Bva-KYqAU4vWoguLGTCRcOR_RKA9Vuv1KXEV2GfnVQXVHTVHkG794JGWcRUo`
- Parent Folder ID: `17stlnAioklvvs8q2FmDfqaWLMAN_VM_7`
- Canonical path: `01_住宅サッシ → 00_共通資料 → 03_工程統合管理 → 00_工程横断仕様`
- Status: CANONICAL v1.0

## Repository / branches

- Repository: `Takuro-Kwkm/sash-app`
- main at startup: `a09d7d5547f95f81ac055a51f184bbc33b227a8f`
- Working branch: `feat/public-saas-foundation-a1`
- Concurrent open PRs observed at startup: #26, #24, #19, #1
- PR #26 changes `src/server/recovery-app.mjs` and Runtime UI files, so STAGE A-1 intentionally starts with isolated new `src/public-saas/*` modules to minimize merge conflicts.

## Current deployment inventory

Vercel project:
- Project ID: `prj_4z0zqW6yKyPuFINODfGX8LPBuJRP`
- Team ID: `team_AkuHacuJlCl8LuvaFpCzFmbv`
- Project name: `sash-app-wave3-preview`
- Node: 24.x

Production at startup:
- Deployment ID: `dpl_Gft1ZyaYCJF3mZNV93GtbYE34fqD`
- State: READY
- target: production
- Git SHA: `a09d7d5547f95f81ac055a51f184bbc33b227a8f`
- Canonical URL: `https://sash-app-wave3-preview.vercel.app`

Preview deployments exist. A dedicated Staging environment/project was not established by the retrieved inventory and remains TBD/BLOCKED for the Foundation gate.

## Current application persistence

Current work-management persistence is browser-only:

`BrowserStorageDocumentStore` → browser `localStorage` → key `sash.work-management.v1`.

Health metadata reports:
- persistence.type = `BROWSER_LOCAL_STORAGE`
- multiDevice = false
- databasePath = null

The current database document contains:
- projects
- estimates
- openings

`Project` already has nullable `workspace_id` and `owner_user_id`, but the current service/repository path does not establish authenticated users, memberships, workspace context, or server-side authorization. `Estimate` and `Opening` inherit ownership only indirectly through their parent relationships and are not independently tenant-scoped today.

## Authentication / Workspace / DB gap

### Authentication

Status: NOT IMPLEMENTED

- No auth dependency/provider is present in `package.json`.
- No sign-up/login/logout/recovery/session enforcement path is wired into the current app.
- Email verification is not implemented.

### Workspace / Membership

Status before this branch: NOT IMPLEMENTED

- `workspace_id` exists only as a nullable future-facing Project field.
- User → Membership → Workspace model did not exist as an executable domain model.
- Role enforcement did not exist.

### Persistent DB

Status: BLOCKED / NOT IMPLEMENTED

- Production work data remains local to one browser profile.
- No production relational/document database is connected for projects, estimates, openings, users, memberships, or settings.
- No migration system exists yet.

### Tenant isolation / server authorization

Status before this branch: BLOCKED

- Browser visibility is not a security boundary.
- No server/API membership check exists for Project CRUD.
- No automated cross-workspace isolation regression existed.

## Security / Backup / Monitoring / Environment

- SECURITY_BASELINE: BLOCKED. Authentication/authorization and public traffic controls are not yet established.
- BACKUP_RESTORE: BLOCKED. Browser localStorage has no managed production backup/restore path.
- MONITORING: PARTIAL. Vercel runtime error inventory is available; 24h runtime error scan at startup returned no error clusters. P0/P1 alerting and application-level auth/data event logging are not yet implemented.
- ENVIRONMENT_SEPARATION: PARTIAL/BLOCKED. Preview and Production deployments exist; dedicated Staging and separate data credentials are not established by the retrieved inventory.
- ROLLBACK_READINESS: PARTIAL. Application deployments are traceable, but there is no DB migration rollback because there is no production DB/migration layer yet.

## Public maturity

Current Public Stage: `DEVELOPMENT`.

Production deployment is a technical deployment state only. It does not imply Private Alpha, Open Beta, or GA readiness.

No confirmed Public SaaS P0/P1 incident was found in the 24h Vercel runtime-error scan, but this does not constitute Public SaaS readiness because the auth/tenant/data foundation is not implemented.

## STAGE A-1 implementation started

This branch introduces provider-independent core models and authorization primitives:

- `src/public-saas/domain.mjs`
  - User
  - Workspace
  - Membership
  - Owner / Admin / Member roles
- `src/public-saas/authorization.mjs`
  - authenticated session principal contract
  - active Membership resolution
  - role minimum enforcement
  - optional verified-email enforcement
  - fail-closed session expiry validation
  - cross-workspace resource denial
  - legacy unscoped resource denial
- `test/75-public-saas-foundation.test.mjs`
  - multi-workspace membership
  - unauthenticated rejection
  - suspended membership rejection
  - insufficient-role rejection
  - expired/invalid session rejection
  - email verification requirement
  - cross-workspace denial
  - unscoped legacy-data denial

These modules are intentionally provider-independent. Selecting and wiring the real Authentication Provider and Persistent Database is the next implementation step; no fake credentials or local-only auth is promoted as production auth.

## Gate status at STAGE A-1

- PUBLIC_SAAS_STARTUP_GATE = PASS
- S0_INVENTORY = PASS
- S1_AUTHENTICATION = IN_PROGRESS
- S2_WORKSPACE_MODEL = IN_PROGRESS
- S3_PERSISTENT_DB = BLOCKED
- S4_TENANT_ISOLATION = IN_PROGRESS (core authorization primitive only)
- SECURITY_BASELINE = BLOCKED
- BACKUP_RESTORE = BLOCKED
- MONITORING = PARTIAL
- ENVIRONMENT_SEPARATION = BLOCKED
- STAGING_SMOKE = BLOCKED
- ROLLBACK_READINESS = PARTIAL
- PUBLIC_SAAS_FOUNDATION_GATE = BLOCKED
- PRIVATE_ALPHA_READY = FALSE
- NEXT_STAGE_GATE = CLOSED

## Next implementation step

1. Choose/configure a production-capable Auth Provider and Persistent Database.
2. Add server-side session verification adapter.
3. Create User / Workspace / Membership persistence schema and migration.
4. Create initial Workspace on first verified user onboarding.
5. Move Project persistence behind server API/repository with mandatory workspace context.
6. Add two-workspace CRUD isolation tests before any external user invitation.
