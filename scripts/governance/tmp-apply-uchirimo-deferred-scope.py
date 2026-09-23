from pathlib import Path
import re


def rw(path):
    return Path(path).read_text()

def write(path, text):
    Path(path).write_text(text)

def once(text, old, new, label):
    count=text.count(old)
    if count!=1:
        raise SystemExit(f'{label}: expected 1 exact match, got {count}')
    return text.replace(old,new,1)

def regex_once(text, pattern, repl, label, flags=0):
    out,count=re.subn(pattern,repl,text,count=1,flags=flags)
    if count!=1:
        raise SystemExit(f'{label}: expected 1 regex match, got {count}')
    return out

# 1. Human Flow Review generation: release-scope-aware 7-series artifact.
p='scripts/governance/generate-human-flow-review.mjs'
s=rw(p)
s=once(s,
"const snapshot = readJson('project-governance/runtime-snapshot.json');\nconst head = currentExactHead();\nconst integrations = appRuntimeIntegrationRegistry.filter((row) => WINDOW_UI_CATEGORIES.has(row.uiCategory));\nconst snapshotByKey = new Map(snapshot.entries.map((row) => [row.registry_series_key, row]));",
"const snapshot = readJson('project-governance/runtime-snapshot.json');\nconst releaseScope = readJson('project-governance/release-scope.json');\nconst head = currentExactHead();\nconst allIntegrations = appRuntimeIntegrationRegistry.filter((row) => WINDOW_UI_CATEGORIES.has(row.uiCategory));\nconst currentReleaseIds = new Set(releaseScope.current_release_targets.map((row) => row.integration_id));\nconst deferredIds = new Set(releaseScope.deferred_targets.map((row) => row.integration_id));\nconst currentReleaseKeys = new Set(releaseScope.current_release_targets.map((row) => row.registry_series_key));\nconst deferredKeys = new Set(releaseScope.deferred_targets.map((row) => row.registry_series_key));\nconst integrations = allIntegrations.filter((row) => currentReleaseIds.has(row.id));\nconst integrationIds = new Set(allIntegrations.map((row) => row.id));\nconst canonicalSnapshotKeys = new Set(snapshot.entries.map((row) => row.registry_series_key));\nconst overlap = [...currentReleaseIds].filter((id) => deferredIds.has(id));\nconst gap = [...integrationIds].filter((id) => !currentReleaseIds.has(id) && !deferredIds.has(id));\nif (integrations.length !== currentReleaseIds.size) throw new Error('CURRENT_RELEASE_SCOPE_INTEGRATION_MISMATCH');\nif (overlap.length) throw new Error(`RELEASE_SCOPE_OVERLAP:${overlap.join(',')}`);\nif (gap.length) throw new Error(`RELEASE_SCOPE_GAP:${gap.join(',')}`);\nfor (const row of releaseScope.deferred_targets) {\n  if (row.status !== 'DEFERRED' || row.qa_status !== 'UNVERIFIED' || row.release_eligibility !== false) throw new Error(`DEFERRED_TARGET_FALSE_PASS:${row.integration_id}`);\n}\nfor (const key of [...currentReleaseKeys, ...deferredKeys]) if (!canonicalSnapshotKeys.has(key)) throw new Error(`RELEASE_SCOPE_NOT_IN_CANONICAL_SNAPSHOT:${key}`);\nconst snapshotByKey = new Map(snapshot.entries.map((row) => [row.registry_series_key, row]));",
'release scope header')
s=once(s,
"const snapshotId = `RUNTIME-SNAPSHOT-${stableHash(snapshot.entries.map((row) => [row.registry_series_key, row.runtime_manifest_identity, row.package_version, row.runtime_sha256])).slice(0, 20)}`;",
"const currentSnapshotEntries = snapshot.entries.filter((row) => currentReleaseKeys.has(row.registry_series_key));\nconst snapshotId = `RUNTIME-SNAPSHOT-${stableHash(currentSnapshotEntries.map((row) => [row.registry_series_key, row.runtime_manifest_identity, row.package_version, row.runtime_sha256])).slice(0, 20)}`;\nconst canonicalRuntimeSnapshotId = `RUNTIME-SNAPSHOT-${stableHash(snapshot.entries.map((row) => [row.registry_series_key, row.runtime_manifest_identity, row.package_version, row.runtime_sha256])).slice(0, 20)}`;",
'snapshot id')
s=once(s,
"  runtime_snapshot_id: snapshotId,\n  task_classification: 'NON-PRODUCT-MASTER',",
"  runtime_snapshot_id: snapshotId,\n  canonical_runtime_snapshot_id: canonicalRuntimeSnapshotId,\n  current_release_scope: {\n    status: 'CURRENT_RELEASE_TARGET',\n    series_count: releaseScope.current_release_targets.length,\n    integration_ids: releaseScope.current_release_targets.map((row) => row.integration_id),\n    registry_series_keys: releaseScope.current_release_targets.map((row) => row.registry_series_key),\n  },\n  deferred_scope: releaseScope.deferred_targets.map((row) => ({ ...row })),\n  task_classification: 'NON-PRODUCT-MASTER',",
'artifact scope')
s=once(s,
"  runtime_snapshot_gaps: snapshot.gaps,",
"  runtime_snapshot_gaps: snapshot.gaps.filter((row) => !row.registry_series_key || currentReleaseKeys.has(row.registry_series_key)),",
'snapshot gaps')
s=once(s,
"  '- HUMAN_FLOW_REVIEW_GATE: **BLOCKED_PENDING_EXPLICIT_APPROVAL**',\n  `- Series: **${artifact.series_count}**`,",
"  '- HUMAN_FLOW_REVIEW_GATE: **BLOCKED_PENDING_EXPLICIT_APPROVAL**',\n  `- Current Release Scope: **${artifact.current_release_scope.series_count} series**`,\n  `- Deferred Scope: **${artifact.deferred_scope.map((row) => `${row.registry_series_key}=${row.status}/${row.qa_status}`).join(', ')}**`,\n  `- Series: **${artifact.series_count}**`,",
'markdown scope')
write(p,s)

