# Product Master Core v0.8｜Persistent Evidence Inbox

Status: EXPERIMENTAL / NON-CANONICAL

## Purpose

Make the Gemini / NotebookLM transport boundary durable without granting external AI any Canonical authority.

Flow:

```text
NotebookLM / Gemini
→ pure JSON Transport Envelope
→ v0.4 Transport validation
→ v0.8 Persistent Evidence Inbox
→ duplicate / identity guard
→ ChatGPT or Human adjudication
→ ACCEPT / REJECT / PENDING
→ Canonical Evidence only after ACCEPT
```

## Added in v0.8

### 1. Persistent Inbox store

Module:

`src/product-master-core/evidence-inbox-store.mjs`

A successful import now writes:

```text
data/evidence-inbox/
├─ manifest.json
└─ batches/
   └─ <batchId>.json
```

The batch JSON is stored as the exact raw Transport text received by the importer.

`manifest.json` records:

- batchId
- importedAt / generatedAt
- producer
- productId
- sourceContext
- raw SHA-256
- Candidate IDs
- Issue IDs
- semantic source-claim fingerprints

No Canonical Master or Canonical Evidence write occurs during persistence.

### 2. Global record identity guard

Persistent identity is checked across all stored batches.

Rejected cases:

- duplicate `batchId` → `INBOX_BATCH_ID_CONFLICT`
- reused Candidate or Issue ID → `INBOX_GLOBAL_RECORD_ID_CONFLICT`

Helper:

`createGlobalInboxRecordId(batchId, kind, ordinal)`

Recommended IDs:

```text
batchId:
BATCH-GEMINI-APW430-FIX-20260902T043858Z

Candidate:
CAND-GEMINI-APW430-FIX-20260902T043858Z-001

Issue:
ISSUE-GEMINI-APW430-FIX-20260902T043858Z-001
```

The generic NotebookLM extraction prompt was updated so future batches must include their batch namespace in Candidate / Issue IDs.

### 3. Duplicate Evidence detection

`evidenceClaimFingerprint(candidate)` creates a SHA-256 fingerprint from:

- productId
- subjectField
- normalized atomic claim
- sorted Product Node IDs
- source type
- Drive file ID
- source title
- source version

Page / locator are intentionally excluded from the semantic fingerprint so that the same source claim is detected even when a later extraction changes only its locator.

Default behavior:

- duplicate semantic claim → `INBOX_DUPLICATE_CLAIM` and persistence is rejected

Explicit audit override:

- `allowDuplicateClaims: true`
- CLI: `--allow-duplicate-claims`

This override still requires globally unique batch / Candidate / Issue IDs.

### 4. Import CLI now really persists

Command:

```bash
npm run import:gemini-evidence -- path/to/transport.json
```

Optional Inbox location:

```bash
EVIDENCE_INBOX_DIR=/path/to/inbox npm run import:gemini-evidence -- path/to/transport.json
```

Explicit duplicate-claim audit retention:

```bash
npm run import:gemini-evidence -- path/to/transport.json --allow-duplicate-claims
```

Successful result:

```text
PERSISTED_TO_EVIDENCE_INBOX
canonicalWritePerformed: false
nextAction: CHATGPT_OR_HUMAN_ADJUDICATION_REQUIRED
```

## Safety properties preserved

- Gemini / NotebookLM cannot set Canonical VERIFIED.
- Raw Candidate cannot enter Canonical Evidence Registry directly.
- Persistence does not auto-adjudicate.
- Persistence does not alter Product Nodes, Rules, Gate or Runtime.
- ACCEPT / REJECT / PENDING remains ChatGPT/Human-only.
- Existing v0.4 Transport validation still runs before persistence.

## Tests

New file:

`test/12-product-master-core-v08-persistent-inbox.test.mjs`

Coverage:

1. raw batch + manifest persistence
2. no Canonical write
3. duplicate batch rejection
4. cross-batch global Record ID collision rejection
5. semantic duplicate-claim detection
6. explicit duplicate-claim audit override
7. distinct-claim acceptance
8. batch-namespaced global ID generation

GitHub Actions Run #175:

- `npm test`: **157/157 PASS**
- new v0.8 tests: **7/7 PASS**
- runtime_smoke: **SUCCESS**
- concord_regression: **SUCCESS**
- browser_qa: **SUCCESS**
- workflow conclusion: **SUCCESS**

## Gate

```text
PERSISTENT_INBOX_STORE               PASS
RAW_TRANSPORT_PRESERVATION           PASS
GLOBAL_BATCH_ID_GUARD                PASS
GLOBAL_RECORD_ID_GUARD               PASS
SEMANTIC_DUPLICATE_DETECTION         PASS
DUPLICATE_AUDIT_OVERRIDE             PASS
CANONICAL_AUTO_WRITE                 0
CHATGPT_OR_HUMAN_ADJUDICATION        REQUIRED
V0.4_REGRESSION                      PASS
FULL_NPM_TEST                         157/157 PASS
RUNTIME_SMOKE                         PASS
BROWSER_QA                            PASS
GITHUB_ACTIONS_RUN_175                SUCCESS
```

## v0.8 decision

`Product Master Core v0.8 Persistent Evidence Inbox = PASS`

The feature remains EXPERIMENTAL / NON-CANONICAL because persistence itself does not authorize Canonical promotion.

## Next work

v0.9 should connect persistence to adjudication history so the Inbox can durably record:

- Candidate status transitions
- adjudication audit records
- ACCEPT → Canonical Evidence provenance
- REJECT retention
- PENDING lifecycle linkage
- duplicate comparison against existing Canonical Evidence, not only Inbox Candidates

That is the final major step before the NotebookLM → ChatGPT → Canonical Evidence round trip becomes a durable production-oriented workflow.
