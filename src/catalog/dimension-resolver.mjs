import { buildCatalogContext, selectorMatches } from "./selector.mjs";

const AUTO_TYPES=new Set(["AUTO_RECT","AUTO_RATIO","AUTO_PIECEWISE","AUTO_POLYGON"]);
const REVIEW_TYPES=new Set(["SOURCE_GRAPH_GATE","COMPOUND_GATE"]);
const finite=(value)=>Number.isFinite(Number(value));
const within=(value,min,max)=>finite(value)&&(min===null||min===undefined||Number(value)>=Number(min))&&(max===null||max===undefined||Number(value)<=Number(max));
const inBounds=(w,h,bounds={})=>within(w,bounds.minW,bounds.maxW)&&within(h,bounds.minH,bounds.maxH);
const onSegment=(x,y,[x1,y1],[x2,y2])=>{
  const cross=(x-x1)*(y2-y1)-(y-y1)*(x2-x1);
  if(Math.abs(cross)>1e-7)return false;
  return x>=Math.min(x1,x2)&&x<=Math.max(x1,x2)&&y>=Math.min(y1,y2)&&y<=Math.max(y1,y2);
};
const inPolygon=(x,y,points=[])=>{
  if(points.length<3)return false;
  let inside=false;
  for(let i=0,j=points.length-1;i<points.length;j=i++){
    const a=points[j],b=points[i];
    if(onSegment(x,y,a,b))return true;
    if(((b[1]>y)!==(a[1]>y))&&(x<(a[0]-b[0])*(y-b[1])/(a[1]-b[1])+b[0]))inside=!inside;
  }
  return inside;
};
const autoPass=(rule,w,h)=>{
  if(!inBounds(w,h,rule.bounds))return false;
  if(rule.type==="AUTO_RECT")return true;
  if(rule.type==="AUTO_RATIO")return finite(rule.ratio)&&Number(h)<=Number(rule.ratio)*Number(w)+Number(rule.intercept??0);
  if(rule.type==="AUTO_PIECEWISE")return (rule.regions??[]).some(([minW,maxW,minH,maxH])=>within(w,minW,maxW)&&within(h,minH,maxH));
  if(rule.type==="AUTO_POLYGON")return inPolygon(Number(w),Number(h),rule.points);
  return false;
};
const dimensionRules=(catalog,productId)=>catalog.ruleSets
  .filter((row)=>row.productId===productId&&row.type==="DIMENSION_RULES"&&row.status!=="INACTIVE")
  .flatMap((row)=>Array.isArray(row.payload)?row.payload:(row.payload?.rules??[]));

export function evaluateDimension(catalog,productId,selection={}){
  if(selection.size_mode!=="CUSTOM")return null;
  const width=selection.custom_width,height=selection.custom_height;
  if(!finite(width)||!finite(height))return{status:"PENDING",message:"特注W・Hを入力してください。",matchedRuleIds:[],ruleTypes:[]};
  const context=buildCatalogContext(catalog,productId);
  const rules=dimensionRules(catalog,productId).filter((rule)=>selectorMatches(rule.selector??{},selection,context));
  if(!rules.length)return{status:"BLOCK",message:"選択条件に対応する正式な特注寸法ルールがありません。",matchedRuleIds:[],ruleTypes:[]};
  const review=rules.filter((rule)=>REVIEW_TYPES.has(rule.type));
  const reviewInside=review.filter((rule)=>inBounds(width,height,rule.bounds));
  if(reviewInside.length)return{
    status:"REVIEW_REQUIRED",
    message:"原本グラフまたは複合条件の確認が必要です。発注前にLIXIL一次資料・見積システムで確認してください。",
    matchedRuleIds:reviewInside.map((rule)=>rule.id),
    ruleTypes:[...new Set(reviewInside.map((rule)=>rule.type))]
  };
  const automatic=rules.filter((rule)=>AUTO_TYPES.has(rule.type));
  const passed=automatic.filter((rule)=>autoPass(rule,width,height));
  if(passed.length)return{
    status:"PASS",message:"正式な自動判定範囲内です。",
    matchedRuleIds:passed.map((rule)=>rule.id),
    ruleTypes:[...new Set(passed.map((rule)=>rule.type))]
  };
  return{
    status:"BLOCK",
    message:"正式な特注寸法範囲外です。",
    matchedRuleIds:rules.map((rule)=>rule.id),
    ruleTypes:[...new Set(rules.map((rule)=>rule.type))]
  };
}

export const DIMENSION_RULE_TYPES={AUTO_TYPES:[...AUTO_TYPES],REVIEW_TYPES:[...REVIEW_TYPES]};
