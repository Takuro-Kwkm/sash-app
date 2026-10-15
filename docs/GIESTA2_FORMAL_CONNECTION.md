# ジエスタ2 非防火の正式保存接続

既存のQA_READY接続・完了Work・v0.8-R3を保持する。新しい正式採用依頼は
Current routerがFORMAL_CHANGE_ADOPTIONと解決し、既存Sheets preparerから
prepare-sheet-package-formal.pyへ渡す。formal_profileの実hashが必要。
中央の既存production-work.py / workflow.pyが単一DAG・Human・Resumeを所有する。

Native validatorは完了済みWorkをinspectし、同じSource/Scope/Rule/Model/Authoring
の実行済み内容QAを継承する。正式候補の変更は審査済みlifecycle/Source adoption
だけに限定し、既存表・Evidence・6件の確認事項・NULL価格/BOM/最終コードを保持する。
元の95-sheet SheetsはWorkingとして保持し、正式Product Master JSONとManifest、
Scope/QA/Source/Evidence/Promotion/Registry/Authorityを含む実Packageを固定する。
Runtime ScopeはNOT_INCLUDED_IN_PRODUCT_MASTER_FORMAL。空Runtimeを作らない。

Shared Human GateがWork specとnative Packetの両方を固定する。旧Packet/PR merge承認を
新しいbindingへ転用しない。外部の実Human Decisionなしにnative mutation要求を出さない。
接続PRのmain採用と商品Formal採用は別承認。main採用後の実HEADで最終Workを固定する。

Human通過後はfreshなRegistry・旧6ファイルのmetadata・新staged artifactのmetadataと
実downloaded bytesを取得する。native workerが出すbounded要求をhostの既存Drive
connectorで実行し、旧正本を旧版へ、新正本をcanonicalへ移動する。削除しない。
Registryはmove後のfreshなrow/CASで当該商品行だけ更新し、他商品行を保持する。
途中失敗時は保存済みrequest/receiptと実metadataを確認し、未完了の操作だけ続行する。

readback validatorはraw connector refs、旧版退避、新canonicalの正確な集合、
File ID/parent/name、全実bytes、Registry前後行と非対象行の一致を検証する。
その検証済みreceiptだけを既存Shared formal-saveが消費する。受領前の部分保存や
stale approvalでFORMALを出さない。完了後は次のWorkからnative Registryの
authoring JSON/manifest/packageと今回保存したcurrent selectorを照合して参照する。

Inputs・Code・Authority・Sources・spec・journal・Packet・receiptをWorkingへcheckpointし、
Driveから実bytesを読み戻す。完了済みWorkはINSPECT_ONLY。UI・本番公開は別工程。
