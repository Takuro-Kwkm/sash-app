# Product Master Core v2.7 — LIXIL サーモスL Second-Series Current-Stack E2E

## Purpose

This report records the second-series reproducibility verification of the common Product Master pipeline using LIXIL サーモスL as the non-YKK manufacturer target.

The verification now contains both deterministic current-stack E2E regression and a fresh real Gemini AI Pro LIVE run on the same current HEAD. It does not represent a new Product Master formalization or a new Human approval.

## Governing Product Master state

- Manufacturer: LIXIL
- Series: サーモスL
- Registry series key: `LIXIL::サーモスL`
- Product id: `SER-LIXIL-THERMOSL`
- Current canonical package: `v0.7`
- Current canonical Authoring file id: `17lVzBZ1hp4RVcGv0yNdnrKt25SFO2FhL`
- Current canonical Runtime manifest id: `1FSt_7IDffvgnDfxmNeBhJ9R-XNV_8o0C`
- Current canonical documentation id: `1c7yP81WZcUgGqDn7zFtXOUl8ihS4SIda`

The current canonical package was not modified by this verification.

## Startup Gate used for the product-specific proof

Before the fresh product-specific LIVE run was accepted, Drive governance was re-read:

- `サッシ商品マスター_成果物パッケージ・保管・完了ゲート仕様書_v2.0`
- `PRODUCT_MASTER_COMPLETION_POLICY_v2.0.json`
- `PRODUCT_MASTER_CANONICAL_REGISTRY_v2.0`
- `ChatGPT_Gemini_商品マスターパイプライン共通仕様書_v1.1_WORKING`

Policy and Registry resolved the same folder ids for サーモスL:

- series folder: `1ZgoCNo_kzlrljYN_SyiFIbPnI4QU1SyW`
- canonical folder / `01_正本`: `1H83njk7Gww0RJOZKntYBp5VxdaJD9Jc4`
- old folder / `00_旧版`: `1LFQOkjIm_INOIu2muWyw6iCN3hqX9c7g`
- working folder / `90_作業中`: `1PqgX6VbCBmdz121DgLG2xF-Z7aK-pbah`

`PRODUCT_MASTER_STARTUP_GATE = PASS`

## Historical real Gemini AI Pro evidence

The earlier Phase 7-R9 real run remains historical evidence and is not rewritten:

- GitHub Run `33931410581`
- historical HEAD `e42ba10c66706762f21bbb4e4fc594e8c5a1f9b8`
- Gemini Job `GJOB-LIXIL-L-AGY-33931410581-1`
- Antigravity CLI 1.1.26
- authentication `GOOGLE_AI_PRO_OAUTH`
- producer `GEMINI_ANTIGRAVITY`

That run predated the latest v2.7 contracts, so it is retained only as historical proof.

## Current-stack deterministic E2E regression

Test:

`test/61-product-master-core-v27-thermosl-second-series-e2e.test.mjs`

The test loads the actual `config/product-master-profiles/lixil-thermosl.v1.json` and traverses:

`Product Profile -> GEMINI_AI_PRO Job -> Source Acquisition -> Source Delivery -> Gemini Execution Audit -> governed Transport -> Evidence Inbox -> Review Queue Gate -> synthetic adjudication fixture -> synthetic Human Approval fixture -> Change Control -> Authoring STAGING -> Runtime Candidate -> Working Savepoint Handoff`

The synthetic Human Approval is a CI fixture only. It cannot authorize a real Product Master mutation.

The current common v2.7 suite passed `99/99` during the fresh LIVE run.

## Fresh current-HEAD Gemini AI Pro LIVE proof

After the dedicated self-hosted worker became available, the previously queued/pending validation executed successfully.

- Workflow: `Product Master Antigravity Profile LIVE`
- Run ID: `33966494545`
- Job ID: `101428460432`
- HEAD: `02a0884b49f7de88c5bae0221fe3e5aeba9e979a`
- Runner: `sash-gemini-worker-mac`
- Machine: `kawakamitakumiryuunoMacBook-Air-2`
- Gemini Job: `GJOB-LIXIL-L-AGY-33966494545-1`
- execution mode: `LIVE_EXTERNAL`
- execution channel: `GEMINI_AI_PRO`
- preferred channel: `GEMINI_AI_PRO`
- fallback channel: `GEMINI_API`
- fallback allowed: `false`
- fallback from: `null`
- authentication: `GOOGLE_AI_PRO_OAUTH`
- producer: `GEMINI_ANTIGRAVITY`
- transport: `GEMINI_AI_PRO_STRUCTURED_HANDOFF`
- model: unknown / not inferred

