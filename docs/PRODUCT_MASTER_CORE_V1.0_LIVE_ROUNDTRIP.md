# Product Master Core v1.0｜APW430 LIVE Evidence Round Trip

Status: **LIVE ROUNDTRIP PASS / PASS_WITH_NON_BLOCKING_PENDING**

Architecture status: **EXPERIMENTAL / NON-CANONICAL PRODUCT-MASTER INTEGRATION**

## Purpose

Run the first end-to-end field test with an actual NotebookLM / Gemini `LIVE_EXTERNAL` batch rather than a simulated fixture.

Input:

- product: `SER-YKK-APW430`
- batch: `BATCH-GEMINI-APW430-FIX-20260901213858`
- producer: `GEMINI_NOTEBOOKLM / LIVE_EXTERNAL`
- source: `202607_YKKAP_APW430_商品カタログ.pdf`
- Drive file id: `1j9PtW8yoKBZ4Nodm58wU3QtOCvxlEja9`
- raw repository source: `docs/notebooklm/live/BATCH-GEMINI-APW430-FIX-20260901213858.json`
- Candidates: 12
- Transport Issues: 4

The field-test flow is:

```text
real official PDF
→ NotebookLM / Gemini LIVE_EXTERNAL
→ raw Transport JSON
→ Persistent Evidence Inbox
→ immutable raw batch
→ existing Canonical Evidence overlap preflight
→ ChatGPT review
→ ACCEPT / REJECT
→ VERIFIED Canonical Evidence staging
→ Transport Issues → persistent PENDING lifecycle
→ no automatic Product Master / Runtime write
```

## Actual adjudication result

```text
Candidates             12
ADJUDICATED             12
ACCEPT                   9
REJECT                   3
Candidate PENDING        0
Canonical Evidence       9
Transport Issue PENDING  4
Blocking PENDING         0
Non-blocking PENDING     4
```

### Existing Canonical overlap preflight

Four Candidates were detected in the same official source region as existing APW430 Canonical Evidence:

- `CAND-GEMINI-APW430-FIX-001`
- `CAND-GEMINI-APW430-FIX-002`
- `CAND-GEMINI-APW430-FIX-003`
- `CAND-GEMINI-APW430-FIX-004`

Decision:

- 001 → REJECT as redundant with `EV-YKK-APW430-CAT-202607-FIX-TAXONOMY-P69`
- 002 → ACCEPT as a distinct atomic fact: `FIX窓 窓タイプ = 在来工法`
- 003 → REJECT as redundant with `EV-YKK-APW430-CAT-202607-FIX-TAXONOMY-P69`
- 004 → REJECT as redundant with `EV-YKK-APW430-CAT-202607-FIX-SIZE-ANGLE-P70`

This demonstrates why exact string fingerprinting alone is not sufficient for production Evidence review. Source-region overlap is a preflight signal for ChatGPT/Human comparison, not an automatic rejection rule.

## Promoted Canonical Evidence

The live adjudication staging store generated these 9 VERIFIED Canonical Evidence records:

1. `EV-YKK-APW430-CAT-202607-FIX-MADO-ZAIRAI-P69`
2. `EV-YKK-APW430-CAT-202607-FIX-TR-ZAIRAI-H18-P71`
3. `EV-YKK-APW430-CAT-202607-FIX-TR-ZAIRAI-H20-P71`
4. `EV-YKK-APW430-CAT-202607-FIX-TR-ZAIRAI-H22-P71`
5. `EV-YKK-APW430-CAT-202607-FIX-TR-ZAIRAI-H24-P71`
6. `EV-YKK-APW430-CAT-202607-FIX-TR-204-H18-P71`
7. `EV-YKK-APW430-CAT-202607-FIX-TR-204-H20-P71`
8. `EV-YKK-APW430-CAT-202607-FIX-TR-204-H22-P71`
9. `EV-YKK-APW430-CAT-202607-FIX-TR-204-H24-P71`

These are persisted in the v1.0 adjudication artifact only. They are **not automatically written into the formal APW430 Product Master or Runtime**.

## Transport Issue lifecycle

The real V3 batch contained four `OTHER` issues because the current Canonical Field Registry has no field dedicated to the documented inner-dimension formulas.

