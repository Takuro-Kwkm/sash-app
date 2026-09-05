# Product Master Core v2.7 — Gemini Execution Audit Contract

## Status

COMMON INFRASTRUCTURE / NON-PRODUCT-MASTER TASK

This contract normalizes the actual Gemini execution evidence produced after Source Acquisition / Source Delivery and before Evidence is treated as a governed candidate batch.

It does not authorize Product Master, Runtime, Registry, or canonical Drive writes.

## Pipeline position

```text
Gemini Job
  -> Execution Channel Router
  -> Source Acquisition
  -> Source Delivery / Scope Validation
  -> Gemini Execution
  -> Transport
  -> Evidence Inbox
  -> Evidence Adjudication
  -> Unified Review Queue
```

The Worker Contract describes the requested execution policy. The Gemini Execution Audit records what actually executed.

## Schema

- schemaVersion: `1.1`
- recordType: `PRODUCT_MASTER_GEMINI_EXECUTION`
- persistable status: `SUCCEEDED`

A successful record contains:

- Gemini Job identity
- execution mode
- actual execution channel
- preferred/fallback channels
- fallback permission / provenance
- transport method
- execution reference
- model when known
- execution surface identity
- authentication mode without credential values
- preflight result
- Source Acquisition reference/fingerprint
- Source Delivery reference/fingerprint
- raw response SHA-256
- retry audit when applicable
- no-authoritative-write declaration
- `credentialMaterialPersisted=false`

## GEMINI_AI_PRO

Surface:

`ANTIGRAVITY_CLI`

Provider system:

`GEMINI_ANTIGRAVITY`

Authentication mode:

`GOOGLE_AI_PRO_OAUTH`

The AI Pro model field remains `null` unless the actual model is explicitly known. The contract must not infer the API Profile model as the AI Pro model.

Before Transport import, the normalized execution audit requires:

- Job channel = `GEMINI_AI_PRO`
- traceable execution reference
- PASS AI Pro Source Acquisition
- PASS `INLINE_VERIFIED_PAGE_SCOPED_TEXT` Source Delivery
- Antigravity status = `SUCCESS`
- producer system = `GEMINI_ANTIGRAVITY`
- authentication mode = `GOOGLE_AI_PRO_OAUTH`
- no denied Worker actions
- structured output SHA-256
- structured output SHA-256 equals the exact raw Transport file fingerprint
- canonical/runtime/production write flags all false

A fingerprint mismatch blocks the governed handoff before Evidence import.

## GEMINI_API

Surface:

`GOOGLE_GEMINI_API`

Authentication mode:

`GEMINI_API_KEY`

A successful API execution audit requires:

- Job channel = `GEMINI_API`
- explicit model
- traceable execution reference
- PASS API Source Acquisition
- PASS `GEMINI_FILE_ATTACHMENT` Source Delivery
- credential/model/source preflight = READY
- API key presence proven without returning the key
- secret echo/value persistence disabled
- governed bridge result imported successfully
- raw response SHA-256 present
- canonical/runtime/production write flags all false

Transient provider retry information is preserved in the normalized execution audit. Credentials are never included.

## Separation of concerns

The following are deliberately separate records:

### Worker Execution Contract

What channel/fallback/model policy was requested.

### Source Acquisition

What official source was acquired and how its identity was established.

### Source Delivery

What exact source representation/scope was supplied to the selected Worker.

### Gemini Execution Audit

What execution surface actually ran and what response fingerprint it produced.

This separation prevents a configured Job from being mistaken for proof that execution actually occurred.

## Evidence Inbox persistence

After the governed response is accepted, the execution audit is persisted under:

```text
manifest.batches[].executionContext.geminiExecution
```

The Unified Review Queue forwards the same `executionContext` into Evidence candidate refs, allowing a reviewer to inspect:

- requested Worker policy
- actual channel
- fallback provenance
- source acquisition
- source delivery
- actual execution surface/model
- response fingerprint

from one queue item.

## Fail-closed rules

Execution provenance is BLOCKED when any of the following is true:

- actual channel differs from Job channel
- execution reference is missing or mismatched
- model is missing for Gemini API
- Source Acquisition/Delivery provenance does not match the Job
- AI Pro provider status is not SUCCESS
- AI Pro attempted denied actions
- AI Pro output hash differs from governed raw response hash
- API preflight is not READY
- API credential presence is not proven
- secret policy allows credential value return or echo
- response SHA-256 is missing or mismatched
- authoritative write flags are not all false
- a different execution audit is already attached to the Evidence batch

No missing execution details are inferred.

## Authority boundary

A successful Gemini Execution Audit proves execution provenance only. It cannot:

- approve Evidence
- replace Evidence Adjudication
- approve a Change Proposal
- modify Authoring Master
- modify Runtime
- modify Registry
- declare Product Master FORMAL PASS
- replace Human Approval

## Required regression coverage

The v2.7 suite must prove:

1. AI Pro execution audit preserves unknown model as null
2. AI Pro surface/producer/authentication identity
3. AI Pro output fingerprint equality with governed raw Transport
4. AI Pro fingerprint mismatch BLOCKED
5. API execution requires an explicit model
6. API preflight credential presence without credential value persistence
7. API retry provenance preservation
8. Gemini execution persistence into Evidence Inbox
9. propagation into Unified Review Queue refs
10. both LIVE workflow surfaces enforce `GEMINI_EXECUTION_GATE=PASS`
11. authority remains closed

## Current LIVE surface policy

- `GEMINI_AI_PRO` is the default PRIMARY Worker channel.
- `GEMINI_API` is SECONDARY by default and may be directly selected for Batch/Automation jobs.
- AI Pro execution audit is normalized before the external result enters Transport.
- API execution audit is generated from the verified internal execution result and persisted with the imported batch.
- API LIVE remains manual-only to avoid unintended API consumption.