# 2. Review field coverage follows Current Release Scope; deferred Uchirimo is verified separately against canonical snapshot.
p='scripts/governance/verify-human-flow-field-coverage.mjs'
s=rw(p)
s=once(s,
"const review = readJson('artifacts/governance/human-flow-review.json');\nconst snapshot = readJson('project-governance/runtime-snapshot.json');",
"const review = readJson('artifacts/governance/human-flow-review.json');\nconst snapshot = readJson('project-governance/runtime-snapshot.json');\nconst releaseScope = readJson('project-governance/release-scope.json');",
'coverage release scope import')
s=once(s,
"if (review.series_count !== snapshot.series_count) fail(`series_count mismatch ${review.series_count} != ${snapshot.series_count}`);\nif (review.base_window_count !== snapshot.base_window_count) fail(`base_window_count mismatch ${review.base_window_count} != ${snapshot.base_window_count}`);",
"const currentReleaseKeys = new Set(releaseScope.current_release_targets.map((row) => row.registry_series_key));\nconst expectedEntries = snapshot.entries.filter((row) => currentReleaseKeys.has(row.registry_series_key));\nconst expectedSeriesCount = expectedEntries.length;\nconst expectedBaseWindowCount = expectedEntries.reduce((sum, row) => sum + row.window_count, 0);\nif (review.series_count !== expectedSeriesCount) fail(`series_count mismatch ${review.series_count} != ${expectedSeriesCount}`);\nif (review.base_window_count !== expectedBaseWindowCount) fail(`base_window_count mismatch ${review.base_window_count} != ${expectedBaseWindowCount}`);\nfor (const row of releaseScope.deferred_targets) {\n  const canonical = snapshot.entries.find((entry) => entry.registry_series_key === row.registry_series_key);\n  if (!canonical) fail(`deferred target absent from canonical snapshot ${row.registry_series_key}`);\n  if (row.status !== 'DEFERRED' || row.qa_status !== 'UNVERIFIED' || row.release_eligibility !== false) fail(`deferred target false pass ${row.registry_series_key}`);\n}",
'coverage expected counts')
write(p,s)

# 3. Release scope is Human-Review relevant.
p='project-governance/gate-definition.json'
s=rw(p)
s=once(s,
'      "project-governance/runtime-snapshot.json",',
'      "project-governance/runtime-snapshot.json",\n      "project-governance/release-scope.json",',
'gate release scope path')
write(p,s)

