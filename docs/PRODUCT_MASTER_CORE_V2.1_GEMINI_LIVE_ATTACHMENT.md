# Product Master Core v2.1 — Gemini LIVE_EXTERNAL Source Attachment

## Purpose

This revision closes the source-attachment gap between a Drive-fetched official PDF and the existing Gemini Execution Bridge.

The controlled path is:

`Drive official PDF -> local authenticated fetch -> SHA-256 verification -> Gemini Files API -> ACTIVE state verification -> Gemini file URI -> generateContent -> Transport validation -> Evidence Inbox -> Unified Review Queue`

Gemini never writes Canonical Product Master, Runtime, or Production data.

## Authority boundary

- Evidence adjudication: `CHATGPT_OR_HUMAN`
- Product Master change approval: `HUMAN_REQUIRED`
- Production apply: existing controlled gate only
- Canonical auto-write: `false`
- Runtime auto-write: `false`
- Production auto-write: `false`

## Runtime contract

Required for a real LIVE_EXTERNAL run:

- `GEMINI_API_KEY` — secret environment variable. Never pass it as a CLI argument or persist it in audit output.
- `GEMINI_MODEL` — explicit Gemini model name.
- Drive-fetched source PDF path via `--source-file=...` or `GEMINI_SOURCE_FILE`.

The generic runner is:

`node scripts/run-gemini-product-master-job.mjs --job=<job.json> --source-file=<Drive-fetched.pdf>`

The APW430 verification runner is:

`npm run gemini:live:apw430:v21 -- --source-file=<Drive-fetched APW430 catalog.pdf>`

## APW430 source binding

- Manufacturer: YKK AP
- Series: APW430
- Product ID: `SER-YKK-APW430`
- Drive File ID: `1j9PtW8yoKBZ4Nodm58wU3QtOCvxlEja9`
- Source title: `202607_YKKAP_APW430_商品カタログ.pdf`
- Source version: `202607`
- Drive-fetched SHA-256: `a3b130d2227af07808c36d74528592ab76f52b122057d831d5fef5aa34b246be`
- Drive-fetched size: `33064011` bytes

The APW430 runner refuses a local source whose SHA-256 does not match this fingerprint.

## Gemini Files API boundary

`src/product-master-core/gemini-file-upload.mjs` implements the current resumable Files API upload flow:

1. Validate API key and local source availability.
2. Enforce the configured PDF size ceiling.
3. Compute and verify SHA-256.
4. Start resumable upload with `x-goog-api-key` in the request header.
5. Upload/finalize the file bytes.
6. If the provider reports `PROCESSING`, poll `files.get` until the file reaches `ACTIVE`; fail closed on `FAILED`, status error, or processing timeout.
7. Capture only non-secret file metadata and the returned Gemini file URI.
8. Pass the ACTIVE file URI into the existing `generateContent` bridge.

Provider errors are recursively redacted against the supplied API key before returning from the bridge.

## Evidence safety

A valid Gemini response must still pass the pre-existing transport validator. The live APW430 contract requires:

- `transportType = EVIDENCE_CANDIDATE_BATCH`
- `transportSchemaVersion = 1.0`
- `productId = SER-YKK-APW430`
- `producer.system = GEMINI_NOTEBOOKLM`
- `producer.mode = LIVE_EXTERNAL`
- exact Drive source provenance

Only a validated batch is persisted to the Evidence Candidate Inbox. Review Queue remains read-only.

## Test coverage

`test/35-product-master-core-v21-gemini-live-attachment.test.mjs` covers:

- Files API upload success
- `PROCESSING -> ACTIVE` status polling before inference handoff
- SHA-256 source mismatch rejection
- unavailable source rejection
- LIVE upload -> generateContent -> Transport -> Inbox -> Review Queue
- Human approval boundary retention
- Canonical/Runtime/Production write = false
- API-key redaction from provider errors

Run:

`npm run test:product-master-core:v21`

## Current live gate

At implementation time on 2026-09-04, the ChatGPT execution environment did not expose `GEMINI_API_KEY` or `GEMINI_MODEL`, and no Gemini connector/plugin was available. Therefore this revision must not claim a new real provider request was executed.

`GEMINI_LIVE_EXECUTION_GATE = BLOCKED`

The code path is ready for a credentialed retry, but PASS requires a real request/response followed by successful Transport, Inbox, and Review Queue verification.
