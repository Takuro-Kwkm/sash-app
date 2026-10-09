# リプラス既存7構成の限定接続候補

2026-10-09。中央remote main `22c855b40d1a8fe7f46cc7b586d5b2bd1cbd481f`、Sash remote main `c46fc42319ef711e20497beba9f4cc49a2e2c75b`から隔離。consumer implementation `68f2fe69831a33ab92789526bdcd7a49446122a2`は別軸。GA terminal index / Current compatibilityは実取得してPASS。元checkoutのdirty/untracked、順序5中央PR #38・Sash PR #81、固定Decision・索引はNo-Touch。

## 到達状態

技術候補では既存Formal全7構成の原本照合をCurrent router→native prepare/wrapper→既存Shared `scripts/production-work.py`へ接続した。DAG・journal・保存・読み戻し・ResumeはShared v2だけが実行する。凍結Engine / UI / CommonRuleEngine / Output Engineは変更しない。

`CONNECTED` / Validator `READY`のScopeは **EXISTING_PACKAGE_AUDIT_ONLY**、targetは `REPLUS_PACKAGE_AUDITED`。新規作成、Fact変更実行、QA_READY、正式採用、Runtime/UI公開は拒否する。共通接続の全工程完了を意味しない。採用には新しい限定successorが必要。

| 構成 | Formal構成版 | 原本セルQA | 内容・統合の状態 |
|---|---|---:|---|
| RPL_ROOM | v1.0 | 3336 PASS | 原本維持。新版のキー付クレセント適用/依存監査が残る |
| RPL_TW | v1.0 | 2593 PASS | 原本維持。新版のキー付クレセントとTW参照Closureが残る |
| RPL_EW | v1.0 | 2604 PASS | 原本維持。全責務Source/色/網戸/ガラス/施工条件の意味監査未完 |
| RPL_BATH | v1.0 | 3917 PASS | 原本維持。新版価格表の寸法帯訂正・部材差分の影響判定が残る |
| RPL_ATT_TW | v1.0 | 2288 PASS | 原本維持。TW正本のCurrent identity / native Rule接続未完 |
| RPL_ATT_TH | v1.1 | 3054 PASS | 原本維持。S2H/L/A参照先Current/Rule接続未完。AはPENDING |
| RPL_CUT_MALL | v1.0 | 2118 PASS | 外付型/雨戸付のWORKING R1を隔離。48セル差分、正式採用なし |

パッケージFormal版はv1.1。7 Authoring・7 Runtime・Index・ManifestのID/hash、220表・108 Evidence ID、Source・Decision・QA・次工程は `contracts/production/replus/coverage-matrix.v1.json`。原本hash一致/セル一致/旧QAラベルは商品内容QAを代替しない。Accepted Decision別artifactはNOT_RETURNED。

## 限定修正候補

`candidates/cut-mall-r1/`のAuthoringとRuntimeは新しいWorking。既設外付サッシの一律UNAVAILABLE/HIDEを、公式図表の外付型一致条件を確認するCONDITIONAL/MANUAL_CHECKへ変更。雨戸付の鏡板付戸袋必須と戸袋側W+cの確認を追加。CM-EV-017は候補Evidence。価格/BOM/Set Codeを確定しない。自動発注false、QA_READY/FORMAL/Release false。

Spreadsheetsのartifact-toolで編集・再計算・出力し、元27シートの全セルを照合した。変更48セル、Scope外値/書式/数式/native feature差分0、数式エラー/未cache0。変更4シートを視覚確認。他6構成は元bytesを保持するが、全商品Factに影響なしと判定した意味ではない。

根拠のローカルSN1200はPDF 277/280ページ（印刷273/276）の交換可否表・注記・施工スペース・モール換算表を視覚確認。全296ページのlive原本bytes読み戻しは未完。HTTP403後、base64の全body取得も64 MiB IPC上限で失敗し、公式ブラウザPDFはERR_BLOCKED_BY_CLIENT。これをSource PASSへ変換しない。

旧IS8000と新版IS9800は別の取得経路で全bodyのSHAを読み戻し、ローカルPDFと一致。双方244ページのテキストを比較した。42ページに価格mask後の差分がある。印刷93/94/102/113（PDF95/96/104/115）を旧新版視覚比較し、価格表寸法帯/追加スペーサー/部材色の差を確認した。これは全ページ意味/図表監査完了ではない。詳細は新しい `source-supplement.v2.json`、新版採用false。順序・Scopeは全7基準取得→公式Source比較→限定Fact候補→参照Closure→data-driven Runtime/UI→商品QA→固定承認資料。全7完成を宣言しない。

## 実行と拒否

```sh
python scripts/production/replus-work.py --central ACQUIRED_CENTRAL route --instruction 'リプラスの既存商品マスター変更を監査して'
python scripts/production/prepare-replus-package.py --central ACQUIRED_CENTRAL --checkout ISOLATED_NATIVE --captures ACQUIRED_CAPTURES.json --destination NEW_BINDING --instruction 'リプラスの既存商品マスター変更を監査して'
python scripts/production/replus-work.py --central ACQUIRED_CENTRAL run --root BINDING_ROOT --work CHECKPOINT --spec FIXED_SPEC --live-state FRESH_OBSERVATIONS
```

root存在時のprepareは拒否。completed auditはINSPECT_ONLY。native wrapperと直接Sharedに対する正式採用/QA_READY/Release targetは、未対応targetとして外部操作前にexit2で拒否。これは将来の正式採用Scopeでの承認不一致/QA・CI不足個別gateを実証した意味ではない。既存共通Release ContractもこのリプラスScopeを未採用。Human Decisionを生成・流用していない。

## 未完了境界

商品Browser 1280/768/390、選択Clear/保存/再表示/固有PDF・XLSX、DB/複数端末E2EはNOT_EXECUTED。技術候補のlint/typecheckと636既存テスト、13 native実データ/拒否テスト、2宣言テストはPASS。新規PR CIの実完了は別の証跡で固定する。

現在はSource/参照Projection不足で正式承認資料未成立。公開先・固定Deployment・復旧packetを備える正式Release要求は未作成。Merge/Main/公開alias/Current selector変更0、一時QAアクセス作成0。本番復旧も未実行。元Formal/旧Evidence ID/採用履歴/Unknownを維持した。
