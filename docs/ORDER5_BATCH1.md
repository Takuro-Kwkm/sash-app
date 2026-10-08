# 順序5 第1バッチ: SER-LIX-EW

既存Formal v1.4 の商品bytesを継承し、商品固有QAとShared公開経路を新しいbindingへ接続する。対象は `EW_NORMAL_29_FIELDS_ORDER5_BATCH1_V1`、公開経路は `/runtime-lab`。商品Fact、価格、BOM、Set Code、施工可否の追加採用はない。中央Currentと固定Shared実装を別軸で確認する。

出発Main: `c46fc42319ef711e20497beba9f4cc49a2e2c75b`。前回profileとsuccessorは新しいimmutable predecessor carrierに保存し、完了Order4 WorkはINSPECT_ONLYのまま保持する。Order4条件付き承認は終了。Formal/UI/Outputの適用条件を再確認し、新しい固定候補に対するHuman Release Decision取得後だけ、通常の公開直前 authorize-publication と昇格を実行する。

Source/Formal/Contract/Runtime/UIの固定byte参照は order5-assets.v1.json。native byte guardは order5-release-scope.v1.json。専用Harnessは追加しない。Sharedの8工程を完了するまでは RELEASE_COMPLETED としない。

QAは1280/768/390px、依存、無効組合せ、Clear、保存、再表示、商品出力、必要な回帰。PDF全ページを視覚確認し、未解決ページを明記。保存はローカル/Drive/bytes読み戻しを区別し、隔離rootの新規Workと完了Work INSPECT_ONLYを確認する。

継承残課題: 原CI ZIP取得HTTP403、本番rollback未実施、Sash/Interior実alias復旧未実施、Exterior /app新規DB E2E、Formal Runtime登録、Exterior背景のみ2頁目。今回必要なQAで実証した範囲のみ更新する。BROWSER_LOCAL_STORAGEはDB E2Eを意味しない。価格/製作等のControlled Unresolvedと確認要求は保持する。
