import path from'node:path';
import{buildProductMasterReviewQueue,PRODUCT_MASTER_REVIEW_STATUSES}from'../src/product-master-core/review-queue.mjs';

const args=process.argv.slice(2);
const command=args.find((arg)=>!arg.startsWith('--'))??'summary';
const value=(name)=>args.find((arg)=>arg.startsWith(`--${name}=`))?.slice(name.length+3)??null;
const productId=value('product');
const status=value('status');
const kind=value('kind');
const actionableOnly=args.includes('--actionable-only');
const evidenceInboxDir=path.resolve(value('evidence-inbox')??'data/evidence-inbox');
const changeControlDir=path.resolve(value('change-control')??'data/master-change-control');
if(status&&!PRODUCT_MASTER_REVIEW_STATUSES.has(status))throw new Error(`Unsupported review status: ${status}`);
if(!['summary','list'].includes(command))throw new Error('Usage: node scripts/product-master-review-queue.mjs <summary|list> [--product=ID] [--status=STATUS] [--kind=KIND] [--actionable-only]');
const queue=buildProductMasterReviewQueue({evidenceInboxDir,changeControlDir,productId,status,kind,actionableOnly});
console.log(JSON.stringify(command==='summary'?{
  pass:true,reviewQueueSchemaVersion:queue.reviewQueueSchemaVersion,generatedAt:queue.generatedAt,filters:queue.filters,summary:queue.summary,authorityBoundary:queue.authorityBoundary
}:{pass:true,...queue},null,2));
