# Product Master Core v2.7 — Source Delivery / Scope Validation Contract

## Status

COMMON INFRASTRUCTURE / NON-PRODUCT-MASTER TASK

This contract sits between Source Acquisition and Gemini execution. It records the exact evidence representation delivered to the selected Worker and proves that the delivered material remains bound to the acquired official source and requested scope.

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

Source Acquisition answers **what official source was acquired**. Source Delivery answers **what exact representation of that source was delivered to the Worker**.

## Schema

- schemaVersion: `1.1`
- recordType: `PRODUCT_MASTER_SOURCE_DELIVERY`
- status: `PASS`

Every PASS record contains:

- executionChannel
- executionReference when known
- Drive source identity
- acquired source SHA-256
- source identity mode
- requested PDF pages
- requested printed pages
- requested canonical fields
- delivery method
- delivery-specific fingerprint/reference
- `credentialMaterialPersisted=false`

## GEMINI_AI_PRO delivery

Method:

`INLINE_VERIFIED_PAGE_SCOPED_TEXT`

The AI Pro/Antigravity surface derives text only from the PDF that already passed Source Acquisition. Before the Worker is invoked, the Source Delivery gate requires:

- Source Acquisition status PASS
- Source Acquisition channel `GEMINI_AI_PRO`
- exact equality between scope audit `pageScope` and Source Acquisition `pdfPages`
- one page-audit entry for every requested PDF page
- SHA-256 for every page text extraction
- SHA-256 and positive byte length for the combined scoped-text artifact
- execution reference consistency when supplied

The Source Delivery record is generated **before** `agy` execution. If it cannot be generated, Gemini AI Pro is not invoked.

## GEMINI_API delivery

Method:

`GEMINI_FILE_ATTACHMENT`

The API surface uses the same Source Acquisition record, then verifies the actual Gemini Files API attachment used by generation. The Source Delivery gate requires:

- Source Acquisition status PASS
- Source Acquisition channel `GEMINI_API`
- Gemini attachment SHA-256 equals the acquired PDF SHA-256
- attachment MIME type is `application/pdf`
- positive attachment byte size
- attachment byte size equals acquired PDF size when both are available
- non-empty provider attachment reference / Gemini File URI
- execution reference consistency

Both direct upload audit form (`sourceSha256`) and pre-uploaded-file verification audit form (`providerSha256Hex` / `expectedSha256Hex`) are normalized by the common contract.

The API execution layer may apply additional provider-specific checks. A PASS Source Acquisition record does not bypass Gemini Files API verification.

## Fail-closed rules

Worker execution or downstream provenance persistence is blocked when:

- delivery channel differs from Source Acquisition or Job channel
- execution reference differs from Job reference
- delivered source fingerprint differs from acquired source fingerprint
- requested PDF/printed scope differs from Source Acquisition
- AI Pro scoped text does not fully cover requested pages
- API attachment URI is unavailable
- API attachment SHA/MIME/size validation fails
- a different Source Delivery record is already persisted for the same Evidence batch

No missing or contradictory Source Delivery metadata is inferred.

## Evidence Inbox persistence

After Transport import, Source Delivery is persisted under:

```text
manifest.batches[].executionContext.sourceDelivery
```

The Unified Review Queue forwards the full execution context into Evidence candidate refs. Reviewers can therefore inspect, from one queue item:

- execution channel
- execution reference
- model when known
- Source Acquisition provenance
- Source Delivery / scope provenance
- fallback provenance when applicable

## Authority boundary

Source Delivery is evidence provenance only. It cannot:

- approve Evidence
- approve a Change Proposal
- modify Authoring Master
- modify Runtime
- modify Registry
- perform formal Product Master adoption
- replace Human Approval

## Required regression coverage

The v2.7 suite must prove:

1. AI Pro scoped delivery PASS with exact scope and fingerprints
2. AI Pro scope mismatch BLOCKED
3. API verified attachment PASS when SHA/MIME/size/reference match
4. API attachment fingerprint mismatch BLOCKED
5. Source Delivery persistence into Evidence Inbox
6. Source Delivery propagation into Unified Review Queue
7. no credential material persisted
8. AI Pro workflow performs Source Delivery validation before Worker invocation
9. API workflow verifies the persisted `GEMINI_FILE_ATTACHMENT` delivery record
10. both LIVE surfaces declare `SOURCE_DELIVERY_GATE=PASS` only after validation

## Relationship to fallback

Fallback remains an Execution Channel Router decision. If a Job actually changes channel, Source Acquisition and Source Delivery must correspond to the **actual selected channel**. An AI Pro delivery record must not be reused as an API delivery record, or vice versa.
