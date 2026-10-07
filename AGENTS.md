# sash-app — Repository Instructions

`README.md` と `docs/RECOVERY_BASELINE.md` の既存設計ルールを維持する。商品名によるif / switch / case、商品専用Form / Output / Mapper / AllowedValue Resolverを追加しない。商品差はProductMaster / SpecificationDefinition / RuleSet / Evidence / Selector / Dependencyのデータで表し、CommonRuleEngineとOutput Engineの共通性を保つ。Evidenceなしメーカー仕様を確定せず、内部Enumをユーザーへ露出しない。変更Scopeに応じてpackage.jsonのlint / typecheck / testと必要なBrowser QAを使う。

# Current App Development Architecture

All product development starts by acquiring `contracts/production/current-architecture.json` and its exact shared Authority revision. Resolve short instructions through the shared `scripts/architecture-work.py`. The existing `scripts/production-work.py` executes the resolved native profile; it remains the single v2 DAG/Resume/Formal/CI implementation. Do not choose migration/reference profiles as the Current production workflow. PENDING products must return the declared FAIL_CLOSED contract without legacy or fixture fallback. Completed Work is inspected, never re-adopted.

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
