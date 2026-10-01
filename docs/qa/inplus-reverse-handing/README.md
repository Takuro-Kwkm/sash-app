# Inplus reverse handing — PR #56 continuation

## Diagnosis and authority

Baseline: `integration/window-flow-compliance-20260929`,
`7e059f45a5d21008206cff5cef7472e05bc5ecbf` (latest branch head at diagnosis).
The reported missing selector was **not reproduced on this head**, either locally
or in its READY Vercel Preview. Selecting only 引違い窓 leaves 障子構成 unset;
the conditional field appears after selecting either supported two-sash configuration.

The formal authoring v0.4-R3 sheet `01_項目構造`, Formal Runtime v0.4-R3
`reverse_handing`, values 標準 / 逆勝手, and VERIFIED rule RL-002 all exist.
RL-002 requires window_type=引違い窓 AND sash_configuration in
[2枚建, 2枚建（障子W指定）]. The global semantic slot and presentation order
already exist. The resolver already evaluates visibility, clears invalid values,
preserves still-valid values, and excludes hidden fields from snapshots/handoff.
There is no missing Product Fact or Runtime field to invent.

The actual adapter gap is that `parent_fields` was empty despite the existing
Formal SHOW_FIELD condition. Its old labels were 逆勝手 / 標準 / 逆勝手.
The patch derives the two parents from the VERIFIED Formal condition and renders
勝手 / 標準勝手 / 逆勝手. It retains the canonical key and values, existing
global order, rule conditions and reset logic. This is a **NON-PRODUCT-MASTER TASK**.
No product-specific presentation-order branch was added.

## Official evidence

- LIXIL インプラス商品カタログ **SN4200, 2026/09**, printed **P44**
  (PDF page 48), バリエーション / 引違い窓: reverse handing is available for
  2枚建 and 2枚建（障子W指定）. Other sliding configurations shown there do not
  carry the reverse-handing setting. This corroborates existing RL-002.
- Current official normal-spec lineup:
  https://www.lixil.co.jp/lineup/window/inplus/variation-inplus/
  (same two configuration-specific reverse-handing notes).
- Bathroom: SN4200 printed **P58** (PDF page 62) and
  https://www.lixil.co.jp/lineup/window/inplus/variation-bathroom/
  show sliding 2枚建 / 開き窓, but do **not** establish a reverse-handing option.
  Formal bathroom v1.0 also has no reverse_handing Fact. Absence of a note is not
  proof of manufacturer impossibility. Status: **SOURCE_NOT_SUFFICIENT**; do not
  add or copy normal-spec values, or reinterpret this as estimate-confirmed allowed.
  Controlled Unresolved: bathroom reverse-handing availability requires a direct
  official bathroom-specific statement before a future Fact change. Owner:
  product evidence review; reopening condition: verifiable official evidence.

## Mutation and identity

Product Master / Formal Runtime package / Registry mutations: **0**.
Authoring remains v0.4-R3; bathroom remains v1.0. Exact downloaded formal hashes
are recorded in `formal-identities.json`; the checked-in runtime package and
runtime_manifest identities match. Runtime manifest SHA256:
`d408bd64237ba5d44f9ebbf3ab3c869e9b64864ff0da28609568718b881607d1`.
The current-source manifest v1.5, active development guardrails and global Inner
Window contracts were read before diagnosis. No old QA/master was recreated.

## Applicability and reset

| Context | Result |
| --- | --- |
| Standard / 引違い窓 / 2枚建 | 勝手: 標準勝手 / 逆勝手 |
| Standard / 引違い窓 / 2枚建（障子W指定） | Same choices |
| Sash configuration unset, 3枚 or 4枚 | Hidden; stale value cleared |
| FIX窓, 開き窓, テラスドア | Hidden; stale value cleared |
| Supported → supported | Preserve valid selected value |
| Bathroom | Hidden; no verified bathroom Fact added |

Existing RL-008 paper-glass restrictions remain enforced for reverse handing.
An unsupported context never becomes ESTIMATE_CONFIRM_REQUIRED permission.

## Validation

- `test/93-inplus-reverse-handing.test.mjs`: 13 targeted cases, PASS.
- Full existing automated suite plus additions: 568 tests, zero failures.
- lint, typecheck, release production build: PASS (build only; no production deploy).
- `test/browser/inplus-reverse-handing-browser-qa.mjs`: PASS for four combinations
  (both supported sash configurations × both values), actual selector and global
  order, Save / Reload / restored selection / estimate output, compatible retain,
  incompatible clear + hidden + no handoff value, bathroom boundary, and viewport
  widths 1280 / 768 / 390. Console/page errors: zero.
- Existing browser regression is carried forward and re-executed using unchanged
  suites: global window flow, canonical frame, Inplus bathroom, bathroom estimate
  separation, accessory request, downstream flow, eight-series business flow,
  release regression, work management and estimate output.
- GitHub compliance workflow now includes the focused browser suite and an actual
  self-contained product UI review HTML generated from the same modules/packages.
  CI artifacts embed the tested HEAD; final CI/Preview status belongs to that exact
  published head and is recorded in PR #56.

The baseline Vercel Preview was also inspected directly in Desktop Browser:
window_type alone hides the field; selecting 2枚建 reveals the existing selector.
This observation is distinct from a reproduced missing-field bug.

Release scope: continue the existing Draft PR #56 only; main is not merged;
Production is not deployed.
