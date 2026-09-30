import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const INDEX='src/ui/web/index.html';
const THEME_JS='src/ui/web/theme.js';
const THEME_CSS='src/ui/web/theme.css';

test('theme selector and no-flash theme bootstrap are wired into the app shell',async()=>{
  const html=await readFile(INDEX,'utf8');
  assert.match(html,/name="color-scheme" content="light dark"/);
  assert.match(html,/sash\.theme\.v1/);
  assert.match(html,/id="themePreference"/);
  assert.match(html,/<option value="system">システム<\/option>/);
  assert.match(html,/<option value="light">ライト<\/option>/);
  assert.match(html,/<option value="dark">ダーク<\/option>/);
  assert.match(html,/href="\/theme\.css"/);
  assert.match(html,/src="\/theme\.js"/);
});

test('theme controller persists explicit choice and follows system preference',async()=>{
  const source=await readFile(THEME_JS,'utf8');
  assert.match(source,/const STORAGE_KEY='sash\.theme\.v1'/);
  assert.match(source,/prefers-color-scheme: dark/);
  assert.match(source,/localStorage\.setItem\(STORAGE_KEY,safe\)/);
  assert.match(source,/dataset\.theme=resolved/);
  assert.match(source,/media\.addEventListener\('change',handleSystemChange\)/);
});

test('dark mode covers app shell, forms, cards, notices and print reset',async()=>{
  const css=await readFile(THEME_CSS,'utf8');
  for(const selector of [
    'html[data-theme="dark"] body',
    'html[data-theme="dark"] .topbar',
    'html[data-theme="dark"] input',
    'html[data-theme="dark"] .card',
    'html[data-theme="dark"] .notice.warning',
    'html[data-theme="dark"] .estimate-summary th',
    '@media print',
  ]) assert.ok(css.includes(selector),`missing theme rule: ${selector}`);
});