# 4. Browser QA counts Current Release Scope only.
p='test/browser/global-window-selection-flow-browser-qa.mjs'
s=rw(p)
s=once(s,
"const snapshot = readJson('project-governance/runtime-snapshot.json');\nconst exactHead = process.env.GITHUB_SHA || process.env.HEAD_SHA || currentExactHead();",
"const snapshot = readJson('project-governance/runtime-snapshot.json');\nconst releaseScope = readJson('project-governance/release-scope.json');\nconst currentReleaseIds = new Set(releaseScope.current_release_targets.map((row) => row.integration_id));\nconst exactHead = process.env.GITHUB_SHA || process.env.HEAD_SHA || currentExactHead();",
'browser scope import')
s=once(s,
"const expectedIntegrations = appRuntimeIntegrationRegistry.filter((row) => WINDOW_UI_CATEGORIES.has(row.uiCategory));",
"const expectedIntegrations = appRuntimeIntegrationRegistry.filter((row) => WINDOW_UI_CATEGORIES.has(row.uiCategory) && currentReleaseIds.has(row.id));",
'browser integration filter')
s=once(s,
"if (expectedIntegrations.length !== 8) throw new Error(`EXPECTED_8_WINDOW_INTEGRATIONS:${expectedIntegrations.length}`);",
"if (expectedIntegrations.length !== 7) throw new Error(`EXPECTED_7_CURRENT_RELEASE_WINDOW_INTEGRATIONS:${expectedIntegrations.length}`);",
'browser integration count')
s=once(s,
"if (snapshot.series_count !== 8 || snapshot.base_window_count !== 113) throw new Error(`RUNTIME_SNAPSHOT_NOT_8_SERIES_113_WINDOWS:${snapshot.series_count}/${snapshot.base_window_count}`);",
"const currentSnapshotEntries = snapshot.entries.filter((row) => releaseScope.current_release_targets.some((target) => target.registry_series_key === row.registry_series_key));\nconst currentBaseWindows = currentSnapshotEntries.reduce((sum, row) => sum + row.window_count, 0);\nif (currentSnapshotEntries.length !== 7 || currentBaseWindows !== 109) throw new Error(`CURRENT_RELEASE_SNAPSHOT_NOT_7_SERIES_109_WINDOWS:${currentSnapshotEntries.length}/${currentBaseWindows}`);",
'browser snapshot count')
s=once(s,
"if (result.checkedWindowCount !== 226) throw new Error(`WINDOW_CHECK_COUNT_NOT_226:${result.checkedWindowCount}`);",
"if (result.checkedWindowCount !== 218) throw new Error(`WINDOW_CHECK_COUNT_NOT_218:${result.checkedWindowCount}`);",
'browser window check count')
s=once(s,
"if (result.transitionScenarioCount < 16) throw new Error(`TRANSITION_SCENARIO_COUNT_LT_16:${result.transitionScenarioCount}`);",
"if (result.transitionScenarioCount < 14) throw new Error(`TRANSITION_SCENARIO_COUNT_LT_14:${result.transitionScenarioCount}`);",
'browser transitions')
s=once(s,
"if (result.domSemanticCheckCount < 254) throw new Error(`DOM_SEMANTIC_CHECK_COUNT_LT_254:${result.domSemanticCheckCount}`);",
"if (result.domSemanticCheckCount < 246) throw new Error(`DOM_SEMANTIC_CHECK_COUNT_LT_246:${result.domSemanticCheckCount}`);",
'browser dom count')
write(p,s)

# 5. Global flow evidence expects 7 / 109 / 218 in Current Release Scope.
p='scripts/governance/emit-global-flow-evidence.mjs'
s=rw(p)
s=once(s,"if (review.series_count !== 8 || review.base_window_count !== 113) failures.push('HUMAN_REVIEW_SCOPE_NOT_8_SERIES_113_WINDOWS');","if (review.series_count !== 7 || review.base_window_count !== 109) failures.push('HUMAN_REVIEW_SCOPE_NOT_7_SERIES_109_WINDOWS');",'global evidence review count')
s=once(s,"if (browserQa.checked_window_count !== 226) failures.push(`BROWSER_WINDOW_CHECK_COUNT_${browserQa.checked_window_count}`);","if (browserQa.checked_window_count !== 218) failures.push(`BROWSER_WINDOW_CHECK_COUNT_${browserQa.checked_window_count}`);",'global evidence browser count')
write(p,s)

