# Product Master Core v3.1 — Fixed Baseline Decision

## Scope

This is a **common infrastructure** baseline decision. It is not a Product Master package, does not modify any manufacturer/series Authoring Master, Runtime, Registry, Canonical folder, or Production artifact, and does not evaluate Product Master FORMAL PASS.

## Decision

`PRODUCT_MASTER_CORE_V31_BASELINE_GATE = PASS_BASELINE_FIXED`

The v1.1 common ChatGPT ↔ Gemini pipeline can be used as the fixed common baseline for subsequent series onboarding, with the execution and authority boundaries below preserved.

Continuous scheduled monitoring is a separate deployment gate:

`CONTINUOUS_MONITORING_GATE = PENDING_DEFAULT_BRANCH_MERGE`

The hourly self-hosted smoke and GitHub-hosted watchdog workflows exist and have passed manual/push validation on `feat/catalog-recovery-v2`, but GitHub scheduled workflows become continuously operative from the repository default branch.

## Evidence used for the decision

### 1. Second-series LIVE reproducibility

LIXIL サーモスL Phase9-R2-R1:

- GitHub Actions Run: `33966494545`
- validated HEAD: `02a0884b49f7de88c5bae0221fe3e5aeba9e979a`
- execution mode: `LIVE_EXTERNAL`
- execution channel: `GEMINI_AI_PRO`
- authentication: `GOOGLE_AI_PRO_OAUTH`
- producer: `GEMINI_ANTIGRAVITY`
- transport: `GEMINI_AI_PRO_STRUCTURED_HANDOFF`
- fallback allowed: `false`
- Source Acquisition → Source Delivery → Gemini Execution → Transport → Pre-Inbox Guard → Evidence Inbox → Review Queue: PASS
- formal mutation required: `0`
- Authoring / Runtime / Registry / Canonical writes: `false`
- `SECOND_SERIES_REPRODUCIBILITY = PASS`

This proves the current common path on a non-YKK manufacturer without granting Gemini Master authority.

### 2. Dedicated Gemini AI Pro worker readiness

Self-hosted worker:

- labels: `self-hosted / macOS / ARM64 / gemini-worker`
- runner: `sash-gemini-worker-mac`
- machine sleep on AC: disabled
- display sleep: allowed
- Antigravity CLI: available
- Google AI Pro OAuth preflight: PASS
- readiness: `WORKER_READINESS_GATE = PASS_LIVE`

Validated smoke run:

- Run `34016872372`
- conclusion: `success`
- artifact: `antigravity-worker-readiness-v31`

### 3. External liveness watchdog

GitHub-hosted watchdog validates stale success, stuck queue, failed smoke, and missing smoke conditions independently from the Mac worker.

Validated watchdog run:

- Run `34016853394`
- conclusion: `success`
- artifact: `antigravity-worker-liveness-v31`

### 4. Current branch regression

At HEAD `a11493b2587b63b15864960d1ccecd90449454a9`:

- V2 Recovery CI Run `34016889644`: `completed / success`
- `npm test`: PASS
- Runtime smoke: PASS
- Product Master common workflow regressions: PASS

## Fixed invariants

The following are baseline invariants and must not be relaxed by a Product Profile:

1. Completion Policy is the sole mechanical authority for series/canonical/old/working Folder IDs.
2. Product Profile contains manufacturer/series differences and must not fork Common Core logic.
3. `execution_mode` and `execution_channel` remain distinct.
4. `GEMINI_AI_PRO` is the preferred channel for interactive/complex evidence work; `GEMINI_API` is appropriate for batch/automation or explicit routing.
5. No silent `GEMINI_AI_PRO -> GEMINI_API` fallback.
6. Gemini output remains Candidate/Evidence only.
7. Evidence adjudication does not equal Product Master approval.
8. Product Master mutation requires the Human Approval / Change Control boundary.
9. Readiness and liveness gates never grant Canonical, Authoring, Runtime, Registry, or Production write authority.
10. Working Savepoint PASS requires actual Drive save and parent verification; handoff alone is not sufficient.
11. Product Master FORMAL PASS remains governed only by the Product Master completion/storage/registry gates.

## Machine-readable baseline gate

Common module:

`src/product-master-core/baseline-readiness.mjs`

The gate aggregates:

- common spec v1.1 identity;
- second-series LIVE validation;
- Common Core contract tests;
- zero product-specific Common Core paths;
- Fail Closed verification;
- Human Approval boundary verification;
- `PASS_LIVE` worker readiness;
- healthy worker liveness;
- read-only authority boundary;
- silent fallback prohibition.

`defaultBranchScheduleActive` is deliberately separate from baseline fixation. Until the workflows are deployed on the default branch, the baseline may be fixed while `CONTINUOUS_MONITORING_GATE` remains `PENDING_DEFAULT_BRANCH_MERGE`.

## Next stage

The next development target is **third-series onboarding ergonomics**:

- add a new series through Product Profile + schema adapter / dependency hook only when required;
- produce a preflight report before any Product Master job;
- detect accidental manufacturer/series hard-coding in Common Core;
- require no Common Core modification for ordinary series onboarding;
- preserve the same Fail Closed, Human Approval, Savepoint, and Formal Gate behavior.
