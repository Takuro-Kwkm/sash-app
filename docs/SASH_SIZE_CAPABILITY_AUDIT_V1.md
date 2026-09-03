# Sash Size Capability Audit v1

## 1. Status

- Common Sash Sales Input Contract v1.0: **FORMAL PASS**
- 4-Series Size Capability Audit: **PARTIAL PASS**
- Audit integrity: **PASS**
- Managed blocking PENDING: **10**
- Formal Product Master write: **0**
- Runtime manufacturer-value write: **0**
- Automatic mutation: **0**

This audit deliberately does not treat Canonical↔Runtime equality as Official Source coverage. The required path is `Official Manufacturer Source → Canonical Master → Runtime`.

## 2. Scope

| Product | Active nodes | Canonical selectable STANDARD | Runtime selectable STANDARD | CUSTOM source |
| --- | ---: | ---: | ---: | --- |
| LIXIL サーモスⅡ-H | 17 | 2,131 | 2,131 | CONFIRMED / exact rules pending |
| LIXIL サーモスL | 17 | 1,495 | 1,495 | AVAILABLE / 50 rules audited |
| YKK AP APW430 | 25 | 718 | 718 | CONFIRMED / exact rules pending |
| YKK AP APW431 | 6 | 538 | 538 | AVAILABLE / 29 rules audited |

## 3. Source Manifest

See `artifacts/size-capability-audit/source-manifest.json`.

Primary official sources:

- LIXIL 2026.04 サーモスL 業務用資料集・完成品価格表
- LIXIL サーモスⅡ-H/L 商品カタログ（current 06C source locator for dimension graphs）
- LIXIL 2026.04 サーモスⅡ-H 業務用資料集・完成品価格表
- YKK AP 2026.08 APW430 業務用資料集（製作範囲・納まり図）
- YKK AP 2026.07 APW430 商品カタログ

## 4. STANDARD Audit Method

STANDARD uses three independent layers:

1. Official manufacturer availability
2. Canonical Size Master
3. Runtime Standard Size

`Canonical == Runtime` is recorded only as current consistency. It never upgrades an unenumerated Official Source state to MATCH.

All 65 active Product Nodes are explicitly represented in `standard-size-audit.json`. Selector-state enumeration that is not yet source-complete remains `PENDING`.

### Verified reference slice

Thermos L / シャッター付引違い窓 / 手動 / 標準タイプ:

- Official: 97
- Canonical: 97
- Runtime: 97
- Missing: 0
- Status: MATCH

This slice does not imply full Thermos L STANDARD coverage.

## 5. CUSTOM Audit Method

CUSTOM is classified independently from Runtime presence:

- `CUSTOM_AVAILABLE`
- `CUSTOM_NOT_APPLICABLE`
- `CUSTOM_PENDING`

Absence of a Runtime Dimension Rule is never interpreted as manufacturer `NOT_APPLICABLE`.

## 6. Thermos L — 50 Dimension Rules

All 50 current rules were assigned an explicit audit result.

- MATCH: 37
- SOURCE_GRAPH_REVIEW_REQUIRED: 12
- RULE_MISMATCH: 1
- SOURCE_MISSING: 0
- SELECTOR_MISMATCH: 0
- PENDING: 0

### Confirmed mismatch: CR-SL-036 / 内倒し窓

Current Rule simplifies the range to:

- `240<=W<=870: 350<=H<=943`
- `870<W<=1690: 350<=H<=500`

Official P221 keeps the dimensional envelope but marks hatched sub-regions as conditional: the page explicitly states that the hatched area is available only with 3-A-3 glass, and that some glass configurations may not be manufacturable. Therefore the current `AUTO_PIECEWISE` rule is unsafe when Runtime evaluates W/H geometry without the glass-condition gate.

The first draft incorrectly interpreted the hatch as a hard dimensional exclusion and proposed `AUTO_POLYGON`; source revalidation rejected that draft before formalization. The formal proposal now conservatively changes the rule to `COMPOUND_GATE` / `REVIEW_REQUIRED` while preserving the official dimensional envelope:

`PMCP-LIX-SAMOSL-INNER-TILT-GLASS-GATE-20260903-002`

The proposal is **PROPOSED / HUMAN_REQUIRED** only. No workbook or Runtime write occurred.

### Thermos L grille gap

Official source confirms current product settings for:

- 高強度縦格子
- 目隠し可動ルーバー

