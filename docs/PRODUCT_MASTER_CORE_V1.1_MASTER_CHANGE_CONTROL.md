# Product Master Core v1.1｜Canonical Evidence → Product Master Change Control

Status: **IMPLEMENTATION PASS / REAL PROPOSAL READY_FOR_HUMAN_APPROVAL**

Production Product Master status: **NOT_CHANGED**

Runtime status: **NOT_CHANGED**

## Purpose

v1.1 adds the control boundary after Canonical Evidence adjudication.

```text
Official Source
→ NotebookLM / Gemini Evidence Candidate
→ Persistent Evidence Inbox
→ ChatGPT / Human Evidence Adjudication
→ VERIFIED Canonical Evidence
→ Product Master Change Proposal
→ HUMAN Approval
→ STAGING Master Apply
→ external Production Adapter (future boundary)
→ formal Product Master / Runtime
```

The purpose is not automatic Master mutation. The purpose is to ensure that accepted Evidence can become a reviewable, reproducible and explicitly approved Product Master change without allowing an AI agent to silently modify the formal Master.

## Approval authority

Evidence adjudication and Product Master mutation approval are intentionally separate authorities.

```text
Evidence Candidate → Canonical Evidence   ChatGPT or Human adjudication
Canonical Evidence → Product Master      HUMAN approval required
```

`ChatGPT` cannot self-approve a Product Master Change Proposal.

A proposal remains `PROPOSED` until a human explicitly approves the exact proposal fingerprint.

## State lifecycle

```text
PROPOSED
  ├─ HUMAN approval → APPROVED
  │                    └─ valid STAGING apply → APPLIED
  └─ rejection → REJECTED
```

The lifecycle is persisted atomically. Restarting the process does not erase the approval state.

## Safety controls

v1.1 enforces the following before a change can be applied:

1. Proposal is bound to the exact base Product Master SHA-256 fingerprint.
2. Proposal content has its own SHA-256 fingerprint.
3. Human approval is bound to that exact Proposal fingerprint.
4. Modified Proposal content after approval is rejected.
5. A changed base Product Master after proposal creation is rejected as base drift.
6. Any open `BLOCKING` PENDING at apply time blocks the change.
7. Duplicate record IDs after apply are rejected.
8. Optional post-apply Product Master validation can reject the result.
9. Core v1.1 supports only `STAGING` apply.
10. Direct `PRODUCTION` apply is rejected unless a separate external production adapter is implemented.

Stable rejection boundaries include:

- `MASTER_CHANGE_HUMAN_APPROVAL_REQUIRED`
- `MASTER_CHANGE_APPROVAL_REQUIRED`
- `MASTER_CHANGE_APPROVED_CONTENT_TAMPERED`
- `MASTER_CHANGE_BASE_DRIFT`
- `MASTER_CHANGE_BLOCKING_PENDING_OPEN`
- `MASTER_CHANGE_DUPLICATE_ID_AFTER_APPLY`
- `MASTER_CHANGE_POST_VALIDATION_FAILED`
- `MASTER_CHANGE_PRODUCTION_ADAPTER_REQUIRED`

## Real APW430 proposal

The v1.1 field test uses the real v1.0 NotebookLM / Gemini batch:

- product: `SER-YKK-APW430`
- source batch: `BATCH-GEMINI-APW430-FIX-20260901213858`
- producer: `GEMINI_NOTEBOOKLM / LIVE_EXTERNAL`
- source: `202607_YKKAP_APW430_商品カタログ.pdf`
- accepted Canonical Evidence: `9`
- open Blocking PENDING: `0`
- open Non-blocking PENDING: `4`

Generated Product Master Change Proposal:

- Proposal ID: `PMCP-YKK-APW430-FIX-LIVE-20260902-001`
- status: `PROPOSED`
- approval policy: `HUMAN_REQUIRED`
- risk level: `MEDIUM`
- proposed changes: `9`
- change type: 9 × `ADD_RECORD` into the Core `evidence` collection
- Rule changes: `0`
- Product Node changes: `0`
- size changes: `0`
- Runtime changes: `0`

Proposal fingerprint:

`sha256:0f71567249ed2e2d5f7f02a3704cdbf969c016160f0b3dccb3448686b1cc56d9`

Base Master fingerprint:

`sha256:efb2c2e694dab840a44ff403b19d9e06568d282f328bce086b24408e5164dfa6`

