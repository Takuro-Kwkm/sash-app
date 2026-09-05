# Product Master Core v2.7 — Human Approval and Change Control Gate

## Purpose

This contract closes the boundary after Unified Review Queue and before Change Control.

A Product Master Change Proposal is not eligible for Change Control merely because an approval file says `approverType=HUMAN`. New v1.1 work must retain proof of exactly what Proposal, Base Master, Canonical Evidence, adjudication state, and Review state the Human approved.

The standard boundary is:

`Evidence Adjudication -> Unified Review Queue PASS -> explicit Human action -> Human Approval Provenance PASS -> Change Control OPEN -> STAGING`

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

## Fail-closed conditions

Human Approval Provenance is BLOCKED when, among other conditions:

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

## Change Control Entry Gate

`openGovernedChangeControl()` validates Human Approval Provenance before creating the in-memory APPROVED proposal state.

The APPROVED proposal is bound to the Human Approval Provenance fingerprint. `validateGovernedChangeControlEntry()` revalidates Proposal, Base Master, Review, adjudication, and PENDING state before application.

If any state drifts after approval, Change Control closes and a new Human approval is required.

## Staging-only authority

The common v1.1 Change Control entry wrapper permits only `STAGING`.

Production Master and Runtime writes remain closed:

- `productionMasterWritePerformed = false`
- `runtimeWritePerformed = false`

Production/formal adoption requires the later Product Master formal gates when the actual task is a PRODUCT MASTER TASK.

## Legacy compatibility

Existing `approvalSchemaVersion=1.0` approval artifacts are not rewritten or re-fingerprinted.

New Human Approval Provenance is stored separately under:

`data/master-change-control/approval-provenance/<proposalId>.human-approval.json`

This allows historical approval/staging tests and audit history to remain byte/fingerprint compatible while new v1.1 work uses the stronger gate.

## Operator surface

The CLI validates an **already explicit Human approval record**; it does not manufacture Human approval:

```bash
npm run master:human-approval:v27 -- \
  --proposal=<proposal.json> \
  --approval=<explicit-human-approval.json> \
  --review-queue=<review-queue.json> \
  --adjudication-state=<adjudication-state.json> \
  --base-master=<base-master.json> \
  --change-control-root=<change-control-root>
```

A successful run persists the separate provenance record and reports `humanApprovalGate=PASS`. It performs no Product Master or Runtime write.
