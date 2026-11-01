import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {projectRowTableMaster,evaluateRowTableProjection} from '../../src/catalog/runtime-master/row-table-runtime-projection.mjs';

const hash = b => crypto.createHash('sha256').update(b).digest('hex');
function read(ref) {
  const bytes=fs.readFileSync(ref.path);
  if(hash(bytes)!==ref.sha256)throw new Error('NATIVE_INPUT_CHANGED: '+ref.path);
  return JSON.parse(bytes);
}
const args=process.argv.slice(2);
if(args.length!==2)throw new Error('Usage: export-row-table-runtime INPUT_REFS OUT_DIR');
const refs=JSON.parse(fs.readFileSync(args[0])), source=read(refs.master), policy=read(refs.policy);
const projection=projectRowTableMaster(source,policy);
const root=new URL('../../',import.meta.url);
const implementations=['scripts/production/export-row-table-runtime.mjs','src/catalog/runtime-master/row-table-runtime-projection.mjs',
  'src/catalog/runtime-master/generic-rule-engine.mjs','src/catalog/runtime-master/runtime-condition.mjs',
  'src/catalog/runtime-master/runtime-state.mjs','src/catalog/runtime-master/runtime-effects.mjs',
  'src/catalog/dimension-resolver.mjs','src/catalog/selector.mjs','src/catalog/selector-ops.mjs']
  .map(name=>({native_path:name,sha256:hash(fs.readFileSync(new URL(name,root)))}));
const cases=source.golden_test_master.map(row=>{
  const out=evaluateRowTableProjection(projection,JSON.parse(row.input_configuration_json));
  const expectedReasons=JSON.parse(row.expected_reason_codes_json);
  return {case_id:row.golden_test_id,expected_status:row.expected_result,actual_status:out.constraint_status,
    expected_reasons:expectedReasons,actual_reasons:out.reason_codes,all_reason_codes:out.all_reason_codes,
    status:out.constraint_status===row.expected_result && JSON.stringify([...expectedReasons].sort())===JSON.stringify([...out.reason_codes].sort())?'PASS':'FAIL',
    request_complete:out.request_complete,source_invalid_rule_ids:out.source_invalid_rule_ids,
    source_manual_rule_ids:out.source_manual_rule_ids,dimension:out.dimension};
});
const packageDocument={schema:'NATIVE_ROW_TABLE_RUNTIME_PACKAGE_CANDIDATE_V1',product_id:policy.native_product_id,
  source_series_id:policy.source_series_id,source_master:refs.master,policy:refs.policy,
  implementation_refs:implementations,
  fields:projection.master.fields,values:projection.master.values,engine_master:projection.master,
  dimension_rules:projection.dimensional,manual_rules:projection.manual,reset_rules:projection.reset,
  source_invalid_rules:[...projection.sourceRule],unresolved_labels:projection.labelsMissing,
  execution:'EXISTING_GENERIC_RULE_ENGINE_AND_DIMENSION_RESOLVER',
  formal_adoption:false,runtime_ui_adopted:false,automatic_orderability:false};
const qa={schema:'NATIVE_ROW_TABLE_CONSTRAINT_QA_V1',product_id:policy.native_product_id,source_master:refs.master,
  scope:'EXECUTED_ORIGINAL_CONSTRAINT_CASES; NOT_COMPLETE_SALES_UI_OR_QA_READY',
  status:cases.every(c=>c.status==='PASS')?'PASS':'FAIL',checks:cases.length,cases,
  reason_comparison:'EXACT_PRIMARY_SOURCE_CODES; COMPLETE_DIMENSION_DIAGNOSTICS_RETAINED',
  source_adoption_operations:0,human_decisions_created:0,product_qa_ready:false,browser_qa_executed:false};
const directory=path.resolve(args[1]);
if(fs.existsSync(directory))throw new Error('OUTPUT_EXISTS: preserve candidate outputs');
fs.mkdirSync(directory,{recursive:true});
for(const [name,value] of [['runtime-package.candidate.json',packageDocument],['native-constraint-qa.json',qa]])fs.writeFileSync(path.join(directory,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
if(qa.status!=='PASS')process.exitCode=2;
