# Product Master Core v0.9｜Persistent Adjudication History + Canonical Promotion

Status: EXPERIMENTAL / NON-CANONICAL

## Purpose

Complete the durable NotebookLM / Gemini Evidence workflow after v0.8 Persistent Evidence Inbox.

v0.9 persists the human/ChatGPT review layer without mutating the raw external-AI batch.

```text
Official PDF
→ NotebookLM / Gemini
→ pure JSON Transport Envelope
→ v0.8 Persistent Evidence Inbox
→ immutable raw batch
→ v0.9 Persistent Adjudication State
   ├─ SUBMITTED
   ├─ UNDER_REVIEW
   └─ ADJUDICATED
      ├─ ACCEPT  → VERIFIED Canonical Evidence
      ├─ REJECT  → audit history only
      └─ PENDING → persistent PENDING lifecycle
→ controlled future Product Master integration
```

## Storage separation

Raw external-AI output remains immutable:

```text
data/evidence-inbox/
├─ manifest.json
├─ batches/
│  └─ <batchId>.json
└─ adjudication-state.json
```

`batches/<batchId>.json` is never rewritten by v0.9.

All review state, decisions, promoted Canonical Evidence and PENDING records are written only to:

`adjudication-state.json`

This preserves a clear audit boundary between:

1. what Gemini / NotebookLM actually returned; and
2. what ChatGPT or a Human later decided.

## Module

`src/product-master-core/evidence-adjudication-store.mjs`

Adjudication store schema:

- `candidateStates`
- `adjudications`
- `canonicalEvidence`
- `pending`

## Persistent review transition

`persistCandidateUnderReview(...)`

Persists:

```text
SUBMITTED → UNDER_REVIEW
```

with reviewer and timestamp history while retaining the raw Candidate unchanged in the original batch file.

Invalid repeated or unsupported transitions are rejected by the existing Candidate lifecycle rules.

## Persistent adjudication

`adjudicatePersistedCandidate(...)`

Uses the existing pure adjudication engine and then durably records the result.

### ACCEPT

ACCEPT is the only decision that can create Canonical Evidence.

The generated record must:

- pass `validateEvidenceRecord(...)`
- have `status = VERIFIED`
- preserve Candidate provenance
- retain the original official source locator
- identify the ChatGPT/Human adjudicator
- have a unique Canonical Evidence ID
- not duplicate an already promoted semantic source claim
- not duplicate pre-existing external/formal Canonical Evidence supplied for comparison

Successful status:

`CANONICAL_EVIDENCE_PROMOTED`

Important boundary:

```text
canonicalWritePerformed: true
productionMasterWritePerformed: false
```

`canonicalWritePerformed` means the adjudication store now contains a VERIFIED Canonical Evidence record. It does **not** mean the production Product Master, Product Nodes, Dependency Rules, Gate, or Runtime were automatically modified.

### REJECT

REJECT persists:

- Candidate `ADJUDICATED` status
- adjudication audit record
- reason
- adjudicator
- timestamp

It creates no Canonical Evidence and no PENDING.

Successful status:

`CANDIDATE_REJECTED_WITH_AUDIT`

### PENDING

PENDING persists:

- Candidate `ADJUDICATED` status
- adjudication audit record
- an `OPEN` PENDING linked through `sourceCandidateId`

Successful status:

`PENDING_LINKED`

The persistent PENDING then uses the existing lifecycle:

```text
OPEN
├─ INVESTIGATING
├─ RESOLVED
└─ REJECTED
```

`INVESTIGATING` may return to `OPEN` or move to `RESOLVED` / `REJECTED`.

A `RESOLVED` PENDING requires:

- at least one resolution Evidence ID
- a resolution note
- Evidence IDs known either to the v0.9 Canonical Evidence store or explicitly supplied as verified external Canonical Evidence IDs

Unknown Evidence references are rejected with:

`PENDING_RESOLUTION_EVIDENCE_UNKNOWN`

## Canonical duplicate guard

Before ACCEPT is persisted, v0.9 compares the proposed Evidence against:

1. Canonical Evidence already promoted in `adjudication-state.json`; and
2. optional pre-existing external/formal Canonical Evidence.

Two independent guards exist:

- duplicate ID → `CANONICAL_EVIDENCE_ID_CONFLICT`
- duplicate semantic source claim → `CANONICAL_EVIDENCE_DUPLICATE_CLAIM`

The semantic fingerprint reuses the v0.8 Evidence claim fingerprint logic, so a later extraction cannot create a second Canonical Evidence record merely by changing page/locator wording while preserving the same source-backed claim.

## External AI authority boundary

Gemini / NotebookLM still cannot adjudicate.

Allowed adjudicator types remain:

- `CHATGPT`
- `HUMAN`

An attempted `GEMINI_NOTEBOOKLM` adjudicator is rejected before Canonical Evidence can be written.

Therefore:

```text
Gemini extracts
≠ Gemini verifies
≠ Gemini accepts
≠ Gemini passes Gate
```

## CLI

Entry point:

`scripts/adjudicate-evidence-candidate.mjs`

npm command:

```bash
npm run evidence:adjudicate -- <command>
```

### Summary

```bash
npm run evidence:adjudicate -- summary
```

Returns machine-readable counts for:

- Candidate states
- ACCEPT / REJECT / PENDING decisions
- promoted Canonical Evidence
- total PENDING
- unresolved PENDING

### Start review

```bash
npm run evidence:adjudicate -- review <batchId> <candidateId> --by=CHATGPT
```

