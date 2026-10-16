import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
const {chromium}=await import(process.env.QA_PLAYWRIGHT_MODULE??'playwright');
const [casesPath,reportPath]=process.argv.slice(2),cases=JSON.parse(readFileSync(casesPath)),browser=await chromium.launch({headless:true}),errors=[];
const report={status:'RUNNING',scope:'ALL_PARAMETERIZED_GENERIC_FIELD_RENDERINGS',classes:cases.length,verified:0,errors,exact_head:process.env.QA_EXPECTED_COMMIT};
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(process.env.QA_BASE_URL,{waitUntil:'networkidle'});const health=await(await page.request.get(process.env.QA_BASE_URL+'/api/health')).json();assert.equal(health.releaseCommitSha,process.env.QA_EXPECTED_COMMIT);
 for(let start=0;start<cases.length;start+=25){const count=await page.evaluate(async rows=>{
  const {ProductConfigurationEditor}=await import('/product-configuration-editor.mjs');let verified=0;
  const host=document.createElement('section');document.body.append(host);
  try{for(const row of rows){const f=row.field;host.innerHTML=ProductConfigurationEditor.prototype.renderField.call({state:{selection:row.selection}},f);const control=host.querySelector('[data-spec-key]');if(!control)throw Error('MISSING_CONTROL:'+f.key);
   if(control.dataset.specKey!==f.key||control.dataset.semanticSlot!==f.semanticSlot||control.dataset.semanticStage!==f.semanticStage)throw Error('SEMANTIC_MAPPING:'+f.key);
   if(control.required!==Boolean(f.required)||control.disabled!==Boolean(f.disabled))throw Error('STATE_FLAGS:'+f.key);
   const value=row.selection[f.key],expected=Array.isArray(value)?value.map(String):value===undefined?[]:[String(value)];
   if(f.dataType==='NUMBER'||f.dataType==='TEXT'){if(control.value!==(expected[0]??''))throw Error('VALUE_PROJECTION:'+f.key);}
   else{
    const options=[...control.options].filter(o=>o.value!=='');if(JSON.stringify(options.map(o=>o.value))!==JSON.stringify(f.values.map(v=>String(v.value))))throw Error('CHOICE_PROJECTION:'+f.key);
    if(JSON.stringify([...control.selectedOptions].map(o=>o.value).filter(Boolean).sort())!==JSON.stringify([...expected].sort()))throw Error('SELECTED_PROJECTION:'+f.key);
    for(let i=0;i<options.length;i++)if(options[i].textContent!==f.values[i].displayLabel)throw Error('CHOICE_LABEL:'+f.key);
   }
   if(!host.textContent.includes(f.displayLabel))throw Error('FIELD_LABEL:'+f.key);verified++;
  }}finally{host.remove();}return verified;
 },cases.slice(start,start+25));report.verified+=count;}
 assert.equal(report.verified,cases.length);assert.deepEqual(errors,[]);report.status='PASS';report.unverified_browser_projection_classes=0;
}catch(e){report.status='FAIL';report.failure=e.stack;throw e;}finally{writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');await browser.close();}
console.log(JSON.stringify(report));
