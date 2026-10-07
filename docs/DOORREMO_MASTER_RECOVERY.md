# ドアリモ玄関ドア 非防火のWorking復旧

既存Registryは `WORKING_RECOVERY / v1.0-LEGACY-RECOVERY`。Google Sheets
`1LRoDsDS6ni2Z_S2G7VSfk00yFL7f8k5F8qG05DstkNY` を原本として実取得し、全35シートを
ローカルXLSXと照合する。旧JSONの `formal_pass=true` と保存済みPASS行は履歴として保持し、現行QAへ昇格しない。

Current中央routerへ実取得Repository mapと選択済み商品
`NATIVE_REGISTRY:YKK AP::ドアリモ玄関ドア 非防火` を渡す。作成Intentは専用の
native **Working復旧build profile**へ解決する。新規・Registry不在商品のBuilderを既存商品へ転用しない。

接続Scopeは `STRUCTURAL_DRAFT_RECOVERY_ONLY`。生成物は全シートの列・値・ID・Evidence・旧成果を
保持したDRAFT候補JSON、構造監査、Source再確認queue。商品名によるUI/Resolver分岐は追加しない。
`WORKING_STRUCTURE_VERIFIED` は営業見積用 `QA_READY`、正式採用、Runtime統合を意味しない。
作成済みWorkingの内容更新・営業QA・正式採用は、このprofileの許可Scopeに含まれない。

## 実行

1. 中央remote default branchのCurrent / Skill Authority、live GA index、Drive Current Registry / Manifest / native governanceを取得する。
2. native Google Sheets全シート、File ID / parent、旧JSONの実bytesを取得し、ローカル保存物と照合する。
3. `prepare-working-master-recovery.py` に `--harness-root`、`--checkout`、`--captures`、外部作業領域の
   `--destination`、`--instruction 'ドアリモ玄関ドア 非防火の商品マスターを作成して'` を渡す。
   capturesは実取得branch/tree、native inputs、observations、authorities、sourcesと保存先を固定する。
4. 中央の既存 `scripts/production-work.py run --root INPUT_ROOT --spec INPUT_ROOT/spec.json --work WORK_ROOT --live-state LIVE_STATE` を実行する。
5. 同じ中央runnerの `checkpoint` でJournal・Receiptを保存し、Working SavepointをDriveへ保存・別経路で読み戻す。

復旧AdapterはDAG/Journal/Resume/Storageを持たない。中央の既存Engineを呼ぶ。
復旧出力が完了したWorkはINSPECT_ONLY。Sourceの再評価や入力が変わる場合は新しいimmutable successorを作成する。
正式価格・BOM・商品コード・メーカー仕様の推測は禁止する。

## 次のGate

営業QAへ進むには、復旧した候補に対する公式本文・表・図・注記の行レベル再確認、Critical Dependencyと
上流変更時のclear/re-evaluate、同一候補のnative business QAを含むProfileの接続が必要。
内部Phase履歴にしか結びついていないメーカーFactを公式Sourceへ結び直す。商流詳細の未解決は
積算確認として区分し、全BOM・価格・発注コードをQA_READYの上流条件にしない。

11月価格改定版は候補Sourceとして保持する。適用日前に現行正式価格として自動使用しない。