# 6. Finalizer: remove deferred Uchirimo from Current Release PASS proof without converting it to PASS.
p='scripts/governance/finalize-post-human-evidence.mjs'
s=rw(p)
s=once(s,
"const gates = readJson('artifacts/governance/gate-evaluation.json');\nconst snapshot = readJson('project-governance/runtime-snapshot.json');",
"const gates = readJson('artifacts/governance/gate-evaluation.json');\nconst snapshot = readJson('project-governance/runtime-snapshot.json');\nconst releaseScope = readJson('project-governance/release-scope.json');",
'finalizer scope import')
s=once(s,
"const uchi = readJson('artifacts/uchirimo-full-selector-proof/report.json');\nconst uchiBrowser = readJson('artifacts/uchirimo-runtime-browser-qa/report.json');\n",
"const deferredUchirimo = releaseScope.deferred_targets.find((row) => row.integration_id === 'SER-YKKAP-UCHIRIMO');\nif (!deferredUchirimo || deferredUchirimo.status !== 'DEFERRED' || deferredUchirimo.qa_status !== 'UNVERIFIED' || deferredUchirimo.release_eligibility !== false) throw new Error('UCHIRIMO_DEFERRED_SCOPE_INVALID');\nconst currentReleaseKeys = new Set(releaseScope.current_release_targets.map((row) => row.registry_series_key));\nconst currentSnapshotEntries = snapshot.entries.filter((row) => currentReleaseKeys.has(row.registry_series_key));\n",
'finalizer remove uchi proofs')
s=once(s,
"const fullWindowPass = nonTw.status === 'PASS' && tw.status === 'PASS' && inplus.status === 'PASS' && uchi.status === 'PASS';",
"const fullWindowPass = nonTw.status === 'PASS' && tw.status === 'PASS' && inplus.status === 'PASS';",
'full window current scope')
s=once(s,
"const fullBrowserPass = globalBrowser.status === 'PASS' && uchiBrowser.status === 'PASS';",
"const fullBrowserPass = globalBrowser.status === 'PASS';",
'full browser current scope')
s=once(s,
"  series_count: snapshot.series_count,\n  base_window_count: snapshot.base_window_count,",
"  series_count: currentSnapshotEntries.length,\n  base_window_count: currentSnapshotEntries.reduce((sum, row) => sum + row.window_count, 0),\n  deferred_target_count: releaseScope.deferred_targets.length,\n  deferred_targets: releaseScope.deferred_targets,",
'finalizer summary counts')
s=once(s,
"    uchirimo_selector_status: uchi.status,\n    uchirimo_browser_status: uchiBrowser.status,\n",
"    uchirimo_deferred_status: deferredUchirimo.status,\n    uchirimo_deferred_qa_status: deferredUchirimo.qa_status,\n",
'finalizer deferred status')
s=once(s,
"  qa_case_count: Number(nonTw.qa_case_count ?? 0) + Number(tw.qa_case_count ?? 0) + Number(inplus.qa_case_count ?? 0) + Number(uchi.qa_case_count ?? 0),",
"  qa_case_count: Number(nonTw.qa_case_count ?? 0) + Number(tw.qa_case_count ?? 0) + Number(inplus.qa_case_count ?? 0),",
'finalizer case count')
write(p,s)