Fresh LIVE gates:

- Worker Execution Contract: PASS
- Source Acquisition: PASS
- Source Delivery: PASS
- Antigravity LIVE Execution: PASS
- Gemini Execution: PASS
- Transport: PASS
- Transport Provenance: PASS
- Pre-Inbox Guard: PASS
- Evidence Inbox: PASS
- Execution Provenance: PASS
- Review Queue: PASS

No API fallback occurred.

## Source identity

- Drive File ID: `1YUN-mtWYs48YBUHJk0C3vJXnhjyZFHyf`
- title: `202604_LIXIL_サーモスＬ_業務用資料集_完成品価格表.pdf`
- PDF pages: 6, 7, 8
- printed pages: 4, 5, 6
- identity mode: `FULL_BYTE_IDENTITY`
- source SHA-256: `e3cd40bfd85bdeac0de253afa4d5187059bab71c164ccc266d2125e655114960`
- scope text SHA-256: `cf80b896460ffc3a293942f1b769d3955142021dc733b19026d14c923d7276c7`

GitHub audit artifact:

- artifact ID: `9983371575`
- name: `product-master-antigravity-profile-live-phase9-r2-audit`
- SHA-256: `a6db2a89f18fc6eff6bbf68801edbd2f73f8449c2f0466b4b3572b774d25dd2c`

## Evidence adjudication result

Batch `BATCH-SER-LIXIL-THERMOSL-20260906-001` produced 5 candidates and 1 source ambiguity.

- `CAND-001` 単体引違い窓 H1 -> `FORMAL_ALREADY_REPRESENTED`
- `CAND-002` 縦すべり出し窓（カムラッチ）VT2 -> `FORMAL_ALREADY_REPRESENTED`
- `CAND-003` フレームイン構造 -> `FORMAL_SCHEMA_GAP_NON_MUTATING`
- `CAND-004` `w = W - 40mm` -> `FORMAL_SCHEMA_GAP_NON_MUTATING`
- `CAND-005` アングル付枠 -> `FORMAL_SCHEMA_GAP_NON_MUTATING`
- height text-extraction ambiguity -> `NON_MUTATING_SOURCE_EXTRACTION_LIMITATION`

Formal mutation required: `0`.

Therefore:

- Human Approval: NOT_OPENED
- Authoring mutation: NONE
- Runtime mutation: NONE
- Registry mutation: NONE
- Canonical mutation: NONE
- Master Change Gate: `CLOSED_NO_MUTATION_REQUIRED`

## Second-series reproducibility result

The common stack has now been verified at both code and real LIVE execution boundaries with a LIXIL Product Profile.

The verification demonstrates that the non-YKK series can use the same:

- execution-channel contract;
- Source Acquisition and Source Delivery contracts;
- Gemini Execution contract;
- governed Transport / Pre-Inbox Guard;
- Evidence Inbox and Review Queue;
- Fail Closed semantics;
- Human / Master authority separation.

`SECOND_SERIES_REPRODUCIBILITY = PASS`

The result does not claim that every future product can be added without a Product Profile or Adapter. Product-specific differences remain isolated in those extension points.

## Worker availability lesson

The fresh run also verified an operational dependency: when the matching self-hosted `macOS / ARM64 / gemini-worker` surface is unavailable, a GitHub job may remain queued or pending. After `sash-gemini-worker-mac` returned, the same current-HEAD run completed successfully.

This behavior is now normalized by the v3.1 Worker Readiness contract. Display sleep is allowed; machine sleep is not.

## Product Master mutation status

- canonical package v0.7: unchanged
- new Authoring Master mutation: NONE
- new Runtime canonical mutation: NONE
- Human approval for real mutation: NOT_OPENED
- new formalization: NOT_EXECUTED

The product-specific success artifacts were stored in the Policy-derived working folder during Phase9-R2-R1. This document records the common-core verification only and is not itself a Product Master package artifact.
