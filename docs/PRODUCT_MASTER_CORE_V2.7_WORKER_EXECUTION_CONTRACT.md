# Product Master Core v2.7 — Worker Execution Contract

Status: WORKING implementation aligned to `ChatGPT_Gemini_商品マスターパイプライン共通仕様書_v1.1_WORKING`.

This document describes common pipeline infrastructure only. It does not update a series Product Master and does not invoke Product Master STARTUP / SAVEPOINT / Registry gates.

## 1. Purpose

v2.7 removes execution-surface ambiguity from Gemini Jobs. `execution_mode` and `execution_channel` are separate concepts:

- `execution_mode`: `MOCK` / `REPLAY` / `LIVE_EXTERNAL`
- `execution_channel` for new LIVE jobs: `GEMINI_AI_PRO` / `GEMINI_API`

The common default is:

- `preferred_execution_channel = GEMINI_AI_PRO`
- `fallback_execution_channel = GEMINI_API`
- `fallback_allowed = false`

A batch/automation job may explicitly select `GEMINI_API` first.

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

## 3. Transport methods

Current normalized values:

- `MOCK_IN_MEMORY`
- `REPLAY_ARTIFACT`
- `GEMINI_AI_PRO_STRUCTURED_HANDOFF`
- `GEMINI_API_DIRECT_RESPONSE`

These describe how the worker result crosses into the governed Transport boundary. They do not change Evidence authority.

## 4. Fallback rule

No silent fallback is allowed.

When `execution_channel = GEMINI_AI_PRO` and the AI Pro execution surface or handoff is unavailable:

- `fallback_allowed = false` -> `BLOCKED`
- `fallback_allowed = true` and fallback channel is `GEMINI_API` -> route to API and record:
  - actual `execution_channel = GEMINI_API`
  - `fallback_from = GEMINI_AI_PRO`
  - `fallback_reason`
  - `transport_method = GEMINI_API_DIRECT_RESPONSE`

## 5. Legacy compatibility

Legacy Job artifacts without `worker_contract_version = 1.1` are readable without inventing `execution_channel`.

A new Worker Contract v1.1 LIVE Job without `execution_channel` is rejected. This deliberately separates backward compatibility from new-job authoring rules.

## 6. Product Profile v1.1

Profile v1.1 keeps series-specific configuration separate from common pipeline logic. In addition to identity/source/extraction fields, it explicitly records:

- `schemaAdapter`
- `runtimePartitionPolicy`
- `dependencyHooks`

Completion Policy storage/package authority remains forbidden in Product Profile.

The current LIXIL Thermos L reproducibility profile is upgraded to Profile v1.1. Its worker routing is not hidden inside series-specific Master data; the common Job builder applies the Worker Contract defaults and an execution surface may explicitly override them.

## 7. Gemini AI Pro / Antigravity surface

The Antigravity self-hosted worker is treated as a Gemini AI Pro execution surface:

- `execution_mode = LIVE_EXTERNAL`
- `execution_channel = GEMINI_AI_PRO`
- `transport_method = GEMINI_AI_PRO_STRUCTURED_HANDOFF`
- `execution_reference` identifies the GitHub Actions run (or an explicit local Antigravity reference)

The historical `replay-job.json` filename is temporarily retained for workflow compatibility, but the Job record itself is no longer modeled as REPLAY.

The v1.1 workflow was verified with an actual self-hosted Antigravity Google AI Pro run on 2026-09-05. Worker Contract validation, source SHA verification, structured worker output, governed Transport import, Evidence Inbox execution provenance, Review Queue propagation, and the no-authoritative-write boundary all passed.

## 8. Gemini API surface

The direct Gemini API runner explicitly selects `GEMINI_API` for LIVE API execution. Credential/model/source preflight remains fail-closed.

`.github/workflows/product-master-gemini-profile-live.yml` is the generic v1.1 API execution surface. It is `workflow_dispatch` only: repository pushes do not automatically consume Gemini API capacity. The workflow explicitly records:

- `execution_mode = LIVE_EXTERNAL`
- `execution_channel = GEMINI_API`
- `preferred_execution_channel = GEMINI_AI_PRO`
- `fallback_execution_channel = GEMINI_API`
- `fallback_allowed = false`
- `transport_method = GEMINI_API_DIRECT_RESPONSE`
- `execution_reference = GITHUB_ACTIONS_RUN:<repository>:<run_id>:<attempt>`

Missing `GEMINI_API_KEY`, missing model/source, or authoritative source SHA mismatch blocks before model execution. Secret values are not persisted in audit artifacts.

## 9. Evidence Inbox execution provenance

The raw Transport envelope remains schema-compatible and does not gain Worker execution fields.

At the governed import boundary, the Orchestrator builds a normalized `executionContext` from the completed Job and stores it on the Evidence Inbox manifest batch entry. The Review Queue carries the same context in Evidence Candidate references so reviewers can trace the actual execution surface without changing the Evidence Candidate schema.

The normalized context includes:

- `workerContractVersion`
- `executionMode`
- `executionChannel`
- `preferredExecutionChannel`
- `fallbackExecutionChannel`
- `fallbackAllowed`
- `fallbackFrom`
- `fallbackReason`
- `transportMethod`
- `executionReference`
- `model`

Legacy Evidence Inbox batches without execution context remain valid. The system must not infer or backfill a channel for those batches.

## 10. Authority boundary

Worker output remains Evidence Candidate material only. Worker Contract v1.1 does not grant authority to write Authoring Master, Runtime, Registry, Production, or canonical Drive folders.

Transport Schema v1.0 and Evidence Candidate schema remain unchanged. Execution-channel differences are kept outside Product Master schema so AI Pro/API implementation details do not leak into canonical product data.

## 11. Reproducibility acceptance checks

v2.7 tests lock the following behavior:

1. Profile v1.1 required extension fields are validated.
2. New LIVE jobs default to AI Pro primary and API fallback disabled.
3. New LIVE Worker Contract jobs reject missing `execution_channel`.
4. Legacy artifacts do not receive guessed channels.
5. Gemini AI Pro structured handoff remains `LIVE_EXTERNAL` and preserves execution provenance.
6. Missing AI Pro surface blocks when fallback is not allowed.
7. API fallback occurs only when explicitly allowed and records `fallback_from` and reason.
8. Evidence Inbox persists normalized execution provenance separately from raw Transport JSON.
9. Review Queue exposes that provenance for Evidence review.
10. Legacy Inbox batches remain readable without invented execution metadata.
11. AI Pro and API workflow surfaces both declare their execution channel and transport method explicitly.
12. API Profile LIVE remains manual-only and keeps Human Approval / Master Change authority closed.
