# Guided Product Selection — Phase 0 / Phase 1

教育効果を優先し、短い理由 → なぜこの商品 → 顧客への説明ポイント → 詳しく学ぶ、の順に開示する。希望条件、メーカー事実、社内推薦理由は別データとする。生成AI・外部API課金は不要。

## Current acquisition

2026-10-08に4 remote default branchを隔離取得。HEAD、原checkoutのbranch/dirty状態、Authority/Adapter/Validator/Resume bytes hashは `current-state.json`。元checkoutの変更を保存したまま別branchで実装する。

| Repository | 取得Main HEAD | 接続資産と限界 |
| --- | --- | --- |
| sash-app | 866b98bab41c090e2ed62d9d1e2dd9989670d2a6 | Formal Runtime 9系列、共通API/Editor/Snapshot、localStorage案件保存、共通XLSX/PDF。ThermosL v0.7-R3がMVP対象。変更Adapter READYとRuntime READYは別軸。 |
| interior-estimator | f56a36d0852bfba9c5202e6754cb2ad65ada05ae | Canonical Schema、Flow/Dependency、Generic Renderer、3 native profiles、R002統合HTML。Published Formal Runtime manifestはNOT_REGISTERED。candidate UI・hand-offとDB Runtimeを混同しない。 |
| exterior-estimator | d45e27f05c0078be59975a26122bec5bf5c04012 | SC/Nesca/Fugo/FIRST Registry、共通carport Engine、Snapshot・案件・出力。review localStorageと認証付きDB経路は別境界。Plain Roofは今回未対応。 |
| product-ui-contracts | 2eae38b851cc55b02a30f03792f05385f4b2e39c | Current Architecture/Skill Registry、architecture-work.py、単一production-work.py、Validator/CI Bridge/Resume。Canonical Skill原本を実読。 |

GitHub live Main CIは各取得HEADのsuccessを観測。中央routerはThermosLを既存native profileへ解決した。GA Drive terminal indexのmetadata/bytesを取得し `verify-ga-index.py` を実行したが、`CURRENT_AUTHORITY_INCOMPATIBLE: Unadopted Release implementation bytes: scripts/release-contract.py`。古いpinに戻してPASSとしない。Shared実行・正式採用・本番ReleaseはBLOCKED。今回の新規UI候補は既存Formal bytesを読んでローカルQAするだけで、Shared WorkのREADYやFormal採用を発行しない。

## Reuse and data sufficiency

- sash: `runtime-app-bridge.mjs` の正式Resolver、`ProductConfigurationEditor` のSelection State/Field Renderer/Revision guard、`createProductConfigurationSnapshot`、Work service保存を再利用。商品変更はResolverが無効値だけを解除する。
- interior: `packages/flow-engine` / `packages/dependency-engine` / `packages/interior-runtime-adapter` / `packages/estimate-engine` を将来のport実装へ使う。
- exterior: `src/features/product-registry` / `runtime/carport/engine.ts` / snapshot/outputを将来のport実装へ使う。
- ThermosL: 正式manifestとRuntime JSONのhashを照合。17開閉形式、規格寸法のactualW/actualH、色、ガラス、オプション、特注判定は既存Runtimeから取得できる。呼称から実寸を計算しない。
- 価格は推薦用の正規化済比較データがなく未確認。断熱性能の共通測定条件・数値順位も未整備。最安/高性能/バランス最良は表示しない。納まりの現地適合は別確認。既存Evidence/Controlled UnresolvedをCarry-Forward。
- Phase0はGitと指定GA indexの実取得、およびアプリ接続監査。全商品のDrive Registry行、最新メーカー全カタログ、live DB E2Eの監査は今回実施していない。

## Integration contract

推薦dataは商品IDでキー化し、対応Runtime版/hash、用途条件、Evidence参照、更新履歴を保持する。メーカー仕様は既存Runtimeだけを正本とする。Engineの依存は `resolve(productId, selection)` とInventory。将来のAIは希望条件の入力portへ追加できる。

Question EngineはRuntimeのvisible/enabled Field順序とRequired/Validation/Reset結果を読み、未回答を1件ずつ表示。回答済みは要約から編集。任意項目の「追加しない」は質問履歴だけに記録。仕様値は両モードで同じstate.selectionに入り、同じresolveとSnapshotを使う。モード切替は選択値を変更しない。旧版Snapshotは既存の明示再検証まで凍結する。

推薦の寸法確認は規格寸法の実寸完全一致だけをMVPで扱う。W/H未回答は「寸法未確認」、一致なしは候補なし。特注・施工適合・価格・性能比較はControlled Unresolved。候補選択後も最終確認は通常入力へ戻し、既存出力へは従来の確認手順を使う。MVP完了を正式見積確定/商品正式採用/Releaseとはしない。

## Savepoints and handoff

監査 → Contract/Engine → Adapter/UI → QAを独立commitで保存。完了したcommitとQA入力hashを継承し、変更がないFormal/Sourceは再採用しない。次Workは新しいCurrentとbindingを取得する。Phase2で正規化した価格/性能/寸法比較根拠、Phase3で数量と営業の最終承認/Output接続、Phase4でconsumer portを追加する。中央Release互換性の同期は専用scopeで解決が必要。
