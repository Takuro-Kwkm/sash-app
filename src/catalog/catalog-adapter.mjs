const ROLE_ALIASES = Object.freeze({
  SERIES: ["02_シリーズ"],
  WINDOWS: ["03_窓種"],
  APP_CONTROL: ["14_APP_候補制御", "16_APP_候補制御", "27_APP統合選択"],
  SIZE: ["06_サイズ", "05_規格サイズ", "26_統合候補マスター"],
  CUSTOM_SIZE: ["06C_特注寸法範囲", "06_製作範囲", "28_自由寸法Lookup"],
  COLOR: ["07_色", "07_外観色"],
  INNER_COLOR: ["08_内観色"],
  SCREEN: ["09_網戸", "10_網戸"],
  GLASS: ["08_ガラス", "11_ガラス"],
  OPTIONS: ["10_その他OP", "13_その他OP"]
});

export function resolveSheetRole(sheetNames, role) {
  const aliases = ROLE_ALIASES[role] ?? [];
  return aliases.find((name) => sheetNames.includes(name)) ?? null;
}

export function installCatalogModule(module, catalog) {
  validateCatalogModule(module);
  if (!catalog.products) catalog.products = [];
  if (!catalog.specificationDefinitions) catalog.specificationDefinitions = [];
  if (!catalog.allowedValues) catalog.allowedValues = [];
  if (!catalog.requiredFieldRules) catalog.requiredFieldRules = [];
  if (!catalog.ruleSets) catalog.ruleSets = [];
  if (!catalog.dependencies) catalog.dependencies = [];
  if (!catalog.evidence) catalog.evidence = [];

  catalog.products.push(module.product);
  catalog.specificationDefinitions.push(...(module.specificationDefinitions ?? []));
  catalog.allowedValues.push(...(module.allowedValues ?? []));
  catalog.requiredFieldRules.push(...(module.requiredFieldRules ?? []));
  catalog.ruleSets.push(...(module.ruleSets ?? []));
  catalog.dependencies.push(...(module.dependencies ?? []));
  catalog.evidence.push(...(module.evidence ?? []));

  return catalog;
}

export function createCatalog(modules = []) {
  const catalog = {
    products: [],
    specificationDefinitions: [],
    allowedValues: [],
    requiredFieldRules: [],
    ruleSets: [],
    dependencies: [],
    evidence: []
  };
  for (const module of modules) installCatalogModule(module, catalog);
  return catalog;
}

export function catalogInventory(catalog) {
  return catalog.products.map((product) => {
    const selectorMatches = (row) => row.productId === product.id;
    return {
      productId: product.id,
      manufacturer: product.manufacturer,
      series: product.displayName,
      definitions: catalog.specificationDefinitions.filter(selectorMatches).length,
      allowedValues: catalog.allowedValues.filter(selectorMatches).length,
      requiredRules: catalog.requiredFieldRules.filter(selectorMatches).length,
      ruleSets: catalog.ruleSets.filter(selectorMatches).length,
      dependencies: catalog.dependencies.filter(selectorMatches).length
    };
  });
}

export function validateCatalogModule(module) {
  if (!module || typeof module !== "object") throw new TypeError("catalog module must be an object");
  if (!module.product?.id) throw new Error("catalog module requires product.id");
  if (!module.product?.displayName) throw new Error("catalog module requires product.displayName");
  if (!module.product?.manufacturer) throw new Error("catalog module requires product.manufacturer");

  const collections = [
    "specificationDefinitions",
    "allowedValues",
    "requiredFieldRules",
    "ruleSets",
    "dependencies",
    "evidence"
  ];
  for (const key of collections) {
    for (const row of module[key] ?? []) {
      if (row.productId && row.productId !== module.product.id) {
        throw new Error(`product contamination in ${key}: ${row.productId}`);
      }
    }
  }
  return true;
}

export { ROLE_ALIASES };
