import{writeProductMasterReviewSurface}from'../src/product-master-core/review-surface.mjs';

const args=process.argv.slice(2);
const value=(name)=>args.find((arg)=>arg.startsWith(`--${name}=`))?.slice(name.length+3)??null;
const result=writeProductMasterReviewSurface({
  evidenceInboxDir:value('evidence-inbox')??'data/evidence-inbox',
  changeControlDir:value('change-control')??'data/master-change-control',
  outputDir:value('output')??'artifacts/product-master-review',
  productId:value('product'),
  actionableOnly:args.includes('--actionable-only')
});
console.log(JSON.stringify({pass:true,htmlPath:result.htmlPath,jsonPath:result.jsonPath,total:result.queue.summary.total,actionable:result.queue.summary.actionable,mutationPerformed:result.mutationPerformed},null,2));
