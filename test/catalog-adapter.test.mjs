import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createCatalog, catalogInventory, resolveSheetRole } from "../src/catalog/catalog-adapter.mjs";
import { CURRENT_WINDOW_SERIES_MODULES } from "../src/catalog/modules/current-window-series.mjs";

test("wave1 installs four products through the same adapter", () => {
  const catalog = createCatalog(CURRENT_WINDOW_SERIES_MODULES);
  assert.equal(catalog.products.length, 4);
  assert.deepEqual(catalog.products.map((p) => p.displayName), ["サーモスⅡ-H", "サーモスL", "APW 430", "APW 431"]);
  assert.equal(catalogInventory(catalog).length, 4);
});

test("APP control aliases resolve by role rather than product branch", () => {
  assert.equal(resolveSheetRole(["02_シリーズ", "14_APP_候補制御"], "APP_CONTROL"), "14_APP_候補制御");
  assert.equal(resolveSheetRole(["02_シリーズ", "16_APP_候補制御"], "APP_CONTROL"), "16_APP_候補制御");
  assert.equal(resolveSheetRole(["02_シリーズ", "27_APP統合選択"], "APP_CONTROL"), "27_APP統合選択");
});

test("adapter source contains no product-specific names", async () => {
  const source = await readFile(new URL("../src/catalog/catalog-adapter.mjs", import.meta.url), "utf8");
  for (const forbidden of ["サーモス", "APW", "LIXIL", "YKK", "SER-LIX", "SER-YKK"]) {
    assert.equal(source.includes(forbidden), false, `adapter leaked product-specific token: ${forbidden}`);
  }
});

test("no catalog contamination", () => {
  const catalog = createCatalog(CURRENT_WINDOW_SERIES_MODULES);
  for (const product of catalog.products) {
    const defs = catalog.specificationDefinitions.filter((row) => row.productId === product.id);
    assert.ok(defs.length > 0, `${product.displayName} has no definitions`);
    const windows = catalog.allowedValues.filter((row) => row.productId === product.id && row.specificationKey === "window_type");
    assert.ok(windows.length > 0, `${product.displayName} has no windows`);
  }
});
