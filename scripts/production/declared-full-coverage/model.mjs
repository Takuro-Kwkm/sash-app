import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,dirname} from 'node:path';
const [indexPath,output]=process.argv.slice(2), index=JSON.parse(readFileSync(indexPath)),root=dirname(resolve(indexPath)),entry=index.products[0],doc=JSON.parse(readFileSync(resolve(root,entry.path))),m=doc.product_module;
const json=x=>JSON.stringify(x),hash=x=>createHash('sha256').update(json(x)).digest('hex');
const keys=new Set(m.specificationDefinitions.map(f=>f.key));
const supported=new Set(['$eq','$ne','$in','$notIn','$lte','$lt','$gte','$gt','$exists','$contains','$notContains']);
function pred(k,e){if(e&&typeof e==='object'&&!Array.isArray(e))assert.ok(Object.keys(e).every(op=>supported.has(op)),'UNSUPPORTED_OPERATOR');assert.ok(keys.has(k),'UNBOUND_FIELD:'+k);return {k,e};}
function ast(s){
 if(!s||Object.keys(s).length===0)return true;
 const parts=[];for(const [k,v] of Object.entries(s)){
  if(['all','allOf','any','anyOf'].includes(k))parts.push({op:k.startsWith('all')?'and':'or',a:v.map(ast)});
  else if(k==='not')parts.push({op:'not',a:[ast(v)]});else parts.push(pred(k,v));
 }return simplify({op:'and',a:parts},{});
}
const empty=v=>v===undefined||v===null||v==='';
function match(v,e){
 if(empty(v)&&!(e&&typeof e==='object'&&'$exists'in e))return false;
 if(e&&typeof e==='object'&&!Array.isArray(e))return Object.entries(e).every(([op,x])=>{
  switch(op){case '$eq':return v===x;case '$ne':return v!==x;case '$in':return x.includes(v);case '$notIn':return!x.includes(v);case '$lte':return +v<=+x;case '$lt':return +v<+x;case '$gte':return+v>=+x;case '$gt':return+v>+x;case '$exists':return Boolean(x)!==empty(v);case '$contains':return(Array.isArray(v)?v:[v]).includes(x);case '$notContains':return!(Array.isArray(v)?v:[v]).includes(x);default:throw Error('UNSUPPORTED');}
 });return Array.isArray(e)?e.includes(v):v===e;
}
function simplify(n,s){
 if(typeof n==='boolean')return n;if(n.k)return Object.hasOwn(s,n.k)?match(s[n.k],n.e):n;
 const a=n.a.map(x=>simplify(x,s));if(n.op==='not')return typeof a[0]==='boolean'?!a[0]:{op:'not',a};
 if(n.op==='and'&&a.includes(false)||n.op==='or'&&a.includes(true))return n.op==='or';
 const b=a.filter(x=>typeof x!=='boolean');return b.length===0?n.op==='and':b.length===1?b[0]:{op:n.op,a:b};
}
function support(n,out=new Set()){if(n?.k)out.add(n.k);for(const a of n?.a??[])support(a,out);return [...out];}
const rawFactors=[];
for(const f of m.specificationDefinitions){
 const active=ast(f.selector),required=ast({any:m.requiredFieldRules.filter(r=>r.specificationKey===f.key&&r.required).map(r=>r.selector)}),values=m.allowedValues.filter(v=>v.specificationKey===f.key);
 const present={op:'not',a:[pred(f.key,{$exists:false})]};
 const membership=['ENUM','MULTI_ENUM'].includes(f.dataType)?{op:'or',a:values.map(v=>({op:'and',a:[pred(f.key,f.dataType==='MULTI_ENUM'?{$contains:v.value}:v.value),ast(v.selector)]}))}:true;
 // Per-value admissibility for MULTI_ENUM retains every subset, not just one choice.
 const valid=f.dataType==='MULTI_ENUM'?{op:'and',a:values.map(v=>({op:'or',a:[{op:'not',a:[pred(f.key,{$contains:v.value})]},ast(v.selector)]}))}:membership;
 rawFactors.push({id:'field:'+f.key,node:{op:'or',a:[{op:'and',a:[{op:'not',a:[present]},{op:'or',a:[{op:'not',a:[active]},{op:'not',a:[required]}]}]},{op:'and',a:[present,active,valid]}]}});
}
for(const rule of m.ruleSets.flatMap(s=>s.payload.rules))rawFactors.push({id:'rule:'+rule.id,node:{op:'not',a:[ast(rule.when)]}});
assert.ok(m.dependencies.every(d=>d.mode==='MANUAL_CHECK'));assert.ok(m.allowedValues.every(v=>!v.metadata||Object.keys(v.metadata).length===0));
assert.ok(!doc.composition&&!doc.numeric_constraints&&!doc.linear_transforms&&!doc.unsupported_rules);
const defs=new Map(m.specificationDefinitions.map(f=>[f.key,f]));
const values=key=>[...new Map(m.allowedValues.filter(v=>v.specificationKey===key).map(v=>[json(v.value),v.value])).values()];
function domains(k){const f=defs.get(k);if(f.uiHidden&&!dimensionKeys.includes(k))return[undefined];if(f.dataType==='TEXT')return[undefined,'QA_SYMBOLIC_TEXT'];if(f.dataType==='NUMBER')throw Error('UNFIXED_NUMBER:'+k);const vs=values(k);if(f.dataType==='MULTI_ENUM')return [undefined,...Array.from({length:2**vs.length},(_,mask)=>vs.filter((_,i)=>mask&(1<<i)))];return[undefined,...vs];}
const dimensionKeys=[doc.sales_handoff.dimensions.width,doc.sales_handoff.dimensions.height],cuts=Object.fromEntries(dimensionKeys.map(k=>[k,new Set([1])]))
function scan(n){if(n?.k&&dimensionKeys.includes(n.k)){const e=n.e;for(const v of (typeof e==='object'&&!Array.isArray(e)?Object.values(e).flat():[e].flat()))if(typeof v==='number'){cuts[n.k].add(v);cuts[n.k].add(v+1);}}for(const a of n?.a??[])scan(a);}
rawFactors.forEach(f=>scan(f.node));
// The exact integral domain is partitioned at every authoritative predicate breakpoint.
const upper={};for(const k of dimensionKeys)upper[k]=Math.max(...cuts[k])-1;
const partitions={};for(const k of dimensionKeys){const a=[...cuts[k]].filter(x=>x>=1).sort((a,b)=>a-b);partitions[k]=a.slice(0,-1).map((lo,i)=>({lo,hi:a[i+1]-1,probe:lo,weight:a[i+1]-lo})).filter(r=>r.weight>0);partitions[k].push({lo:a.at(-1),hi:null,probe:a.at(-1),weight:1,tail:true});}
assert.equal(doc.selection_views.length,1,'DECLARED_TUPLE_VIEW_REQUIRED');
for(const key of dimensionKeys)assert.ok(m.ruleSets.some(s=>s.payload.numbers?.some(n=>n.key===key&&n.integer&&n.minimum===1)),'POSITIVE_INTEGRAL_DIMENSION_REQUIRED');
const view=doc.selection_views[0],contexts=[],model=new Map();let numericCells=0;
const contextKeys=view.parents.filter(k=>k!==Object.keys(view.selector)[0]);
const coreContexts=[];
function enumerateCore(i,s){
 if(i===contextKeys.length){coreContexts.push(s);return;}
 const key=contextKeys[i],f=defs.get(key),active=simplify(ast(f.selector),s);
 assert.equal(typeof active,'boolean','CONTEXT_REQUIRES_UNBOUND_SELECTOR:'+key);
 for(const value of active?values(key):[undefined])enumerateCore(i+1,{...s,[key]:value});
}
enumerateCore(0,{});
for(const core of coreContexts){
 const c={...core,[doc.sales_handoff.quantity_field]:1};
 if(rawFactors.some(f=>simplify(f.node,c)===false))continue;
 for(const size_mode of values(Object.keys(view.selector)[0])){
  const s={...c,[Object.keys(view.selector)[0]]:size_mode};const standard=size_mode===view.selector.size_mode;
  const ranges=standard?view.choices.map(v=>({assign:v.assign,standard_size:v.value,weight:1})):partitions[dimensionKeys[0]].flatMap(w=>partitions[dimensionKeys[1]].map(h=>({assign:{[dimensionKeys[0]]:w.probe,[dimensionKeys[1]]:h.probe},weight:w.weight*h.weight,partition:{width:w,height:h}})));
  for(const range of ranges){const fixed={...s,...range.assign,standard_size:range.standard_size};const factors=rawFactors.map(f=>({...f,node:simplify(f.node,fixed)}));if(factors.some(f=>f.node===false))continue;const unknown=[...new Set(factors.flatMap(f=>support(f.node)))];
   // Field variables whose constraints simplify to tautologies still contribute a domain.
   for(const k of keys)if(!Object.hasOwn(fixed,k)&&!unknown.includes(k))unknown.push(k);
   const graph=new Map(unknown.map(k=>[k,new Set()]));for(const f of factors){const ks=support(f.node);for(const k of ks)for(const b of ks)if(k!==b)graph.get(k).add(b);}
   const seen=new Set(),components=[];for(const k of unknown){if(seen.has(k))continue;const stack=[k],ks=[];while(stack.length){const n=stack.pop();if(seen.has(n))continue;seen.add(n);ks.push(n);stack.push(...graph.get(n));}ks.sort((a,b)=>graph.get(b).size-graph.get(a).size);components.push({keys:ks,domains:Object.fromEntries(ks.map(k=>[k,domains(k)])),factors:factors.filter(f=>support(f.node).some(k=>ks.includes(k)))});}
   contexts.push({fixed,weight:range.weight,partition:range.partition,components:components.map(x=>hash(x))});for(const comp of components)model.set(hash(comp),comp);numericCells++;
  }
 }
}
const components=[];let visited=0;
for(const [id,comp] of model){
 const valid=[],s={};let assignments=0;
 function walk(i){
  const tested=comp.factors.map(f=>simplify(f.node,s));if(tested.some(n=>n===false))return;
  if(i===comp.keys.length){assert.ok(tested.every(n=>n===true));valid.push({...s});assignments++;return;}
  const k=comp.keys[i];for(const v of comp.domains[k]){s[k]=v;visited++;assert.ok(visited<3000000,'MODEL_SEARCH_LIMIT');walk(i+1);}delete s[k];
 }
 walk(0);components.push({id,...comp,cardinality:String(assignments),valid});
}
const byId=new Map(components.map(c=>[c.id,c]));let stateCount=0n,partitionCount=0,standardCells=0,customCells=0;
for(const c of contexts){let n=1n;for(const id of c.components)n*=BigInt(byId.get(id).cardinality);c.configuration_classes=String(n);c.configuration_points=String(n*BigInt(c.weight));stateCount+=n*BigInt(c.weight);if(c.partition&&(c.partition.width.tail||c.partition.height.tail))assert.equal(n,0n,'UNBOUNDED_DIMENSION_REQUIRES_SEPARATE_DOMAIN_PROOF');if(n){partitionCount++;if(c.partition)customCells++;else standardCells++;}}
const result={status:'PASS',scope:'EXACT_FACTORED_CANONICAL_REQUEST_DOMAIN; readiness requires independent runtime, transition, browser and repository gates',PROOF_MODEL_VERSION:'RUNTIME_UI_SYMBOLIC_FULL_COVERAGE_V1',exact_head_sha:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),runtime_index_sha256:createHash('sha256').update(readFileSync(indexPath)).digest('hex'),contexts:contexts.length,nonempty_contexts:partitionCount,standard_cells:standardCells,custom_partition_cells:customCells,abstract_components:components.length,component_valid_states:components.reduce((n,c)=>n+c.valid.length,0),visited,integer_configuration_count:String(stateCount),numeric_partitions:partitions,text_domain:'PARAMETRIC_STRING_OR_ABSENT',quantity_domain:'PARAMETRIC_POSITIVE_INTEGER',component_models:components,context_models:contexts};
mkdirSync(dirname(output),{recursive:true});writeFileSync(output,json(result));console.log(json({...result,component_models:undefined,context_models:undefined,numeric_partitions:Object.fromEntries(Object.entries(partitions).map(([k,v])=>[k,v.length]))}));
