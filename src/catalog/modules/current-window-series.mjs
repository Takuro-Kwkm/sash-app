const makeDefinition = (productId, key, displayLabel, displayOrder, sourceRole, dataType = "ENUM") => ({
  productId,
  key,
  displayLabel,
  description: `${displayLabel}を商品マスターから選択`,
  dataType,
  category: "estimate",
  applicability: "SELECTOR_DRIVEN",
  displayOrder,
  evidenceIds: [],
  version: "recovery-0.1",
  status: "ACTIVE",
  sourceRole
});

const makeWindowValues = (productId, windows) => windows.map((window, index) => ({
  productId,
  specificationKey: "window_type",
  value: window.id,
  displayLabel: window.label,
  displayOrder: index + 1,
  status: "ACTIVE",
  metadata: window.metadata ?? {}
}));

const makeModule = ({ product, windows, source, appControlSheet, sizeMode = "STANDARD" }) => ({
  product: {
    ...product,
    category: "サッシ",
    status: "ACTIVE",
    recoveryStatus: "SOURCE_VERIFIED",
    source
  },
  specificationDefinitions: [
    makeDefinition(product.id, "window_type", "窓種", 10, "WINDOWS"),
    makeDefinition(product.id, "size_mode", "サイズ方式", 20, "SIZE"),
    makeDefinition(product.id, "size", "サイズ", 30, "SIZE"),
    makeDefinition(product.id, "exterior_color", "外観色", 40, "COLOR"),
    makeDefinition(product.id, "interior_color", "内観色", 50, "INNER_COLOR"),
    makeDefinition(product.id, "screen", "網戸", 60, "SCREEN"),
    makeDefinition(product.id, "glass", "ガラス", 70, "GLASS"),
    makeDefinition(product.id, "options", "その他オプション", 80, "OPTIONS", "MULTI_ENUM")
  ],
  allowedValues: [
    ...makeWindowValues(product.id, windows),
    { productId: product.id, specificationKey: "size_mode", value: "STANDARD", displayLabel: "規格サイズ", displayOrder: 1, status: "ACTIVE" },
    ...(sizeMode === "STANDARD_CUSTOM" ? [{ productId: product.id, specificationKey: "size_mode", value: "CUSTOM", displayLabel: "特注寸法", displayOrder: 2, status: "ACTIVE" }] : [])
  ],
  requiredFieldRules: [
    { productId: product.id, specificationKey: "window_type", required: true, selector: { productId: product.id } },
    { productId: product.id, specificationKey: "size_mode", required: true, selector: { productId: product.id } },
    { productId: product.id, specificationKey: "size", required: true, selector: { productId: product.id } }
  ],
  ruleSets: [
    {
      productId: product.id,
      id: `${product.id}:app-control`,
      type: "SOURCE_ROUTING",
      selector: { productId: product.id },
      payload: { appControlSheet },
      status: "ACTIVE"
    }
  ],
  dependencies: [],
  evidence: [{
    productId: product.id,
    id: `${product.id}:master-source`,
    sourceType: "PRODUCT_MASTER",
    title: source.title,
    sourceId: source.id,
    status: "VERIFIED_SOURCE"
  }]
});

