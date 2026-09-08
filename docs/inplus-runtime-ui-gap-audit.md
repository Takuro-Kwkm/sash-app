# LIXIL インプラス UI Contract ↔ Runtime Gap Audit

## Scope

NON-PRODUCT-MASTER / Product Master read-only.

## Authority correction

The Inplus v0.4-R1 formal Authoring Master field table is the UI authority for this series. The former generic `INNER_WINDOW` skeleton incorrectly treated `スペーサー` and a `規格 / 特注` (`size_mode`) selector as required top-level Inplus UI fields.

The formal Inplus Authoring Master instead defines W/H directly and does not define either `spacer` or `size_mode` as a visible input field. Runtime may still derive `spacer` internally for dependency evaluation; it is not surfaced as an Inplus UI field.

## Result

| Authoring Master UI field / rule | Runtime support | Result | App handling |
| --- | --- | --- | --- |
| メーカー / 商品 | integration identity | PASS | top-level app UI |
| 窓種～吊元 | formal Runtime fields/rules | PASS | exact Authoring order; conditional visibility |
| 発注寸法 W / H | explicit dimension fields | PASS | always before 上枠仕様 |
| 上枠仕様 | fabrication selector data | PASS | W/H入力後のみ表示 |
| 障子中桟 / クレセント / 枠・ふかし・連段窓 | formal Runtime fields/rules | PASS | conditional only |
| 本体色 | `body_colors` + dependency rules | PASS | single 本体色 field; no split color |
| ガラス大分類～ガラス詳細 | `glass_configurations` + ID joins | PASS | exact Authoring order |
| 中空層 / 供給形態 | formal glass data | PASS | singleton auto-fixed/hidden |
| 格子・組子デザイン | RL-016 / glass_config ID | PASS | conditional; 荒間 / 横繁 |
| 選択品・有償品 | explicit installability ID/matrix joins | PASS | zero-candidate hidden; unresolved remains MANUAL_CHECK |
| 網戸関連 | Authoring Master = 非適用 | PASS | not rendered |
| `spacer` | internal Runtime derived field only | PASS | hidden from Inplus UI |
| `size_mode` / Standard Size Record | not part of formal Inplus UI contract | NOT REQUIRED | no app-side invention |

## Gap record

- `UI_STANDARD_RUNTIME_GAP`: `NONE`
- `PRODUCT_MASTER_DEFECT`: `NONE`
- `PRODUCT_MASTER_MUTATION`: `0`
- Previous generic `特注サイズ` blocker: `RESOLVED_APP_UI_CONTRACT_CORRECTION`
