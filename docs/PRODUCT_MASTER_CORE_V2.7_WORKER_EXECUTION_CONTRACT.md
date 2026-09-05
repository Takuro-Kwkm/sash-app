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

## 8. Gemini API surface

The direct Gemini API runner explicitly selects `GEMINI_API` for LIVE API execution. Credential/model/source preflight remains fail-closed.

## 9. Authority boundary

Worker output remains Evidence Candidate material only. Worker Contract v1.1 does not grant authority to write Authoring Master, Runtime, Registry, Production, or canonical Drive folders.

Transport Schema v1.0 and Evidence Candidate schema remain unchanged. Execution-channel differences are kept outside Product Master schema so AI Pro/API implementation details do not leak into canonical product data.

## 10. Reproducibility acceptance checks

v2.7 tests lock the following behavior:

1. Profile v1.1 required extension fields are validated.
2. New LIVE jobs default to AI Pro primary and API fallback disabled.
3. New LIVE Worker Contract jobs reject missing `execution_channel`.
4. Legacy artifacts do not receive guessed channels.
5. Gemini AI Pro structured handoff remains `LIVE_EXTERNAL` and preserves execution provenance.
6. Missing AI Pro surface blocks when fallback is not allowed.
7. API fallback occurs only when explicitly allowed and records `fallback_from` and reason.