### ACCEPT

```bash
npm run evidence:adjudicate -- adjudicate <batchId> <candidateId> ACCEPT \
  --reason="Official locator and atomic claim independently verified." \
  --canonical-evidence-id=EV-EXAMPLE-001
```

Optional comparison against an existing Canonical Evidence file:

```bash
--existing-canonical-file=path/to/evidence.json
```

The file may be:

- a JSON array of Evidence records
- an object with `evidence`
- an object with `canonicalEvidence`

### REJECT

```bash
npm run evidence:adjudicate -- adjudicate <batchId> <candidateId> REJECT \
  --reason="Claim exceeds the official source scope."
```

### PENDING

```bash
npm run evidence:adjudicate -- adjudicate <batchId> <candidateId> PENDING \
  --reason="Additional official verification required." \
  --pending-id=PEND-EXAMPLE-001 \
  --pending-severity=BLOCKING \
  --pending-question="Confirm exact applicability."
```

### PENDING lifecycle

```bash
npm run evidence:adjudicate -- pending PEND-EXAMPLE-001 INVESTIGATING
```

Resolve using known Evidence:

```bash
npm run evidence:adjudicate -- pending PEND-EXAMPLE-001 RESOLVED \
  --evidence-id=EV-EXAMPLE-001 \
  --resolution-note="Resolved against verified official Evidence."
```

`EVIDENCE_INBOX_DIR` may be used to point the CLI to a non-default Inbox root.

## Tests

### v0.9 adjudication lifecycle

`test/13-product-master-core-v09-persistent-adjudication.test.mjs`

Coverage:

1. `SUBMITTED → UNDER_REVIEW` persistence
2. raw Gemini batch immutability during review
3. ACCEPT → VERIFIED Canonical Evidence
4. production Master write remains disabled
5. REJECT audit retention without Canonical Evidence
6. PENDING persistent lifecycle linkage
7. RESOLVED PENDING requires known Evidence
8. duplicate promotion against another Inbox batch is rejected
9. duplicate promotion against pre-existing external Canonical Evidence is rejected
10. Gemini / NotebookLM self-adjudication remains forbidden
11. durable adjudication summary metrics

### CLI smoke

`test/14-product-master-core-v09-cli.test.mjs`

Confirms that the summary command exits successfully and emits machine-readable JSON.

## CI

GitHub Actions Run #195:

- run id: `33593390618`
- workflow: `V2 Recovery CI`
- conclusion: **SUCCESS**
- `npm test`: **166/166 PASS**
- fail: **0**
- v0.9 persistent adjudication tests: **8/8 PASS**
- v0.9 CLI smoke: **PASS**
- runtime_smoke: **SUCCESS**
- concord_regression: **SUCCESS**
- browser_qa: **SUCCESS**

Existing Runtime inventory remains unchanged by Product Master Core v0.9.

## Gate

```text
RAW_GEMINI_BATCH_IMMUTABILITY            PASS
PERSISTENT_CANDIDATE_STATE               PASS
SUBMITTED_TO_UNDER_REVIEW                PASS
UNDER_REVIEW_TO_ADJUDICATED              PASS
ACCEPT_TO_VERIFIED_CANONICAL_EVIDENCE    PASS
REJECT_AUDIT_RETENTION                   PASS
PENDING_LIFECYCLE_LINK                   PASS
PENDING_RESOLUTION_EVIDENCE_GUARD        PASS
CANONICAL_ID_DUPLICATE_GUARD             PASS
CANONICAL_CLAIM_DUPLICATE_GUARD          PASS
EXTERNAL_CANONICAL_DUPLICATE_GUARD       PASS
GEMINI_SELF_ADJUDICATION                 BLOCKED
PRODUCTION_MASTER_AUTO_WRITE             0
FULL_NPM_TEST                            166/166 PASS
RUNTIME_SMOKE                            PASS
BROWSER_QA                              PASS
GITHUB_ACTIONS_RUN_195                   SUCCESS
```

## v0.9 decision

`Product Master Core v0.9 Persistent Adjudication History + Canonical Promotion = PASS`

The subsystem remains **EXPERIMENTAL / NON-CANONICAL** because the final write from the adjudication store into a production Product Master is intentionally not automatic.

## Architecture after v0.9

```text
Official Source Library
↓
NotebookLM / Gemini Evidence Extraction
↓
Transport Contract
↓
Persistent Evidence Inbox
↓
ChatGPT / Human Review
↓
Persistent Adjudication History
├─ ACCEPT  → VERIFIED Canonical Evidence
├─ REJECT  → audit retention
└─ PENDING → Evidence-backed lifecycle
↓
[controlled integration boundary]
↓
Product Master / Dependency Rules / Gate / Runtime
```

## Next work

The next useful milestone is not more prompt tuning.

A v1.0 candidate should exercise the complete durable workflow using one real `LIVE_EXTERNAL` NotebookLM batch and add a controlled export/integration boundary from adjudicated Canonical Evidence into the formal Product Master process.

Recommended v1.0 scope:

1. ingest one real batch into the v0.8 persistent Inbox;
2. persist real ChatGPT adjudications with v0.9;
3. prove ACCEPT / duplicate / PENDING behavior against existing formal Canonical Evidence;
4. create a reviewable Canonical Promotion Package;
5. require an explicit Gate before any Product Master / Rule mutation;
6. keep Runtime mutation outside the Evidence ingestion transaction.

This would convert the APW430 NotebookLM experiment into a full durable source-to-Canonical round trip without giving external AI direct Master authority.
