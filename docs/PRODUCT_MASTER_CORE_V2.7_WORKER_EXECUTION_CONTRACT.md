# Product Master Core v2.7 — Worker Execution Contract

Status: WORKING implementation aligned to `ChatGPT_Gemini_商品マスターパイプライン共通仕様書_v1.1_WORKING`.

This document describes common pipeline infrastructure only. It does not update a series Product Master and does not invoke Product Master STARTUP / SAVEPOINT / Registry gates.

## 1. Purpose

v2.7 removes execution-surface ambiguity and makes the source-to-Evidence boundary auditable before Evidence Inbox persistence.

`execution_mode` and `execution_channel` are separate concepts:

- `execution_mode`: `MOCK` / `REPLAY` / `LIVE_EXTERNAL`
- `execution_channel` for new LIVE jobs: `GEMINI_AI_PRO` / `GEMINI_API`

The common default is:

- `preferred_execution_channel = GEMINI_AI_PRO`
- `fallback_execution_channel = GEMINI_API`
- `fallback_allowed = false`

A batch/automation job may explicitly select `GEMINI_API` first.

The governed LIVE chain is now:

`Gemini Job → Execution Channel Router → Source Acquisition → Source Delivery → Gemini Execution → Transport Validation → Transport Provenance → Pre-Inbox Guard → Evidence Inbox → Unified Review Queue`

## 2. Common Worker fields

New Worker Contract v1.1 jobs record:

- `worker_contract_version`
- `execution_mode`
- `execution_channel`
- `preferred_execution_channel`
- `fallback_execution_channel`
- `fallback_allowed`
- `fallback_from`
- `fallback_reason`
- `transport_method`
- `execution_reference`
- `model` when known

`execution_reference` may be unresolved at CREATED time, but must identify the concrete external execution before a Gemini AI Pro handoff is accepted.

## 3. Execution Channel Router

The Router is a standalone policy boundary. New v1.1 LIVE jobs require an explicit channel.

No silent fallback is allowed. When `GEMINI_AI_PRO` is unavailable:

- `fallback_allowed = false` → `BLOCKED`
- `fallback_allowed = true` and fallback channel is `GEMINI_API` → `FALLBACK_SELECTED`

A governed fallback records the actual API channel, `fallback_from = GEMINI_AI_PRO`, the fallback reason, API transport method, and the API model resolved for the actual route.

Legacy artifacts without Worker Contract v1.1 are readable without guessing an execution channel.

## 4. Transport methods

Current normalized values are:

- `MOCK_IN_MEMORY`
- `REPLAY_ARTIFACT`
- `GEMINI_AI_PRO_STRUCTURED_HANDOFF`
- `GEMINI_API_DIRECT_RESPONSE`

These describe how Worker output crosses the governed Transport boundary. They do not change Evidence authority.

## 5. Product Profile v1.1

Profile v1.1 keeps series-specific configuration separate from common pipeline logic. In addition to identity/source/extraction fields, it explicitly records:

- `schemaAdapter`
- `runtimePartitionPolicy`
- `dependencyHooks`

Completion Policy storage/package authority remains forbidden in Product Profile.

The common Job builder applies Worker Contract defaults. AI Pro does not inherit the API default model when the actual AI Pro model is unknown; `model = null` is preserved until a model is genuinely known.

## 6. Source Acquisition Contract

Both LIVE surfaces use the same Source Acquisition contract before Worker execution.

The record binds:

- manufacturer / series / product ID
- execution channel
- Drive file ID / title / version
- official download/detail locations
- authoritative SHA-256
- acquired SHA-256 and byte size
- MIME/PDF validation
- PDF and printed-page scope
- canonical-field scope
- identity mode

Accepted identity modes are explicit full-byte identity or governed scoped-content equivalence. SHA mismatch, invalid PDF/source identity, unavailable source, or Job/source mismatch fails closed.

## 7. Source Delivery Contract

Source Acquisition answers **what was acquired**. Source Delivery separately answers **what was actually presented to the Worker**.

Current delivery methods:

- AI Pro: `INLINE_VERIFIED_PAGE_SCOPED_TEXT`
- API: `GEMINI_FILE_ATTACHMENT`

The Delivery record binds the acquired source SHA and identity, execution reference, requested scope, and the actual Worker-facing artifact/attachment. A Delivery record that cannot be reconciled with Source Acquisition is rejected before governed import.

## 8. Gemini AI Pro / Antigravity surface

The Antigravity self-hosted worker is treated as a Gemini AI Pro execution surface:

- `execution_mode = LIVE_EXTERNAL`
- `execution_channel = GEMINI_AI_PRO`
- `transport_method = GEMINI_AI_PRO_STRUCTURED_HANDOFF`
- `execution_reference` identifies the GitHub Actions run (or an explicit local Antigravity reference)

The historical `replay-job.json` filename is temporarily retained for workflow compatibility, but the record itself is a LIVE_EXTERNAL / GEMINI_AI_PRO Job.

The Antigravity surface derives verified page-scoped text before execution and temporarily denies model file/URL/command/MCP tools for the inline-evidence run. Its Execution Audit records the actual surface, authentication mode, conversation reference when available, response SHA, usage metadata when available, and no-authoritative-write flags. If the model name is not known, it remains `null` rather than being inferred from the API default.

