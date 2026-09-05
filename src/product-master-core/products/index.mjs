import{createProductWorkflowRegistry}from'../product-workflow-registry.mjs';
import{APW430_PRODUCT_MASTER_WORKFLOW}from'./apw430/workflow.mjs';
import{THERMOSL_PRODUCT_MASTER_WORKFLOW}from'./thermosl/workflow.mjs';

const built=createProductWorkflowRegistry([APW430_PRODUCT_MASTER_WORKFLOW,THERMOSL_PRODUCT_MASTER_WORKFLOW]);
if(!built.pass)throw new Error(JSON.stringify(built.errors));

export const PRODUCT_MASTER_WORKFLOW_REGISTRY=built.registry;
export const REGISTERED_PRODUCT_MASTER_WORKFLOW_IDS=PRODUCT_MASTER_WORKFLOW_REGISTRY.productIds();
