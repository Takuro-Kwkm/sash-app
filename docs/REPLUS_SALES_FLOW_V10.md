# リプラス営業入力整理 V10

写真で指定された7項目を候補Runtimeの入力定義から除外する。居室仕様では「設置・施工条件」「現場採寸・取付条件」の空見出しも消える。他構成の写真にない現調項目、浴室改修モード、地域等は維持する。

- 既設上枠・下枠・縦枠の見付
- 建物構造、設置場所、使用環境、新設枠の振出し条件

共通Resolverは定義にない旧入力を除去し、必須チェック・選択明細・出力へ戻さない。寸法範囲、禁止条件、Evidence、メーカーの施工条件、カバー色の対応表は維持する。見付未入力の化粧カバーは候補選択であり、納まり・適合を自動認定しない。キー付クレセントの高温多湿不可・要在庫確認は従来の確認表示を保持する。

共通Engine/UI/Outputには今回の変更を加えていない。商品名分岐は追加していない。候補原本の01_入力フローと14_UI選択契約を更新し、他の原本テーブルは一致する。XLSXはその2シートのセルデータのみ差替え、V9由来のパッケージXMLのルート接頭辞2箇所をOpenXML読み取り互換のため正規化した。その他のZIP memberとstyles.xmlは完全一致し、7冊をArtifact Toolで再読み込み・表示確認した。

## 固定入力

先行完了候補: 6569e4f7e32d2f9d703c69b86cdda8659c06a6a3（V9、INSPECT_ONLY）。

中央remote mainを再取得し、HEAD/FETCH_HEADは f7759305a53ed206280a395c0fce166476f2327f。中央Architecture/Skill AuthorityのCanonical原本を確認し、Current routerは依然 NATIVE_ADAPTER_UNAVAILABLE を返す。consumer採用実装pinとは区別する。新bindingは changes/replus-runtime-v5/binding.v10.json。正式採用・Releaseではない。

候補索引は、ユーザーがファイルと保存先を明示して承認した後、非公開91_Savepointへ新規保存した。Drive ID: 1m9UMPr1xSNn73tjzkTyBinczePi66VE7、240518bytes、SHA256 b5517f2220c4451c244c3fc8276e58f7c9f792d5deea1c7982eab86d66f1c18d。実バイト読み戻し MATCH。既存保存単位は上書きしていない。

## QA

- lint/typecheck PASS、全体686件、対象51件、失敗0。
- 1280/768/390px: 25ケース、7構成×3幅で保存・再表示、削除項目なし、両カバーの色連動、枠変更によるカバーClear、寸法最後、横溢れなし。
- 旧7項目の入力を与えても再評価で除去。共通Snapshotへ残らず、必須判定へ戻らない。
- 共通出力7行で削除ラベルなし。PDF 2ページを視覚確認。XLSX出力作成成功。価格未確定により出力状態はINCOMPLETEを維持。
- 原本の変更対象外テーブル、寸法・色RuleSet、既存Dependency、保護2ファイルのhashを照合。
- PersistenceはBROWSER_LOCAL_STORAGE。DB/複数端末・正式native実行・本番QAは未実行。

現在のレビューURLは http://127.0.0.1:4197/runtime-lab?product=CANDIDATE%3ARPL_ROOM 。サーバーをV10へ切替え、既存タブを再読込し、以前の選択を戻して7項目なしと表示順を確認した。
