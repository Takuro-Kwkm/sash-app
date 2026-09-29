import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {json,hash} from './uchirimo-slim-factorized-selector.mjs';
const rootDir=process.env.UCHIRIMO_FACTORIZED_ROOTS??'artifacts/uchirimo-slim/factorized-qa';
const oldDir=process.env.UCHIRIMO_FACTORIZED_LEGACY??'artifacts/uchirimo-slim/factorized-legacy-plan';
const roots=JSON.parse(readFileSync(`${rootDir}/summary.json`)),old=JSON.parse(readFileSync(`${oldDir}/summary.json`));
const rootPlan=JSON.parse(readFileSync(`${rootDir}/input-plan.json`)),oldPlan=JSON.parse(readFileSync(`${oldDir}/input-plan.json`));
assert.equal(roots.status,'PASS');assert.equal(old.status,'PASS');assert.ok(roots.all_parent_coverage&&old.all_parent_coverage);
assert.equal(roots.parents_completed,42);assert.equal(old.parents_completed,3956);
for(const key of ['candidate_sha256','runtime_manifest_sha256','dependency_contract_sha256','exact_head'])assert.equal(roots[key],old[key],`COVERAGE_SOURCE_MISMATCH:${key}`);
const group=r=>`${r.node_id}|${r.glass_family}`;
const oldByGroup=new Map(),files=new Map(),restrictions=new Map();let pairChecks=0,restrictedComparisons=0;
for(const p of oldPlan.partitions){assert.equal(old.parents[p.shard].partition_key,p.partition_key);const key=group(p);if(!oldByGroup.has(key))oldByGroup.set(key,[]);oldByGroup.get(key).push(p);}
function restrictedCount(key,seed){
 const component=files.get(key)??JSON.parse(readFileSync(`${rootDir}/components/${key}.json`));files.set(key,component);
 const constraints=Object.fromEntries(Object.entries(seed).filter(([k])=>component.fields.includes(k)));
 if(!Object.keys(constraints).length)return BigInt(component.logical_configurations);
 const cacheKey=key+json(constraints);if(restrictions.has(cacheKey))return restrictions.get(cacheKey);
 let count=0n;
 for(const t of component.terminals){let n=BigInt(t.multiplicity);
  for(const[k,v]of Object.entries(constraints)){
   const axis=t.axes.find(a=>a.field_key===k);
   if(axis){const matches=axis.branches.filter(d=>d.kind==='VALUE'&&json(d.value)===json(v)).length;n=n/BigInt(axis.branches.length)*BigInt(matches);}
   else if(json(t.selection[k])!==json(v)){n=0n;break;}
  }count+=n;
 }restrictions.set(cacheKey,count);return count;
}
const groups=[];let total=0n;
for(const p of rootPlan.partitions){
 const root=roots.parents[p.shard],children=oldByGroup.get(group(p));assert.ok(children?.length,`MISSING_LEGACY_GROUP:${group(p)}`);
 const seeds=children.map(c=>JSON.parse(c.partition_seed_json));
 // Syntactic disjointness is stronger than comparing aggregate counts alone.
 for(let i=0;i<seeds.length;i++)for(let j=0;j<i;j++){pairChecks++;assert.ok(Object.keys(seeds[i]).some(k=>Object.hasOwn(seeds[j],k)&&json(seeds[i][k])!==json(seeds[j][k])),`PARENT_SEEDS_NOT_DISJOINT:${children[i].shard}:${children[j].shard}`);}
 let sum=0n;
 for(let i=0;i<children.length;i++){
  const count=root.component_keys.reduce((n,key)=>n*restrictedCount(key,seeds[i]),1n),reference=BigInt(old.parents[children[i].shard].logical_configurations);
  assert.equal(count,reference,`RESTRICTED_PARENT_LANGUAGE_COUNT_MISMATCH:${children[i].shard}`);sum+=count;restrictedComparisons++;
 }
 assert.equal(sum,BigInt(root.logical_configurations),`ROOT_PARTITION_COVERAGE_MISMATCH:${group(p)}`);total+=sum;
 groups.push({group:group(p),legacy_parents:children.length,logical_configurations:String(sum),status:'PASS'});
}
assert.equal(oldByGroup.size,groups.length);
const report={schema:'UCHIRIMO_FACTORIZED_PARTITION_EQUIVALENCE_V1',status:'PASS',scope:'EXACT_RESTRICTION_COUNTS_PLUS_DISJOINT_PARTITION_COVER',candidate_sha256:roots.candidate_sha256,exact_head:roots.exact_head,root_summary_sha256:hash(roots),legacy_summary_sha256:hash(old),root_groups:groups.length,legacy_parents:restrictedComparisons,disjoint_seed_pair_checks:pairChecks,logical_configurations:String(total),missing:0,extra:0,overlap:0,groups};
const out=process.env.UCHIRIMO_FACTORIZED_COVERAGE_OUT??'artifacts/uchirimo-slim/factorized-coverage.json';mkdirSync(out.slice(0,out.lastIndexOf('/')),{recursive:true});writeFileSync(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...report,groups:undefined}));
