# 案件・見積・開口部管理 v1.0 — UI Integration Handoff

## Classification

- Task: NON-PRODUCT-MASTER
- PRODUCT_MASTER_MUTATION: 0
- Product Master / Runtime package files changed: 0

## Architecture

- Domain: `Project 1:N Estimate 1:N Opening 1:1 ProductConfigurationSnapshot`
- Persistence boundary: `ProjectRepository` / `EstimateRepository` / `OpeningRepository`
- v1 implementation: versioned browser `localStorage` document (`sash.work-management.v1`)
- Service: parent-child isolation, immutable IDs, estimate revision fields, duplicate, reorder, soft delete and restore
- UI entry: `/` ProjectList
- Runtime QA entry: `/runtime-lab`
- Runtime editor: existing Catalog / Runtime Bridge extracted as common `ProductConfigurationEditor`

## Persistence decision

The current repository has no authentication, database connection, or durable server API. The displayed SQLite path was health metadata only; no SQLite persistence implementation existed. v1 therefore uses browser-local durable storage behind repository interfaces. This satisfies same-browser close/reopen recovery without introducing an unrelated external service. A server repository can replace it later without changing the UI domain model.

Known boundary: browser-local persistence does not provide multi-device sync, shared workspace access, backup, or server-enforced authorization. `owner_user_id` and `workspace_id` are reserved on Project for that future migration.

## Save contract

- Save states: `UNSAVED / SAVING / SAVED / SAVE_FAILED`
- Autosave debounce: 800 ms
- Explicit save and in-app navigation flush pending changes
- Emergency draft is synchronously retained in browser storage
- Optimistic `updated_at` comparison rejects stale writes
- Save requests are serialized so an older result cannot replace newer input
- Failure keeps the editor open and exposes retry

## Runtime snapshot contract

- Stores manufacturer, series, package version, manifest identity, integrity hash, configuration, display summary, validation state and captured time
- Runtime Master products are tagged `CANONICAL_RUNTIME`
- Existing Catalog products are transparently tagged `LEGACY_CATALOG`; a manifest identity is never fabricated
- A saved Runtime identity mismatch freezes the historical Snapshot and shows `旧Runtimeで作成`
- Migration occurs only after explicit `現在Runtimeで再検証`

## Verification

- Node tests: existing 75 + work management 11
- Browser scenario A–I: PASS
- EW Runtime browser QA: Desktop / Mobile PASS
- TW Runtime browser QA: Desktop / Mobile PASS
- Existing four-series browser regression: PASS
- Console errors: 0
- Page errors: 0
- Unexpected failed responses: 0
- Mobile horizontal overflow: 0

## Release boundary

This branch is UI Integration only. It must stop at a fixed Release Candidate SHA and `APP_INTEGRATION_READY`. Production deployment, Production smoke, rollback and `RELEASED` belong to the separate Release process.