# 7. Global flow reusable workflow: Current Release lane no longer blocks on Uchirimo proof/browser.
p='.github/workflows/global-window-selection-flow-gate.yml'
s=rw(p)
s=regex_once(s,r"\n  uchirimo-selector-proof:\n.*?(?=\n  global-flow:)","",'remove uchi selector proof job',flags=re.S)
s=once(s,
"  global-flow:\n    needs:\n      - governance-authority\n      - governance-precheck\n      - uchirimo-selector-proof",
"  global-flow:\n    needs:\n      - governance-authority\n      - governance-precheck",
'decouple global flow uchi')
s=regex_once(s,r"\n      - name: Restore aggregated Uchirimo selector proof\n.*?\n      - name: Global flow syntax and source gates",'\n      - name: Global flow syntax and source gates','remove uchi restore verify',flags=re.S)
s=regex_once(s,r"\n      - name: Uchirimo UI regression partition\n        run: .*?\n\n      - name: New-construction UI regression partition",'\n\n      - name: New-construction UI regression partition','remove uchi regression')
s=once(s,"command:'node --test test/70-runtime-manifest-ew-integration.test.mjs test/73-runtime-ui-uchirimo-gate.test.mjs test/77-runtime-ui-inplus-v04r2-installability-coverage.test.mjs test/84-requested-flow-acceptance.test.mjs'","command:'node --test test/70-runtime-manifest-ew-integration.test.mjs test/77-runtime-ui-inplus-v04r2-installability-coverage.test.mjs test/84-requested-flow-acceptance.test.mjs'",'dependency evidence command')
s=once(s,"node --test test/70-runtime-manifest-ew-integration.test.mjs test/73-runtime-ui-uchirimo-gate.test.mjs test/77-runtime-ui-inplus-v04r2-installability-coverage.test.mjs test/84-requested-flow-acceptance.test.mjs","node --test test/70-runtime-manifest-ew-integration.test.mjs test/77-runtime-ui-inplus-v04r2-installability-coverage.test.mjs test/84-requested-flow-acceptance.test.mjs",'dependency command')
s=once(s,"command:'node --test test/79-global-window-selection-flow.test.mjs test/74-new-construction-ui-v16.test.mjs test/73-runtime-ui-uchirimo-gate.test.mjs test/75-runtime-ui-inplus-v04r2-gate.test.mjs'","command:'node --test test/79-global-window-selection-flow.test.mjs test/74-new-construction-ui-v16.test.mjs test/75-runtime-ui-inplus-v04r2-gate.test.mjs'",'ui evidence command')
s=once(s,"node --test test/79-global-window-selection-flow.test.mjs test/74-new-construction-ui-v16.test.mjs test/73-runtime-ui-uchirimo-gate.test.mjs test/75-runtime-ui-inplus-v04r2-gate.test.mjs","node --test test/79-global-window-selection-flow.test.mjs test/74-new-construction-ui-v16.test.mjs test/75-runtime-ui-inplus-v04r2-gate.test.mjs",'ui command')
s=once(s,"          node test/browser/uchirimo-runtime-browser-qa.mjs\n",'', 'remove uchi browser')
s=once(s,"          echo 'FULL_BROWSER_FLOW_QA_GATE=PASS_8_WINDOW_RUNTIME_TRANSITIONS_DESKTOP_SMARTPHONE'","          echo 'FULL_BROWSER_FLOW_QA_GATE=PASS_7_CURRENT_RELEASE_RUNTIME_TRANSITIONS_DESKTOP_SMARTPHONE'",'browser summary')
s=s.replace("            artifacts/uchirimo-runtime-browser-qa/\n",'').replace("            artifacts/uchirimo-full-selector-proof/\n",'')
write(p,s)

