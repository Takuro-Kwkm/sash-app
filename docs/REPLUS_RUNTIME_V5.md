# リプラス 工程3：固定候補とQA

到達点は7構成の候補Authoring/Runtimeと、共通Engine/Form/OutputによるローカルQA。Current native接続、QA_READY、Formal、Merge、Releaseは未完了。

## Sourceと修正

既存Formalパッケージv1.1を保持。構成版はATT_TH v1.1、その他6構成v1.0。元のdirty checkout、既存PR #82、旧Savepointは変更していない。

公式IS9800（2026年10月、244ページ）を完全取得した。22,799,380 bytes、SHA256 b03de30bbeb44ad81df55d6f7175ae2eab25fddf7c9d2fd540fd47d0207f6091。V4全ページレビューと同一bytesなのでレビューを継承。SourceはNEW_CANDIDATE、Current採用0。

[公式一覧](https://ctlgsearch.lixil.co.jp/public/index.php?category=CTGMC_4168793) / [IS9800公式Viewer](https://webcatalog.lixil.co.jp/cgi-bin/openCatalog.cgi?c=IS9800&d=newinter)

キー付クレセントはROOM/TW引違いだけ、小開口ストッパー併用不可、高温多湿不可、要在庫確認。施工調整スペーサー15×20は6構成、CUTへ拡張しない。木製ケーシング色・充てん剤、CUT木部色、既存ケーシングID欠落、CUT外付条件を候補へ反映。本体色・樹脂カバー色と寸法Ruleは継承。浴室価格表ラベル訂正を製作範囲変更へ読み替えない。価格/BOM/Set Code/数量は推測しない。

8参照行をCurrent正本IDへ更新し、窓種69行を固定。57行は既存TW/S2H/L Runtimeを参照し、Aの12行は明示拒否。参照元10本とReplus15本をfresh full bytesで取得・比較。TWの商品WorkがPENDINGであることと、既存TW Runtime読取を区別する。

## 共通性と境界

汎用compile-table-projection.pyが明示projectionから既存Catalog contractへ変換する。商品差は7 projectionのSelector/Dependency/RuleSet/Evidenceデータ。商品専用Form/Output/AllowedValue Resolverは追加していない。既存ProductModule/Common Rule/Global Window Selection Flow/Output/WorkManagementを使用する。

候補はINSPECT_LOCAL、固定Index SHA、localhostが必要。production/VERCEL、SHA改ざん、critical ref欠落、symlink、未登録Scopeを拒否。default Runtime Registry、runtime-app-bridge、既存UI/保存処理、ウチリモ/TW Source contractは元bytesを保持。候補Indexの実Drive File IDをSnapshot identityへ渡す。

全構成の自動製作・自動価格・自動注文を無効にする。包絡外はBLOCK、包絡内はSOURCE_GRAPH_GATE/個別確認。未機械化の施工/組合せ、図形、価格/数量は確認事項として保持。PENDING解消やnative全責務自動化を主張しない。

| 構成 | 候補修正/参照 | ローカルQA | Current native |
|---|---|---|---|
| ROOM | キー・スペーサー・木部/充てん剤・ID欠落 | 検証済み | 未接続 |
| TW | キー・スペーサー・木部/充てん剤 | 検証済み | 未接続 |
| EW | スペーサー・木部/充てん剤、寸法継承 | 検証済み | 未接続 |
| BATH | スペーサー、キー対象外、寸法継承 | 検証済み | 未接続 |
| ATT_TW | 部材/木部、TW13対応行 | 検証済み | 未接続 |
| ATT_TH | 部材/木部、24対応行、A拒否 | 検証済み | 未接続 |
| CUT_MALL | 木部・外付条件、32対応行、A拒否 | 検証済み | 未接続 |

## QA

lint/typecheck、652 repository tests、17 candidate tests。7×1280/768/390の21 Browser caseで選択、条件変更、Clear、保存/再表示、候補SHA、内部Enum非表示、横overflowを確認。保存はBROWSER_LOCAL_STORAGE。DB/複数端末E2EはNOT_EXECUTED。

PDF全1ページを視覚確認、共通XLSXの7行・価格NULL・候補identityを読み戻す。例示出力はDRAFT/INCOMPLETE、正式見積ではない。7 Authoringの対象外の値/書式、全57既存formula文字列/cached values、tab順を保持。Excelアプリ再計算は未実施。native Validator/必須CIは別のCurrent admissionが必要。

native wrapperと直接SharedはNATIVE_ADAPTER_UNAVAILABLE。fresh Central a3c925f49246b2003a85104b0c6b85c379f56b68とconsumer adoptionにはrelease_publication変更、CI schema追加の差があり、verify-ga-indexもCURRENT_AUTHORITY_INCOMPATIBLE。検証無効化/古いAuthorityへのfallbackはしない。Current DAGは未実行、production journalは未作成。保存候補の別root INSPECT_ONLYとNative Work Resumeを区別する。

## 再現と後続

bundled Node24、Python、artifact-tool/Playwrightを使用。validate-runtime-candidate.mjsへchanges/replus-runtime-v5/index.jsonを渡し、node --test test/103-candidate-composition.test.mjsで検査する。

プレビューentryはscripts/start-candidate-runtime.mjs。SASH_CANDIDATE_MODE=INSPECT_LOCAL、SASH_CANDIDATE_RUNTIME_INDEX、実測SASH_CANDIDATE_INDEX_SHA、SASH_CANDIDATE_MANIFEST_FILE_ID（保存・読み戻し済みIndex ID）、HOST=127.0.0.1、PORT=4193が必要。production経路へ追加しない。

後続はCurrent互換採用と限定native Profile admission、native DAG/Validator/CI/Resume。その後に固定Human packetで正式採用、Merge、Releaseを別々に判定する。
