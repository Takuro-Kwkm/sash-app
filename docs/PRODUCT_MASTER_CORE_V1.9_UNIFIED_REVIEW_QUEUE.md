# Product Master Core v1.9｜Unified Review Queue

Status: IMPLEMENTED / READ-ONLY CONTROL PLANE

## Purpose

Unify the already-existing Evidence review lifecycle and Product Master Change Control lifecycle into one read model so an operator can answer one question safely:

> What requires review or approval now, and who has authority to act?

This layer does **not** create a second source of truth and does **not** approve, reject, mutate a Product Master, or write Runtime data.

## Existing authorities preserved

Evidence remains governed by the existing persistent Inbox / Adjudication flow:

```text
SUBMITTED → UNDER_REVIEW → ADJUDICATED
                         ├─ ACCEPT
                         ├─ REJECT
                         └─ PENDING
```

Product Master changes remain governed by the existing Change Control artifacts:

```text
PROPOSED → HUMAN approval → STAGING → Production Gate / Apply
```

The queue is only a derived view across those artifacts.

## Normalized queue statuses

- `SUBMITTED`: Evidence Candidate has not entered review.
- `UNDER_REVIEW`: Evidence Candidate review is active.
- `APPROVED`: Evidence was accepted, or a Proposal has a later approval artifact and is ready for the next controlled gate.
- `REJECTED`: Evidence or Proposal was rejected.
- `NEEDS_REVIEW`: unresolved Evidence PENDING or a rolled-back change requires reassessment.
- `HUMAN_REQUIRED`: Product Master Change Proposal has no later human approval artifact.
- `APPLIED`: a later Staging / Production artifact proves the Proposal has already progressed beyond approval.
- `RESOLVED`: a previously PENDING Evidence item is resolved.
- `BLOCKED`: source artifacts are inconsistent or missing.

## Multi-artifact precedence

A Proposal manifest may intentionally remain immutable with `status=PROPOSED`. Therefore the queue never trusts that field alone.

Effective state is derived from the most advanced durable artifact:

```text
rollback
> production apply/no-op
> production approval
> staging apply
> human approval
> proposal manifest
```

This prevents an already-approved or already-applied Proposal from being shown again as waiting for approval.

## Authority boundary

```text
Evidence adjudication        CHATGPT_OR_HUMAN
Master change approval       HUMAN_REQUIRED
Queue mutation authority     NONE
Production Master auto-write false
Runtime auto-write           false
```

The queue intentionally has no approve/reject command. Existing adjudication and Change Control commands remain the only mutation paths.

## Files

- `src/product-master-core/review-queue.mjs`
- `scripts/product-master-review-queue.mjs`
- `test/32-product-master-core-v19-unified-review-queue.test.mjs`

## CLI

```bash
node scripts/product-master-review-queue.mjs summary
node scripts/product-master-review-queue.mjs list --actionable-only
node scripts/product-master-review-queue.mjs list --product=SER-YKK-APW430
node scripts/product-master-review-queue.mjs list --status=HUMAN_REQUIRED
```

The output is JSON and can later be consumed by a UI or automation layer.

## Safety properties

1. Reads Evidence Inbox and Adjudication artifacts without rewriting them.
2. Reads Proposal / Approval / Staging / Production artifacts without rewriting them.
3. Later durable artifacts override stale immutable Proposal status.
4. Product filtering is read-only.
5. No external AI receives approval authority.
6. No Product Master or Runtime mutation is performed by queue generation.

## Next boundary

After this read model is validated in CI and saved as a working savepoint, the next useful step is to expose it in an operator-facing review surface and then connect Gemini job execution behind the existing Candidate Inbox boundary. The Review Queue itself must remain non-authoritative.
