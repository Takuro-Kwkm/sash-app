# リシェント玄関ドア3 非防火 — 営業見積依頼の統合差分

Current Human Review Gate: **APP_INTEGRATION_READY = BLOCKED_PRODUCT_MASTER_DEFECT**。
枠色の熱仕様別Scope不足を公式DL2100 p181で確認。過去のReader差分PASSは履歴として保持し、
現在のGateを上書きしない。詳細・許可範囲の修正・QA境界は [Color / Exterior Trim closure](rechent-color-trim-closure.md)。

NON-PRODUCT-MASTER TASK。Canonical Product `LIXIL_RECHENT_DOOR3_NON_FIRE` / App Product `SER-LIXIL-RECHENT-D3-NF`。Formal v0.8-R7 / FORMAL_PASSをcarry-forwardする。Formal Product Master、8 Runtime documents、メーカーDependency、Evidence、PRODUCT_MASTER_CANONICAL_REGISTRYは変更しない。

## Authorityとbaseline

- Project Instructions v2.0: Drive `1vuexA-sGCeoO6gOeqogvdQvHpDmAr0wia14tRPYen1k`
- CURRENT_INFORMATION_SOURCE_MANIFEST v1.5 ACTIVE: `1xZ7gbinFDTL_Gm1XKwEP95aXQGxzKHH_IiwxZj2dg4A`
- 営業見積依頼責務境界 v1.1: `1_kKAVLQe2cJeKspQE6fYqnUl2_rSjlCGpxZVwIu4YsY`
- UI実装標準 v2.1 section 11: `1IjO6n-GmGFwCqb3XxQRnt5hMP5O-L7kT`
- Canonical Registry v2.0: `1HMMZ8JdsbJPtL_8LjQfxMF8P_Zb4-LReqvPMFn1pJks`
- Formal Authoring Master: `1L2JxjIxbfITjVvCg46RwKkg2I9hDbYWa`
- Canonical Runtime Manifest: `11P1jHLQs4KO9ZiHxF7ofvqDcwtuoNxbU`; SHA256 `6c189dff2197ab095168c308fb6733bd1a0f5a2f336a3352a39ce536ee08230d`
- Canonical folder: `1wNyL_JFz4wMFfV4zRbcahqCbU24K-n_G`
- Sash main / production baseline: `f9c5019661bee9f87d6cd657c4fce070fe2cbc10`, PR #56。CURRENT_RELEASE_MANIFESTとAPP_CHANGE_GUARDRAIL取得結果はINTERIOR向けであり、サッシのrelease authorityとして流用しない。RepositoryとVercel production metadataからbaseline一致を確認。

旧Product Selection GateのSurvey Layer Gapは、営業見積依頼の統合Blockerとして機械的に継承しない。明示的な `workflowScope:site_survey` は従来通りSource不足をfail closedする。

## Legacy Survey項目の再分類

全17項目はC: 現場調査時のみ必要。営業見積では入力、Required、Validation、Handoff、保存configurationから除外する。既存値は `workflow_data.site_survey.contexts[productId::standard].values` へ分離して保持。未検証のまま `DEFERRED_NOT_VERIFIED` とする。

| Field | 内容 | 分類 |
|---|---|---|
| existing_frame_material | 既設枠材質 | C / FUTURE_SOURCE_PENDING |
| existing_frame_type | 既設枠タイプ | C / FUTURE_SOURCE_PENDING |
| fastening_method | 固定方式 | C / FUTURE_SOURCE_PENDING |
| existing_opening_w1 | 既設開口W1 | C |
| existing_opening_w2 | 既設開口W2 | C |
| existing_opening_w_correction | 既設開口W補正 | C |
| existing_opening_h1 | 既設開口H1 | C |
| existing_opening_h2 | 既設開口H2 | C |
| exterior_trim_a | 外額縁寸法a | C |
| exterior_trim_b | 外額縁寸法b | C |
| exterior_trim_c | 外額縁寸法c | C |
| interior_trim_d | 内額縁寸法d | C |
| interior_trim_e | 内額縁寸法e | C |
| interior_trim_j | 内額縁寸法j | C |
| interior_trim_k | 内額縁寸法k | C |
| existing_threshold_g | 既設下枠寸法g | C |
| fit_result | 施工Fit判定 | C / FUTURE_SOURCE_PENDING |