# 8. Project Governance: move Uchirimo recovery into a pre-Human deferred lane and let Current Release series proceed independently after Human Review.
p='.github/workflows/project-governance-gate.yml'
s=rw(p)
s=regex_once(s,
r"\n  post-review-uchirimo-recovery-pilot:\n.*?(?=\n  post-review-global-flow:)",
"",
'remove old post-human recovery pilot',
flags=re.S)
s=once(s,
"  post-review-global-flow:\n    needs:\n      - governance\n      - post-review-uchirimo-recovery-pilot\n    if: ${{ needs.governance.outputs.authorized == 'true' && needs.post-review-uchirimo-recovery-pilot.outputs.full_coverage_authorized == 'true' }}",
"  post-review-global-flow:\n    needs:\n      - governance\n    if: ${{ needs.governance.outputs.authorized == 'true' }}",
'decouple post review global flow')
s=once(s,
"  post-review-nontw-exact:\n    needs:\n      - governance\n      - post-review-uchirimo-recovery-pilot",
"  post-review-nontw-exact:\n    needs:\n      - governance",
'decouple nontw')
s=once(s,
"  post-review-tw-exact:\n    needs:\n      - governance\n      - post-review-uchirimo-recovery-pilot",
"  post-review-tw-exact:\n    needs:\n      - governance",
'decouple tw')
s=once(s,
"      - post-review-uchirimo-recovery-pilot\n      - post-review-global-flow",
"      - post-review-global-flow",
'decouple finalizer')
anchor='\n  post-review-global-flow:\n'
if anchor not in s: raise SystemExit('post-review-global-flow anchor missing')
heavy_job='''\n  uchirimo-heavy-analysis:\n    needs:\n      - governance\n    if: ${{ needs.governance.result == 'success' }}\n    runs-on: ubuntu-latest\n    timeout-minutes: 60\n    permissions:\n      contents: read\n      actions: read\n    env:\n      HEAD_SHA: ${{ github.event.pull_request.head.sha || github.sha }}\n      GH_TOKEN: ${{ github.token }}\n      UCHIRIMO_HEAVY_SOURCE_RUN_ID: '35670279840'\n      UCHIRIMO_HEAVY_SOURCE_EXACT_HEAD: '508021c64897039b2fa6e0391058ad88394536af'\n    steps:\n      - name: Checkout exact HEAD\n        uses: actions/checkout@v4\n        with:\n          ref: ${{ env.HEAD_SHA }}\n          fetch-depth: 0\n      - name: Setup Node 24\n        uses: actions/setup-node@v4\n        with:\n          node-version: 24\n      - name: Install\n        run: npm install --ignore-scripts\n      - name: Verify exact HEAD and deferred scope\n        run: |\n          set -euo pipefail\n          test "$(git rev-parse HEAD)" = "$HEAD_SHA"\n          node --check scripts/governance/uchirimo-heavy-partition-analysis.mjs\n          node -e "const s=require('./project-governance/release-scope.json'); const u=s.deferred_targets.find(x=>x.integration_id==='SER-YKKAP-UCHIRIMO'); if(!u||u.status!=='DEFERRED'||u.qa_status!=='UNVERIFIED'||u.release_eligibility!==false) process.exit(1);"\n      - name: Build Heavy Partition Analysis and recursive child plan\n        run: node scripts/governance/uchirimo-heavy-partition-analysis.mjs\n      - name: Verify analysis contract\n        run: |\n          node --input-type=module <<'NODE'\n          import { readFileSync } from 'node:fs';\n          const a=JSON.parse(readFileSync('artifacts/uchirimo-heavy-recovery/heavy-partition-analysis.json','utf8'));\n          const p=JSON.parse(readFileSync('artifacts/uchirimo-heavy-recovery/recursive-partition-plan.json','utf8'));\n          if(a.exact_head!==process.env.HEAD_SHA||a.heavy_partition_count<1||a.deferred_scope_status!=='DEFERRED_UNVERIFIED')throw new Error('HEAVY_ANALYSIS_INVALID');\n          if(p.exact_head!==process.env.HEAD_SHA||p.PARTITION_OVERLAP_COUNT!==0||p.PARTITION_GAP_COUNT!==0)throw new Error('RECURSIVE_PLAN_COVERAGE_INVALID');\n          console.log(`HEAVY_PARTITION_COUNT=${a.heavy_partition_count}`);\n          console.log(`HEAVY_PRODUCT_NODES=${a.heavy_product_nodes.join(',')}`);\n          console.log(`CHILD_PARTITION_COUNT=${p.child_partition_count}`);\n          console.log(`UNSPLITTABLE_PARENT_COUNT=${p.UNSPLITTABLE_PARENT_COUNT}`);\n          NODE\n      - name: Upload Heavy Partition Analysis\n        if: always()\n        uses: actions/upload-artifact@v4\n        with:\n          name: uchirimo-heavy-partition-analysis-${{ env.HEAD_SHA }}\n          path: artifacts/uchirimo-heavy-recovery/\n          if-no-files-found: error\n'''
s=once(s,anchor,heavy_job+anchor,'insert pre-human heavy analysis')
write(p,s)

# 9. Workflow authority policy: register the pre-Human heavy lane and remove the old post-Human Uchirimo pilot.
p='project-governance/workflow-authority-policy.json'
s=rw(p)
s=once(s,
'''    "reconstruct-current-state": {
      "needs": [
        "governance",
        "persist"
      ],
      "required_if_contains": [
        "github.event_name != 'pull_request'"
      ]
    }
  },''',
'''    "reconstruct-current-state": {
      "needs": [
        "governance",
        "persist"
      ],
      "required_if_contains": [
        "github.event_name != 'pull_request'"
      ]
    },
    "uchirimo-heavy-analysis": {
      "needs": [
        "governance"
      ],
      "required_if_contains": [
        "needs.governance.result == 'success'"
      ]
    }
  },''',
'register pre-human heavy analysis')
s=once(s,'    "post-review-uchirimo-recovery-pilot",\n','', 'remove old pilot authority registration')
write(p,s)

print('UCHIRIMO_DEFERRED_SCOPE_MIGRATION_PATCH=PASS')