export const CURRENT_WINDOW_SERIES_MODULES = [
  makeModule({
    product: { id: "SER-LIX-SAMOS2H", manufacturer: "LIXIL", displayName: "サーモスⅡ-H" },
    source: { id: "17nX4MDq9eNj-GaLvESMrRBobqoR0s5pj", title: "サーモスⅡH_商品マスター_v0.8_網戸格子全面監査_GoldenTest版.xlsx" },
    appControlSheet: "14_APP_候補制御",
    windows: [
      ["WT-S2H-HIKICHIGAI","単体引違い窓"], ["WT-S2H-SHUTTER-HIKI","シャッター付引違い窓"], ["WT-S2H-AMADO-HIKI","雨戸付引違い窓"], ["WT-S2H-MENKOSHI-HIKI","面格子付引違い窓"],
      ["WT-S2H-AGE-SAGE","上げ下げ窓FS"], ["WT-S2H-TATE-SUBERI","縦すべり出し窓"], ["WT-S2H-SUBERI","すべり出し窓"], ["WT-S2H-FIX","FIX窓"], ["WT-S2H-UCHITAO-SHI","内倒し窓"], ["WT-S2H-SOTO-TAOSHI","外倒し窓"],
      ["WT-S2H-RENMADO","連窓"], ["WT-S2H-DANMADO","段窓"], ["WT-S2H-DEG-SHO","出窓"], ["WT-S2H-KAZARI-HIKI","装飾引違い窓"], ["WT-S2H-KOSHO","高所用横すべり出し窓"], ["WT-S2H-SAIHU-KATTEGUCHI","採風勝手口ドアFS"], ["WT-S2H-KATTEGUCHI","勝手口ドア" ]
    ].map(([id,label]) => ({id,label}))
  }),
  makeModule({
    product: { id: "SER-LIX-SAMOSL", manufacturer: "LIXIL", displayName: "サーモスL" },
    source: { id: "17lVzBZ1hp4RVcGv0yNdnrKt25SFO2FhL", title: "サーモスL_商品マスター_v0.7_特注寸法発注アプリ投入完成版_QA確定.xlsx" },
    appControlSheet: "16_APP_候補制御",
    sizeMode: "STANDARD_CUSTOM",
    windows: [
      ["WT-SL-HIKICHIGAI","単体引違い窓"], ["WT-SL-SHUTTER-HIKI","シャッター付引違い窓"], ["WT-SL-AMADO-HIKI","雨戸付引違い窓"], ["WT-SL-MENKOSHI-HIKI","面格子付引違い窓"],
      ["WT-SL-AGE-SAGE","上げ下げ窓FS"], ["WT-SL-TATE-SUBERI","縦すべり出し窓"], ["WT-SL-SUBERI","すべり出し窓"], ["WT-SL-FIX","FIX窓"], ["WT-SL-UCHITAO-SHI","内倒し窓"], ["WT-SL-SOTO-TAOSHI","外倒し窓"],
      ["WT-SL-RENMADO","連窓"], ["WT-SL-DANMADO","段窓"], ["WT-SL-KOSHO","高所用横すべり出し窓"], ["WT-SL-KATTEGUCHI","勝手口ドア"], ["WT-SL-SAIHU-KATTEGUCHI","採風勝手口ドアFS"]
    ].map(([id,label]) => ({id,label}))
  }),
  makeModule({
    product: { id: "SER-YKK-APW430", manufacturer: "YKK AP", displayName: "APW 430" },
    source: { id: "1QDocQ7yoXE6TAnzHtfsyKwwK6YB5_mgk90Bw1hm4iPo", title: "20260830_YKKAP_APW430_商品マスター_正本" },
    appControlSheet: "COMMON_MASTER_RULE_TABLES",
    sizeMode: "STANDARD_CUSTOM",
    windows: [
      ["APW430-HIKI","引違い窓"], ["APW430-SHUTTER-HIKI","シャッター付引違い窓"], ["APW430-MENKOSHI-HIKI","面格子付引違い窓"], ["APW430-TATE-SUBERI","たてすべり出し窓"], ["APW430-SUBERI","すべり出し窓"], ["APW430-FIX","FIX窓"], ["APW430-KOSHO","高所用窓"]
    ].map(([id,label]) => ({id,label}))
  }),
  makeModule({
    product: { id: "SER-YKK-APW431", manufacturer: "YKK AP", displayName: "APW 431" },
    source: { id: "1TBEn2tTbFjBLeIOeDs0fR3iIDcLEn3jI", title: "APW431_商品マスター_v1.0_最終QA正式固定版.xlsx" },
    appControlSheet: "27_APP統合選択",
    sizeMode: "STANDARD_CUSTOM",
    windows: [
      ["W431-001","引違いテラス戸"], ["W431-002","シャッター付引違いテラス戸"], ["W431-003","大開口スライディング"], ["W431-004","開き窓テラス"], ["W431-005","FIX窓"], ["W431-006","勝手口ドア"]
    ].map(([id,label]) => ({id,label}))
  })
];
