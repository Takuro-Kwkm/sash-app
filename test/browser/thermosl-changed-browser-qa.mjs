import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const OUT = process.env.QA_OUTPUT ?? 'artifacts/thermosl-changed-browser-qa';
const BASE = process.env.QA_BASE_URL ?? 'http://127.0.0.1:4182';
const OPTION = 'OP-SL-EMERGENCY-SKIRT';
await mkdir(OUT, { recursive: true });
const server = process.env.QA_BASE_URL ? null : spawn('node', ['scripts/start-step8-ui.mjs'],
  { env: { ...process.env, PORT: '4182' }, stdio: ['ignore', 'pipe', 'pipe'] });
let browser;
const report = { status: 'RUNNING', product: 'SER-LIX-SAMOSL', revision: 'v0.7-R3', widths: [], errors: [] };
try {
  if (server) await once(server.stdout, 'data');
  browser = await chromium.launch({ headless: true,
    ...(process.env.QA_CHROMIUM_PATH ? { executablePath: process.env.QA_CHROMIUM_PATH } : {}),
    args: ['--no-sandbox'] });
  for (const width of [1440, 768, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    page.on('pageerror', e => report.errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') report.errors.push(m.text()); });
    page.on('response', r => { if (r.status() >= 400) report.errors.push(`${r.status()} ${r.url()}`); });
    await page.goto(`${BASE}/runtime-lab`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => document.querySelector('#status')?.textContent === 'CATALOG CONNECTED');
    assert.ok((await page.locator('body').innerText()).length > 100);
    assert.equal(await page.locator('[data-nextjs-dialog],.vite-error-overlay').count(), 0);
    await page.selectOption('#manufacturer', 'LIXIL');
    await page.selectOption('#product', 'SER-LIX-SAMOSL');
    await page.waitForSelector('[data-spec-key="window_type"]');
    async function choose(key, value) {
      const response = page.waitForResponse(r => {
        if (!r.url().includes('/api/runtime-master/resolve') || r.status() !== 200) return false;
        const raw = new URL(r.url()).searchParams.get('selection');
        return raw && JSON.stringify(JSON.parse(raw)[key]) === JSON.stringify(value);
      });
      await page.locator(`[data-spec-key="${key}"]`).selectOption(value);
      const result = await (await response).json();
      await page.waitForFunction(({ key, value }) => {
        const e = document.querySelector(`[data-spec-key="${key}"]`);
        return e && (Array.isArray(value) ? JSON.stringify([...e.selectedOptions].map(o => o.value)) === JSON.stringify(value) : e.value === value);
      }, { key, value });
      return result;
    }
    await choose('window_type', 'WT-SL-SHUTTER-HIKI');
    await choose('shutter_type', 'SP-SL-SHUT-M-STD');
    const option = page.locator(`[data-spec-key="options"] option[value="${OPTION}"]`);
    await option.waitFor({ state: 'attached' });
    assert.match(await option.textContent(), /代替進入口用幅木仕様/);
    await choose('options', [OPTION]);
    await page.screenshot({ path: `${OUT}/thermosl-${width}.png`, fullPage: true });
    const labels = await page.locator('label').allTextContents();
    const selections = await page.locator('[data-spec-key="options"]').evaluate(e => [...e.selectedOptions].map(o => o.value));
    assert.deepEqual(selections, [OPTION]);
    for (const type of ['SP-SL-SHUT-M-WIND', 'SP-SL-SHUT-E-STD']) {
      await choose('shutter_type', type);
      assert.equal(await page.locator(`[data-spec-key="options"] option[value="${OPTION}"]`).count(), 0);
    }
    report.widths.push({ width, status: 'PASS', manual_standard_only: true, invalid_selection_cleared: true, labels });
    await page.close();
  }
  assert.deepEqual(report.errors, []);
  report.status = 'PASS';
} finally {
  if (browser) await browser.close();
  if (server) server.kill();
  await writeFile(`${OUT}/report.json`, JSON.stringify(report, null, 2) + '\n');
}
console.log(JSON.stringify({ status: report.status, widths: report.widths.map(x => x.width), errors: report.errors }));
