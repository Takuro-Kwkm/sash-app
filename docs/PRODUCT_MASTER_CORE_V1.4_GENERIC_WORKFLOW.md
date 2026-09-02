# Product Master Core v1.4｜全商品共通 Workflow Profile Architecture

## Status

`FORMAL_PASS`

本版は、APW430で検証した Evidence Candidate Transport / Evidence Inbox / ChatGPT Adjudication / Canonical Evidence / PENDING / Technical Fact / Change Control の運用を、商品固有PoCから切り離し、全商品で利用できる Product Master Control Plane の共通Workflowとして一般化する。

## 1. Architecture Decision

```text
Official Sources / Drive
  ↓
NotebookLM / External Evidence Extractor
  ↓
Evidence Candidate Batch
  ↓
Generic Evidence Roundtrip Runner
  ↓
Persistent Evidence Inbox
  ↓
ChatGPT / Human Adjudication
  ├─ ACCEPT → Canonical Evidence
  ├─ REJECT → Audit only
  └─ PENDING → Persistent lifecycle
                ↓
            Technical Fact / Evidence / Rule
                ↓
              RESOLVED
  ↓
Controlled Master Change Proposal
  ↓
Human Approval
  ↓
STAGING / Production Preview
```

責務境界は次を正式方針とする。

- 正式Workbook: 商品選択、成立可否、Dependency、規格サイズ等のBusiness Selection Dataの正本。
- GitHub Control Plane: Evidence provenance、Adjudication、PENDING、Technical Fact、Change Control、Gateの正本。
- Runtime: 承認済みの正式商品Masterを消費するExecution Plane。
- Technical FactはCanonical Fieldへ強制変換しない。
- Technical Factは明示的なRuntime Adapterと別承認GateなしにRuntimeへ自動投入しない。
- Product Master Workflowから正式Workbook・Runtimeへの自動書込は禁止する。

## 2. Generic Core

商品固有名称を持たない共通Coreとして以下を使用する。

- `src/product-master-core/evidence-roundtrip-runner.mjs`
- `src/product-master-core/technical-fact-resolution-runner.mjs`
- `src/product-master-core/product-workflow-registry.mjs`
- `src/product-master-core/evidence-inbox-store.mjs`
- `src/product-master-core/evidence-adjudication-store.mjs`
- `src/product-master-core/transport-issue-lifecycle.mjs`
- `src/product-master-core/technical-fact-registry.mjs`

v1.4 Gateでは主要3共通Runner / Registry内の `APW430` / `YKK` / `LIXIL` tokenが0であることを機械確認する。

## 3. Product Workflow Profile

商品固有情報はCoreへ直書きせず、`PRODUCT_MASTER_WORKFLOW_PROFILE` として登録する。

最低構成:

```text
workflowSchemaVersion
recordType
productId
status
capabilities
  evidenceRoundTrip
  technicalFacts
  formalWorkbookMutation = false
  runtimeAutoWrite = false

evidenceRoundTrip
  rawPath
  knownFields
  nodeIds
  existingCanonicalEvidence
  adjudicationPlan
  expectedProducerMode
  issueSeverity

technicalFacts[]
```

Profile RegistryはproductId重複を拒否し、未登録商品をrequireした場合は停止する。

## 4. First Registered Product

v1.4の最初の正式Workflow Profileは:

`SER-YKK-APW430`

配置:

- `src/product-master-core/products/apw430/workflow.mjs`
- `src/product-master-core/products/apw430/technical-facts.mjs`
- `src/product-master-core/products/index.mjs`

旧 `poc/apw430-technical-facts.mjs` は履歴互換exportのみとし、運用データの正本にはしない。

APW430を最初のProfileとして登録したことは、他商品がすでにNotebookLM Evidence Workflowへ投入済みであることを意味しない。次商品は商品固有Profile、Source、Node、Field scope、Adjudication Plan、必要なTechnical Factを登録することで同じCoreを利用する。

## 5. Generic CLI

共通実行入口:

```bash
npm run master:workflow -- <productId> evidence-roundtrip <artifactDir>
npm run master:workflow -- <productId> technical-facts <artifactDir>
```

実装:

`scripts/run-product-master-workflow.mjs`

APW430専用の旧CLI / APIは互換性のため薄いwrapperとして残すが、内部実行はGeneric Coreへ委譲する。

## 6. APW430 Compatibility Result

Generic Runnerへ移行後も既存APW430 LIVE_EXTERNAL V3 roundtripを再現した。

- Candidate: 12
- ACCEPT: 9
- REJECT: 3
- Candidate PENDING: 0
- Canonical Evidence promotion: 9
- Transport Issue: 4
- Technical Fact: 4
- Technical FactによるPENDING: 4 → 0
- Canonical Field追加: 0
- 正式Workbook schema変更: 0
- 正式Workbook write: 0
- Runtime write: 0
- Runtime auto consumption: 0

## 7. v1.4 Gate

Implementation commit:

`45b42d96a24efd698b9b7dd0a3bf3fdb1501013f`

GitHub Actions:

- Workflow: `V2 Recovery CI`
- Run: `#299`
- Run ID: `33608840025`
- Conclusion: `SUCCESS`

Tests:

- `npm test`: `193 / 193 PASS`
- v1.4 dedicated tests: `5 / 5 PASS`
- Generic Product Master Workflow job: `SUCCESS`
- Existing APW430 LIVE roundtrip: `SUCCESS`
- v1.3 compatibility Technical Fact job: `SUCCESS`
- Runtime smoke: `SUCCESS`
- Concord regression: `SUCCESS`
- Browser QA: `SUCCESS`

Generic Workflow artifact:

- name: `product-master-generic-workflow-v14-apw430`
- artifact ID: `9838123083`
- SHA-256: `a3c050b374562821f8949ed85766ee29fde7447dac029a97f64218055a1ab889`

Generic Technical Fact output:

```text
TECHNICAL_FACT_REGISTRY        PASS
PRODUCT_SCOPE                  PASS
EXACT_OFFICIAL_SOURCE_LOCATORS PASS
CANONICAL_FIELD_POLLUTION      0
FORMAL_WORKBOOK_SCHEMA_MUTATION 0
RUNTIME_AUTO_CONSUMPTION       0
PENDING_RESOLUTION             PASS
```

## 8. Formal Decision

```text
Product Master Core v1.4 = FORMAL_PASS
Generic Core product-name dependency = 0
Generic Workflow Registry = PASS
APW430 compatibility = PASS
PENDING 4 → 0 = PASS
Formal Workbook automatic mutation = 0
Runtime automatic write = 0
Full regression = PASS
```

今後の商品追加ではGeneric Coreを複製・変更するのではなく、原則として `src/product-master-core/products/<product>/` にWorkflow Profileを登録する。
