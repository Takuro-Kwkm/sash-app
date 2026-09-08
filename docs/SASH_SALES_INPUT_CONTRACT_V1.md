# Sash Sales Input Contract v1.0

## Status

`FORMAL_PASS`

This contract is the common sales-input presentation/runtime contract for current and future residential sash products registered in the common catalog runtime.

## Scope

Current verification set:

- LIXIL サーモスⅡ-H (`SER-LIX-SAMOS2H`)
- LIXIL サーモスL (`SER-LIX-SAMOSL`)
- YKK AP APW 430 (`SER-YKK-APW430`)
- YKK AP APW 431 (`SER-YKK-APW431`)

Active window types: `17 + 17 + 25 + 6 = 65`.

## Common glass flow

Sales UI order is fixed as:

1. `glass_base` — ガラス
2. `glass_type` — ガラス種
3. `glass_detail` — ガラス詳細
4. `glass_function` or `glass_additional` — ガラス追加機能
5. `glass_spacer` — スペーサー
6. `glass_air_layer` or `glass_gas` — 中空層

Physical glass build strings may remain in Product Master internals, but ordinary sales UI does not expose them as the primary glass-detail choice.

Manufacturer labels are source-driven. LIXIL and YKK AP labels must not be converted into each other's terminology.

Glass type candidates are source/capability driven. `CLEAR / PATTERN / FROST-equivalent` is a presentation concept, not permission to fabricate an unavailable manufacturer option. Size-dependent candidates remain size-dependent.

## Hidden technical inputs

`construction` is an internal technical selector and MUST NOT be shown as an ordinary sales input.

Examples:

- 在来
- 204 / 2×4
- 在来・204
- 在来・204・単純段差

These values remain available to internal Standard Size matching, Dimension Rule matching, Evidence and Dependency logic.

When construction is hidden:

- STANDARD candidates are gathered across compatible internal construction branches and de-duplicated by formal record identity.
- CUSTOM evaluation may evaluate multiple compatible internal construction branches.
- If compatible branches disagree on PASS/BLOCK or require graph/source confirmation, the sales result must be `REVIEW_REQUIRED`; it must not silently choose one construction branch.

## Size mode policy

`size_mode` is capability driven.

- Formal matching standard-size record exists -> `STANDARD` available.
- Formal source-backed Dimension Rule exists -> `CUSTOM` available.
- Both exist -> show `STANDARD` and `CUSTOM`.
- Only one is shown only when the other capability is formally absent/not applicable.
- Missing Runtime Dimension Rules alone MUST NOT be interpreted as `CUSTOM_NOT_APPLICABLE`.

Capability states for audit are:

- `AVAILABLE`
- `NOT_APPLICABLE`
- `PENDING`

## Source boundary

Formal completion for manufacturer facts requires:

`Official Manufacturer Source -> Canonical Product Master -> Runtime`

Canonical-to-Runtime equality alone is not Official Source coverage. The Thermos L manual-standard shutter incident demonstrated that a Canonical Master and Runtime can agree while the Canonical Master itself omits official standard sizes.

Manufacturer-data corrections must use the Product Master Core controlled flow:

`Evidence -> Adjudication -> Change Proposal -> HUMAN Approval -> STAGING -> Production Preview -> Production -> Runtime regeneration`

No self-approval by ChatGPT.

## Generic architecture gate

Common UI / Resolver logic must not branch on specific product IDs, window IDs or product names. Product differences belong in Product Master, Workflow Profile, Capability Records, Dependency Rules, Dimension Rules and manufacturer display mappings.

Future sash products inherit this contract by the common sash contract application layer.

## Formal Gate

Implementation file:

`src/catalog/sash-sales-input-contract.mjs`

Formal Browser/CI evidence:

- GitHub Actions workflow: `V2 Recovery CI`
- Run: `#485`
- Run ID: `33650169830`
- Head: `0806f208d7e8cabb5bee2cee1768a681b293cb73`
- Conclusion: `SUCCESS`

Gate:

```text
COMMON_GLASS_FLOW                 PASS
MANUFACTURER_GLASS_LABEL          PASS
CONSTRUCTION_UI_HIDDEN            PASS
STANDARD_CUSTOM_COMMON_RESOLVER   PASS
DESKTOP_BROWSER_QA                PASS
MOBILE_BROWSER_QA                 PASS
MOBILE_HORIZONTAL_OVERFLOW        0
CONSOLE / PAGE ERROR              0
RUNTIME_SMOKE                     PASS
GITHUB_ACTIONS                    SUCCESS
```

Final decision:

`Common Sash Sales Input Contract v1.0 = FORMAL_PASS`

## Separate capability audit boundary

This FORMAL PASS does not claim that all four current products already have complete Official Source STANDARD/CUSTOM data coverage. Product-specific official-source capability is audited separately under `artifacts/size-capability-audit/` and may remain `PARTIAL_PASS` / `PENDING` without invalidating this common presentation/runtime contract.
