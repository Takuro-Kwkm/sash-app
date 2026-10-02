# PR #61 — Color / Exterior Trim Human Review closure

APP_INTEGRATION_READY = **BLOCKED_PRODUCT_MASTER_DEFECT**.
Scope: Rechent door3 non-fire adapter / presentation only. Formal Product Master,
Runtime Package, Registry and Evidence are unchanged. Technical regression PASS
does not mean official frame candidate correctness PASS.

## Official sources and classification

- LIXIL リシェント受発注資料集 IG3700, 2026/04, 2026年5月価格掲載版, 208 pages.
  Current official listing: https://kinken.lixil.co.jp/e/products/CSSERESDET_777922/documents/webcatalog
  Detail: https://webcatalog.lixil.co.jp/iportal/CatalogDetail.do?catalogID=18003070000&volumeID=LXL13001&designID=newinter&method=initial_screen
  Original previously retrieved: `202604_LIXIL_リシェント_業務用資料集.pdf`, Drive `1NBm3G1nzmFI4T6miuEiqp-nEQeLQpln_`.
  RD-20 / RD-24 / RD-38 (physical PDF 36 / 40 / 54): separate frame price categories.
  RD-40 (PDF 56): exterior trim 呼称. RD-42 (PDF 58): aggregate frame color / generic part color table.
- LIXIL リシェント玄関ドア3 DL2100, 2026/09, 2026年10月価格掲載版, 252 pages.
  https://webcatalog.lixil.co.jp/cgi-bin/openDetailBL.cgi?c=DL2100
  Catalog ID `18539070000`. p65 / p104–105 / p161 are body/series color lists,
  **not** door × frame dependencies. p181 explicitly lists **枠色** by thermal specification
  and distinguishes XE model. p116: S14 frame is マットブラック. p134: M78 / クリエダーク
  recommends aluminum frame colors (recommendation, not mandatory). p230–231: exterior trim shapes.
  Actual category PDF endpoints were extracted from the official catalog detail HTML;
  PDF text and rendered p181 / IG3700 RD-40 were inspected, not inferred from names.

## PRODUCT_MASTER_DEFECT — RE3NF_FRAME_COLOR_THERMAL_SCOPE

Classification: **CASE B**, plus an independent Adapter `ANY` evaluation defect.

Affected Formal v0.8-R7 data: `product_rules.json#frame_colors` (17 rows),
`frame_color_rules#DEFAULT` (`design_scope=ANY`, `door_color_scope=ANY`,
`constraint=ALLOW`, `frame_color_result=BASE_FRAME_COLOR_SET=17 colors`).
All seven frame rules lack `thermal_scope` and `model_variant` scope.
DEFAULT's reference says RD-41; the aggregate frame table is actually RD-42,
while RD-41 is glass. No thermal-specific frame color allow-list exists in the
canonical fields / dependency document to resolve this gap.

The 17-row master is an aggregate inventory; its existence does not permit all
17 colors on every non-fire frame. It includes BG / FK, which appear in the
aggregate IG3700 table and relate to XE configurations. DL2100 p181 explicitly
separates XE frame colors from high-insulation and insulation/aluminum frame colors.

| Context | Official p181 frame color codes | Current Formal DEFAULT |
| --- | --- | --- |
| HIGH_INSULATION | ED, AK, CB, BB, BC, CC, BA, AG (8) | all 17 |
| INSULATION_K2 / INSULATION_K4 / ALUMINUM, before design-specific requirements | ER, EA, ED, AK, HC, CC, BA, CB, CJ, BB, BC, CA, CD, AG, AA (15) | all 17 |

For an ordinary K2 / K4 G12 body color CB review case, the Formal projection still
returns HC, BG, FK, ER, ED, CJ, CB, BB, BC, CC, BA, CA, CD, EA, AK, AA, AG.
The official general frame set excludes BG / FK; design-specific REQUIRED rules
must additionally be applied. The uploaded finding did not identify the exact
thermal/design/body configuration, so G12/CB is a reproducible representative,
not claimed to be the original Human Review selection.

Expected Product Master Change Work: retain an aggregate color inventory if
needed, add evidence-backed frame ALLOWED scopes for each thermal specification,
verify design/body/model intersections and priority, retain valid REQUIRED rules,
and keep RECOMMENDED as a nonrestrictive recommendation. Reissue Formal package,
manifest/integrity and downstream integration in its own authorized Change Work.
**No invented official rule has been added to this Adapter.**

Impact gate: candidate correctness FAIL / official thermal reset unresolved.
APP_INTEGRATION_READY remains BLOCKED until this Formal defect is corrected.
CI's last job now reports the same blocker instead of emitting a misleading PASS.

## Adapter closure

- Frame rule matching honors ANY and optional thermal/model scopes. Real S14's
  `door_color_scope=ANY` now restricts the frame to AA. Specific ALLOW / ALLOWED
  sets replace the Formal base fallback; REQUIRED intersects permitted sets.
  RECOMMENDED annotates choices and never deletes permitted colors.
- Frame selection requires upstream thermal/design/body context. Upstream changes
  clear invalid frame values and retain values still in the resolved Formal set.
  `thermal_spec` is declared as a frame parent. Official thermal-specific reset
  cannot be claimed closed while Formal's DEFAULT remains defective.
- Exterior trim label priority: Formal official_name / label_ja, then the
  source-backed mapping below; an unmapped ID fails closed, never displays its ID.
- Limited ENUM / MULTI_ENUM audit also found handing R / L presentation bypassing
  the existing official right/left mapping. Those now display 右吊元 / 左吊元;
  internal IDs and allowed set are unchanged. Design and child design identifiers
  are official catalog model designations; AC100V is the official requested label.
  One limited pass scanned 1,944 contexts and all 29 visible estimate ENUM / MULTI_ENUM
  fields (including sidelight and applicable glass safety). Raw displayLabel equality
  after the mapping fix: 0 unexplained identifiers. The remaining equal values are
  catalog design/child model codes and the intentional AC100V official label.

| Internal value | IG3700 RD-40 呼称 (flattened table cells) |
| --- | --- |
| 150 | 150 長（分割タイプ） |
| 125 | 125 長（分割タイプ） |
| 100 | 100 長（分割タイプ） |
| 75 | 75 長（分割タイプ） |
| 50_LONG | 50 長（分割タイプ） |
| 50_SHORT | 50 短（一体タイプ） |
| 25_LONG | 25 長（分割タイプ） |
| 25_SHORT | 25 短（一体タイプ） |

These combine the official number / 長・短 / type columns with spaces and Japanese
parentheses for one Select label. They do not invent ロング / 長尺 names.
Formal trim IDs, installation dimensions, Save schema and Handoff schema stay unchanged.

## Verification scope

`test/99-rechent-color-trim-closure.test.mjs`: real REQUIRED rules for K2 and K4,
nonrestrictive M78 recommendation, unchanged Formal DEFAULT projection, in-memory
contract fixtures for thermal/model ALLOWED/ALLOW scoping, required intersection,
invalid/valid frame reset, all eight trim labels and internal IDs, Save/Reload and
Estimate Handoff, official-field precedence and unknown trim rejection.
Fixtures are never saved to Formal Runtime / Registry.

Browser QA covers actual options and selected labels, all eight trims, frame
requirements/recommendation and upstream reset on desktop/tablet/390px mobile,
save/reload/handoff, dark mode and existing FamiLock regression. A successful
browser regression confirms faithful Formal projection, not closure of the
documented official frame color defect.