## Important approval status

The real APW430 proposal is **not approved** by this implementation task.

The user's instruction to implement the control layer is not treated as approval of the specific generated APW430 proposal.

Current real proposal state remains:

```text
PMCP-YKK-APW430-FIX-LIVE-20260902-001
status = PROPOSED
next = explicit HUMAN approval or rejection
```

No formal Product Master or Runtime mutation has occurred.

## Mechanical approval test

The automated test suite contains a `TEST_HUMAN_FIXTURE` only to verify the state machine mechanically.

That fixture proves that:

- HUMAN approval can bind an exact Proposal fingerprint.
- `APPROVED` persists after reload.
- STAGING apply can create a staging Master snapshot.
- `APPLIED` persists after reload.

`TEST_HUMAN_FIXTURE` is not a real approval and must never be interpreted as user consent.

## Production boundary

v1.1 deliberately stops before writing the formal Product Master.

```text
Core v1.1
PROPOSED → APPROVED → STAGING APPLIED
                         ↓
              production adapter required
                         ↓
              formal Master / Runtime
```

Attempting `mode=PRODUCTION` directly from Core v1.1 returns:

`MASTER_CHANGE_PRODUCTION_ADAPTER_REQUIRED`

Therefore:

```text
productionMasterWritePerformed = false
runtimeWritePerformed = false
```

## CI Gate

Latest code Gate:

- Workflow: `V2 Recovery CI`
- Run: `#231`
- Run ID: `33595303752`
- head: `7e94a28e14ed129c9c7b96e633f974969311f703`
- conclusion: **SUCCESS**

Jobs:

- `test`: **SUCCESS**
- `runtime_smoke`: **SUCCESS**
- `concord_regression`: **SUCCESS**
- `product_master_live_v1`: **SUCCESS**
- `product_master_change_v11`: **SUCCESS**
- `browser_qa`: **SUCCESS**

Tests:

- `npm test`: **176 / 176 PASS**
- v1.1 change-control tests: **9 / 9 PASS**

v1.1 test coverage includes:

1. real LIVE Canonical Evidence → immutable Proposal
2. unapproved apply rejection
3. ChatGPT self-approval rejection
4. fingerprint-bound HUMAN approval
5. STAGING apply
6. base Master drift rejection
7. BLOCKING PENDING rejection
8. direct PRODUCTION apply rejection
9. durable `PROPOSED → APPROVED → APPLIED` persistence

## CI Artifact

Artifact from Run #231:

- name: `product-master-change-v11-apw430`
- artifact id: `9833171467`
- size: `12,776 bytes`
- SHA-256: `feb5efad528666d72d0f503125f3b9b5e731fd3472484eb3738374be98de5b59`

The artifact includes the real live Evidence round-trip evidence plus the generated Product Master Change Proposal and report.

## Gate result

```text
LIVE_EVIDENCE_TO_PROPOSAL                 PASS
REAL_PROPOSAL_GENERATION                  PASS
PROPOSAL_FINGERPRINT_BINDING              PASS
BASE_MASTER_FINGERPRINT_BINDING           PASS
HUMAN_APPROVAL_REQUIRED                   PASS
CHATGPT_SELF_APPROVAL_BLOCKED             PASS
UNAPPROVED_APPLY_BLOCKED                  PASS
APPROVED_CONTENT_TAMPER_BLOCKED           PASS
BASE_MASTER_DRIFT_BLOCKED                 PASS
BLOCKING_PENDING_BLOCKED                  PASS
DURABLE_APPROVAL_LIFECYCLE                PASS
STAGING_APPLY                             PASS
DIRECT_PRODUCTION_APPLY                   BLOCKED_BY_DESIGN
FORMAL_PRODUCT_MASTER_WRITE               0
RUNTIME_WRITE                             0
NPM_TEST                                  176/176 PASS
GITHUB_ACTIONS_RUN_231                    SUCCESS
```

## v1.1 decision

`Product Master Core v1.1 Change Control = IMPLEMENTATION PASS`

The real APW430 proposal is `READY_FOR_HUMAN_APPROVAL`, not yet approved.

The next boundary is the user's explicit approval/rejection of a concrete Proposal, followed by a controlled STAGING apply. Formal Product Master / Google Drive / Runtime mutation remains a separate production-adapter phase.