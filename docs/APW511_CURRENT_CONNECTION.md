# APW511 Current Runtime/UI候補接続

ユーザーの「UIのCurrent接続登録を行ってください」に基づく、既存候補R2の接続登録です。正式Product Masterの40項目・16制約、Runtime module、Global Window Selection Flow、UIコードと候補indexを引き継ぎます。

中央 `registries/current-architecture.v2.json` の APW511 / APW 511 / YKK AP APW511 は、商品ID `NEW-CANDIDATE-d780d8e7c8cdae7ba41675eb` に一致します。consumerの `work-connections.v2.json` と `validator-registry.v2.json` が同一hashの `runtime-candidates/apw511-r2.profile.json` を選びます。

接続Scopeは `LOCAL_SALES_ESTIMATE_REQUEST_UI_CANDIDATE_ONLY`、到達Gateは `RUNTIME_UI_CANDIDATE_QA_REVIEW` です。入口はCurrent `architecture-work.py`、prepareは既存 `prepare-domain-runtime-candidate.py`、実行は既存 `runtime-candidate-work.py` → Shared `production-work.py` / `harness/workflow.py` です。

今回の登録依頼をフロー採用・Runtime正式採用・公開のHuman Decisionには転用しません。固定フローの `flow_review` と実際の `flow_authorization` がなければprepareは `HUMAN_FLOW_REVIEW_REQUIRED` で停止します。価格・BOM・Set CodeはNULL、自動製作・自動価格・自動発注は無効です。

APW511の正式保存はShared coreのdrive_bridgeで完了しています。元MasterのQA_READY/DRAFTラベルを変更せず、hash固定manifest、実Registry、元のcore journal・binding・同payload authorization・POST_SAVE_VERIFIED receiptで採用を検証します。既存のWorkflow型Formalの検証経路も維持します。完了Formal WorkはINSPECT_ONLYであり再実行しません。

登録のsuccessor scopeは既存immutable scope validatorを利用し、中央engineを変更しません。他商品の接続を保持し、既存Releaseの承認・CI・QA・公開条件は変更せず、変更した依存bytesだけを新しい保護契約へ固定します。前任のscope・release profile・selectorは保存したまま検査します。

```sh
HARNESS_PYTHON -B ACQUIRED_CENTRAL/scripts/architecture-work.py route \
  --repositories ACQUIRED_REPOSITORIES.json \
  --instruction 'APW511のRuntime UI候補接続を反映する'
HARNESS_PYTHON -B scripts/production/validate-domain-runtime-connection.py
node scripts/production/validate-domain-runtime-projection.mjs \
  changes/apw511-runtime-ui-r2/index.json /tmp/apw511-parity.json
```

接続登録とUIの正式採用、通常アプリへの配信、Production QAは別Gateです。今回のCurrent登録はMaster Registry、商品Fact、画面の採用状態、本番を変更しません。
