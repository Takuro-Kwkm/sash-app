# リプラス ガラス・寸法フロー候補 V8

ガラス追加機能の投影漏れ、居室仕様の中空層欠落、途中に置かれていた寸法入力を修正した。商品は「リプラス住宅用」1件、仕様はその後に選ぶ既存7構成を保持する。候補UIの修正であり正式マスターの採用・公開ではない。

## 表示と意味

ガラス種類 → Low-E等の詳細 → ガラス追加機能 → ガラス仕上げ・目隠し → 中空層 → スペーサー。型板とフロストは追加機能と分ける。中空層は充填内容（乾燥空気／アルゴン／クリプトン）であり、任意の中空層厚さ選択を追加したという意味ではない。

| 仕様・ガラス種類 | 追加機能（ほかに「なし」） | 中空層 |
|---|---|---|
| 居室・浴室の複層 | 安全合わせ、防災安全合わせ、安全合わせ乳白、格子入り、ブラインドインPG | 一般は乾燥空気。Low-Eはアルゴン／乾燥空気。ブリッジ枠はアルゴンのみ。 |
| TW／既存適用窓種の居室・浴室トリプル | 安全合わせ、防災安全合わせ、安全合わせ乳白、特殊薄板合わせ | アルゴン／クリプトン |
| EW 複層 | 安全合わせ、安全合わせ乳白 | アルゴン固定 |
| EW トリプル | 既存原本の安全合わせ、安全合わせ乳白、特殊薄板合わせを候補へ投影 | アルゴン固定 |

仕上げは透明・型板・フロスト。安全合わせ乳白選択時は乳白のみを表示し、矛盾する既存仕上げはクリアする。製作可否を自動確定しない。ガラス構成・窓種・寸法・組合せは個別見積確認。既存居室の安全合わせ適用窓種制限を保持し、一般複層＋ブリッジ枠、乾燥空気＋樹脂等の既知の不整合は拒否する。トリプルへの格子・ブラインド、EWへの居室専用機能を継承しない。

表示順は設置条件 → 窓種・基本仕様 → 本体色 → 網戸 → ガラス → カバー・部材色 → オプション／選択部材の仕様 → 現場採寸 → 製品寸法。7構成とも数値の採寸と製品寸法を最後へ配置する。採寸と製品仕上がり寸法の別キーを保つ。

## 実装と証拠

公式 SN1200（2025-08）PDF52／56／60、印刷48／52／56の体系図を実際に描画して確認。固定PDF SHA256: `b837ce209c8b55b2b66b412a4e3c2694a78fd5de823efc7b2b960688a5668098`。差分根拠は `changes/replus-runtime-v5/flow/official-glass-review.v8.json`。元の正式・候補JSON/XLSX 28ファイルは保持し、新Evidenceを持つ候補Projection／Moduleへ追加する。

既存CommonRuleEngine・Global Selection Flow Engineの共通処理を使用する。商品名分岐・専用Form／Resolverは追加しない。V3表示定義は、最後に置く寸法を明示的な評価Contextとして宣言し、表示前提と評価依存を区別する。元のparentFields、Selector、サイズ制約は保持。宣言漏れ、循環、未許可の逆順、原本および追加根拠のbytes不一致は拒否。V2の既存厳格判定は保持する。

## 固定入力と状態

- 前段HEAD: `3da7d2794665fb810e9c73f1b3d65eec8d2d8dba`。独立した `codex/replus-glass-flow-v8-20261014` checkoutで実装。
- 実取得した中央Current HEAD: `f7759305a53ed206280a395c0fce166476f2327f`。consumerの採用済みimplementation pin `68f2fe69831a33ab92789526bdcd7a49446122a2` と区別する。
- 新版候補: `REPLUS_GLASS_FLOW_V8_20261014`。
- Drive候補Index: `1YYSdnp75fqgVGoDB_-x2_mvPfgdbFB2V`、207415 bytes、SHA256 `a8f5ad37f51b5a133da1533b40a8f1fee7c63b46aee4105974cd7b6f02396bf2`。実bytes読み戻し一致。
- Current RegistryとSourcesを再取得。xlsxのbytesは更新されたが全シートのセル内容は前段固定版と一致。公式Sourceおよび既存Formalの無変更範囲はCarry-Forward。
- 原本28ファイル、V7定義、TW domain.mjs、ウチリモ field-workflow-scope.mjs はbytes保持。
- Current routerのnative Replusは `FAIL_CLOSED / NATIVE_ADAPTER_UNAVAILABLE`（writes=0）。候補検証をnative QA_READYやFormalへ読み替えない。Human Decision、Merge、Release、Current書換えは実施していない。
- 価格・BOM・SetCodeはNULL、orderReady=false。独立した中空層厚さ、未確認強化ガラス、製作組合せ、施工適否、連窓等はHOLD／個別確認を維持。

## QA

全674テスト、lint、typecheck PASS。7候補×1280／768／390pxの保存・再表示・条件変更・クリア、意味別ガラス軸と寸法末尾のBrowser QA PASS。追加機能／中空層／枠／ガラス種類／仕上げの変更を個別検証。全57参照窓種の既存直接Runtimeへの委譲と制約は前段テストで実行される。

共通PDF／XLSX 7行の出力、追加機能・仕上げ・中空層の日本語表示、保存候補ID、価格NULLを検証。PDF全2ページを描画して視覚確認（1ページ目1〜6構成、2ページ目7構成）。通常商品のRelease regressionと8商品×3画面幅の保存／再表示／出力もPASS。保存はBROWSER_LOCAL_STORAGE。DB／複数端末E2E、実機Safari、native Validator、Formal／Releaseは未実施または未接続。

画面検証の初回は通常サーバーを誤って起動したため候補が出ず、候補用入口に修正。表示順テストの初回は前の画面更新との競合で選択肢を早読みしたため、該当Resolver応答を待ち、原本の正確な選択値を使う検証へ修正してPASS。検証失敗を商品PASSとして継承していない。
