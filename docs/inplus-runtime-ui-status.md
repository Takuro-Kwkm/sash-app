# LIXIL インプラス Runtime UI Integration Status

- Task classification: NON-PRODUCT-MASTER
- PRODUCT_MASTER_MUTATION: 0
- Canonical Product Master / Runtime Package / Registry: READ ONLY
- Runtime package: `v0.4-R1`
- Runtime manifest Drive File ID: `1iPSLxyziMGXUN71-cSvQO8SRfudx80Qf`
- Runtime manifest SHA-256: `39017746404c98b59a3238890bfece9f46acb122870def6a1361472dad5390ed`
- Runtime JSON Drive File ID: `1VREtyCeLgiGD4ereIDGLLPfsea3d-ac5`
- Runtime JSON SHA-256: `3f8468bfd089d6077489311aab6f8c5664eec096e41298fa4325d36cf2cc6c71`
- Runtime Schema Drive File ID: `1re25pGC5Zo0ytwD2snL0OPsfYSW6Ymqc`
- Runtime Schema SHA-256: `e6de5896b3e39c1e77df72a89f499735a045748b7744d84072dc5057c403c3ec`
- Runtime contract: `MANIFEST_DECLARED_SEMANTIC_TABLE_BUNDLE`
- UI contract source: formal Authoring Master `1NbvIhvxINl45MStUR17LqPOP2123fUAQ`
- UI template: `INPLUS_V04R1`

## Canonical UI contract

The formal Authoring Master field table is the authority for the Inplus UI. Runtime provides candidates, dependencies, validation, explicit ID joins, and MANUAL_CHECK states; Runtime field/key order does not redefine UI order.

Outer app:

`メーカー → 商品`

Dynamic Inplus form, with conditional fields omitted when not applicable:

`窓種 → 建て方・障子構成 → サイズ区分 → 逆勝手 → 吊元 → 発注寸法 W → 発注寸法 H → 上枠仕様 → 障子中桟 → クレセント位置 → 枠・納まり仕様 → ふかし枠仕様 → 連窓・段窓構成 → 本体色 → ガラス大分類 → ガラス種類 → Low-E区分 → 中空層 → 供給形態 → ガラス詳細 → 格子・組子デザイン → 選択品・有償品`

Required implementation constraints:

- `manufacturer`, `series`, `product_category`, `evidence` are not duplicated in the dynamic form.
- 網戸 / 網戸中桟 / ネット種類 are not rendered for standard Inplus.
- Body color is one `本体色` field; no exterior/interior color split.
- `spacer` is an internal Runtime-derived field and is not an Inplus Authoring Master UI field, so it is not rendered.
- `size_mode` / `規格・特注` is not an Inplus Authoring Master UI field, so the app does not invent it.
- W/H precede upper-frame specification; upper-frame specification is not shown before both W/H are present.
- `cavity_fill` and `supply_form` are hidden when only one valid candidate exists.
- frame/option fields with zero valid candidates are hidden.
- RL-016 decorative-pattern requirements and all formal MANUAL_CHECK paths remain Runtime-driven and fail-closed.

## Gap / defect status

`UI_STANDARD_RUNTIME_GAP = NONE`

The previous `size_mode` / Standard Size Record blocker came from applying a generic inner-window UI skeleton that is not the formal Inplus Authoring Master UI contract. It is resolved app-side by using the actual v0.4-R1 Authoring field table. No Product Master mutation was performed.

`PRODUCT_MASTER_DEFECT = NONE`

## Readiness rule

`APP_INTEGRATION_READY` may be true only when the final PR HEAD passes Runtime package integrity, exact UI contract tests, explicit join/MANUAL_CHECK tests, lint/typecheck/build, full repository tests, Runtime smoke, and desktop/mobile Chromium QA on the same HEAD, with no Product Master mutation and no unresolved merge conflict.
