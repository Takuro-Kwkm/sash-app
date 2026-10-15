# ドアリモ非防火のWorkingから正式保存への接続

完了済みWorkingのspec・journal・出力・607ケースの実行済みQAをinspectし、
同じSource/Scope/Rule/ModelだけをCarry-Forwardする。既存WorkingをFormalと偽装しない。
商品名の分岐は追加せず、profileのbaseline_kindで共通ドメイン形式を選択する。

正式候補ではlifecycle、revision、実Authorityに結ぶPolicy参照のみを変更する。
メーカー値・Dependency・Evidence・確認事項は完全一致を要求する。旧35表は
R0履歴として保持し、新ScopeへLegacyのPASSを持ち込まない。

既存prepare-sheet-package-formal / sheet-package-formalが単一のnative保存接続を所有する。
Shared workflow.pyのHuman Gate、changed_path.pyの正式保存、approved_continuationの
予定Registry更新後の続行を使う。独自DAG・保存・再開エンジンを設けない。

実Working ArtifactのFile IDとbytes、実Registry行、空の正本フォルダ、staged Master/
Manifest/PackageのFile ID・親・hashを固定Packetへ結ぶ。Human Decision後に共通Domain
Validatorで提案Formal payloadを検証し、その後だけ既存native移動・行CAS要求を出す。
Human DecisionはAI発行不可。単なる接続PR mergeは商品正式採用ではない。

RuntimeはNOT_INCLUDED_IN_PRODUCT_MASTER_FORMAL。価格/BOM/正式コードや現場施工成立を
自動承認しない。UI接続・本番公開は別のnative Integration/Release Workで進め、既存
Release lifecycleのpreflightと同一対象の実QA・配信・readbackを通す。
