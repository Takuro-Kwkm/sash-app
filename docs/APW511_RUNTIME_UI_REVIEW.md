# APW511 Runtime/UI review R2

正式Product Master v1.0-F1-20261016の40項目を、既存の共通変換・Adapter・Global Window Selection Flow・共通UIへ接続した候補です。価格、BOM、最終コード、メーカー承認を生成しません。

## 到達点

- Product Master Formalは完了済みとして参照のみ。Master SHA256は `f23760a601229f31bfcd4fdc5b3be6fc64a3392cff8eda31283bc4d3381c043b` のままです。
- R2は説明文の内部値名を日本語へ整理した後継候補です。R1とそのDrive固定物は保持しています。
- Current router結果は `FAIL_CLOSED / PRODUCTION_TARGET_AMBIGUOUS`。APW511の正式Runtime/UI接続、native profile、フローHuman Reviewは未完了です。既存の候補preparerが要求する承認入力は生成していません。
- 検証対象は隔離したローカル候補です。Current candidate workflow完了、APP_INTEGRATION_READY、Runtime採用、Merge、Releaseを主張しません。

## 表示順と依存

メーカー → 商品 → 窓種類 → 窓種固有仕様 → 開き勝手 → サイズ → 外観色・内観色 → 網戸 → ガラス → その他オプション → 現場・確認事項 → 営業依頼数量。

`changes/apw511-runtime-ui-r2/review/flow.json` が全40項目の宣言、`dependencies.json` が親・表示・必須・候補値・リセット・16禁止ルールの対応表です。表示/候補値の条件と、組合せ自体の禁止を区別しています。

- 窓種・工法・サイズ方式・FIX区分変更時に希望W/HをCLEAR。窓種変更時の勝手、シャッター種類変更時のボックスも明示CLEARを継承します。
- 外観色から内観色、内観色・窓種からハンドル色、網戸希望・窓種・工法・Hからネット、寸法・窓仕様からガラスを再評価します。許可される既存値は保持します。
- 希望寸法はサッシ外寸mmです。呼称・内法・開口寸法原文から自動換算せず、規格のW/H全組合せを許可しません。サイズオーダーはメーカー確認依頼です。
- 積算確認結果・メーカー最終製作確認の2欄は選択させず、2件の確認依頼として保持します。現場条件と依頼数量は案件入力でありメーカーFactの確定ではありません。

## 共通処理の変更

変換はimmutableな正式採用スナップショットのmanifest、数値・真偽値・自由記入、明示CLEAR、制御された未確定項目を扱います。工法の公開は宣言された `userSelectable` で制御します。商品名による分岐は追加していません。

依存変更のCLEARは既存のwork-management domainから共通UIが利用します。許可候補の再評価は既存Catalog resolverが所有します。第二のrouter/DAG/保存/QAエンジンは作成していません。

## 再現

```sh
node scripts/production/validate-runtime-candidate.mjs changes/apw511-runtime-ui-r2/index.json
node scripts/production/validate-domain-runtime-projection.mjs changes/apw511-runtime-ui-r2/index.json /tmp/apw511-parity.json
```

候補server / faithful HTML builderは、既存入口へ次の固定環境を渡します。`SASH_CANDIDATE_MODE=INSPECT_LOCAL`、`SASH_CANDIDATE_RUNTIME_INDEX` はR2 indexの絶対パス、`SASH_CANDIDATE_INDEX_SHA=3f1e66efccdba3fbd4bedf8868776a803100110e6e1aff89a3a19e6c58013590`、`SASH_CANDIDATE_MANIFEST_FILE_ID=1b8bgs_goVbtDD4EMiQUZjjPIPMaEvmsM`。

```sh
node scripts/start-candidate-runtime.mjs
node scripts/build-composed-candidate-review-preview.mjs /absolute/path/candidate.html
```

Browser QAは既存 `test/browser/declared-sales-runtime-browser-qa.mjs` にR2 `review/browser-qa.json` を渡します。今回、表示順・自由記入操作・出力寸法ラベルをcontractで確認する対応を同scriptへ追加しました。既存契約の既定挙動は維持します。

729件の単体/回帰、55件の原本判定整合、1280/768/390pxの各3例、各幅4変更、保存/再表示/再読込を検証しました。PDF/Excelは生成とモデル確認までです。印刷目視、実機、複数端末DB、公開は未実施です。

固定した中央Currentは `a66ecca3db80e57a4bbd6c7a611d991c5d60c10c`、consumer開始点は `04120930f7d1ca8179b852335414a8af2459f1aa`。元のdirty checkoutと完了Workは変更していません。
