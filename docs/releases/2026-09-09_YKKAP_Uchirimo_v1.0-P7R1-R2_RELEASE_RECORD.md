# YKK AP ウチリモ 内窓｜Production Release Record

- release_id: `REL-YKKAP-UCHIRIMO-v1.0-P7R1-R2-20260909`
- release_date_time: `2026-09-09T17:49:50+09:00`
- task_classification: `RELEASE_TASK / NON-PRODUCT-MASTER`
- product_master_mutation: `0`
- repository: `Takuro-Kwkm/sash-app`
- release_branch: `release/ykkap-uchirimo-v1.0-p7r1-r2-production-20260909`
- release_candidate_commit_sha: `92ee5c5c92e8cb6a5227047fa670e220e25fec6c`
- production_commit_sha: `92ee5c5c92e8cb6a5227047fa670e220e25fec6c`
- production_deployment_reference: `dpl_2JJ4x8rdn3nxmogV7x8AgMda4G8e`
- production_deployment_url: `https://sash-app-wave3-preview-q79uvjzmq-tk-4bb0.vercel.app`
- production_url: `https://sash-app-wave3-preview.vercel.app`
- production_build_id: `RECOVERY-UCHIRIMO-d3374f21ee01`

## Runtime Package Identity

- manufacturer: `YKK AP`
- series: `ウチリモ 内窓`
- runtime_package_identity: `YKK AP / ウチリモ 内窓 / v1.0-P7R1-R2 / sourceHash be4f1f77727424dc06ddf9de947201f33d4aee5219b182e37d0f178e1fb7147d`
- package_version: `v1.0-P7R1-R2`
- runtime_source_hash: `be4f1f77727424dc06ddf9de947201f33d4aee5219b182e37d0f178e1fb7147d`
- runtime_manifest_identity: `Drive File ID 1119yamXn21wLZd3C8LvamNWsTAx_1dt2`
- runtime_status_at_release: `READY / selectable=true`

## APP_INTEGRATION_READY Reference

- reference_type: `Git commit / fixed Release Candidate`
- reference: `92ee5c5c92e8cb6a5227047fa670e220e25fec6c`
- commit_message: `Merge YKK AP ウチリモ Runtime UI v1.0-P7R1-R2`
- integration_state: `APP_INTEGRATION_READY candidate after CI, desktop/mobile Browser QA, and EW/TW regression`
- product_master_mutation_at_integration: `0`

## Gate Results

- RELEASE_INPUT_GATE: `PASS`
- BUILD_GATE: `PASS`
- STAGING_DEPLOY_GATE: `PASS`
- STAGING_SMOKE_GATE: `PASS`
- DEPLOYMENT_READY: `TRUE`
- PRODUCTION_DEPLOY_GATE: `PASS`
- DEPLOYED: `TRUE`
- PRODUCTION_SMOKE_GATE: `PASS`
- ROLLBACK_READINESS_GATE: `PASS`
- PRODUCTION_READY: `TRUE`
- RELEASE_RECORD_GATE: `PASS`
- RELEASED: `TRUE`

## Production Smoke Evidence

- GitHub Actions production deploy run: `34321549343`
- GitHub Actions production smoke run: `34330938838`
- production smoke job: `102399098041`
- production smoke artifact: `uchirimo-production-smoke-evidence`
- artifact_id: `10095758311`
- artifact_zip_sha256: `707c14beecde17670d1e0a4cb992d3aed0ea3a9bb1c939a8703c413ab4320358`
- browser_execution: `GitHub Actions Playwright Chromium against canonical Production URL`

### Uchirimo

- Desktop: `PASS`
- Smartphone: `PASS`
- Manufacturer selection: `PASS`
- Series selection: `PASS`
- Dynamic fields: `PASS`
- Dependency: `PASS`
- Downstream clear: `PASS`
- Custom size: `PASS`
- Options: `PASS`
- Manual confirmation path: `PASS`
- Invalid configuration handling: `PASS`
- Summary: `PASS`
- Horizontal overflow: `0`

### Regression

- LIXIL EW: `PASS`
- LIXIL TW: `PASS`
- Existing Catalog / サーモスⅡ-H: `PASS`
- Existing Catalog / サーモスL: `PASS`
- Existing Catalog / APW 430: `PASS`
- Existing Catalog / APW 431: `PASS`

### Error Sentinel

- console_error_count: `0`
- pageerror_count: `0`
- unexpected_4xx_5xx_count: `0`
- request_failure_count: `0`
- unhandled_rejection_count: `0`
- Desktop overflow: `0`
- Smartphone overflow: `0`
- Vercel recent runtime error/fatal check: `0`
- Vercel recent 5xx check: `0`

## Known Manual States

- release_blocking_manual_states: `none`
- ORDER_READY: `false`
- ORDER_READY=false is intentional for the current sales-level Runtime/UI; this release does not enable order-finalization behavior.

## Rollback Target

- last_known_good_deployment: `dpl_3rJDZtmuhRdnafYj1rrPF7oPaaXd`
- last_known_good_commit: `1d4438783f07c0affb681954498a0c3e67752c81`
- rollback_method: `POST /v1/projects/prj_4z0zqW6yKyPuFINODfGX8LPBuJRP/rollback/dpl_3rJDZtmuhRdnafYj1rrPF7oPaaXd?teamId=team_AkuHacuJlCl8LuvaFpCzFmbv`
- post_rollback_smoke: `rerun Production Uchirimo / EW / TW / existing-catalog Browser Smoke and error sentinel`
- rollback_does_not_mutate_product_master: `true`

## Execution Reference

- released_by: `ChatGPT release orchestration under user-authorized Production Release`
- production_deploy_execution_reference: `GitHub Actions run 34321549343`
- production_smoke_execution_reference: `GitHub Actions run 34330938838`
- release_record_execution_reference: `this repository record`

## Release Status

`RELEASED`

This record contains no credential, token, session secret, or other secret value.
