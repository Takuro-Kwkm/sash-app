# Product Master Core v2.2 — Gemini Credential Injection + Verified LIVE Retry

## Purpose

This revision prepares the blocked Phase 3 LIVE_EXTERNAL path for a secure retry without exposing credentials in chat, CLI arguments, repository files, logs, or audit artifacts.

The controlled path is:

`Drive source fingerprint -> secure environment credential -> Gemini file metadata verification -> generateContent -> Transport validation -> Evidence Inbox -> Unified Review Queue`

Gemini never writes Canonical Product Master, Runtime, or Production data.

## Secure credential contract

A real LIVE_EXTERNAL retry requires:

- `GEMINI_API_KEY` — secret environment variable only.
- `GEMINI_MODEL` — explicit `gemini-*` model name. Repository variable or environment variable is allowed because it is not a credential.
- one source route:
  - `GEMINI_SOURCE_FILE` / `--source-file` pointing to the authenticated Drive-fetched PDF, or
  - `GEMINI_FILE_URI` pointing to a recently uploaded Gemini Files API object.

API keys supplied through `--api-key`, `--gemini-api-key`, or `--key` are rejected by the v2.2 preflight.

The preflight returns only credential presence/source metadata. It never returns the API key value.

## APW430 source binding

- Manufacturer: YKK AP
- Series: APW430
- Product ID: `SER-YKK-APW430`
- Drive File ID: `1j9PtW8yoKBZ4Nodm58wU3QtOCvxlEja9`
- Source title: `202607_YKKAP_APW430_商品カタログ.pdf`
- Source version: `202607`
- Drive-fetched size: `33064011` bytes
- Drive-fetched SHA-256: `a3b130d2227af07808c36d74528592ab76f52b122057d831d5fef5aa34b246be`

## Preuploaded Gemini file verification

A preuploaded `GEMINI_FILE_URI` is not trusted by URI alone.

Before `generateContent`, v2.2 calls Gemini Files API metadata and requires:

1. provider file resolves to `files/{id}`;
2. provider state is `ACTIVE`;
3. provider metadata includes `sha256Hash`;
4. provider `sha256Hash` equals the Base64 form of the Drive-fetched source SHA-256.

Mismatch is fail-closed with `GEMINI_FILE_SHA256_MISMATCH` and inference is not executed.

This preserves Drive provenance when a short-lived Gemini file URI is injected through a secure environment.

## Files API lifetime

Gemini Files API uploads are temporary and are automatically deleted by the provider after the provider retention window. A retry must therefore use a current URI. Expired or unavailable URIs are treated as provider/file verification failures rather than silently falling back to another source.

## CLI

Credential/source preflight:

`npm run gemini:preflight:v22`

APW430 verified LIVE retry:

`npm run gemini:live:apw430:v22`

Authenticated local Drive source route:

`GEMINI_API_KEY=... GEMINI_MODEL=gemini-... npm run gemini:live:apw430:v22 -- --source-file=/secure/path/APW430.pdf`

Do not place the actual API key in command history in shared environments. Prefer an environment/secret manager injection mechanism.

Preuploaded file route:

- `GEMINI_API_KEY` from secret environment
- `GEMINI_MODEL` from environment/repository variable
- `GEMINI_FILE_URI` from protected environment/secret

The APW430 runner verifies the provider file hash before inference.

## GitHub Actions retry workflow

`.github/workflows/gemini-live-apw430-retry.yml` is intentionally `workflow_dispatch` only.

It expects:

- Repository/Environment Secret: `GEMINI_API_KEY`
- Repository Variable: `GEMINI_MODEL`
- Repository/Environment Secret: `GEMINI_APW430_FILE_URI`

The workflow runs v2.2 preflight first, then the APW430 LIVE_EXTERNAL runner. Missing credentials/source fail before inference. Non-secret audit artifacts are retained for seven days.

The workflow does not fetch or expose secret values and does not auto-approve Product Master changes.

## Authority boundary

- Evidence adjudication: `CHATGPT_OR_HUMAN`
- Product Master change approval: `HUMAN_REQUIRED`
- Production apply: existing controlled gate only
- Review Queue mutation authority: `NONE`
- Canonical auto-write: `false`
- Runtime auto-write: `false`
- Production auto-write: `false`

## Test coverage

`test/36-product-master-core-v22-gemini-credential-retry.test.mjs` covers:

- missing credential -> BLOCKED;
- secret CLI argument -> BLOCKED;
- environment credential -> READY without secret echo;
- invalid model name -> BLOCKED;
- preuploaded file SHA mismatch -> BLOCKED before inference;
- verified provider SHA -> LIVE mocked response -> Transport -> Evidence Inbox -> Unified Review Queue;
- Human approval boundary retained;
- Canonical / Runtime / Production writes remain false.

Run:

`npm run test:product-master-core:v22`

## Current real LIVE gate

Implementation of the secure retry path does not itself prove a new real Gemini provider round trip.

`GEMINI_LIVE_EXECUTION_GATE = PASS` is allowed only after a credentialed provider request returns a real response and that response passes Transport, Evidence Inbox, and Review Queue checks.

Until then:

`GEMINI_LIVE_EXECUTION_GATE = BLOCKED`

Do not advance to Phase 4 while this principal Phase 3 gate remains blocked.
