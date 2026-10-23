# Public SaaS Foundation｜STAGE A-2 Supabase Decision

Date: 2026-09-10
Task Classification: NON-PRODUCT-MASTER
PRODUCT_MASTER_MUTATION = 0
Status: IMPLEMENTATION PREPARED / LIVE CONNECTION BLOCKED

## Decision

Public SaaS FoundationのAuthentication / Persistent Database基盤は、初期実装として以下を採用する。

- Authentication: Supabase Auth
- Persistent Database: Supabase Postgres
- Data access: Supabase Data API with authenticated user JWT
- Tenant enforcement: Postgres Row Level Security + explicit workspace_id
- Migration source of truth: `supabase/migrations/*.sql`

商品Runtime / 商品マスターとは接続責務を分離する。

## Why this stack

現行アプリはNext.js等のFrameworkを前提としない軽量Node HTTP + browser UI構成である。
SupabaseはAuthのuser identityとPostgres RLSを同じJWT subjectで接続できるため、Framework依存を増やさずWorkspace単位のDB強制認可を作れる。

Public SaaS共通仕様の最重要要件である「UI非表示ではなくServer / API / DB層でTenant Isolationを強制する」に対して、以下の二重防御を採る。

1. Application authorization: `src/public-saas/authorization.mjs`
2. Database authorization: Postgres RLS in `supabase/migrations/*`

## Auth contract

`src/public-saas/supabase-auth-adapter.mjs` をSupabase固有境界とする。
Domain / Workspace authorizationはSupabase固有APIへ直接依存しない。

Initial flow:

- sign up: email + password
- email verification: REQUIRED
- sign in: email + password
- session verification: Supabase Auth server verification
- refresh: refresh token
- sign out: Supabase Auth session revoke
- password recovery: Supabase Auth recovery

初期実装ではSigning Key方式の差異に依存しないよう、Access Tokenの正当性確認をAuth serverへ問い合わせる方式を使う。
将来、非対称Signing Key/JWKSが確定した段階でserver-side JWKS cache verificationへ最適化可能とする。

## Environment variables

Required public/server configuration:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`

禁止:

- Password / refresh token / access tokenをRepositoryへ保存しない。
- Supabase secret key / legacy service-role keyをbrowser bundleへ入れない。
- PreviewとProductionで同一Production DB credentialを安易に共用しない。

本Phaseの通常User CRUDはauthenticated user JWT + RLSで成立させ、service-role bypassを前提にしない。

## Database model

Core hierarchy:

`auth.users`
→ `profiles`
→ `memberships`
→ `workspaces`
→ `projects`
→ `estimates`
→ `openings`

Tenant boundaryは`workspace_id`。

`projects / estimates / openings` はすべて `workspace_id NOT NULL` とし、Estimate / Openingでもtenant keyを保持する。
親子間は複合Foreign Keyで同じWorkspaceに固定する。

## Workspace bootstrap

初回Workspace作成は直接Table INSERTではなく、DB RPC `create_workspace_with_owner` で行う。

RPCは以下を原子的に実行する。

1. authenticated userを確認
2. Email confirmedを確認
3. Workspace作成
4. callerをOWNER Membershipとして作成

未認証・Email未確認状態ではFail Closed。

## Role model

- OWNER = 30
- ADMIN = 20
- MEMBER = 10

初期MigrationではMembershipの直接INSERT/UPDATEをauthenticated roleへ許可しない。
これはRole自己昇格を避けるためで、Invite / Role変更は後続の専用RPC/APIで追加する。

## Row Level Security

全Core tableでRLSを有効化する。

- `profiles`: 自分自身のみ
- `workspaces`: Active MembershipがあるWorkspaceのみ
- `memberships`: Active MembershipがあるWorkspaceのみ
- `projects`: Active MembershipがあるWorkspaceのみ
- `estimates`: Active MembershipがあるWorkspaceのみ
- `openings`: Active MembershipがあるWorkspaceのみ

`anon` にはCore business table権限を付与しない。
Hard DELETEは初期authenticated grantから除外する。

さらに`workspace_id`は作成後にUPDATEで別Workspaceへ移動できないようDB Triggerで固定する。

## Browser localStorage migration policy

現在の `sash.work-management.v1` は既存ユーザーのローカルデータとして保持する。
SaaS DB接続時に無断・自動でProductionへアップロードしない。

Migrationは後続Phaseで明示的なImport Flowとして実装する。

- Authenticated userがMigration対象Workspaceを選択
- Legacy dataをvalidation
- workspace_id / owner_user_idを明示付与
- transaction/import batch
- import件数と失敗件数を表示
- server readbackで一致確認
- local dataは成功確認後も即削除せずRollback期間を設ける

## Environment separation

Foundation Gateまでに最低限以下を分ける。

- Development / local Supabase
- Staging Supabase project or isolated branch/environment
- Production Supabase project

Production DataをPreview/Stagingへコピーしない。
Test Dataを別途作成する。

## Current Gate after this decision

- PUBLIC_SAAS_STARTUP_GATE = PASS
- S0_INVENTORY = PASS
- S1_AUTHENTICATION = IN_PROGRESS (adapter prepared; live provider not connected)
- S2_WORKSPACE_MODEL = IN_PROGRESS (schema/RPC prepared; remote migration not applied)
- S3_PERSISTENT_DB = IN_PROGRESS (migration prepared; remote DB not connected)
- S4_TENANT_ISOLATION = IN_PROGRESS (application + RLS contract prepared; live RLS test pending)
- SECURITY_BASELINE = BLOCKED
- BACKUP_RESTORE = BLOCKED
- ENVIRONMENT_SEPARATION = BLOCKED
- STAGING_SMOKE = BLOCKED
- PUBLIC_SAAS_FOUNDATION_GATE = BLOCKED
- PRIVATE_ALPHA_READY = FALSE

## Live-connection completion conditions

次の全項目を実DBで確認するまでAUTH / PERSISTENCE / TENANT_ISOLATIONをPASSにしない。

- Supabase project created/connected
- Email confirmation enabled
- Migration applied from Git-tracked SQL
- Test User A / User B created
- Workspace A / Workspace B created
- User A cannot SELECT/INSERT/UPDATE Workspace B Project
- User B cannot SELECT/INSERT/UPDATE Workspace A Project
- unscoped Project creation rejected
- workspace_id reassignment rejected
- logout/re-login restores DB data
- Preview/Staging and Production data environments separated
