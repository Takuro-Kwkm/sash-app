import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source=readFileSync(new URL('../src/public-saas/ui/app.js',import.meta.url),'utf8');

test('Public SaaS async submit handlers retain a stable form reference across awaits',()=>{
  for(const formId of ['signInForm','signUpForm','workspaceForm','projectForm','openingForm']){
    const marker=`$('#${formId}').addEventListener('submit',async(event)=>{`;
    const start=source.indexOf(marker);
    assert.notEqual(start,-1,`${formId} submit handler must exist`);
    const window=source.slice(start,start+500);
    assert.match(window,/const form=event\.currentTarget;/,`${formId} must capture currentTarget before awaiting`);
  }

  assert.doesNotMatch(source,/event\.currentTarget\.reset\(\)/);
  assert.doesNotMatch(source,/new FormData\(event\.currentTarget\)/);
  assert.doesNotMatch(source,/setFormBusy\(event\.currentTarget,false\)/);
});
