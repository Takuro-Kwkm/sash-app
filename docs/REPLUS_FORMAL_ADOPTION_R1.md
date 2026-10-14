# リプラス V13 正式採用の接続と範囲

最新候補V13と商品別フロー登録R1を固定し、既存Shared Harness v2で7冊のAuthoring Masterを正式採用へ進めるための接続。候補の商品データ・表示契約は変更しない。価格・数量・BOM・発注コード・施工適合の要確認を保持する。

Currentは中央remote mainから取得する。候補が保持していた旧実行部の差は、既存main `8152f03883430716f520168ff01d60738e4a4b8f` の採用内容を取り込んで解消する。その後の中央Current `11c3ce5ebc3db3fa6515c11123ad66ee4e1c0aec` への追随は、既存のV7 successor契約で行う。追加された別商品のrouteはリプラスへ転用しない。凍結されたShared Engine、Canonical Skill、旧採用記録、旧Workは変更しない。

完了したpublication-lifecycle Workの全Repository用allowlistを、新しい商品変更に再適用しない。旧Workはmerge済みrevisionのbytesをINSPECT_ONLYで照合し、新Workは `native-change-scope.v1.json` の限定allowlistで検証する。候補7冊、Runtime/UI、他商品の正本は保護対象とする。これは旧Gateを省略したり不正な差分を許可したりするものではない。

Native接続は `native-change-profiles/replus-v13.json` が指定したTable/XLSX照合と既存candidate/flow Validatorを使用する。Excel 7冊と選択データ全セル、7 Product Moduleの再compile一致、重複・欠落・置換拒否を確認する。WorkのDAG、Journal、Resume、Human Decision、Formal Saveは中央の既存実装へ委譲する。

今回のProduct Master Formal候補は `v1.2-R1`。Scopeは営業選択と積算への確認事項の引渡し。採用するIS9800の根拠はレビュー済み変更箇所だけであり、価格改定を含む全カタログ採用ではない。既存のマスターID・native base versionはlineageとして保持し、新Package revisionとV13候補revisionで変更bytesを識別する。

Runtime Scopeは `NOT_INCLUDED_IN_PRODUCT_MASTER_FORMAL`。既存V13 Runtime/UI QAを補助Evidenceとして参照するが、Runtime正式昇格、中央カテゴリFlow登録、mainへの商品Runtime登録、本番公開をこのFormalへ含めない。既存アプリのRuntimeと未解決条件を維持する。

Formal採用では固定Human Packetへの判断と、Google Driveの正本・旧版・作業中フォルダ、対象7冊、Manifest、Scope、Controlled Unresolved、Registryの実保存・読み戻しが必要。AIによる承認の発行や、候補索引の保存だけでFormal PASSにすることを禁止する。承認前の成果物は作業中へ保存し、正本切替は行わない。
