# Product Master Core v2.7 — Human Approval and Change Control Gate

## Purpose

This contract closes the boundary after Unified Review Queue and before Change Control.

A Product Master Change Proposal is not eligible for Change Control merely because an approval file says `approverType=HUMAN`. New v1.1 work must retain proof of exactly what Proposal, Base Master, Canonical Evidence, adjudication state, Review state, and governed Review Queue Gate results the Human approved.

The standard boundary is:

`Evidence Adjudication -> Unified Review Queue -> Review Queue Gate PASS for every source batch -> explicit Human action -> Human Approval Provenance PASS -> Human Approval Review Gate Binding PASS -> Change Control OPEN -> STAGING`

Human approval does **not** authorize Production Master or Runtime writes.

## Human Approval Provenance

Record type:

`PRODUCT_MASTER_HUMAN_APPROVAL_PROVENANCE`

Schema:

`1.1`

The record binds:

- Proposal id/product id
- exact Proposal fingerprint
- Base Master fingerprint
- Human actor and approval timestamp
- explicit Human approval source/reference
- approval scope
- Canonical Evidence ids referenced by the Proposal
- ACCEPT adjudication ids
- Candidate/Review provenance bindings
- relevant Unified Review Queue fingerprint
- source batch ids
- zero open BLOCKING PENDING at the approval boundary

Allowed explicit Human approval surfaces include:

- `CHAT_CONVERSATION_EXPLICIT_COMMAND`
- `HUMAN_REVIEW_UI`
- `SIGNED_APPROVAL_RECORD`
- `MANUAL_CONTROL_PLANE`

`approvedBy` cannot identify ChatGPT, Gemini, SYSTEM, or automation.

## Human Approval Review Gate Binding

Record type:

`PRODUCT_MASTER_HUMAN_APPROVAL_REVIEW_GATE_BINDING`

Schema:

`1.1`

This child evidence record makes the Review Queue Gate an explicit prerequisite for Human approval. For every `proposal.sourceBatchIds[]` entry there must be exactly one matching:

`PRODUCT_MASTER_REVIEW_QUEUE_VALIDATION`

with:

- schema `1.1`
- status `PASS`
- matching product id
- matching batch id
- governed Gemini Job id
- Candidate count
- Transport Issue count
- `evidenceQueueItemCount = candidateCount + transportIssueCount`
- Evidence authority `CHATGPT_OR_HUMAN`
- Transport Issue authority `CHATGPT_OR_HUMAN`
- Gemini adjudication disabled
- Master change approval `HUMAN_REQUIRED`
- queue mutation authority `NONE`
- Production/Runtime auto-write disabled

The binding stores a fingerprint of each Review Queue Gate and a fingerprint of the complete gate set. Missing, duplicate, unexpected, non-PASS, or later-modified gate records close Change Control.

This means a Human approval cannot be used merely because a Review Queue JSON exists. The source batches must have passed the governed Review Queue completeness/authority gate first.

## Fail-closed conditions

Human Approval / Review Gate binding is BLOCKED when, among other conditions:

- Proposal fingerprint changed
- Base Master fingerprint changed
- approver is not HUMAN
- ChatGPT/Gemini/SYSTEM/automation is presented as the Human approver
- explicit approval reference is missing
- referenced Canonical Evidence is missing or not ACCEPTED
- source Candidate is not APPROVED/ACCEPT in Unified Review Queue
- governed review provenance is not PASS
- relevant queue item is BLOCKED
- source batch contains an open BLOCKING PENDING
- a Proposal source batch has no Review Queue Gate
- a source batch has multiple Review Queue Gate records
- a Review Queue Gate is not PASS
- Candidate/Transport Issue coverage counts are inconsistent
- Review Queue Gate authority permits Gemini approval or automatic writes
- Review Queue Gate set changes after Human approval

## Change Control Entry Gate

`openGovernedChangeControl()` validates both:

1. Human Approval Provenance
2. Human Approval Review Gate Binding

before creating the in-memory APPROVED proposal state.

The APPROVED proposal is bound to both fingerprints. `validateGovernedChangeControlEntry()` revalidates Proposal, Base Master, Review, adjudication, PENDING state, Human Approval Provenance, and the Review Queue Gate set before application.

If any of those states drift after approval, Change Control closes and a new Human approval package is required.

## Staging-only authority

The common v1.1 Change Control entry wrapper permits only `STAGING`.

Production Master and Runtime writes remain closed:

- `productionMasterWritePerformed = false`
- `runtimeWritePerformed = false`

Production/formal adoption requires the later Product Master formal gates when the actual task is a PRODUCT MASTER TASK.

## Legacy compatibility

Existing `approvalSchemaVersion=1.0` approval artifacts are not rewritten or re-fingerprinted.

New v1.1 approval evidence is stored separately under:

- `data/master-change-control/approval-provenance/<proposalId>.human-approval.json`
- `data/master-change-control/approval-provenance/<proposalId>.review-queue-gates.json`

Both records are append-only per Proposal.

This allows historical approval/staging tests and audit history to remain byte/fingerprint compatible while new v1.1 work uses the stronger gate.

## Operator surface

The CLI validates an **already explicit Human approval record**; it does not manufacture Human approval. It also requires the governed Review Queue Gate output for every Proposal source batch.

A `--review-queue-validation` input may be either the direct `PRODUCT_MASTER_REVIEW_QUEUE_VALIDATION` record or a governed Job audit containing `reviewQueueValidation.record`. Repeat the option for multi-batch Proposals.

```bash
npm run master:human-approval:v27 -- \
  --proposal=<proposal.json> \
  --approval=<explicit-human-approval.json> \
  --review-queue=<review-queue.json> \
  --review-queue-validation=<governed-job-audit-or-gate.json> \
  --review-queue-validation=<second-batch-gate.json> \
  --adjudication-state=<adjudication-state.json> \
  --base-master=<base-master.json> \
  --change-control-root=<change-control-root>
```

A successful run persists both append-only records and reports:

- `humanApprovalGate=PASS`
- `reviewQueueGateBinding=PASS`
- `changeControlOpenAllowed=true`

It performs no Product Master or Runtime write.
