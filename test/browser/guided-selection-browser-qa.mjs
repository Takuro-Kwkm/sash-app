import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const BASE = process.env.QA_BASE_URL ?? 'http://127.0.0.1:4190';
const OUT = process.env.QA_OUTPUT ?? 'artifacts/guided-selection-browser-qa';
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.env.QA_CHROMIUM_PATH ? { executablePath: process.env.QA_CHROMIUM_PATH } : {}) });
const report = { status: 'RUNNING', widths: [], errors: [], boundary: 'BROWSER_LOCAL_STORAGE; no formal estimate approval' };
try {
  for (const width of [1440, 768, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    page.on('pageerror', error => report.errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') report.errors.push(message.text()); });
    page.on('response', response => { if (response.status() >= 400) report.errors.push(`${response.status()} ${response.url()}`); });
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: '新しい案件', exact: true }).first().click();
    await page.locator('[name="project_name"]').fill(`Guided MVP QA ${width}`);
    await page.locator('#projectForm button[type="submit"]').click();
    await page.getByRole('button', { name: '見積を開く', exact: true }).click();
    await page.getByRole('button', { name: '最初の開口部を追加', exact: true }).click();
    await page.locator('[data-guided-action="guided"]').click();
    await page.selectOption('#guidedPurpose', 'new_exterior');
    await page.selectOption('#guidedPriority', 'thermal');
    await page.locator('[data-guided-action="next"]').click();
    await page.selectOption('#guidedOpening', 'WT-SL-HIKICHIGAI');
    await page.locator('[data-guided-action="next"]').click();
    await page.locator('#guidedWidth').fill('99999');
    await page.locator('#guidedWidth').dispatchEvent('change');
    await page.locator('#guidedHeight').fill('99999');
    await page.locator('#guidedHeight').dispatchEvent('change');
    await page.locator('[data-guided-action="search"]').click();
    await page.getByRole('heading', { name: '候補がありません', exact: true }).waitFor();
    assert.equal(await page.locator('.guided-candidate').count(), 0);
    await page.locator('[data-guided-action="back"]').click();
    await page.locator('#guidedWidth').fill('640'); await page.locator('#guidedWidth').dispatchEvent('change');
    await page.locator('#guidedHeight').fill('370'); await page.locator('#guidedHeight').dispatchEvent('change');
    await page.locator('[data-guided-action="search"]').click();
    await page.locator('.guided-candidate').waitFor();
    assert.equal(await page.locator('.guided-candidate').count(), 1);
    assert.match(await page.locator('.guided-candidate').innerText(), /価格未確認/);
    assert.match(await page.locator('.guided-candidate').innerText(), /規格実寸 W 640 × H 370 mm 一致/);
    assert.equal(await page.locator('.guided-candidate details[open]').count(), 0);
    for (const name of ['なぜこの商品？', '顧客への説明ポイント', '詳しく学ぶ']) {
      await page.locator('.guided-candidate summary').filter({ hasText: name }).click();
    }
    assert.match(await page.locator('.guided-candidate').innerText(), /社内推薦ルール/);
    assert.match(await page.locator('.guided-candidate').innerText(), /正式商品マスター v0.7-R3/);
    const visibleText = await page.locator('#guidedPanel').innerText();
    assert.ok(!/SER-LIX|WT-SL|SZ-SL|MANUAL_CHECK|ESTIMATE_CONFIRM_REQUIRED/.test(visibleText));
    await page.screenshot({ path: `${OUT}/comparison-${width}.png`, fullPage: true });
    await page.locator('[data-guided-action="choose"]').click();
    await page.locator('#guidedQuestion').waitFor();
    const seen = [];
    for (let iteration = 0; iteration < 30; iteration++) {
      if (!await page.locator('#guidedQuestion').count()) break;
      const key = await page.locator('#guidedQuestion').getAttribute('data-question-key');
      assert.ok(!seen.includes(key), `answered question repeated: ${key}`); seen.push(key);
      const control = page.locator('#guidedQuestion [data-spec-key]');
      const required = await control.getAttribute('required');
      if (required === null) { await page.locator('[data-guided-action="skip"]').click(); continue; }
      const value = await control.locator('option:not([value=""]):not([disabled])').first().getAttribute('value');
      assert.ok(value, key);
      const response = page.waitForResponse(r => r.url().includes('/api/runtime-master/resolve') && r.status() === 200);
      await control.selectOption(value); await response;
      await page.waitForFunction(oldKey => document.querySelector('#guidedQuestion')?.dataset.questionKey !== oldKey, key);
    }
    await page.getByRole('heading', { name: '仕様を入力しました', exact: true }).waitFor();
    const config = () => page.locator('#normalProductInputs [data-spec-key]').evaluateAll(rows => Object.fromEntries(rows.map(e => [e.dataset.specKey, e.multiple ? [...e.selectedOptions].map(o => o.value) : e.value])));
    const before = await config();
    await page.locator('[data-guided-action="normal"]').first().click();
    assert.deepEqual(await config(), before);
    await page.locator('[data-guided-action="guided"]').click();
    assert.deepEqual(await config(), before);
    await page.getByRole('heading', { name: '仕様を入力しました', exact: true }).waitFor();
    assert.ok(await page.locator('#guidedPanel').evaluate(el => el.scrollWidth <= el.clientWidth + 1));
    await page.screenshot({ path: `${OUT}/complete-${width}.png`, fullPage: true });
    const editorUrl = page.url();
    await page.getByRole('button', { name: 'この開口部を保存', exact: true }).click();
    await page.waitForURL(url => url.href !== editorUrl);
    const saved = await page.evaluate(() => window.__sashWorkApp.readDatabase().openings.find(o => !o.deleted_at).product_configuration_snapshot);
    assert.equal(saved.configuration.size, 'SZ-SL-000001');
    assert.equal(saved.workflow_data.guided_selection.mode, 'guided');
    assert.equal(saved.workflow_data.guided_selection.answers.priority, 'thermal');
    await page.goto(editorUrl, { waitUntil: 'networkidle' });
    await page.getByRole('heading', { name: '仕様を入力しました', exact: true }).waitFor();
    assert.deepEqual(await config(), before);
    // Existing normal mode still uses the same Dependency / Reset rules.
    await page.locator('[data-guided-action="normal"]').first().click();
    const response = page.waitForResponse(r => r.url().includes('/api/runtime-master/resolve') && r.status() === 200);
    await page.locator('#normalProductInputs [data-spec-key="window_type"]').selectOption('WT-SL-FIX-OUT');
    const result = await (await response).json();
    await page.waitForFunction(() => document.querySelector('#dynamicForm [data-spec-key="window_type"]')?.value === 'WT-SL-FIX-OUT');
    assert.equal(result.selection.screen_presence, undefined);
    assert.equal(result.selection.exterior_color, before.exterior_color);
    await page.locator('[data-guided-action="guided"]').click();
    assert.ok(await page.locator('#guidedQuestion').count());
    // A stored snapshot from an old package stays frozen across both modes.
    await page.getByRole('button', { name: 'この開口部を保存', exact: true }).click();
    await page.waitForURL(url => url.href !== editorUrl);
    const frozenConfiguration = await page.evaluate(() => {
      const db = window.__sashWorkApp.readDatabase();
      const opening = db.openings.find(o => !o.deleted_at);
      opening.product_configuration_snapshot.package_version = 'OLD-PACKAGE';
      localStorage.setItem(window.__sashWorkApp.storageKey, JSON.stringify(db));
      return opening.product_configuration_snapshot.configuration;
    });
    await page.goto(editorUrl, { waitUntil: 'networkidle' });
    await page.locator('[data-runtime-action="revalidate"]').waitFor();
    assert.match(await page.locator('#guidedPanel').innerText(), /保存時の商品設定を保持/);
    assert.equal(await page.locator('#guidedQuestion').count(), 0);
    await page.locator('[data-guided-action="normal"]').first().click();
    await page.locator('[data-guided-action="guided"]').click();
    const frozen = await page.evaluate(() => window.__sashWorkApp.readDatabase().openings.find(o => !o.deleted_at).product_configuration_snapshot);
    assert.equal(frozen.package_version, 'OLD-PACKAGE');
    assert.deepEqual(frozen.configuration, frozenConfiguration);
    report.widths.push({ width, status: 'PASS', seen, exact_actual_dimensions: true, oversized_rejected: true, education_disclosure: true, mode_values_preserved: true, saved_reload: true, dependency_reset: true, stale_snapshot_preserved: true });
    await page.close();
  }
  assert.deepEqual(report.errors, []); report.status = 'PASS';
} finally {
  await browser.close(); await writeFile(`${OUT}/report.json`, JSON.stringify(report, null, 2) + '\n');
}
console.log(JSON.stringify(report));
