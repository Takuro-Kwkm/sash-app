# Product Master Core v2.7 — LIXIL サーモスL Second-Series Current-Stack E2E

## Purpose

This report records the second-series reproducibility verification of the common Product Master pipeline using LIXIL サーモスL as the non-YKK manufacturer target.

It distinguishes historical real Gemini AI Pro execution from the current-stack deterministic E2E regression. It does not represent a new Product Master formalization or a new Human approval.

## Governing Product Master state

- Manufacturer: LIXIL
- Series: サーモスL
- Registry series key: `LIXIL::サーモスL`
- Product id: `SER-LIXIL-THERMOSL`
- Current canonical package: `v0.7`
- Current canonical Authoring file id: `17lVzBZ1hp4RVcGv0yNdnrKt25SFO2FhL`
- Current canonical Runtime manifest id: `1FSt_7IDffvgnDfxmNeBhJ9R-XNV_8o0C`
- Current canonical documentation id: `1c7yP81WZcUgGqDn7zFtXOUl8ihS4SIda`

The current canonical package is not modified by this E2E regression.

## Startup Gate

The following Drive governance artifacts were re-read before the second-series validation:

- `サッシ商品マスター_成果物パッケージ・保管・完了ゲート仕様書_v2.0`
- `PRODUCT_MASTER_COMPLETION_POLICY_v2.0.json`
- `PRODUCT_MASTER_CANONICAL_REGISTRY_v2.0`
- `ChatGPT_Gemini_商品マスターパイプライン共通仕様書_v1.1_WORKING`

Policy and Registry resolve the same folder ids for サーモスL:

- series folder: `1ZgoCNo_kzlrljYN_SyiFIbPnI4QU1SyW`
- canonical folder / `01_正本`: `1H83njk7Gww0RJOZKntYBp5VxdaJD9Jc4`
- old folder / `00_旧版`: `1LFQOkjIm_INOIu2muWyw6iCN3hqX9c7g`
- working folder / `90_作業中`: `1PqgX6VbCBmdz121DgLG2xF-Z7aK-pbah`

Drive folder readback confirmed these folders are children of the same series folder.

`PRODUCT_MASTER_STARTUP_GATE = PASS`

## Historical real Gemini AI Pro evidence

A prior real Gemini AI Pro / Antigravity execution exists and is retained without rewriting historical evidence:

- Phase: `Phase 7-R9`
- GitHub Run ID: `33931410581`
- GitHub Job ID: `101210585330`
- historical head SHA: `e42ba10c66706762f21bbb4e4fc594e8c5a1f9b8`
- Gemini job id: `GJOB-LIXIL-L-AGY-33931410581-1`
- worker: Antigravity CLI 1.1.26
- authentication: `GOOGLE_AI_PRO_OAUTH`
- producer: `GEMINI_ANTIGRAVITY`
- execution outcome: PASS through Source / Gemini execution / Transport / Evidence Inbox / Review Queue / ChatGPT Review
- Human Approval: NOT_OPENED
- Authoring mutation: NONE
- Change Control: NOT_REQUIRED

Historical Drive working artifacts include:

- `1YY_2nlPqvOHE4CvqGVyNT9vF334mcwzR`
- `1n2Z17eI4EWbcONjysgDHneV5AO7t8E1P`
- `1HM0tMxbDzcs6RVKlAFUYH5fp16xSIM11jekUmME7caw`

This historical real LIVE run predates the latest Human Approval / Authoring STAGING / Runtime Candidate / Working Savepoint Handoff common contracts. It is therefore not claimed as a fresh current-HEAD real LIVE execution.

## Current-stack deterministic E2E regression

Test:

`test/61-product-master-core-v27-thermosl-second-series-e2e.test.mjs`

Initial test commit:

`7b177404845480177be54c201301853384b790b2`

V2 Recovery CI Run:

`33965329761`

Verified outcomes on that commit:

- `npm test`: SUCCESS
- Runtime smoke: SUCCESS
- historical Thermos L source-gap regression: SUCCESS
- historical Thermos L staging regression: SUCCESS
- Thermos L Runtime regeneration regression: SUCCESS
- Product Master generic workflow regression: SUCCESS

The test loads the actual `config/product-master-profiles/lixil-thermosl.v1.json` and traverses the current common contracts:

`Product Profile -> GEMINI_AI_PRO Job -> Source Acquisition -> Source Delivery -> Gemini Execution Audit -> governed Transport -> Evidence Inbox -> Review Queue Gate -> synthetic adjudication fixture -> synthetic Human Approval fixture -> Change Control -> Authoring STAGING -> Runtime Candidate -> Working Savepoint Handoff`

### Synthetic approval boundary

The Human Approval used inside test61 is a deterministic CI fixture only. It is explicitly marked non-authoritative and is not the user's approval of any real Product Master change.

It exists solely to prove that the common Human Approval and Change Control contracts can be traversed by a LIXIL Product Profile.

No real Product Master change proposal is approved by this test.

## Authority result

The current-stack E2E regression enforces:

- canonical Product Master write: false
- production Product Master write: false
- canonical Runtime write: false
- Registry write: false
- Drive Product Master write from the synthetic handoff: false
- Working Savepoint Gate in the synthetic handoff: `NOT_EVALUATED`
- Next Phase Gate in the synthetic handoff: `CLOSED`
- Formal Pass from the synthetic chain: false
- App Integration Ready from the synthetic chain: false

Therefore the test cannot mutate or promote the current canonical v0.7 package.

## Cross-manufacturer reproducibility finding

The present common stack accepts the LIXIL サーモスL Product Profile without requiring an APW430/YKK-specific branch in the tested chain. The same execution-channel, Transport, Evidence, Human authority, Authoring STAGING, Runtime Candidate, and Savepoint Handoff contracts are exercised.

This is a code-level current-stack reproducibility PASS for the deterministic E2E boundary.

A fresh real Gemini AI Pro LIVE execution on the current HEAD remains a separate verification item and must not be inferred from the historical Phase 7-R9 LIVE run.

## Product Master mutation status

- canonical package v0.7: unchanged
- new Authoring Master mutation: NONE
- new Runtime canonical mutation: NONE
- Human approval for real mutation: NOT_OPENED
- new formalization: NOT_EXECUTED

The product-specific Phase 9-R1 audit must be saved to the Policy-derived `working_folder_id` and re-read before this validation revision can open its next Product Master phase.
