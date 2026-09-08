# Product Master Core v0.4｜Gemini / NotebookLM Transport Contract

Status: **EXPERIMENTAL / NON-CANONICAL**

Target PoC: **YKK AP APW 430 / FIX窓 family**

## 1. Goal

v0.4 defines the file-level contract between an external NotebookLM/Gemini extraction run and the v0.3 Evidence Candidate Inbox.

```text
Official PDF in NotebookLM
        ↓
Product Master Evidence Extraction Prompt v1
        ↓
Pure JSON Transport Envelope
        ↓
Transport Validator / Import CLI
        ↓
Evidence Candidate Inbox
        ↓
ChatGPT or Human adjudication
        ↓
ACCEPT / REJECT / PENDING
        ↓
Canonical Evidence / PENDING
        ↓
Rule / Gate / Runtime
```

The transport boundary does **not** grant Canonical write authority.

## 2. Prompt

Canonical extraction prompt:

`docs/notebooklm/PRODUCT_MASTER_EVIDENCE_EXTRACTION_PROMPT_V1.md`

The prompt requires:

- source-grounded atomic claims only;
- no inference from other products;
- exact PDF locators;
- unknown/ambiguous facts routed to `issues`;
- pure JSON output only;
- no self-declared VERIFIED / ACCEPT / PASS.

## 3. Transport Envelope

Required top-level form:

```json
{
  "transportSchemaVersion": "1.0",
  "transportType": "EVIDENCE_CANDIDATE_BATCH",
  "batchId": "BATCH-...",
  "generatedAt": "2026-09-02T00:00:00Z",
  "producer": {
    "system": "GEMINI_NOTEBOOKLM",
    "mode": "LIVE_EXTERNAL"
  },
  "productId": "SER-YKK-APW430",
  "sourceContext": {
    "type": "OFFICIAL_PDF",
    "driveFileId": "...",
    "title": "...",
    "version": "..."
  },
  "candidates": [],
  "issues": []
}
```

`producer.mode`:

- `LIVE_EXTERNAL`: actual external Gemini/NotebookLM output
- `SIMULATED_FIXTURE`: test-only fixture

The current repository PoC uses only `SIMULATED_FIXTURE`; it does not claim a live Gemini run.

## 4. Strict boundary rules

The transport is rejected before the Inbox when any of the following occur:

- Markdown code fences instead of pure JSON;
- wrong schema/version/type;
- wrong product id;
- Candidate product mismatch;
- Candidate producer mode mismatch;
- Candidate Drive source mismatch;
- unknown Canonical Field;
- unknown Product Node;
- missing printed/PDF page locator for official PDF Evidence;
- Candidate attempts to self-declare Canonical VERIFIED status.

## 5. Importer behavior

CLI:

```bash
npm run import:gemini-evidence -- path/to/transport.json
```

A valid transport returns:

```text
ACCEPTED_TO_EVIDENCE_INBOX
canonicalWritePerformed = false
nextAction = CHATGPT_OR_HUMAN_ADJUDICATION_REQUIRED
```

An invalid transport returns:

```text
REJECTED_AT_TRANSPORT_BOUNDARY
```

with stable validation errors.

The importer intentionally performs **no Canonical Master write**.

## 6. Transport issues

When Gemini cannot safely create an Evidence Candidate, it must return an issue instead.

Allowed issue types:

- `SOURCE_AMBIGUOUS`
- `LOCATOR_UNRESOLVED`
- `CLAIM_TOO_BROAD`
- `SOURCE_CONFLICT`
- `OTHER`

Transport issues are intake findings only. They do not automatically become Core PENDING records in v0.4. ChatGPT/Human review decides whether to create a blocking or non-blocking PENDING.

## 7. PoC fixture

`src/product-master-core/poc/apw430-gemini-transport-poc.mjs`

The fixture contains:

- one valid atomic Candidate: FIX terrace type is angle-attached-frame only;
- one `CLAIM_TOO_BROAD` issue for an over-generalized H24 size-grid interpretation.

Both facts are test fixtures grounded in the official APW430 source already verified during v0.2. They are not represented as a new live Gemini extraction.

## 8. Security / authority model

```text
Gemini / NotebookLM
  READ source
  WRITE transport Candidate
  CANNOT verify
  CANNOT change Canonical Master
  CANNOT pass Gate

ChatGPT / Human
  REVIEW Candidate
  ACCEPT / REJECT / PENDING

Product Master Core
  VALIDATE references
  ENFORCE Evidence linkage
  COMPUTE Gate

Runtime
  CONSUME passed Canonical Master
```

## 9. Tests

```bash
npm run test:product-master-core:v04
npm test
```

v0.4 tests cover:

- valid simulated transport import;
- pure-JSON enforcement;
- product/source/mode mismatch rejection;
- unknown Field/Node rejection;
- `LIVE_EXTERNAL` using the same schema without receiving trust;
- explicit ChatGPT adjudication still required after import.

## 10. Next experiment

The next meaningful step is a **human-assisted live NotebookLM round trip**:

1. load the APW430 official catalog in NotebookLM;
2. paste `PRODUCT_MASTER_EVIDENCE_EXTRACTION_PROMPT_V1.md` with APW430 placeholders resolved;
3. save NotebookLM's pure JSON response as a transport file;
4. run the v0.4 importer;
5. ChatGPT adjudicates each imported Candidate against source evidence;
6. compare accepted Evidence against the existing APW430 Canonical Master.

That will be the first true external Gemini -> Product Master Core integration test.
