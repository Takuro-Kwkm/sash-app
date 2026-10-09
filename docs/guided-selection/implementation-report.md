# Guided Selection MVP — PR Candidate

Phase0のCurrent取得・接続監査と、Phase1のサーモスL質問入力E2Eを実装・検証した。営業が開閉形式と実寸を確認し、候補理由を学びながら仕様を決め、既存の通常入力へ戻せる。これはローカルMVP候補であり、商品正式採用・Human Flow Review・見積確定・本番Releaseではない。

## What changed

| 実装単位 | 作成した責務 / 既存資産 |
| --- | --- |
| Contract | guided-selection-contract.mjs: 対象商品ID、Runtime版/hash、用途、推薦理由、根拠リンク、更新履歴、Unknown比較欄、教育文。正式マスターをコピーしない。 |
| Question / Recommendation / Comparison | guided-selection-engine.mjs: Resolver portから候補抽出、規格実寸完全一致、最大3件、未確認状態、未回答/任意回答履歴。現MVPは1シリーズ。 |
| State Adapter | ProductConfigurationEditorの既存resolve/render/Snapshotを再利用。guided適用時は既存の有効値を渡し、RuntimeのResetで無効値だけを解除。 |
| UI / Education | guided-selection-ui.mjs: 通常入力/かんたんの入口、用途・希望→開閉形式→W/H→候補→仕様質問→通常入力で確認。1〜2問ずつ、詳細はクリックで開示。 |
| Persistence | 同じstate.selectionとProductConfigurationSnapshot。workflow_data.guided_selectionにモード、希望、質問履歴、選択時の版/hash/理由IDを保存。仕様変更で古い推薦参照は再確認状態。 |

商品差はContractデータに置き、Engine/UIに商品名if/switch/caseを追加していない。生成AIを呼ばない。メーカー事実は既存正式Runtime、社内推薦理由は別ContractのPR_CANDIDATEである。

## Acceptance and QA

| Acceptance | 結果 |
| --- | --- |
| 通常入力を継続し、新入口を追加 | PASS — 既存通常入力/案件管理Browser回帰 |
| 質問形式の希望・仕様入力 | PASS — 用途/希望、開閉形式、W/H、Runtime Field質問 |
| 正式Runtimeだけを候補にする | PASS — 版/hash/selectable/READY/integrity照合。未対応は通常入力案内 |
| 理由・根拠・顧客説明・学習を段階表示 | PASS — 全3幅で初期折りたたみ、開閉、根拠リンク/社内更新情報 |
| 実寸適合、範囲外除外、価格を推測しない | PASS — W640/H370一致、99999×99999候補なし。価格/性能順位は未確認 |
| 同じSelection Stateへ反映、モード切替で値保持 | PASS — 切替前後の全仕様値一致 |
| 保存・再読込・未回答から再開 | PASS — Browser localStorage / 同Snapshot。live DBは対象外 |
| Dependency / Reset | PASS — 開閉形式変更で無効な網戸値を解除、有効な色は保持 |
| 旧版Snapshotを勝手に更新しない | PASS — 3幅でモード切替後も旧版と仕様値を保持 |
| 内部Enumを表示しない | PASS — 新規候補UIの可視テキスト検査 |
| Native QA | lint/typecheck PASS、638 tests PASS / 0 FAIL、native pointer/adapter PASS |
| Browser QA | 1440/768/390px PASS、既存release-regression/work-management PASS、console/page/HTTP errors 0 |
| Preview build | eight-series review / TW standalone preview build PASS |

教育効果として検証したのは、理由・違いの比較限界・顧客説明・根拠を短く理解できるUI構造と操作である。実際の知識習得率は未測定。次Workでは営業の少人数レビューで、説明可能性・質問重複・所要時間を評価する。

Native入力hashは `qa-inputs.json`、結果は `qa/summary.json` と各Browser JSON、画面は `qa/` のPNGに保存。旧版fixture検証はautosave完了後に保存Snapshotへ設定し、未保存draftとの競合を避ける。これは既存保存保護が働くためであり、アプリの保存挙動は変えていない。

## Controlled Unresolved and next Work

- かんたん選定はサーモスL v0.7-R3だけ。EW/TW/サーモスⅡ-H/APW430/APW431/インプラス/ウチリモ/リシェントなど他Runtimeと、interior/exteriorは通常入力を維持する。
- 価格順位、断熱数値順位、特注候補、現場納まり、複数シリーズ比較は未対応。寸法不明は明示して仕様質問へ進む。現MVPの候補を「最適」「最安」と表示しない。
- Phase3の数量・営業最終承認・Guided専用Output接続は未実装。既存の開口1件の保存/出力をそのまま使う。出力Engineと価格/BOM/Set Codeは変更していない。
- live中央GA検証は `CURRENT_AUTHORITY_INCOMPATIBLE`。採用済Release実装とlive中央bytesの同期を別scopeで解決するまでShared実行/正式採用/Releaseは閉じたまま。古い中央revisionへ戻してPASSにしない。
- 次WorkはCurrent再取得と新binding。Phase2で価格/性能の比較条件を正規化し、Phase3で明示営業承認/数量/出力、Phase4で各consumerのCanonical State portを実装する。Shared HarnessのDAG/Resume/CIは継承する。

## Files changed

- `src/ui/web/guided-selection-contract.mjs`
- `src/ui/web/guided-selection-engine.mjs`
- `src/ui/web/guided-selection-ui.mjs`
- `src/ui/web/product-configuration-editor.mjs`
- `src/ui/web/work-management.css`
- `src/server/recovery-app.mjs`
- `scripts/check-runtime-ui-sources.mjs`
- `package.json`
- `test/101-guided-selection.test.mjs`
- `test/browser/guided-selection-browser-qa.mjs`
- `docs/guided-selection/architecture-audit.md`, `current-state.json`, `implementation-report.md`, `qa-inputs.json`, `qa/*`
- `README.md`（候補機能への案内）

専用Branch: `codex/guided-product-selection-mvp-20261008`。監査、Contract/Engine、Adapter/UI、QAを独立commitで保存。PRと最終HEAD CIはGitHubの実readbackを最終報告に記載する。原checkoutを変更・resetしていない。

## Desktop review

隔離checkoutで `PORT=4190 npm start` を起動し、`http://127.0.0.1:4190/runtime-lab` の「かんたん商品選定」から確認できる。保存E2Eは案件→見積→開口追加から同じモードを選ぶ。Browser QAは `QA_BASE_URL=http://127.0.0.1:4190 npm run test:browser:guided`。