and the official dimension pages contain manufacturing ranges for these variants. Current Canonical modeling is incomplete for these variants. However, exact current STANDARD size rows and complete Selector payload are not yet fully enumerated, so this remains managed PENDING rather than a speculative proposal.

## 7. APW431 — 29 Dimension Rules

All 29 current rules were audited against official business-document pages P.6–P.13.

- MATCH: 21
- SOURCE_GRAPH_REVIEW_REQUIRED: 8
- RULE_MISMATCH: 0
- SOURCE_MISSING: 0
- SELECTOR_MISMATCH: 0
- PENDING: 0

The 8 graph-gated rules are the shutter and large-opening sliding ranges. Their official ranges include wind-pressure/glass/shaded graph conditions, therefore a simple rectangular or ratio auto-pass would be unsafe.

For several geometrically matching AUTO rules, official sources additionally impose glass-weight or related restrictions. The current generic Dimension Resolver evaluates geometric W/H rules only. Those dependencies are retained as a separate Runtime safety PENDING; the Product Master geometry is not rewritten from inference.

## 8. APW430 CUSTOM

The official 2026.08 business document confirms manufacturing-range sections for all current APW430 product families. The 25 active Product Nodes have been mapped to their official source pages P.2–P.8 in `dimension-rule-extraction-apw430.json`.

Exact Product Node / specification / construction rule payloads are still PENDING. Runtime currently has zero APW430 Dimension Rules, but this must not be interpreted as `CUSTOM_NOT_APPLICABLE`.

## 9. ThermosⅡ-H CUSTOM

Official SAMOSⅡ dimension-special-order sections are confirmed. The 17 active Product Nodes have been mapped to the relevant source pages in `dimension-rule-extraction-samos2h.json`.

Exact current-2026 rule payload and continuation checks remain PENDING. Runtime currently has zero S2H Dimension Rules, but the manufacturer source capability is confirmed.

## 10. Construction-hidden policy

Construction remains an internal Product Master attribute and is not shown to sales users. STANDARD candidates are built from the union of valid internal construction records. CUSTOM results that differ by internal construction remain `REVIEW_REQUIRED`; the Runtime must not silently choose PASS or BLOCK.

## 11. Product Master Change Proposals

Generated:

- `PMCP-LIX-SAMOSL-INNER-TILT-GLASS-GATE-20260903-002`
  - fingerprint: `sha256:af42cd7f3d804b26f2f9ff607aeac59f3dbfe759bbbeb227615f82ac8ac9c268`
  - operation: `UPDATE_DIMENSION_RULE`
  - target: `06C_特注寸法範囲 / CR-SL-036`
  - change: `AUTO_PIECEWISE` → `COMPOUND_GATE` (glass-condition source review required)
  - approval: `HUMAN_REQUIRED`
  - approval status: `PENDING`
  - formal write: false
  - runtime write: false

The proposal record explicitly contains `baseMasterFingerprint`, `targetEntity`, `targetRuleId`, `before`, `after`, `sourceEvidenceIds`, `sourceFile`, `printedPage`, `pdfPage`, and `sourceLocator`. CI recomputes the UTF-8 canonical SHA-256 fingerprint rather than trusting the stored string.

Superseded draft fingerprint `sha256:bf89762cd1cf88be8620b93599d2987c23d50fcb335e6c2b525f5a14175184ee` was not formalized because it treated the P221 hatch as a hard dimensional exclusion.

No proposal was generated for incomplete source payloads.

## 12. Generic Gate

`src/product-master-core/size-capability-audit-core.mjs` is product-agnostic. It validates:

- allowed audit statuses
- exact rule audit counts
- duplicate identities
- managed PENDING counts
- mutation boundary
- Official Source PENDING not hidden by Canonical↔Runtime equality
- HUMAN_REQUIRED proposal status
- explicit proposal source/target payload
- base Master fingerprint
- proposal fingerprint stability
- summary ↔ loaded proposal identity consistency

The Generic Audit Core contains no current product IDs or names. Future sash products can use the same gate without adding product-specific branches to the common audit engine.

## 13. Current Gate

- Common Sales Input Contract: FORMAL PASS
- Size Capability Audit integrity: PASS
- Size Capability Audit overall: PARTIAL PASS
- Blocking PENDING: 10
- Product Master proposals: 1, HUMAN approval pending
- Formal Master mutation: 0
- Runtime manufacturer-value hardcode: 0

The next safe action is Human review of the exact CR-SL-036 proposal plus continued source enumeration for remaining STANDARD/CUSTOM PENDING. No new product series should be promoted on the assumption that these PENDING items are already resolved.
