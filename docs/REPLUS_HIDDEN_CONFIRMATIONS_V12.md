# リプラス候補の確認表示整理 V12

営業画面から「内はめ用の必須部材」、室内側カバー色、室外側カバー色の確認欄と連動説明を除く。内はめ仕様の選択、室内側仕上げ仕様、室外側化粧カバーの大きさ・組合せ、最後の採寸／仕上がり寸法は残す。

対象項目はマスターの `internal` 宣言で非表示にし、既存の共通表示経路が入力欄と選択内容の一覧から除外する。内はめ用部材の自動判定と本体色からの色連動は計算・保存データに残り、変更時の再評価と無効値のクリアも継続する。商品名によるUI分岐やCSSだけの隠蔽は追加しない。

内部部材の解決済み確認通知だけは `resolvedNoticeVisibility: INTERNAL_ONLY` の明示宣言で除く。未解決の色対応、施工・価格・部材数量等のHOLDは引き続き維持する。メーカー仕様・価格・BOM・発注コードを追加確定しない。

7候補の元資料では `14_UI選択契約` のみを変更。その他のワークシート、スタイル、公式Evidenceを保持し、Artifact Toolで更新したセルをネイティブXLSXへ反映して全セル照合する。

V11 `9fd0333c26cad370553023f8c0fbbee6dfef7f92` を親とする新しい候補binding。取得した中央Authorityは `f7759305a53ed206280a395c0fce166476f2327f`、consumer implementationは `68f2fe69831a33ab92789526bdcd7a49446122a2`。中央routerは `FAIL_CLOSED:NATIVE_ADAPTER_UNAVAILABLE` を維持。候補レビューの実装・QAであり、Formal採用・main変更・本番リリースを意味しない。

検証結果は `changes/replus-runtime-v5/binding.v12.json` と `artifacts/replus-flow-v12/` を参照。保存・再表示は `BROWSER_LOCAL_STORAGE` の範囲。
