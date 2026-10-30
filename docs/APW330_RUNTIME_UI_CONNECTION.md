# APW330 Runtime/UI connection R1

全体工程: Formal商品 → Runtime/UI候補 → Human Flow Review → 統合QA →
Runtime/UI採用・保存照合 → 公開Gate。

商品正本 v1.0-R1-F1-20261030（SHA256 fef4b67b6f0622d7f6a343c45940196db80e97bb814d9222c371ac0a1a5422cc）
を変更せず、既存共通compiler/resolver/UI/outputへ接続する。41既知項目と7未解決、
12確認経路、103原本ケースと8営業依頼サンプルを保持する。

画面順: メーカー → APW330 → 窓種 → 窓種固有仕様・工法・枠 → 勝手 →
サイズ方式・寸法 → 色 → 網戸・中桟・ネット → ガラス・追加機能・スペーサー・中空層 →
その他オプション → 現場・自由記入 → 依頼数量。工法は原本で明示された営業入力を保持。
換気框の値はガラス条件に影響するためガラス直前で指定し、変更時に再評価する。
スペーサーが中空層に依存する原本条件は保持し、ガス有無の推測・自動確定は行わない。

optionsは共通checkbox群。複数選択を加算し、上流変更時は不成立の希望だけを解除する。
サッシW/H（外観mm）と開口・枠外・網戸・シャッター寸法を区別する。
営業依頼数量は1以上の整数。メーカー製作承認・価格・BOM・Set Code・自動発注は不可。

現時点: native候補接続を実装。Human Flow Review前のため統合QAは未実施。
次の作業: 固定Packetへの実Human Decisionと候補bytesのDrive読戻しを取り込み、
既存prepare-domain-runtime-candidate.py → scripts/production-work.pyで
FORMAL_IDENTITY / PROJECTION / FLOW_REVIEW_AUTHORIZATION / PARITY / BROWSER / REVIEWを進める。
1280/768/390pxで実DOM、checkboxの加算と部分解除、旧廃止値の復元、保存再読込、
出力への希望・確認事項の引継ぎを検証する。PDF生成と目視確認は別判定。
GitHub Actionsは使わない。既存Formal Workと採用履歴は参照のみ。

訂正R3では、初期不正希望と上流編集の文脈を共通UI/APIのselectionContextで区別する。
初期から不正なoptional値を解除して成立扱いにせず、元の不成立を保持する。
上流変更後は不成立値だけを解除し、成立する希望を保持する。
自由記入・現場情報は構造化request_inputsと表示出力の両方へ渡す。
サッシW/H（外観mm）の意味を見積出力へ残す。商品Fact・Formal bytesは変更しない。

原本、候補index/module、詳細QAと画面フローはGit管理しない。profileは固定hashを保持し、
Driveから取得した非公開入力をpublic checkout外のcandidate_rootから取り込む。
全ファイルを既存Workflowのinputs/runtime_refsへ固定し、欠落・追加・改変・symlinkは拒否する。
接続profileの検証はコード採用の検証であり、データの統合QA・画面READYを意味しない。
