# Product Master Core v2.7 — Review Provenance

## Purpose

This contract closes the provenance boundary between governed Gemini execution and the human/ChatGPT review layer.

For a new worker-contract v1.1 LIVE batch, review is allowed only when the review item can be traced through:

`Source Acquisition -> Source Delivery -> Gemini Execution -> Transport Provenance -> Evidence Inbox raw SHA -> Review item`

Gemini output remains Candidate/Evidence input only. Gemini cannot adjudicate its own output and cannot write Canonical Master, Runtime, Registry, or Production artifacts.

## Evidence Candidate review provenance

`PRODUCT_MASTER_EVIDENCE_REVIEW_PROVENANCE` binds:

- Inbox `batchId`
- Candidate id and claim fingerprint
- Inbox raw batch SHA-256
- source context
- worker contract version
- actual execution channel/reference
- Transport Provenance SHA/batch/producer/execution surface

For governed v1.1 batches the status must be `PASS`. A raw SHA, batch id, source, product, channel, or persisted provenance mismatch blocks Review Queue and adjudication.

Historical batches without v1.1 Transport Provenance remain readable as `LEGACY_COMPATIBLE`. Their execution channel is never inferred. Legacy review provenance is not written back into historical adjudication artifacts, so old fingerprints and Human Approval records remain stable.

## Transport Issue review provenance

`PRODUCT_MASTER_TRANSPORT_ISSUE_REVIEW_PROVENANCE` applies the same raw-batch and Transport binding to `envelope.issues[]`.

A Transport Issue is represented in Unified Review Queue as `EVIDENCE_TRANSPORT_ISSUE`.

Lifecycle:

- unlinked issue: `NEEDS_REVIEW / LINK_TRANSPORT_ISSUE_TO_PENDING`
- OPEN or INVESTIGATING PENDING: `NEEDS_REVIEW / RESOLVE_TRANSPORT_ISSUE_PENDING`
- RESOLVED: `RESOLVED`
- REJECTED: `REJECTED`
- provenance mismatch: `BLOCKED / INSPECT_EVIDENCE_PROVENANCE`

Creating PENDING from a governed Transport Issue requires PASS issue review provenance. The PASS provenance record is persisted with the PENDING row. Legacy issue linkage remains compatible and does not modify the historical PENDING shape.

## Operator CLI

The existing Evidence adjudication CLI now supports Transport Issue linkage:

```bash
EVIDENCE_INBOX_DIR=<inbox> npm run evidence:adjudicate -- \
  issue <batchId> <issueId> <pendingId> \
  --severity=BLOCKING \
  --by=CHATGPT
```

PENDING resolution may reference Canonical Evidence or Technical Facts:

```bash
EVIDENCE_INBOX_DIR=<inbox> npm run evidence:adjudicate -- \
  pending <pendingId> RESOLVED \
  --technical-fact-id=<technicalFactId> \
  --external-technical-fact-id=<technicalFactId> \
  --resolution-note="Verified against independent official evidence" \
  --by=CHATGPT
```

A RESOLVED PENDING still requires Evidence or Technical Fact proof under the existing Pending lifecycle contract.

## Authority boundary

Unified Review Queue is read-only.

- Evidence adjudication: `CHATGPT_OR_HUMAN`
- Transport Issue resolution: `CHATGPT_OR_HUMAN`
- Gemini adjudication: forbidden
- Master change approval: `HUMAN_REQUIRED`
- Queue mutation authority: none
- Production Master auto-write: false
- Runtime auto-write: false

Review completion does not imply Product Master formal completion.