An earlier v1.1 self-hosted AI Pro LIVE run on 2026-09-05 verified the external handoff path. Later contract refinements are additionally covered by common CI tests; a historical run is not treated as evidence for changes made after that run.

## 9. Gemini API surface

`.github/workflows/product-master-gemini-profile-live.yml` is the generic v1.1 API surface and remains `workflow_dispatch` only so repository pushes do not automatically consume Gemini API capacity.

It explicitly records:

- `execution_mode = LIVE_EXTERNAL`
- `execution_channel = GEMINI_API`
- `preferred_execution_channel = GEMINI_AI_PRO`
- `fallback_execution_channel = GEMINI_API`
- `fallback_allowed = false`
- `transport_method = GEMINI_API_DIRECT_RESPONSE`
- `execution_reference = GITHUB_ACTIONS_RUN:<repository>:<run_id>:<attempt>`
- explicit API model

Credential/model/source preflight is fail-closed. Secret credential values are never persisted.

For governed v1.1 execution, the API path deliberately stops at `TRANSPORT_VALIDATED` before Inbox persistence. It then builds Source Delivery and a pre-Inbox Gemini Execution Audit from the verified attachment, model/preflight state, actual response fingerprint, and retry audit.

## 10. Gemini Execution Audit

The Execution Audit distinguishes Job configuration from actual execution evidence. It records:

- actual execution channel and reference
- actual surface/provider
- model and whether it is known
- authentication mode without credential material
- preflight result
- source acquisition/delivery references
- provider result status
- raw response SHA-256
- retry metadata where applicable
- no-authoritative-write proof

For API, the pre-Inbox audit uses lifecycle stage `PRE_INBOX_TRANSPORT_VALIDATED`. For AI Pro, the Antigravity structured-output SHA must equal the raw Transport response SHA.

## 11. Transport Provenance Contract

Transport Provenance binds Worker execution to the exact envelope that will enter Evidence Inbox.

The provenance record binds:

- raw response SHA-256
- normalized Transport Envelope SHA-256
- execution channel/reference
- Gemini Execution Audit response fingerprint
- Transport `batchId`
- producer system/mode
- product ID
- source context

Producer/channel mapping is enforced:

- `GEMINI_AI_PRO` → `GEMINI_ANTIGRAVITY`
- `GEMINI_API` → `GEMINI_NOTEBOOKLM`

A stale response fingerprint, producer/channel mismatch, source mismatch, or normalized-envelope mismatch blocks the import.

## 12. Pre-Inbox Guard

The Pre-Inbox Guard is the final write boundary before Evidence Inbox persistence.

It requires all of the following to PASS:

1. v1.1 LIVE Job identity
2. Bridge Transport validation
3. Source Acquisition
4. Source Delivery
5. Gemini Execution Audit
6. Transport Provenance

Only then is `evidenceInboxWriteAllowed = true` and `persistGeminiTransport` may run.

A failure is `BLOCKED_AT_PRE_INBOX_GUARD`; the governed path must not create or mutate the Evidence Inbox manifest for that batch.

The dedicated v1.1 CLI is:

`scripts/run-gemini-product-master-job-v11.mjs`

Both current LIVE workflow surfaces route through this CLI and `runGovernedGeminiV11`. The older general CLI remains for compatibility but is not the governed v1.1 LIVE workflow entrypoint.

## 13. Evidence Inbox and Review Queue provenance

The raw Transport envelope remains schema-compatible and does not gain Worker execution fields.

The governed Inbox manifest stores an `executionContext` containing:

- Worker Execution Context
- `sourceAcquisition`
- `sourceDelivery`
- `geminiExecution`
- `transportProvenance`

The Unified Review Queue carries the same context in Evidence Candidate references. Reviewers can therefore trace source identity, Worker-facing delivery, actual execution, and exact Transport fingerprint without changing the Evidence Candidate schema.

Legacy Inbox batches without execution context remain readable; missing historical channels must not be inferred.

## 14. Authority boundary

Worker output remains Evidence Candidate material only. None of the v1.1 contracts grants authority to write Authoring Master, Runtime, Registry, Production, or canonical Drive folders.

Human Approval and Master Change remain separate downstream gates.

Transport Schema v1.0 and Evidence Candidate schema remain unchanged. Execution implementation details stay outside canonical Product Master data.

## 15. Reproducibility acceptance checks

v2.7 tests lock at least the following behavior:

1. Profile v1.1 extension fields are validated.
2. New LIVE jobs use explicit execution-channel policy.
3. Legacy artifacts do not receive guessed channels.
4. No silent AI Pro → API fallback is allowed.
5. API fallback, when explicitly allowed, records actual route/reason/model.
6. Both LIVE surfaces use common Source Acquisition semantics.
7. AI Pro uses verified scoped Delivery; API uses verified Gemini File Delivery.
8. Gemini Execution Audit binds actual surface/model/preflight to raw response SHA.
9. Transport Provenance binds Execution Audit to the exact normalized envelope.
10. Producer/channel mismatch fails closed.
11. A stale Execution Audit response SHA fails before Evidence Inbox write.
12. Pre-Inbox Guard failure leaves the Inbox manifest unwritten for the rejected batch.
13. Successful guarded import persists the full provenance chain into Inbox and Review Queue.
14. Gemini API workflow remains manual-only.
15. Both LIVE workflows use the dedicated governed v1.1 runner.
16. Human Approval / Master Change authority remains closed after Evidence import.
