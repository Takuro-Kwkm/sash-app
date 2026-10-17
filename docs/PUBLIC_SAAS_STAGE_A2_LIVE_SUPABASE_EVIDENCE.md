# Public SaaS Foundation STAGE A-2 — Live Supabase Evidence

- Task Classification: NON-PRODUCT-MASTER
- PRODUCT_MASTER_MUTATION = 0
- Governing Spec: `サッシ情報管理アプリ_Public_SaaS一般公開共通仕様書_v1.0`
- Public Stage: DEVELOPMENT
- Evidence Date: 2026-09-10

## 1. Live Development Project

A dedicated non-production Supabase project was created for Public SaaS foundation verification.

- Project name: `sash-app-public-saas-dev`
- Project ref: `tgruohlehvocvvqwfbum`
- Region: `ap-northeast-1` (Tokyo)
- Status at creation/readback: `ACTIVE_HEALTHY`
- Environment role: Development only
- Production data copied into this project: No
- Service-role / secret key committed to repository: No

The project creation cost was checked through the provider before creation and confirmed as USD 0/month for this project operation.

## 2. Remote Migration Evidence

The exact SQL content tracked on this branch was applied in order:

1. `supabase/migrations/20260910054500_public_saas_foundation.sql`
2. `supabase/migrations/20260910055000_lock_tenant_scope.sql`

Provider migration history recorded the corresponding applied entries as:

- `20260910071839 public_saas_foundation`
- `20260910071850 lock_tenant_scope`

The provider-generated remote migration versions differ from the Git filename timestamps. The SQL content/order is the Git-tracked source of truth; this timestamp difference must be reconciled before establishing the final promotion/deployment migration workflow to avoid migration-history drift assumptions.

## 3. Security Advisor

After DDL application, the Supabase Security Advisor reported no missing-RLS finding for the core tables.

One warning was reported:

- `authenticated_security_definer_function_executable`
- Function: `public.create_workspace_with_owner(workspace_name text)`

This RPC is intentionally callable only by `authenticated` for first-workspace bootstrap. Its implementation:

- requires `auth.uid()`
- rejects unverified email (`email_confirmed_at is null`)
- validates workspace name
- atomically creates Workspace + ACTIVE OWNER Membership
- revokes execute from `PUBLIC` and `anon`
- grants execute to `authenticated`

This warning is therefore an explicit reviewed exception, not evidence that SECURITY_BASELINE as a whole is complete.

Performance Advisor returned informational findings for currently unused indexes and four foreign keys without covering indexes. They are not security blockers and should be evaluated before scale testing.

## 4. Live Tenant Isolation Matrix

Temporary test identities and workspaces were created only for this verification and removed afterward.

| Test | Expected | Actual |
|---|---|---|
| User A SELECT Projects | Workspace A only | PASS |
| User B SELECT Projects | Workspace B only | PASS |
| User A INSERT into Workspace A | Allow | PASS |
| User A INSERT into Workspace B | Deny | PASS — RLS `42501` |
| User A UPDATE User B / Workspace B Project | No accessible row | PASS |
| User A reassign own Project `workspace_id` A → B | Deny | PASS — immutable trigger `42501` |
| User A UPDATE `memberships` for role escalation | Deny | PASS — table permission `42501` |
| `anon` SELECT Projects | Deny | PASS — table permission `42501` |
| Verified User A call `create_workspace_with_owner` | Workspace + OWNER membership | PASS |
| Unverified User call `create_workspace_with_owner` | Deny | PASS — `verified email required` |

Cleanup readback after the test:

- temporary RLS Projects remaining: 0
- temporary RLS Workspaces remaining: 0
- temporary RLS Auth Users remaining: 0

## 5. Persistence Adapter Progress

The branch now contains a Supabase Data API path for Project / Estimate / Opening and a `WorkManagementService`-compatible Supabase repository bundle.

Security properties of this adapter layer:

- authenticated access token required
- active Workspace UUID required
- authenticated User ID required for Project ownership
- explicit `workspace_id` filters in application requests in addition to DB RLS
- cross-workspace resource mismatch rejected before request
- no hard DELETE path; existing soft-delete model retained
- optimistic update conflict can use `expectedUpdatedAt`
- Workspace ID is never patchable through the adapter

The main browser UI has not yet been switched from localStorage to this adapter. Therefore application persistence is not yet considered PASS.

## 6. Current Gates

- `PUBLIC_SAAS_STARTUP_GATE = PASS`
- `S0_INVENTORY = PASS`
- `S1_AUTHENTICATION = IN_PROGRESS`
  - live provider exists
  - adapter exists
  - real app sign-up/login/logout/recovery and email-verification flow not yet E2E verified
- `S2_WORKSPACE_MODEL = PASS`
  - remote schema applied
  - OWNER bootstrap RPC verified for verified/unverified identities
- `S3_PERSISTENT_DB = IN_PROGRESS`
  - remote schema and repository adapter exist
  - existing application UI still uses Browser Local Storage
- `S4_TENANT_ISOLATION = IN_PROGRESS`
  - `DB_RLS_SUBGATE = PASS`
  - real application/API access-path tenant test still pending
- `SECURITY_BASELINE = BLOCKED`
- `BACKUP_RESTORE = BLOCKED`
- `MONITORING = PARTIAL`
- `ENVIRONMENT_SEPARATION = BLOCKED`
  - dedicated Development DB exists
  - Vercel environment wiring / independent Staging configuration not yet verified
- `STAGING_SMOKE = BLOCKED`
- `ROLLBACK_READINESS = PARTIAL`
- `PUBLIC_SAAS_FOUNDATION_GATE = BLOCKED`
- `PRIVATE_ALPHA_READY = FALSE`
- `NEXT_STAGE_GATE = CLOSED`

## 7. Next Required Work

1. Complete CI for the Supabase repository compatibility adapter.
2. Add an application-facing authenticated Public SaaS API/session boundary without exposing service-role credentials.
3. Wire the app to authenticated Workspace-scoped persistence.
4. Configure non-production Vercel environment variables and verify by deployment readback.
5. Execute real sign-up/login → Workspace → Project/Estimate/Opening save → logout/login → restore tests.
6. Re-run tenant isolation through the actual application/API path.

No Product Master artifact is modified by this work.
