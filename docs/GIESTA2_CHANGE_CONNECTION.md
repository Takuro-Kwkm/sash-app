# ジエスタ2 非防火のProduct Master作業接続

対象はCurrent Registryの `LIXIL::ジエスタ2`、Canonical ID
`LIXIL_GIESTA2_NON_FIRE`。ジエスタ2防火戸とは別商品として扱う。
既存正式 `v0.8-R3` とそのSource/Evidence/採用履歴を保持し、変更は
新しいimmutable WorkのWorking候補へ反映する。

## 正規入口

取得済み中央Currentの `scripts/architecture-work.py route` に
`--selected-product 'NATIVE_REGISTRY:LIXIL::ジエスタ2'` と短文を渡す。
中央のCanonical Builderは既存Formalを検出したら変更Skillへhandoffする。
作成指示のnative profileは `EXISTING_FORMAL_SUCCESSOR` に限定する。
全角の「２」や「この商品」は、選択済み対象IDを併記して中央へ渡す。
他商品・防火仕様をこの対象IDで処理しない。

native profileは `contracts/production/giesta2-change-profile.v1.json`。
`prepare-sheet-package-change.py` は実取得capturesを検証して既存の
Shared Harness `production-work.py` のWorkflow/specを生成する。
`sheet-package-change.py` は商品名分岐を持たず、profileと取得データで
Sheets形式のAuthoring、Core/Maps、Registry、Source、レビュー、native QAを検証する。
Shared Router/DAG/Resume/保存Engineは複製しない。

```sh
python scripts/production/prepare-sheet-package-change.py \
  --harness-root CENTRAL --checkout CHECKOUT --captures CAPTURES.json \
  --destination NEW_WORK --instruction 'ジエスタ2の商品マスターを更新'
python CENTRAL/scripts/production-work.py run \
  --root NEW_WORK --work NEW_WORK/checkpoint --spec NEW_WORK/spec.json \
  --live-state NEW_WORK/live-state.json
```

## capturesと境界

Current Authority/Skill、ACTIVE Information Manifestのbootstrap応答、全Registry、
Formal/Working metadata、実Authoring export、Manifest/Core/Maps/schemaの実bytes、
旧採用Sourceと新版Source、全責務sectionのレビューを取得する。
`baseline_documents` はManifestが列挙する実ファイル名をkeyにする。
`candidate_files`、`candidate_authoring`、`qa_input`、`review` は実hashで固定する。
変更レビューは正確な全cell差分、全Source hash、Evidence/locator、
reverse consumer影響、Controlled Unresolvedを含む。レビュー外変更は拒否する。

Scope QAは保存対象の同一候補を実行し、既存共通condition evaluatorを使う。
自動判定・不成立・確認引渡しの境界と、無関係な商品行の保持を検証する。
Workbook exportの取得形式は証跡であり、元のnative Sheets IDとは区別する。

接続Gateは `QA_READY`。正式採用、Current Source切替、Runtime/UI統合、
Human Decision発行、Releaseはこの接続では実行しない。
新候補のSourceは `NEW_CANDIDATE/CANDIDATE` に留める。
正式採用の要求は固定Packetと同一payloadへの実Human Decisionを必要とする。
正式採用まで指定した未接続GateはFAIL_CLOSEDとし、QA_READYへ黙って縮退させない。

## 保存と再開

生成したAuthoring/機械可読Master、Source/Evidence/Rule/確認事項、QA、
spec/journal/checkpointをRegistryで確定した `90_作業中` に保存し、
File ID/parent/versionと実bytesを読み戻す。
ローカルDriveフォルダーへの書込みだけではクラウド保存済みとしない。
完了WorkはINSPECT_ONLY。次の変更はCurrentを再取得し、新しいbindingを作る。
`v0.8-R3` の旧QAは不変部分の履歴であり、新Working版のQA結果を代用しない。
