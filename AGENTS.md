# sash-app — Repository Instructions

## 共通ハーネス開始仕様（最初に読む）

このRepository単独の新しいchat・checkoutでも、中央 `https://github.com/Takuro-Kwkm/product-ui-contracts.git` のremote default branchを実取得し、その `AGENTS.md` と `docs/architecture-v2/COMMON_HARNESS_INSTRUCTIONS.md` を作業開始前に全文読む。手元の過去checkoutや固定SHA、親directoryのhost設定の存在を前提にしない。取得した実HEADと文書bytes/hashを記録する。
中央 `registries/current-architecture.v2.json` と `registries/skill-authority.v2.json` からCurrentとCanonical Skillを解決する。consumerの `architecture_authority.ref` は固定採用実装であり、live Current selectorではない。最新コードとの互換性は既存Validatorで確認し、pinやhashを書き換えて通さない。
新規商品マスターは取得した中央の `scripts/start-product-master.py --source-checkout EXISTING_CHECKOUT` から始める。同じ未完了Workの続行は保存済みspec/start-resolution/binding/journal/checkpointを元の固定実装でresumeし、fresh mainへ結び直さない。完了WorkはINSPECT_ONLY。既存成果・未commit・未追跡成果を保持する。
以下の記述と競合する場合、入口・Current取得・新規開始/再開の区別はこの節と共通仕様に従う。商品Governance、native Gate、公開の許可Scopeを維持する。

`README.md` と `docs/RECOVERY_BASELINE.md` の既存設計ルールを維持する。商品名によるif / switch / case、商品専用Form / Output / Mapper / AllowedValue Resolverを追加しない。商品差はProductMaster / SpecificationDefinition / RuleSet / Evidence / Selector / Dependencyのデータで表し、CommonRuleEngineとOutput Engineの共通性を保つ。Evidenceなしメーカー仕様を確定せず、内部Enumをユーザーへ露出しない。変更Scopeに応じてpackage.jsonのlint / typecheck / testと必要なBrowser QAを使う。

# Current App Development Architecture

Acquire live Central Current first. Read `contracts/production/current-architecture.json` separately as the fixed consumer adoption contract. Resolve short instructions through the shared `scripts/architecture-work.py`. The existing `scripts/production-work.py` executes the resolved native profile; it remains the single v2 DAG/Resume/Formal/CI implementation. Do not choose migration/reference profiles as the Current production workflow. PENDING products must return the declared FAIL_CLOSED contract without legacy or fixture fallback. Completed Work is inspected, never re-adopted.

## Shared Skill / Current運用

- App Development Skill Architecture v2 GAをCurrentとしてCarry-Forwardする。Shared Harness、DAG、Evidence、Resume、Formal Save、CIを再設計・複製しない。完了済みWorkはINSPECT_ONLY、新しい変更は新しいimmutable bindingとする。
- Work開始前に中央Repositoryのremote default branchから `registries/current-architecture.v2.json`、`registries/skill-authority.v2.json`、Current Registry / Formal / Source / Validator / Resumeを実取得し、実HEADとbytes hashを固定する。過去Chat、古いREADME、記憶のSHAをCurrent Authorityにしない。
- GAの完了Authorityは中央Registryで選択されたDrive Current terminal index。中央の `scripts/verify-ga-index.py` で検証する。live Current Authorityとconsumerが採用する固定implementation revisionを区別する。
- 商品マスター新規作成は `$product-master-builder`、既存商品変更は `$product-change-work`、QA / Regressionは `$app-quality-review` へroutingする。ただしSkill原本とCurrent Registryの実取得が前提。Registryに登録されたCanonical原本を読み、名前だけでnative実行可能・READYと主張しない。原本の探索・再構成は別の明示されたScopeで行い、既存原本を推測で上書きしない。
- 短い指示のSkill選択は `$architecture-router`、Current Production/router入口は中央の `scripts/architecture-work.py`。共通SkillはCurrent Skill RegistryのCanonical pathから解決する。native Contractを取得したうえで中央routerへRepository→checkout mapと短い指示を渡す。既存 `scripts/production-work.py` がv2の単一実行Engine。
- 共通Skillは中央 `Takuro-Kwkm/product-ui-contracts` の `registries/skill-authority.v2.json` が選ぶGit管理原本を使う。ローカルhostのSkill接続設定と実パスはRepository外で管理する。このRepoへShared Skillをコピーしない。Repo固有Skillは実在・必要な場合のみ `.agents/skills/<name>/` に置く。
- このcheckoutで `contracts/production/current-architecture.json`、`work-connections.v2.json`、`validator-registry.v2.json` が解決できない場合は `AUTHORITY_ACQUISITION_REQUIRED` として停止する。対象checkoutとCurrent Authorityの差を報告し、明示された同期Scope以外でbranchの切替・resetを行わない。Fixtureやlegacyへfallbackしない。
- 未接続/PENDING商品はFAIL_CLOSEDを維持する。GAを全商品Adapter READYと解釈しない。価格・BOM・Set Code・メーカー仕様を推測しない。Unknown / HOLD / Controlled Unresolvedと既存Formal、Evidence ID、採用履歴を保持する。
- QAは変更Scopeに限定し、既存の有効なEvidenceをCarry-Forwardする。QA_READY、Formal、Human Adoption、Merge、Releaseを混同しない。Human DecisionをAIで発行しない。


## Canonical Skill source

Canonical rootは中央の既存 `work_skills/`。`product-change-work` は既存原本を保持し、Builder / Quality Review / Architecture RouterはGA Contractから新規Canonical化されたSkillである。由来は中央 `docs/architecture-v2/canonical-skills.md` に従う。検出とnative build profile / QA /商品AdapterのREADYは別に検証する。

## New Product Master startup

新規商品は未登録を正常入力として扱う。新規Workは中央remote default branchを実取得し、
中央 `scripts/start-product-master.py --source-checkout EXISTING_CHECKOUT` から開始する。
既存checkoutはRepository識別用として保持し、開始処理が取得するfresh consumer / centralを使う。
古いcheckoutのnative builderへ直接入って採用設定の不整合で停止しない。
事前の環境確認には中央 `scripts/verify-new-product-environment.py` を使い、商品未登録と実行環境の障害を区別する。
再開は保存済みstart-resolutionとimmutable bindingを維持し、fresh mainへ結び直さない。
