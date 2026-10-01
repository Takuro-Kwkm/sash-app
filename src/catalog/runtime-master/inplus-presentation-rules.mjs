// Read-only projections of the current Formal tables. No product values or
// manufacturer constants are introduced by this presentation adapter.
export function resolveLowEPresentationLabel({master,selection,lowEColor,fallback=String(lowEColor)}) {
  const rows=master?.document?.tables?.glass_configurations?.records;
  if(!rows||!selection.glass_family||!selection.glass_type)return fallback;
  const matching=rows.filter(row=>row['状態']==='VERIFIED'
    &&row['大分類']===selection.glass_family&&row['詳細']===selection.glass_type
    &&row['Low-E色']===lowEColor
    &&(!selection.glass_detail||row.glass_config_id===selection.glass_detail)
    &&(!selection.window_type||row[selection.window_type]!=='不可'));
  if(!matching.length)return fallback;
  if(lowEColor==='グリーン'&&matching.every(row=>/高遮熱仕様/.test(row['商品名称'])&&!/高遮熱仕様ではない/.test(row['備考']??'')))return '高遮熱（グリーン）';
  // The standard clear Low-E construction has its coating on the room side.
  // Washi variants with another/unspecified coating position retain their name.
  if(lowEColor==='クリア'&&matching.every(row=>row['Low-E膜位置']==='室内側'&&/Low-E/.test(row['商品名称'])))return '断熱（クリア）';
  return fallback;
}

const present=value=>value!==null&&value!==undefined&&value!=='';
const pending=message=>({ok:true,pending:true,status:'ESTIMATE_CONFIRM_REQUIRED',message,ruleIds:[]});
function evaluateFormula(expression,{h,f,p}) {
  const expr=String(expression).replace(/\s+/g,'');
  let m=expr.match(/^(H|\(H\+([\d.]+)\))\/4\+([\d.]+)<=F<=3\*?(?:H|\(H\+[\d.]+\))\/4\+([\d.]+)ANDH-F<=([\d.]+)$/);
  if(m){const height=h+Number(m[2]??0);return f>=height/4+Number(m[3])&&f<=3*height/4+Number(m[4])&&h-f<=Number(m[5]);}
  m=expr.match(/^IFF>PTHENF>=P\+([\d.]+);IFF<PTHENP>=F\+([\d.]+);([\d.]+)<=H-F<=([\d.]+)$/);
  if(m)return (f<=p||f>=p+Number(m[1]))&&(f>=p||p>=f+Number(m[2]))&&h-f>=Number(m[3])&&h-f<=Number(m[4]);
  return null;
}

export function validateInplusMidrailF(master,state,value,input={}) {
  const f=Number(value),height=state.fields.order_height?.value,upper=state.fields.upper_frame_spec?.value;
  const size=state.fields.size_class?.value,family=state.fields.glass_family?.value;
  if(!Number.isFinite(f))return {ok:false,message:'中桟位置Fは数値で入力してください。',ruleIds:[]};
  if(!present(height)||!Number.isFinite(Number(height))||!present(upper)||!present(size)||!present(family))return pending('H・サイズ区分・上枠・ガラス仕様の確定後に中桟位置Fを再評価します。');
  const glassCategory=family==='単板'?'SG':['Low-E複層','一般複層'].includes(family)?'PG':null;
  if(!glassCategory)return pending('中桟位置Fのガラス区分を自動評価できないため積算／LIXIL確認へ引き継ぎます。');
  const upperLabel=upper==='standard'?'標準':upper==='adjust_upper_frame'?'アジャスト上枠':null;
  if(!upperLabel)return pending('上枠の中桟位置Fルールを積算／LIXILで確認してください。');
  const h=Number(height),rows=(master?.document?.tables?.pf_position_rules?.records??[]).filter(row=>row['状態']==='VERIFIED'&&row['上枠']===upperLabel&&row['サイズ区分']===size&&row['ガラス区分']===glassCategory&&h>=Number(row.H_min??-Infinity)&&(row.H_max==null||h<=Number(row.H_max)));
  const range=rows.filter(row=>row['指定項目']==='中桟位置F');
  if(range.length!==1)return pending('中桟位置Fの正式範囲を一意に評価できないため積算／LIXIL確認へ引き継ぎます。');
  const selected=[range[0]];
  if(input.crescent_position_mode==='custom'){
    if(!present(input.crescent_position_p_mm))return pending('クレセント位置P入力後にPとFの別指定条件を再評価します。');
    const coupled=rows.filter(row=>row['指定項目']==='中桟・P別指定');
    if(coupled.length!==1)return pending('PとFの別指定条件を積算／LIXILで確認してください。');
    selected.push(coupled[0]);
  }
  const results=selected.map(row=>evaluateFormula(row['判定式'],{h,f,p:Number(input.crescent_position_p_mm)}));
  if(results.includes(null))return pending('中桟位置Fの正式式を自動評価できないため積算／LIXIL確認へ引き継ぎます。');
  const ok=results.every(Boolean),ruleIds=selected.map(row=>row.rule_id);
  const result={ok,pending:false,ruleIds,message:`中桟位置Fは正式範囲${ok?'内':'外'}です。（${ruleIds.join(' / ')}）`};
  // Formal also defines P linkage when F alone is specified. Pass it as a
  // derived confirmation item; never replace an explicitly entered P.
  if(input.crescent_position_mode!=='custom'){
    const linked=rows.filter(row=>row['指定項目']==='F指定時のP自動連動');
    const m=linked.length===1?String(linked[0]['判定式']).replace(/\s+/g,'').match(/^P=F-([\d.]+)$/):null;
    if(m){result.linkedP=f-Number(m[1]);result.linkRuleId=linked[0].rule_id;}
    else {result.pending=true;result.message+=' F指定時のクレセントP連動は積算／LIXIL確認。';}
  }
  return result;
}
