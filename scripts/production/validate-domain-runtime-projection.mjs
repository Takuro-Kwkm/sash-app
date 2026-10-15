import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {adaptComposedProductRuntime} from '../../src/catalog/runtime-master/composed-product-runtime-adapter.mjs';
import {applyDeclaredWindowFlow} from '../../src/catalog/runtime-master/declared-window-flow.mjs';
import {applyDeclaredInputClears} from '../../src/work-management/domain.mjs';

const [indexPath,outputPath]=process.argv.slice(2), root=dirname(resolve(indexPath));
const read=path=>JSON.parse(readFileSync(resolve(root,path)));
const index=JSON.parse(readFileSync(resolve(indexPath))), report={status:'RUNNING',scope:'LOCAL_DOMAIN_RUNTIME_PARITY',request_quantity_test_context:1,formal_adoption:false,source_adoption:false,results:[]};
for(const entry of index.products){
  const bytes=readFileSync(resolve(root,entry.path));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),entry.sha256);
  const document=JSON.parse(bytes), master=read(document.baseline.path), keys=new Set(master.fields.filter(row=>row.knowledge_status==='KNOWN').map(row=>row.field_id));
  assert.equal(createHash('sha256').update(readFileSync(resolve(root,document.baseline.path))).digest('hex'),document.baseline.sha256);
  const reader=await adaptComposedProductRuntime(document,entry,()=>{throw new Error('UNEXPECTED_REFERENCE');});
  const normalize=selection=>Object.fromEntries(Object.entries(selection).filter(([key,value])=>keys.has(key)&&value!==null&&value!==undefined));
  let valid=0,invalid=0;
  for(const row of master.handoff_tests){
    const changed=Object.keys(row.changes).filter(key=>JSON.stringify(row.before[key])!==JSON.stringify(row.changes[key]));
    const input=applyDeclaredInputClears({...row.before,...row.changes,...(document.sales_handoff?{[document.sales_handoff.quantity_field]:1}:{})},changed,document.product_module.specificationDefinitions), result=reader.uiResolver(input);
    try{
      if(row.expected_valid){
        assert.equal(result.validation.status,'MANUAL_CHECK');
        assert.deepEqual(normalize(result.selection),normalize(row.expected_output));
        valid++;
      }else{
        assert.ok(['INVALID','INCOMPLETE'].includes(result.validation.status),JSON.stringify(result.validation));
        invalid++;
      }
      const fields=applyDeclaredWindowFlow(result.fields,entry);
      assert.ok(fields.every(field=>field.fieldMeaning&&field.presentationGroup));
      assert.equal(result.orderReady,false);
      assert.deepEqual(result.pricing,{price:null,bom:null,set_code:null});
    }catch(error){report.results.push({case_id:row.case_id,status:'FAIL',reason:error.message});}
  }
  report.products??=[];report.products.push({id:entry.id,cases:master.handoff_tests.length,positive:valid,negative:invalid});
}
report.status=report.results.length?'FAIL':'PASS';
writeFileSync(outputPath,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
if(report.status!=='PASS')process.exitCode=2;