製品W/H、額縁選択、既設下枠処理、下枠フラット材、段差緩和材は商品選択なのでEstimateへ残す。FamiLock下位仕様、子扉、袖仕様、安全ガラス、オプションはFormal成立条件に従うB。リモコンキー数量0/1/2は現在Runtimeに独立Selectorが存在せず追加しない。

## Integrationの修正

- 共通Global Flow Engineのcategory presentation extensionを利用し、断熱→開き形式→デザイン→ガラス/色→ハンドル/錠→額縁/下枠→W/H→オプションの表示順に変更。Canonical semantic stageは維持する。
- Hardwareの `STANDARD,HIGH_SIZE` scopeをCSVとして解釈。錠候補は現在の錠自身で絞らず、Formal hardware relationから算出。
- Design候補を正式Frame atomic ALLOW relationで絞る。上流変更後は固定点まで再評価し、成立値を保持、非成立/非該当値をclearする。
- OTHER_FRAME範囲を親子に流用せず、HIGH_SIZEの該当Formal寸法行を使用。範囲外、0、非有限値をinvalidとする。
- 営業断熱値は `HIGH_INSULATION` / `INSULATION_K2` / `INSULATION_K4` / `ALUMINUM`。K2/K4の共有Formal scopeはAdapterで両方から参照し、個別scopeは選択等級だけを参照する。ガラスはK2/K4をUnionせず、正式Glass Masterから個別に導出する。旧grouped保存値は等級を推測移行せず再選択を要求する。
- G12/G15 × HIGH_SIZE × DOUBLEの第二扉範囲は `MANUAL_CHECK_REQUIRED` / `automatic_orderability:false` として確認先（積算 / LIXIL）付きで保存・Handoff。寸法を追加しない。
- 内額縁のEXTRA_LARGE/LARGE/SMALLを特大/大/小へ表示翻訳。保存するFormal値は維持。

## QA scopeと証拠

`test/96-rechent-estimate-integration.test.mjs` は14業務経路、全Frame/Hardware relationの候補、寸法境界、非該当clear、Legacy Survey移行を検証。

`test/browser/rechent-estimate-integration-browser-qa.mjs` は14経路 × desktop/tablet/mobile = 42ケース。実Renderer、ブラウザ保存、再読込、見積出力モデル、手動確認伝達、範囲外、ダーク表示、錠/電源/開き形式/断熱変更を検証。完成配置のseedはFormal候補からテスト用に構築するもので、製品UIにdefaultを追加しない。

別Global Flow browser suiteはUIから順次選択しDOMとResolverの一致を確認。既存8シリーズ業務flow、浴室見積、案件管理、見積出力、themeの回帰を実行。現Inventoryで他LIXIL/YKK玄関カバーと新築玄関の正式Runtime integrationは存在しないため、それらのBrowser PASSを主張しない。共通Renderer本体は変更せず、category contractと見積workflowの影響範囲を検証する。

Uchirimoの既存Exact Source QA pinは、Rechent専用bridge分岐とSurvey metadata追加の影響レビュー後、2ファイルだけ更新する。未知Rule拒否・source変更検出のnegative guardは維持。商品Formal contractではなくアプリQA witnessである。

専用CI `Rechent Estimate Integration` はlint/typecheck/full test、Formal/Registry read-only差分、build、local Browser/Regression、自己完結HTML parity、Vercel Preview READY / commit一致、deployed Browserを順に実行する。最終判定は実行結果に基づく。自己完結HTMLは選択/UI確認用で、案件保存・出力は実Previewで確認する。

Production merge/deployは対象外。FORMAL、APP_INTEGRATION_READY、RELEASEDを区別する。

## Human Review Selection Flow refinement — 2026-10-02

先行Candidate `f2193dd16d464f16c673d516844064010fce6c0f` を実取得・検証し、分離・表示・順序変更をcarry-forwardする。無条件RollbackやFormal変更は行わない。

