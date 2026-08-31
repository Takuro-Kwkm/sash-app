export const arr=v=>Array.isArray(v)?v:[v];
export const empty=v=>v===undefined||v===null||v==='';
export function opMatch(actual,expected){
 if(expected&&typeof expected==='object'&&!Array.isArray(expected)){for(const[op,v]of Object.entries(expected)){if(op==='$eq'&&actual!==v)return false;if(op==='$ne'&&actual===v)return false;if(op==='$in'&&!arr(v).includes(actual))return false;if(op==='$notIn'&&arr(v).includes(actual))return false;if(op==='$lte'&&!(+actual<=+v))return false;if(op==='$lt'&&!(+actual<+v))return false;if(op==='$gte'&&!(+actual>=+v))return false;if(op==='$gt'&&!(+actual>+v))return false;if(op==='$exists'&&Boolean(v)===empty(actual))return false;if(op==='$contains'&&!arr(actual).includes(v))return false;if(op==='$notContains'&&arr(actual).includes(v))return false;}return true;}
 return Array.isArray(expected)?expected.includes(actual):actual===expected;
}
