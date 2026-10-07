# 共通リリース契約 — native接続

順序1の契約・証跡検証だけを追加する。中央live Currentとprofileが採用する固定implementation SHAを区別する。既存Current/Product/Adapter/Validator/Formal/Source/ResumeとEvidenceを変更しない。

## 固定実装と入口

```sh
python -B scripts/production/release-contract.py --check
python -B scripts/production/release-contract.py --central "$CENTRAL" --check
python -B scripts/production/release-contract.py --central "$CENTRAL" -- status --root "$UPSTREAM_ROOT" --spec "$RELEASE_INPUT/spec.json" --work "$RELEASE_CHECKPOINT" --observations "$OBSERVATIONS"
```

中央 `docs/architecture-v2/common-release.md` にbinding/receipt、prepare/run/status/resume/checkpointと失敗条件を定義する。--checkはnative宣言検証、--central --checkは実Git revisionと全実装bytes照合。private中央へのCI権限や共有Skillコピーを追加しない。

## 配信とQA

- 配信: .github/workflows/app-production-hotfix.yml -> scripts/vercel-rest-deploy.mjs
- Identity: `npm run verify:app-release -- --url URL --expect-commit SHA --require-release-commit --output EVIDENCE_JSON`
- Browser: `QA_BASE_URL=URL npm run test:browser:release`
- 保存境界: BROWSER_LOCAL_STORAGE

Deployment raw metadata、alias→Deployment ID、PR/main CI run/attempt、native QAと実rendering、保存readbackを取得して中央receiptへ接続する。取得障害はAUTHENTICATION_REQUIRED/PERMISSION_REQUIRED/ACQUISITION_FAILED、配信失敗はDEPLOYMENT_FAILED、本番QA失敗はPRODUCTION_QA_FAILEDとして具体的reason/対象gateを保持する。Protectionを解除しない。QA_READY、Formal、統合、Preview、Merge、Production READY、本番QA、保存済みReleaseは別工程。

旧完了WorkはINSPECT_ONLY。新release successorは既存specのAuthority/Registry/Source/Evidence refをCarry-Forward。Source/Scope/入力/承認payload変更は新binding。Unknown/HOLD/NULL/Controlled Unresolved、価格/BOM/Set Codeと既存採用履歴を保持する。Human Formal/UI/Output判断は実固定候補のDecision原本を使い、AIで発行しない。

## 今回のマージと本番禁止

配信marker・dispatch・既存production workflowを変更/実行しない。今回のcontract-onlyマージはproduction marker対象外。

## 順序2の残課題

- Import existing workflow artifact receipts into common record; not automatically release-closed by workflow success

対象Scope、READY Adapter、取得済みCurrent/Formal/Source、固定Decision、GitHub/Vercel/Driveアクセス、許可された配信範囲、native QAとstorage/readbackを用意する。本番公開実証・DB変更・Protection解除は別Scope。