- `BATTERY`は保存・Dependency keyを維持し、表示だけ「電池式」へ。`AC100V`はそのまま。Formal Hardwareはアルミ仕様でBATTERYのみであり、AC100Vを追加しない。
- category Presentation Contractは `錠仕様 → キーセット → シリンダー → 電源 / プラン → FamiLockリーダー → FamiLockプラン → 追加キー`。手動錠では専用5項目を非表示・clearする。
- Governance run `36965535863` / job `110708365842` はmetadata不足や一時障害ではなく、旧grouped値を入力した `test/82` の不整合。K2/K4それぞれで同じFormal manual-check例外を維持するテストへ更新。
- Integration run `36965532722` / preview job `110708359301` はアルミFamiLockにもAC100Vを要求したQA不整合。実DOMの電源domainをFormal-derived domain全体と比較し、候補の追加・欠落と英語表示を検出する。
- `test/97` は58個の正式K2/K4ガラス・デザイン経路、シリアライズ保存後の再評価、K2↔K4でのガラス再導出と共通値保持、旧grouped値の再選択、共有/個別scope混在時の候補・色・寸法非混線を検証する。Synthetic fixtureはメモリ内のテスト専用で正式商品事実として保存しない。
- Browserは14業務構成 × desktop 1440 / tablet 768 / mobile 390 = 42ケース。K2/K4保存・再読込・Handoffの個別値、ガラス、FamiLock電源、錠切替clear、K2↔K4ガラス変更、dark、表示順、overflowを実Renderで検証。HTMLは1280 / 768 / 390でRuntime parityを検証する。
- Drive Current Manifest v1.5、共通開発標準 v2.0、Runtime UI v1.8、UI標準v2.1、Formal Authoring v0.8-R7を取得。Drive Canonical runtime_manifestのSHA256はrepoの `6c189dff2197ab095168c308fb6733bd1a0f5a2f336a3352a39ce536ee08230d` と一致。

最終APP_INTEGRATION_READY判定は最新commitの全CI・Governance・SHA一致Preview Browser結果を確認してPR本文に記録する。古いPR本文のPASSを新Candidateへ継承しない。

## FamiLock reader official label refinement (2026-10-02)

This continuation changes only the Adapter's reader presentation mapping. `OUTDOOR_READER` and `KEYPAD_OUTDOOR_READER` remain the Runtime, dependency, saved-configuration and handoff identifiers. Hardware rules and Formal packages are unchanged.

Official source checked: LIXIL **リシェント受発注資料集 IG3700**, 2026/04, 2026年5月価格掲載版. LIXIL's product document listing identifies it as current: https://kinken.lixil.co.jp/e/products/CSSERESDET_777922/documents/webcatalog . The complete manufacturer PDF was read from the existing Drive original `202604_LIXIL_リシェント_業務用資料集.pdf` (Drive ID `1NBm3G1nzmFI4T6miuEiqp-nEQeLQpln_`). **RD-4 / RD-12** (PDF pages 20 / 28), FamiLock 部材価格表, 基本部材 → ドア本体, prints **屋外リーダー用** and **テンキー付屋外リーダー用**. These specification labels are adopted exactly.

Cross-check: current LIXIL **リシェント玄関ドア3 DL2100**, 2026/09, 2026年10月価格掲載版, https://webcatalog.lixil.co.jp/cgi-bin/openDetailBL.cgi?c=DL2100 , **206–207** (FamiLock プラン一覧 → 3. 屋外リーダーを選ぶ). The device names there are 屋外リーダー and テンキー付屋外リーダー/ワイヤレス屋内ボタンセット; the ordering specification labels above come from the higher-priority IG3700 component table. No new component, pairing, eligibility or price is inferred from this cross-check.

The Formal canonical field already has Japanese device names. The UI defect arose because `hardwareChoice` returned Hardware allow-rule codes without a reader label mapping. This is an Adapter presentation defect, not a Product Master defect. `test/98` covers both reader values with K2/K4 and BATTERY/AC100V, saved snapshots, reload, estimate output and manual-lock clear. S-handle keypad exclusion remains enforced. The deployed browser gate checks option text and rendered text, both reader selections, saved/handoff identifiers and labels at 1440 / 768 / 390px.
