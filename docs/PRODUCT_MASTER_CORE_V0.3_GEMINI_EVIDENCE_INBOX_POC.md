# Product Master Core v0.3｜Gemini Evidence Inbox PoC

Status: **EXPERIMENTAL / NON-CANONICAL**

Target: **YKK AP APW 430 / FIX窓 family**

## 1. Goal

v0.3 adds a strict intake boundary for AI-extracted facts:

`Gemini/NotebookLM -> Evidence Candidate Inbox -> ChatGPT/Human adjudication -> VERIFIED / REJECTED / PENDING -> Canonical Evidence Registry -> Rule -> Gate`

Gemini/NotebookLM is never allowed to write Canonical Master records or pass a Gate directly.

## 2. Live connection status

No live Gemini/NotebookLM connector is available in the current execution environment.

Therefore the PoC uses records explicitly marked:

`producerMode = SIMULATED_FIXTURE`

They test the integration contract only. They must never be represented as actual Gemini output.

## 3. Candidate boundary

Evidence Candidates use a separate schema from Canonical Evidence:

- `recordType = EVIDENCE_CANDIDATE`
- `candidateSchemaVersion`
- `sourceSystem`
- `status = SUBMITTED / UNDER_REVIEW / ADJUDICATED`
- product / Canonical Field / Product Node references
- claim and proposed strength
- official source locator

A Candidate cannot declare itself `VERIFIED`.

A raw Candidate inserted into `master.evidence[]` fails Core validation with:

`INBOX_CANDIDATE_NOT_CANONICAL`

## 4. Adjudication authority

Allowed adjudicator types are:

- `CHATGPT`
- `HUMAN`

`GEMINI_NOTEBOOKLM` is intentionally not an allowed adjudicator type.

The decision types are:

- `ACCEPT`
- `REJECT`
- `PENDING`

### ACCEPT

Creates a new Canonical Evidence Record with:

- `status = VERIFIED`
- official source locator preserved
- `sourceCandidateId`
- extraction system provenance
- adjudicator identity and reason

### REJECT

Creates no Canonical Evidence. The adjudication audit record remains.

### PENDING

Creates no Canonical Evidence. Instead it creates a PENDING issue for additional source verification.

## 5. Three PoC paths

The APW430 fixture tests three outcomes:

1. Correct FIX taxonomy claim -> `ACCEPT`
2. Contradictory claim saying terrace type is angle-free-frame only -> `REJECT`
3. Over-generalized H24 size-grid claim -> `BLOCKING PENDING`

The third path deliberately demonstrates that a plausible AI statement with a valid source page can still be too broad to promote into Canonical Evidence.

## 6. Gate behavior

The accepted path replaces one FIX Rule's direct v0.2 Evidence link with Candidate-derived, ChatGPT-adjudicated Official Evidence.

The Gate remains `PASS` only because that promoted Evidence is now `VERIFIED` and retains the official PDF locator.

The PENDING path adds an unresolved `BLOCKING` issue and the same Gate becomes `BLOCKED`.

## 7. Source used by the fixture

- Google Drive file id: `1j9PtW8yoKBZ4Nodm58wU3QtOCvxlEja9`
- `202607_YKKAP_APW430_商品カタログ.pdf`
- Printed p.69 / PDF p.71: FIX taxonomy
- Printed p.70 / PDF p.72: size table and terrace angle-attached-only statement

The source facts were already verified in v0.2. v0.3 does not claim a new Gemini extraction run.

## 8. Commands

```bash
npm run test:product-master-core:v03
npm run validate:product-master-core:v03
npm test
```

## 9. Next step

The next production-facing step is to define a transport format for actual NotebookLM/Gemini output, so a real external Gemini run can export Candidate JSON into this Inbox without gaining direct Canonical write authority.
