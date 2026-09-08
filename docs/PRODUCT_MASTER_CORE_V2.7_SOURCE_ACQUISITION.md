# Product Master Core v2.7 — Source Acquisition Contract

## Status

COMMON INFRASTRUCTURE / NON-PRODUCT-MASTER TASK

This document defines the shared Source Acquisition boundary used by the Gemini AI Pro and Gemini API execution surfaces. It does not authorize Product Master, Runtime, Registry, or canonical Drive writes.

## Pipeline position

```text
Gemini Job
  -> Execution Channel Router
  -> Source Acquisition
  -> Gemini Execution
  -> Transport
  -> Evidence Inbox
  -> Evidence Adjudication
  -> Unified Review Queue
```

Source Acquisition is a separate gate. A LIVE worker must not execute against an unverified or provenance-mismatched source.

## Common implementation

- Core: `src/product-master-core/source-acquisition.mjs`
- Persistence: `src/product-master-core/source-acquisition-store.mjs`
- CLI: `scripts/acquire-product-master-source.mjs`
- AI Pro surface: `.github/workflows/product-master-antigravity-profile-live.yml`
- API surface: `.github/workflows/product-master-gemini-profile-live.yml`

Both LIVE worker surfaces must call the same acquisition CLI and pass the resulting audit record into the governed Gemini runner.

## Required Profile inputs

For `OFFICIAL_PDF`, the Source Acquisition request requires:

- manufacturer
- series
- productId
- source.type = `OFFICIAL_PDF`
- source.driveFileId
- source.title
- source.version when known
- source.officialDownloadUrl
- source.officialDetailUrl
- source.authoritativeSha256
- source.pageCount
- extraction.pageScope
- extraction.printedPageScope when used
- extraction.canonicalFieldScope when used
- selected execution channel

PDF page scope must remain inside the authoritative page count. When printed-page scope is supplied, it must map one-to-one to the PDF-page scope.

## Acquisition record

Schema version: `1.1`

Record type: `PRODUCT_MASTER_SOURCE_ACQUISITION`

The PASS record contains at least:

- manufacturer / series / productId
- executionChannel
- Drive source identity
- official detail/download location
- authoritative SHA-256
- requested PDF / printed-page scope
- retrieval method and resolved URL
- downloaded byte size
- acquired SHA-256
- source identity mode
- local artifact file name when persisted
- `credentialMaterialPersisted=false`

Credentials, tokens, sessions, OAuth material, API keys, or secret values must never be serialized into this record.

## Source identity modes

### FULL_BYTE_IDENTITY

Used when acquired PDF SHA-256 equals the authoritative SHA-256 exactly.

This is the preferred identity mode.

### SCOPED_CONTENT_EQUIVALENCE

Allowed only when full-byte identity differs and an explicit reproducible proof passes the existing scoped source-equivalence validator.

A SHA mismatch alone is never accepted. Without a valid proof, Source Acquisition is BLOCKED.

## Fail-closed rules

Source Acquisition blocks LIVE execution when any of the following occurs:

- source metadata is incomplete
- authoritative SHA-256 is invalid
- page scope is invalid or outside pageCount
- execution channel is invalid
- official download fails
- downloaded bytes are not a PDF
- acquired SHA differs and no valid scoped-equivalence proof exists
- acquisition record does not match the Gemini Job source provenance
- acquisition record executionChannel does not match the Gemini Job
- Evidence Inbox persistence conflicts with existing provenance

No automatic downgrade from failed source verification is allowed.

## Evidence provenance persistence

After a governed Gemini response passes Transport and is imported into Evidence Inbox, the Source Acquisition record is persisted under:

```text
manifest.batches[].executionContext.sourceAcquisition
```

The Unified Review Queue already forwards batch `executionContext` into Evidence candidate `refs.executionContext`, so reviewers can inspect both:

- Worker execution provenance
- Source acquisition provenance

from the same queue item.

## Worker-specific behavior

### GEMINI_AI_PRO

The common Source Acquisition step retrieves and verifies the PDF first. AI Pro may then derive a page-scoped text artifact from that verified PDF for tool-less inline evidence delivery. That derived text is secondary to the common acquisition record and does not replace Drive/PDF provenance.

### GEMINI_API

The same common Source Acquisition step retrieves and verifies the PDF first. The verified local PDF may then be uploaded through the existing Gemini File API verifier. Provider-side attachment verification remains an additional execution check, not a replacement for Source Acquisition.

## Authority boundary

Source Acquisition can verify, persist, and expose source provenance only.

It cannot:

- approve Evidence
- approve Master Change Proposals
- modify Authoring Master
- modify Canonical Master
- generate authoritative Runtime state by itself
- write Registry
- declare Product Master FORMAL PASS

Human approval and downstream Change Control remain separate gates.

## Regression requirements

`test:product-master-core:v27` must prove at least:

1. valid channel-aware Source Acquisition request
2. scope/pageCount bounds
3. full-byte SHA identity PASS
4. SHA mismatch without proof BLOCKED
5. no credential material in acquisition record
6. persistence into Evidence Inbox executionContext
7. propagation into Review Queue refs
8. both LIVE workflows use the shared acquisition CLI
9. both LIVE workflows pass the acquisition audit to the governed Gemini runner
10. both LIVE workflows enforce `SOURCE_ACQUISITION_GATE=PASS`

## Current execution policy

- Gemini AI Pro is the default PRIMARY channel.
- Gemini API is the standard SECONDARY channel and may also be selected directly when Batch/Automation is appropriate.
- Source Acquisition rules are identical regardless of channel.
- Fallback is an Execution Channel Router decision; Source Acquisition must then correspond to the actual selected channel and must not reuse a mismatched channel audit record.
