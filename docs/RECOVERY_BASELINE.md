# V2 Recovery Baseline

基準日: 2026-08-30

この文書は、保存済み監査レポートとGate Reportから確認できる、旧V2の検証済み状態を復元基準として固定する。

## Verified runtime identity (historical)

- Build ID: `MOA-CF-R1-36f26118dd05`
- Build timestamp: `2026-08-26T03:02:14.209Z`
- Runtime Catalog: `V4.3 Phase1+Phase3+Phase4+Phase5`
- Entrypoint: `scripts/start-step8-ui.mjs`
- Frontend root: `src/ui/web`
- Backend: `src/ui/server.ts`
- API: same-origin `/api`
- DB: `data/runtime/sash-v2.sqlite`

このBuild IDは履歴識別子であり、復元後コードでは再利用しない。

## Verified tests

- 202 PASS / 0 FAIL
- product-specific branch findings: 0
- product contamination: 0
- Opening leak: 0
- Engine / Domain freeze changes: 0

## Verified architecture

- Vanilla JavaScript + HTML + CSS frontend
- Node.js `node:http` single-process backend
- Node.js `node:sqlite`
- Common dynamic field UI
- Common Rule Engine / Output Engine
- Product differences expressed as catalog/rule data

## Catalog contract

商品差は以下の共通データで表現する。

- ProductMaster
- SpecificationDefinition
- AllowedValue
- EstimateRequiredFieldRule
- RuleSet
- Evidence
- Selector
- Dependency

禁止事項:

- 商品名による if/switch/case
- 商品専用Form
- 商品専用Output
- 商品専用AllowedValue Resolver
- Required Fieldの商品名分岐
- Evidenceなしメーカー仕様の確定
- 内部Enumのユーザー露出

## Historical runtime inventory

旧Runtime監査で確認済みだった主要商品:

| 商品 | Definition | AllowedValue | Required Rule |
|---|---:|---:|---:|
| LIXIL インプラス | 8 | 29 | 11 |
| YKK AP ウチリモ | 4 | 16 | 7 |
| LIXIL リシェント玄関ドア | 24 | 51 | 26 |
| YKK AP ドアリモ | 19 | 38 | 21 |

## Recovery target

新しい復元Buildでは、まず以下を同一Catalog Adapterで追加する。

1. LIXIL サーモスⅡ-H
2. LIXIL サーモスL
3. YKK AP APW 430
4. YKK AP APW 431

Reference ProductはサーモスⅡ-H。

Adapter本体は商品名を知らないこと。商品固有条件はmanifest、Selector、Dependency、RuleSetへ格納する。

## Runtime identity rule

復元後のRuntimeは `/health` と画面フッターへ次を表示する。

- current Build ID
- build timestamp
- runtime catalog version
- entrypoint
- frontend root
- backend source
- DB path
- product-wise catalog inventory

static assetsはQA時 `no-store` とし、旧Runtimeとの取り違えを防止する。
