// Workflow policy regression only; this is not product QA evidence.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const workflow=readFileSync(fileURLToPath(new URL('../../.github/workflows/uchirimo-v12-selector-controller.yml',import.meta.url)),'utf8');
function block(name){
  const start=workflow.indexOf('\n  '+name+':\n');
  assert.ok(start>=0,'job missing: '+name);
  const rest=workflow.slice(start+1),end=rest.search(/\n  [a-zA-Z0-9-]+:\n/);
  return end<0?rest:rest.slice(0,end);
}
function condition(name){
  const match=block(name).match(/^    if: \$\{\{ (.+) \}\}$/m);
  assert.ok(match,'job condition missing: '+name);
  return match[1];
}
// Model the GitHub implicit success() guard as well as the explicit expression.
// Evaluating the checked-in YAML catches the original missing-status-function bug.
function allowed(expression,ctx){
  const hasStatus=/\b(always|cancelled|failure|success)\(\)/.test(expression);
  if(!hasStatus&&!ctx.ancestorsSuccessful)return false;
  let js=expression.replace(/always\(\)/g,'true').replace(/cancelled\(\)/g,String(ctx.cancelled));
  js=js.replace(/needs\.governance-authority\.outputs\.authorized/g,JSON.stringify(ctx.authorized));
  js=js.replace(/needs\.advance\.outputs\.next_action/g,JSON.stringify(ctx.action));
  js=js.replace(/needs\.advance\.result/g,JSON.stringify(ctx.advance));
  assert.ok(!/needs\.|\$\{|[{};]/.test(js),'unsupported expression in test: '+js);
  return Function('"use strict"; return ('+js+');')();
}
const base={ancestorsSuccessful:true,cancelled:false,authorized:'true',advance:'success',action:'DISPATCH_NEXT_GENERATION'};
for(const [job,action] of [['dispatch-next','DISPATCH_NEXT_GENERATION'],['finalize','FINAL_AGGREGATE'],['blocked','BLOCKED']]){
  const expression=condition(job),ctx={...base,action};
  assert.equal(allowed(expression,ctx),true,job+': successful saved decision must run');
  assert.equal(allowed(expression,{...ctx,ancestorsSuccessful:false}),true,job+': consumed matrix timeout must not suppress saved decision');
  assert.equal(allowed(expression,{...ctx,cancelled:true}),false,job+': cancelled old run must not continue');
  assert.equal(allowed(expression,{...ctx,authorized:'false'}),false,job+': authorization remains required');
  for(const advance of ['failure','cancelled','skipped'])assert.equal(allowed(expression,{...ctx,advance}),false,job+': failed state persistence cannot publish continuation');
  assert.equal(allowed(expression,{...ctx,action:''}),false,job+': missing decision cannot continue');
}
const advance=block('advance');
assert.ok(advance.indexOf('      - name: Read next action')>advance.indexOf('      - name: Save controller state to secondary durable cache'),'decision must be published after durable save');
assert.ok(advance.includes('name: uchirimo-v12-controller-state-${{ env.HEAD_SHA }}-g${{ env.GEN }}'),'canonical state artifact identity must remain intact');
console.log('UCHIRIMO_V12_WORKFLOW_CONTINUATION=PASS expected-failure/save-failure/cancellation gates; NOT_PRODUCT_QA_EVIDENCE');
