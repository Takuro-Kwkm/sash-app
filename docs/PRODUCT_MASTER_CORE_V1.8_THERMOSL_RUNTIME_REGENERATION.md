# Product Master Core v1.8｜サーモスL Runtime Regeneration

## Status

```text
Formal Product Master             PRODUCTION_APPLIED
Runtime Regeneration              FORMAL_PASS
Runtime selectable Size           1,410 -> 1,495
Runtime total Size                1,559 -> 1,644
Manual Standard Shutter           97 / 97
Browser QA Desktop                PASS
Browser QA 390x844                PASS
Missing                           0
Extra                             0
```

Final decision:

`Product Master Core v1.8 Thermos L Runtime Regeneration = FORMAL_PASS`

## Formal Master binding

Runtime is bound to the post-production formal Thermos L workbook:

- Drive File ID: `17lVzBZ1hp4RVcGv0yNdnrKt25SFO2FhL`
- Revision ID: `0B1PsqngSohhlRDByanJSNkxtSlpqdVo0WXBRT01MNDIzM2tNPQ`
- Modified: `2026-09-02T12:17:29.703Z`
- Bytes: `678729`
- SHA256: `664a51bd5b9ded22e19780b1ce339338cba45f292438221b0a60fc3974e1abf9`

Runtime delta:
- approved new Size rows: 85
- `SZ-SL-001560` ... `SZ-SL-001644`
- no W×H Cartesian generation
- source facts are the 97 direct official-PDF size records established in v1.5/v1.6

## Runtime inventory

```text
Standard Size rows      1,559 -> 1,644
Selectable Size rows    1,410 -> 1,495
Inactive Size rows                149
Missing                              0
Extra                                0
Coverage                           100%
```

Other products were not changed.

## Manual standard shutter source-to-Runtime Gate

Target:
- Window: `WT-SL-SHUTTER-HIKI`
- Specification: `SP-SL-SHUT-M-STD`

Exact set:

```text
Official Source Records             97
Runtime Records                     97
在来・204                            51
在来                                 46
Missing                              0
Extra                                0
Official Source == Runtime Set      PASS
```

The Runtime resolver returns only the exact formal records; it does not create a W×H cross product.

## Browser QA

Actual Chromium operation against the Runtime:

```text
Desktop
  手動 標準タイプ
  在来・204        51
  在来             46
  total            97
  Missing           0
  Extra             0
  PASS

390x844
  手動 標準タイプ
  在来・204        51
  在来             46
  total            97
  Missing           0
  Extra             0
  horizontal overflow 0px
  PASS
```

Browser artifact:
- Artifact ID: `9848468000`
- Digest: `sha256:6a4c449a0d34ad4d55eac6f6b1f6db472e9e67f54990d00a27a266eaa0512785`

## Regression architecture

v1.5-v1.7 describe the historical pre-production lifecycle:

```text
Official 97
-> pre-production Canonical 12
-> Missing 85
-> Human Proposal
-> STAGING 97/97
-> Production Preview
-> Production apply
```

Those historical Gates must remain reproducible after Runtime regeneration. Therefore Product Master workflow tests use an immutable pre-production baseline:

```text
historical baseline total       1,559
historical baseline selectable  1,410
```

Current Runtime independently consumes the post-production formal Master:

```text
current total                    1,644
current selectable               1,495
```

This prevents current-state updates from rewriting historical audit truth.

## CI Gate

Implementation Gate:
- Workflow: `V2 Recovery CI`
- Run: `#432`
- Run ID: `33635062152`
- Head SHA: `1b28c96c19e1a4dd39c14d3cb98232e806dca1df`
- Conclusion: `SUCCESS`

Results:
- `npm test`: `218 / 218 PASS`
- Runtime smoke: `PASS`
- `product_master_thermosl_runtime_v18`: `PASS`
- historical v1.5 source gap reproduction: `PASS`
- historical v1.6 proposal reproduction: `PASS`
- historical v1.6 STAGING reproduction: `PASS`
- historical v1.7-R2 Preview reproduction: `PASS`
- Browser QA: `PASS`

NPM test artifact:
- ID: `9848422402`
- Digest: `sha256:b5379083aad88712c2d51e0c742cc0ffabede8b5e956d7f13ba6ccfd7d1b508b`

Audit record:
`data/master-change-control/runtime/THERMOSL_RUNTIME_REGENERATION_V18.json`

## Final Gate

```text
FORMAL_MASTER_REVISION_BINDING        PASS
RUNTIME_SIZE_TOTAL                    1,644 PASS
RUNTIME_SELECTABLE_SIZE               1,495 PASS
APPROVED_SIZE_ADDITIONS                  85 PASS
MANUAL_STANDARD_OFFICIAL_SOURCE          97
MANUAL_STANDARD_RUNTIME                  97
SOURCE_RUNTIME_SET_EQUALITY            PASS
在来・204                                 51 PASS
在来                                      46 PASS
MISSING                                   0
EXTRA                                     0
DUPLICATE_SIZE_ID                         0
W×H CARTESIAN GENERATION                  0
DESKTOP_BROWSER_QA                      PASS
MOBILE_390x844_BROWSER_QA               PASS
NPM_TEST                         218/218 PASS
GITHUB_ACTIONS_RUN_432               SUCCESS
```
