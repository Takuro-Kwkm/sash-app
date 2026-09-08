import { buildCatalogContext, selectorMatchesWithInternalDefaults, selectorValue } from "./selector.mjs";
import { dimensionRules } from "./size-availability.mjs";

const AUTO_TYPES=new Set(["AUTO_RECT","AUTO_RATIO","AUTO_PIECEWISE","AUTO_POLYGON"]);
const REVIEW_TYPES=new Set(["SOURCE_GRAPH_GATE","COMPOUND_GATE"]);
const finite=(value)=>Number.isFinite(Number(value));
const within=(value,min,max)=>finite(value)&&(min===null||min===undefined||Number(value)>=Number(min))&&(max===null||max===undefined||Number(value)<=Number(max));
const inBounds=(w,h,bounds={})=>within(w,bounds.minW,bounds.maxW)&&within(h,bounds.minH,bounds.maxH);
const onSegment=(x,y,[x1,y1],[x2,y2])=>{const cross=(x-x1)*(y2-y1)-(y-y1)*(x2-x1);if(Math.abs(cross)>1e-7)return false;return x>=Math.min(x1,x2)&&x<=Math.max(x1,x2)&&y>=Math.min(y1,y2)&&y<=Math.max(y1,y2);};
const inPolygon=(x,y,points=[])=>{if(points.length<3)return false;let inside=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[j],b=points[i];if(onSegment(x,y,a,b))return true;if(((b[1]>y)!==(a[1]>y))&&(x<(a[0]-b[0])*(y-b[1])/(a[1]-b[1])+b[0]))inside=!inside;}return inside;};
const autoPass=(rule,w,h)=>{if(!inBounds(w,h,rule.bounds))return false;if(rule.type==="AUTO_RECT")return true;if(rule.type==="AUTO_RATIO")return finite(rule.ratio)&&Number(h)<=Number(rule.ratio)*Number(w)+Number(rule.intercept??0);if(rule.type==="AUTO_PIECEWISE")return (rule.regions??[]).some(([minW,maxW,minH,maxH])=>within(w,minW,maxW)&&within(h,minH,maxH));if(rule.type==="AUTO_POLYGON")return inPolygon(Number(w),Number(h),rule.points);return false;};
const constructionOf=(rule)=>{const value=rule?.selector?.construction;if(typeof value==='string')return value;if(value&&Array.isArray(value.$in)&&value.$in.length===1)return value.$in[0];return null;};
function outcomeForRules(rules,width,height){
  const review=rules.filter((rule)=>REVIEW_TYPES.has(rule.type));
  const reviewInside=review.filter((rule)=>inBounds(width,height,rule.bounds));
  if(reviewInside.length)return{status:'REVIEW_REQUIRED',rules:reviewInside};
  const automatic=rules.filter((rule)=>AUTO_TYPES.has(rule.type));
  const passed=automatic.filter((rule)=>autoPass(rule,width,height));
  if(passed.length)return{status:'PASS',rules:passed};
  return{status:'BLOCK',rules};
}
export function evaluateDimension(catalog,productId,selection={}){
  if(selection.size_mode!=="CUSTOM")return null;
  const width=selection.custom_width,height=selection.custom_height;
  if(!finite(width)||!finite(height))return{status:"PENDING",message:"特注W・Hを入力してください。",matchedRuleIds:[],ruleTypes:[]};
  const context=buildCatalogContext(catalog,productId);
  const rules=dimensionRules(catalog,productId).filter((rule)=>selectorMatchesWithInternalDefaults(rule.selector??{},selection,context));
  if(!rules.length)return{status:"BLOCK",message:"選択条件に対応する正式な特注寸法ルールがありません。",matchedRuleIds:[],ruleTypes:[]};

  const explicitConstruction=selectorValue('construction',selection,context);
  if(explicitConstruction===undefined||explicitConstruction===null||explicitConstruction===''){
    const groups=new Map();
    for(const rule of rules){const key=constructionOf(rule)??'__COMMON__';if(!groups.has(key))groups.set(key,[]);groups.get(key).push(rule);}
    if(groups.size>1){
      const outcomes=[...groups.entries()].map(([construction,group])=>({construction,...outcomeForRules(group,width,height)}));
      const statuses=new Set(outcomes.map((row)=>row.status));
      if(statuses.size>1||statuses.has('REVIEW_REQUIRED'))return{
        status:'REVIEW_REQUIRED',
        message:'工法区分は営業入力から省略しています。工法区分により特注製作可否が異なるため、発注前にメーカー見積システムで最終確認してください。',
        matchedRuleIds:outcomes.flatMap((row)=>row.rules.map((rule)=>rule.id)),
        ruleTypes:[...new Set(outcomes.flatMap((row)=>row.rules.map((rule)=>rule.type)))],
        internalConstructionOutcomes:outcomes.map((row)=>({construction:row.construction,status:row.status,ruleIds:row.rules.map((rule)=>rule.id)}))
      };
      if(statuses.has('PASS'))return{status:'PASS',message:'全ての内部工法区分で正式な自動判定範囲内です。',matchedRuleIds:outcomes.flatMap((row)=>row.rules.map((rule)=>rule.id)),ruleTypes:[...new Set(outcomes.flatMap((row)=>row.rules.map((rule)=>rule.type)))]};
      return{status:'BLOCK',message:'正式な特注寸法範囲外です。',matchedRuleIds:rules.map((rule)=>rule.id),ruleTypes:[...new Set(rules.map((rule)=>rule.type))]};
    }
  }

  const outcome=outcomeForRules(rules,width,height);
  if(outcome.status==='REVIEW_REQUIRED')return{status:'REVIEW_REQUIRED',message:'原本グラフまたは複合条件の確認が必要です。発注前に一次資料・メーカー見積システムで確認してください。',matchedRuleIds:outcome.rules.map((rule)=>rule.id),ruleTypes:[...new Set(outcome.rules.map((rule)=>rule.type))]};
  if(outcome.status==='PASS')return{status:'PASS',message:'正式な自動判定範囲内です。',matchedRuleIds:outcome.rules.map((rule)=>rule.id),ruleTypes:[...new Set(outcome.rules.map((rule)=>rule.type))]};
  return{status:'BLOCK',message:'正式な特注寸法範囲外です。',matchedRuleIds:rules.map((rule)=>rule.id),ruleTypes:[...new Set(rules.map((rule)=>rule.type))]};
}

export const DIMENSION_RULE_TYPES={AUTO_TYPES:[...AUTO_TYPES],REVIEW_TYPES:[...REVIEW_TYPES]};
