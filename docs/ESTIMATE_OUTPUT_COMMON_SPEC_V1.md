# サッシ情報管理アプリ｜見積出力共通仕様書 v1.0

## 1. 目的

案件・見積・開口部管理に保存された商品仕様SnapshotをSSOTとして、商品仕様見積依頼書を画面・PDF・Excel・印刷で出力する。

この機能はアプリ実装であり、商品マスター実データを変更しない。

- TASK_CLASSIFICATION: NON-PRODUCT-MASTER
- PRODUCT_MASTER_MUTATION: 0

## 2. SSOT

出力時に正式Runtimeを再解決して過去の見積内容を書き換えない。各Openingへ保存済みの `product_configuration_snapshot` を出力根拠とする。

Snapshotから最低限以下を引き継ぐ。

- manufacturer / series
- configuration / display_summary
- validation_state
- product_id / source_mode
- package_version
- runtime_manifest_identity
- runtime_integrity_hash
- captured_at

## 3. EstimateOutputModel v1.0

1 Opening = 1出力行とする。行には開口No.、部屋・位置、開口名称、メーカー、シリーズ、窓・ドア種類、主要仕様、サイズ、金額、出力状態、Runtime監査情報を保持する。

出力状態は以下の4種。

- `COMPLETE`: Snapshotが有効で、出力に必要な情報が揃っている。
- `INCOMPLETE`: Opening未完了または商品仕様Snapshotなし。
- `NEEDS_CONFIRMATION`: 再確認が必要、または金額がSnapshotに保持されていない。
- `INVALID`: 保存SnapshotがINVALID。

## 4. 金額方針

金額が保存Snapshotに存在しない場合、`0`、`0円`、推定額を生成してはならない。

Model上は `price: null` とし、画面では要確認、Excelでは空欄、PDFでは「金額: 要確認」とする。

## 5. 画面

見積画面から「見積出力」を開く。出力画面に以下を表示する。

- 依頼会社 / 依頼会社担当
- 営業担当
- 施主名 / 住所
- 見積No. / Revision
- 全件 / 完了 / 未入力 / 要確認 / 無効の集計
- Opening別商品仕様
- Runtime Package / Validation / Source Mode等の監査情報
- PDF / Excel / 印刷アクション

## 6. PDF

日本語を文字化けさせないため、ブラウザCanvasへ日本語を描画し、ページ画像をPDFへ格納する。

- A4縦
- 標準10 Opening / page
- 30 Openingなら3ページ
- 金額未保持は要確認表示

## 7. Excel

OOXML `.xlsx` として出力する。最低限以下を含む。

- Opening No.
- 部屋 / 位置 / 開口名称
- メーカー / シリーズ
- 窓・ドア種類
- 主要仕様
- サイズ
- 出力状態
- 金額
- Runtime Package
- Runtime Identity
- Validation
- Source Mode

金額 `null` は空セルとする。

## 8. 印刷

ブラウザ標準印刷を使用する。印刷用CSSではアプリヘッダー、操作ボタン、フッター等を非表示にし、見積内容を優先する。

## 9. Responsive

390 × 844を最小検証ビューポートとする。画面全体の横スクロールを発生させず、幅の大きい明細テーブルだけを専用ラッパー内で横スクロール可能にする。

## 10. QA Gate

最低限以下をPASSさせる。

- Node test suite
- Vercel route contract
- EW / TW / YKK AP ウチリモの共通Snapshot mapping
- TW 30 Openingの集計
- PDF 30 Opening = 3ページ
- Excel OOXML生成
- ブラウザでPDF download event完了
- ブラウザでExcel download event完了
- `window.print()` 呼び出しおよびprint stylesheet
- 390 × 844でdocument overflowなし
- console error / page error / HTTP 4xx・5xxなし

## 11. 完了条件

以下がすべて確認できるまで `APP_INTEGRATION_READY=TRUE` にしない。

1. Remote branchへ実装済み
2. PR作成済み
3. Remote CI PASS
4. 見積出力専用Browser QA PASS
5. 商品マスター差分0
6. Release Handoff更新済み

本仕様はProduction deployを自動的に許可するものではない。Production Releaseは別Gateで管理する。

## 12. Production Release Gate

正式Releaseでは、mainへ採用されたMerge SHAそのものをVercel Productionへデプロイし、Deployment identity、canonical alias、`/api/health`、`/app.js`、`/estimate-output/model.mjs`、見積出力Browser QAを再確認する。これらがすべてPASSした場合のみ `PRODUCTION_READY=TRUE` および `RELEASED=TRUE` とする。
