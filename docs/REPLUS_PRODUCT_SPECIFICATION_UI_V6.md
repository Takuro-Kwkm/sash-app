# リプラスの商品・仕様選択 UI V6

商品欄は「リプラス住宅用」の1件だけを表示する。選択後、「リプラスの仕様」で居室仕様、居室仕様 TWタイプ、居室仕様 EWタイプ、浴室仕様、アタッチ枠（TW用）、アタッチ枠（サーモス用）、汎用カットモールを選ぶ。

表示グループは候補Indexの `productSelectionGroup` データで宣言し、共通ProductConfigurationEditorが処理する。商品名による分岐や商品専用Form/Mapper/Resolverを追加しない。仕様選択前にはRuntimeを解決せず、仕様変更では前仕様の入力・Snapshot・警告をクリアする。保存時の `product_id` は実際の構成Runtime IDを維持し、再表示時に商品グループと仕様を復元する。

7構成のAuthoring/Runtime候補、正式基準、Evidence/Rule/Dependencyの68ファイルは前候補HEAD `87fe4c8172df30b536ac9c58a42f9498298c96bb` と同一bytes。変更は共通UI、表示Index、配信、候補画面identity、対象QA。Current Adapter/ValidatorのPENDINGは保持し、本番採用・Source採用・正式採用・Merge・Releaseは行わない。

UI IndexはDrive File ID `16il-Z7HAEVp-olhDZei6zsVCTLBtiBFt`、SHA256 `bb8ea14f6b101e62a6193f7961952939c84c24ed4ed1f65195f93f6268e05507`、32,138 bytesで保存・完全読み戻し済み。

確認: lint/typecheck、657 tests（既存652と共通グループ5）、1280/768/390pxで7仕様切替21件・TW/EW単体6件、7構成×3幅の選択/Clear/ローカル保存/再表示21件。保存はBROWSER_LOCAL_STORAGE。DB/複数端末は未実施。候補Source/価格/BOM/Set Code/施工可否に新たな確定は加えない。

レビュー入口は `/runtime-lab?product=CANDIDATE%3ARPL_RESIDENTIAL`。商品グループを選択した状態で、仕様は未選択から始める。旧7構成IDの直接URLと保存済みSnapshotも維持する。
