# ジエスタ２ v0.8-R4 UI候補

対象は正式採用済みの非防火・営業見積依頼Scope。正式Master、Manifest、Packageは実Drive bytesと一致するGit投影として保存する。完了Formal Work `GIESTA2_R4_NATIVE_FORMAL_SUCCESSOR_20261016_R4` はINSPECT_ONLY。

候補は既存のCatalog resolver → Composed Adapter → Global Window Selection Flow → Generic UIへ接続する。商品名によるForm / Resolver分岐は追加しない。表形式のMasterを変換する宣言データは `changes/giesta2-runtime-ui-r4/projection.json`、全35項目の表示・依存契約は `review/flow.json`。

UI標準v2.1第5章に従い、断熱仕様 → 開き形式 → デザイン・構成部材 → ガラス → 本体色・枠色 → 吊元 → ドアクローザ → ハンドル → 錠仕様・電源・キー → サイズ → オプション・依頼数量とする。片開き・親子・片袖・両袖・親子入隅・両開きの6構成をレビュー対象とする。

正式Masterの27 master表・54 map表、既存QA195件、Formal Scope QA18件、未確定6件は保持する。UIでは明示的な対応Mapと禁止条件を評価する。寸法・部材配分の最終製作可否、登録・通信条件、正式価格・BOM・最終コードは積算確認であり、自動発注・自動価格計算は無効。

Git投影は新しい正式採用を発行しない。Current selectorは既存ハーネスの `resolve_current` で照合する。承認Identityは同ハーネスのcanonical JSON fingerprint、商品ファイルは実bytes SHA-256で検証する。

## 現在のGate

`HUMAN_FLOW_REVIEW_GATE = BLOCKED`。Runtime UI統合共通仕様v1.8第31章およびnative preparerが、変更後の固定フローへの実ユーザー承認を要求する。HTML生成・静的診断はレビュー準備であり、Browser / Regression / Repository Gate PASSへ昇格しない。

`APP_INTEGRATION_READY = FALSE`、`RELEASE_INPUT_GATE = BLOCKED`。候補は通常UIの正式Runtime Registryへ登録せず、本番公開しない。承認後は `prepare-domain-runtime-candidate.py` と既存 `runtime-candidate-work.py` / Shared `production-work.py` で同一固定入力を実行する。

Preview QAは1280 / 768 / 390 px、全6構成、規格・特注、錠仕様、Apple Watch・Life Assist2、禁止条件、保持 / clear、保存 / 再表示、Summary・PDF・XLSXへの確認事項引継ぎを対象とする。未実行の結果はPASSとしない。保存はBrowser localStorageであり、共有DB・実機受入・本番QAは別Scope。
