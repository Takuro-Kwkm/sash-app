# ドアリモ玄関ドア 非防火 Runtime/UI候補

正式マスターv1.1-R4-F1-20261015の35項目・87デザインを保持し、営業見積依頼のUI候補へ接続する。元のFormal WorkはINSPECT_ONLY。メーカーFact、Source採用、正本3ファイル、実際のHuman DecisionとRegistryは変更しない。

標準Product MasterのASTを既存Catalog Selectorへ変換し、Common Rule Engine / COMPOSED_PRODUCT_MODULE_V1 / Global Window Selection Flow / 共通Form・保存・見積出力を使う。商品名によるForm・Resolver・Mapper分岐を追加しない。条件付き数値候補はENUMとして内部評価し、数値入力として表示するため、寸法範囲や組合せを失わない。

Current Manifestが指定するUI標準v2.1の11章に従い、下枠納まりは「標準納まり／フラット納まり／標準枠＋下枠フラット材」の宣言的な3択とする。採用済みの新設枠とフラット材の値へ正確に対応づけ、D50等で不成立となる候補は除外する。元の値は保存監査へ保持する。依頼数量は商品Factとは別の営業入力であり、BOM数量を意味しない。

確認事項6件は担当・質問・条件を保持してSnapshotと見積出力へ渡す。価格・BOM・Set CodeはNULL、自動製作・自動価格・自動注文は無効。W/Hは既設開口ではなく新設枠発注寸法。袖FIXとランマの別途ガラスは両方ある場合も別々に保持する。

実画面QAで検出した、無効な商品仕様を営業ハンドオフ付きSnapshotが再確認へ置き換える問題は、共通保存処理でINVALIDを優先して修正する。通常商品の既存動作はRepository回帰で確認する。

初期ローカル検証：採用済み607ケース（成立531・不成立76）の一致、6見積例×1280/768/390pxの18 Browserケース、入力変更・数値範囲・保持／クリア・保存／再表示、共通PDF/XLSX。PDFは3ページを目視確認。保存境界はBROWSER_LOCAL_STORAGEで、多端末DB E2E・実機受入・Production QAは未実施。正式なnative Workの結果は、その固定bindingとjournalに記録する。

native profileは候補検証だけをadmitする。実行はCurrent `architecture-work.py`で対象を解決したうえで`prepare-domain-runtime-candidate.py`が固定specを作り、既存`production-work.py`のrun/resume/checkpointへ委譲する。第二のDAG・Evidence・保存・Release Engineは作らない。

候補入口はlocalhostとINSPECT_LOCAL、保存読戻し済みIndexのFile IDとSHAが必要。通常のRuntime Registryへは追加しない。Runtimeの正式採用・通常UI接続・Merge後の配信・Production QA・Release完了は後続の固定Human Reviewと既存Release lifecycleで別々に判定する。
