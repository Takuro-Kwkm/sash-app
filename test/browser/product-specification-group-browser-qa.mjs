import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';

const base=process.env.QA_BASE_URL??'http://127.0.0.1:4194';
const index=JSON.parse(await readFile('changes/replus-runtime-v5/index.json'));
const declaration=index.products[0].productSelectionGroup;
const out='artifacts/product-specification-group-v6';
await mkdir(out,{recursive:true});
const report={state:'RUNNING',specifications:[],standalone:[],errors:[],storage:'BROWSER_LOCAL_STORAGE'};
const browser=await chromium.launch({headless:true});
try{
  for(const width of [1280,768,390]){
    const context=await browser.newContext({viewport:{width,height:1000}}),page=await context.newPage();
    page.on('pageerror',error=>report.errors.push(error.message));
    await page.goto(base+'/runtime-lab?product='+encodeURIComponent(declaration.id),{waitUntil:'networkidle'});
    await page.locator('#productSpecification').waitFor({state:'visible'});
    assert.equal(await page.locator('#product').inputValue(),declaration.id);
    assert.equal(await page.locator('#product option:checked').textContent(),declaration.displayName);
    assert.equal(await page.locator('#product option').filter({hasText:declaration.displayName}).count(),1);
    assert.equal(await page.locator('#productSpecification').inputValue(),'');
    assert.equal(await page.locator('#dynamicForm [data-spec-key]').count(),0);
    assert.deepEqual(await page.locator('#productSpecification option').allTextContents(),['選択してください',...index.products.map(row=>row.productSelectionGroup.specificationName)]);
    await page.screenshot({path:out+'/product-then-specification-'+width+'.png'});
    for(const row of index.products){
      const response=page.waitForResponse(r=>r.url().includes('/api/runtime-master/resolve')&&new URL(r.url()).searchParams.get('productId')===row.id);
      await page.locator('#productSpecification').selectOption(row.id);
      const resolved=await response;
      assert.deepEqual(JSON.parse(new URL(resolved.url()).searchParams.get('selection')),{},'specification transition must clear all prior inputs');
      assert.equal(resolved.status(),200);
      await page.waitForFunction(id=>document.querySelector('#productSpecification').value===id&&document.querySelector('#dynamicForm [data-spec-key]'),row.id);
      const select=page.locator('#dynamicForm select[data-spec-key]:not([multiple])').first();
      const value=await select.locator('option').evaluateAll(options=>options.find(option=>option.value)?.value);
      if(value){
        const field=await select.getAttribute('data-spec-key');
        const changed=page.waitForResponse(r=>r.url().includes('/api/runtime-master/resolve')&&new URL(r.url()).searchParams.get('productId')===row.id&&JSON.parse(new URL(r.url()).searchParams.get('selection'))[field]===value);
        await select.selectOption(value);await changed;
        await page.waitForFunction(({key,value})=>document.querySelector('[data-spec-key="'+key+'"]')?.value===value,{key:field,value});
      }
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
      report.specifications.push({width,product_id:row.id,state:'PASS',previous_inputs_cleared:true});
    }
    for(const id of ['SER-LIXIL-TW','SER-LIX-EW']){
      const response=page.waitForResponse(r=>r.url().includes('/api/runtime-master/resolve')&&new URL(r.url()).searchParams.get('productId')===id);
      await page.locator('#product').selectOption(id);assert.equal((await response).status(),200);
      await page.waitForFunction(()=>document.querySelector('#dynamicForm [data-spec-key]'));
      assert.equal(await page.locator('#productSpecificationField').isVisible(),false);
      assert.equal(await page.locator('#product').inputValue(),id);
      report.standalone.push({width,id,state:'PASS'});
    }
    await page.locator('#product').selectOption(declaration.id);
    assert.equal(await page.locator('#productSpecification').inputValue(),'');
    assert.equal(await page.locator('#dynamicForm [data-spec-key]').count(),0);
    await page.locator('#manufacturer').selectOption('YKK AP');
    assert.equal(await page.locator('#productSpecificationField').isVisible(),false);
    assert.equal(await page.locator('#product option').filter({hasText:declaration.displayName}).count(),0);
    await context.close();
  }
  assert.equal(report.errors.length,0,report.errors.join('\n'));report.state='PASS';
}catch(error){report.state='FAIL';report.failure=error.stack;throw error;}
finally{await writeFile(out+'/report.json',JSON.stringify(report,null,2));await browser.close();}