All four are now linked into persistent PENDING records as `NON_BLOCKING / OPEN`:

1. angle-attached window type: `w = W - 60mm / h = H - 60mm`
2. angle-attached terrace / conventional: `w = W - 60mm / h = H - 30mm`
3. angle-attached terrace / 2×4: `w = W - 60mm / h = H - 45mm`
4. angle-less window type: `w = W - 40mm / h = H - 70mm`

They remain unresolved intentionally. No dimension-formula Canonical Field is invented in v1.0.

The four issues do not invalidate the accepted APW430 taxonomy or standard-size Evidence, so their severity is `NON_BLOCKING`.

## Raw preservation

The v1.0 run verifies that the persisted Inbox raw batch is byte-for-byte identical to the repository V3 input.

`RAW_PRESERVATION = PASS`

The existing APW430 Core Canonical Evidence array also remains unchanged during the live round trip.

## Safety boundary

```text
Gemini self-adjudication            forbidden
Raw batch mutation                  0
Existing Canonical mutation         0
Production Product Master write     0
Runtime write                       0
```

Only ChatGPT/Human adjudication can create staged VERIFIED Canonical Evidence.

Product Master integration remains a separate controlled future step.

## CI execution

GitHub Actions:

- Workflow: `V2 Recovery CI`
- Run: `#215`
- Run ID: `33594599440`
- head: `506b6ccb8f3661b9286059b2c91e121b736154c3`
- conclusion: **SUCCESS**

Jobs:

- `product_master_live_v1`: **SUCCESS**
- `test`: **SUCCESS**
- `runtime_smoke`: **SUCCESS**
- `concord_regression`: **SUCCESS**
- `browser_qa`: **SUCCESS**

Tests:

- `npm test`: **167 / 167 PASS**
- v1.0 real LIVE_EXTERNAL round-trip test: **PASS**

## Evidence artifact

GitHub Actions Artifact:

- name: `product-master-live-v1-apw430`
- artifact id: `9832939023`
- size: `7,672 bytes`
- SHA-256: `730a3eaca8deedfe251bf36e71c40cc77e9f14005b13e4e50703de3165f7073d`

The artifact contains the live run evidence set:

```text
product-master-live-v1/
├─ report.json
└─ evidence-inbox/
   ├─ manifest.json
   ├─ adjudication-state.json
   └─ batches/
      └─ BATCH-GEMINI-APW430-FIX-20260901213858.json
```

## Gate

```text
LIVE_EXTERNAL_INPUT                    PASS
RAW_PRESERVATION                       PASS
PERSISTENT_INBOX                       PASS
REVIEW_12_OF_12                        PASS
ADJUDICATION_12_OF_12                  PASS
ACCEPT_9_REJECT_3                      PASS
CANONICAL_PROMOTION_9                  PASS
EXISTING_CANONICAL_OVERLAP_PREFLIGHT   PASS
REDUNDANT_CANONICAL_SUPPRESSION        PASS
EXISTING_CANONICAL_IMMUTABLE           PASS
TRANSPORT_ISSUES_LINKED_4_OF_4         PASS
OPEN_BLOCKING_PENDING                  0
OPEN_NON_BLOCKING_PENDING              4
PRODUCTION_MASTER_AUTO_WRITE           0
RUNTIME_AUTO_WRITE                     0
FULL_NPM_TEST                           167/167 PASS
PRODUCT_MASTER_LIVE_CI_JOB             SUCCESS
RUNTIME_SMOKE                          SUCCESS
BROWSER_QA                             SUCCESS
GITHUB_ACTIONS_RUN_215                 SUCCESS
```

## v1.0 decision

`Product Master Core v1.0 LIVE Evidence Round Trip = PASS_WITH_NON_BLOCKING_PENDING`

The actual NotebookLM → ChatGPT → staged Canonical Evidence round trip is now demonstrated with a real external batch and reproducible CI artifact evidence.

This does **not** yet mean automatic Product Master integration is production-ready.

The next production-oriented boundary is to design a controlled Canonical Evidence → Product Master change proposal / approval layer, while separately deciding whether a dedicated Canonical Field for the four inner-dimension formulas should be introduced.
