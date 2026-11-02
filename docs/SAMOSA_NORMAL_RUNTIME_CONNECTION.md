# 承認済みサーモスA UIの通常Runtime接続

R7のフォーム、UI policy、flow、選択肢、Source・Formal Masterは保持する。
`ROW_TABLE_RUNTIME_V1` はnative形式として既存Runtime Master Registryへ接続し、通常の `/api/runtime-master/resolve`、案件編集・保存・復元・見積PDF/XLSXを使う。
候補用のserver/環境変数・商品別Form/Resolver・独自DAGを追加しない。

`build-row-table-runtime-package.py` は完了済みの共通UI採用Workと原Decisionを検証し、承認済みJSONを無変更で梱包する。Master bytesも保持する。
参照PDFは実bytesを照合してdigest証跡を梱包し、実行時にはパッケージ内のMasterと固定したEvidence対応を検証する。開発機の絶対パスへ依存しない。
通常Runtimeへの移行で共通表示処理がレビュー済み表示名・順序を書き換えないよう、検証済み形式のpresentation flagを使用する。

## 実装と採用の境界

実装候補の `runtimeUiAdopted` / `formalAdoption` はfalse。通常開発アプリで検証できるが、本番環境では未採用の商品だけを一覧から除外する。他の公開済み商品は継続する。
`readRowTableRuntimePackage` の直接ロードも、実採用記録がなければ本番環境で拒否する。破損・symlink・不一致のあるpackageは除外で隠さずエラーにする。

正式採用は `runtime-adoptions/samosa-r7.profile.json` → 既存 `private-runtime-ui-adoption-work.py` → Shared v2。
profileが選ぶrow-table native workerでPREVIEW_IDENTITY / PACKAGE_TRANSFORM / STORAGE_READBACK / FORMAL_RUNTIME_QA / NATIVE_FORMAL_LOCATION_READBACK / RUNTIME_UI_ADOPTIONを実行する。
Mainの実コード・原UI承認・実QAログとBrowser report・Drive全量readbackを要求する。保存先は取得したnative folder bindingへ固定する。
`prepare-row-table-runtime-adoption.py` はこの既存DAG用の入力だけを生成し、Main/Drive証跡やHuman Decisionを発行しない。
`install-row-table-adoption.py` は完了済みnative Workをinspectし、実結果とMain/Drive証跡を新しいpackageコピーへ梱包する。旧Work・元パッケージは変更しない。

## 公開プロファイル

`release-profiles/samosa-r7.v1.json` に商品固有のScope・既存canonical destination・native QA・サーモスAの90_作業中を登録。
`sync-local-release-profiles.py` で、nativeが採用する固定Shared `2098ec3b090560aaa4619a1645abb02d4f1f261e` のローカル公開carrierを生成する。live Current取得版とは別。
通常入口の `architecture-work.py release-profile` から選択し、既存8 Gate、Human Release、preview/Main/本番QA、全量保存readbackを経る。既存他商品のsource profileは変更しない。Actionsを起動しない。

`runtime-integration-qa.mjs` は `row-table-business-browser-qa.mjs` を使い、1280/768/390幅で29状態の案件保存・再表示と出力を検証する。
PDF/XLSX生成・model検証と、PDFの目視確認・最終Release承認は区別する。

この変更は接続実装。Mainマージ、正式Runtime/UI採用、公開、Drive保存は、それぞれの実証跡が揃うまで未完了。
