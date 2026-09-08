# Product Master Core v2.0｜Gemini Execution Bridge + Operator Review Surface

Status: IMPLEMENTED CORE / LIVE_EXTERNAL BLOCKED UNTIL CREDENTIAL + SOURCE ATTACHMENT ARE AVAILABLE

## Goal

Provide a safe execution path:

```text
ChatGPT / Operator
→ Gemini Job
→ Gemini Execution Bridge
→ EVIDENCE_CANDIDATE_BATCH
→ existing Gemini Transport Validator
→ existing Evidence Candidate Inbox
→ Unified Review Queue
→ ChatGPT / Human review
```

This phase does not grant Gemini, ChatGPT, or the Review Queue authority to write Canonical Master, Runtime, or Production Master.

## Gemini Job

Required business fields:

- `job_id`
- `job_type`
- `manufacturer`
- `series`
- `product_id`
- `task`
- `prompt`
- `source_context`
- `expected_transport_type`
- `expected_schema_version`
- `requested_at`
- `requested_by`

Execution modes:

- `MOCK`: deterministic CI/development input.
- `REPLAY`: replay a previously captured Gemini transport without claiming a new live call.
- `LIVE_EXTERNAL`: Google Gemini API only when all live requirements are present.

Job lifecycle:

```text
CREATED → QUEUED → RUNNING → SUCCEEDED
                              ├─ IMPORTED
                              ├─ REJECTED_AT_TRANSPORT
                              └─ REJECTED_AT_INBOX

RUNNING → FAILED / BLOCKED
```

Job status and Evidence Candidate status remain separate layers.

## LIVE_EXTERNAL fail-closed requirements

The adapter uses the Google Gemini `models.generateContent` REST API with `x-goog-api-key`.

No secret is committed.

Required runtime configuration:

```text
GEMINI_API_KEY=<secret, never commit>
GEMINI_MODEL=<explicit supported model>
```

For an `OFFICIAL_PDF` Evidence extraction job, the Drive `fileId` is provenance only. A Gemini-readable attachment must be supplied separately:

```json
{
  "source_attachment": {
    "gemini_file_uri": "files/...",
    "mime_type": "application/pdf"
  }
}
```

Without credentials, explicit model, or required PDF attachment, `LIVE_EXTERNAL` returns `BLOCKED` and performs no external request or Master write.

The current ChatGPT environment did not expose a Gemini connector, API credential, or Gemini Files upload handoff, so Phase 2 records:

```text
GEMINI_LIVE_EXECUTION_GATE = BLOCKED
```

This is intentionally different from MOCK/Replay success.

## Transport boundary

The bridge reuses:

- `src/product-master-core/gemini-transport.mjs`
- `src/product-master-core/evidence-inbox-store.mjs`

It does not introduce a weaker duplicate validator.

Before Inbox persistence the bridge additionally matches the transport against its Job:

- product ID
- transport type
- schema version
- source type
- source Drive file ID
- source title
- source version when specified

Invalid JSON, schema mismatch, wrong product, source mismatch, missing locator, unsupported Canonical Field, duplicate IDs, and other existing validator failures terminate at `REJECTED_AT_TRANSPORT`.

Inbox conflicts such as duplicate batch / global record ID / duplicate claim terminate at `REJECTED_AT_INBOX`.

## Raw response traceability

Every successful provider/mock/replay response is SHA-256 fingerprinted:

```text
raw_response_sha256
job_id
response_received_at
normalized_batch_id
transport_validation_result
inbox_import_result
```

The normal CLI audit file does not persist API credentials or provider response bodies.

## Operator Review Surface

`review-surface.mjs` renders a standalone, read-only HTML/JSON review surface with:

- Product
- Kind
- Source ID
- Review Status
- Source Status
- Decision
- Authority
- Next Action
- Reason
- Artifact State

The UI only filters/displays derived Review Queue records. It has no approval or Canonical mutation endpoint.

## APW430 replay evidence

The integration test replays the stored external Gemini batch:

```text
docs/notebooklm/live/BATCH-GEMINI-APW430-FIX-20260901213858.json
```

This proves the path from a previously captured Gemini response through Validator → Inbox → Unified Review Queue while clearly labeling the execution mode as `REPLAY`.

Existing APW430 Canonical schema issues remain out of scope:

```text
ISSUE-GEMINI-APW430-FIX-001
ISSUE-GEMINI-APW430-FIX-002
ISSUE-GEMINI-APW430-FIX-003
ISSUE-GEMINI-APW430-FIX-004
```

They remain `NEXT_PHASE_SCHEMA_WORK`; Phase 2 does not expand into Canonical schema redesign.

## CLI

Run a job:

```bash
node scripts/run-gemini-product-master-job.mjs --job=job.json --mock-response=fixture.json
node scripts/run-gemini-product-master-job.mjs --job=job.json --replay-response=docs/notebooklm/live/BATCH-GEMINI-APW430-FIX-20260901213858.json
```

Build operator surface:

```bash
node scripts/build-product-master-review-surface.mjs --product=SER-YKK-APW430
```

## Safety boundary

```text
Evidence Adjudication  = CHATGPT_OR_HUMAN
Master Change Approval = HUMAN_REQUIRED
Review Queue mutation  = NONE
Canonical auto-write   = false
Runtime auto-write     = false
Production auto-write  = false
```
