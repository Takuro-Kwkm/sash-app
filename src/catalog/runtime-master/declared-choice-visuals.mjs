import {selectorMatches} from '../selector.mjs';
// Optional presentation data never grants an allowed value or changes selection.
export function safeChoiceVisual(visual) {
  if (!visual || !/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(visual.src ?? '') ||
      typeof visual.alt !== 'string' || !visual.alt.trim() || typeof visual.source_label !== 'string' ||
      !visual.source_label.trim() || typeof visual.source_ref !== 'string' || !visual.source_ref.trim()) return null;
  return {src:visual.src, alt:visual.alt, source_label:visual.source_label, source_ref:visual.source_ref,
    note:typeof visual.note === 'string' ? visual.note : '',
    ...(typeof visual.caption==='string'?{caption:visual.caption}:{}),
    ...(typeof visual.download_name==='string'?{download_name:visual.download_name}:{})};
}

export function safeVisualFilters(declared) {
  if(!Array.isArray(declared))return [];
  const seen=new Set();
  return declared.filter(row=>row && /^[a-z][a-z0-9_]*$/.test(row.key) && !seen.has(row.key) &&
    typeof row.label==='string' && row.label.trim() && Array.isArray(row.options) &&
    row.options.length && row.options.every(option=>option && typeof option.value==='string' &&
      option.value.trim() && typeof option.label==='string' && option.label.trim()) &&
    new Set(row.options.map(option=>option.value)).size===row.options.length && seen.add(row.key))
    .map(row=>({key:row.key,label:row.label,options:row.options.map(({value,label})=>({value,label}))}));
}

export function resolveVisualRecommendations(field, selection, declaration){
  if(!declaration)return null;
  const rows=Array.isArray(declaration.rows)?declaration.rows.filter(row=>row?.when && typeof row.source_ref==='string' && row.source_ref.trim() && selectorMatches(row.when,selection)):[];
  const row=rows.length===1?rows[0]:null,allowed=new Set(field.values.map(choice=>String(choice.value)));
  const clean=values=>Array.isArray(values)?[...new Set(values.filter(value=>typeof value==='string'&&allowed.has(value)))]:[];
  const standardValues=clean(row?.standard_values),recommendedValues=clean(row?.recommended_values).filter(value=>!standardValues.includes(value));
  const enabled=standardValues.length+recommendedValues.length>0;
  const contextNotice=(Array.isArray(declaration.context_notices)?declaration.context_notices:[]).find(item=>item?.when && selectorMatches(item.when,selection))?.notice;
  return {enabled,standardValues,recommendedValues,label:typeof row?.label==='string'?row.label:'標準・推奨',
    notice:enabled?(typeof row?.notice==='string'?row.notice:''):(typeof contextNotice==='string'?contextNotice:typeof declaration.fallback_notice==='string'?declaration.fallback_notice:'推奨候補を確認できないため、全候補を表示しています。'),sourceRef:row?.source_ref??''};
}

export function attachDeclaredChoiceVisuals(result, presentation) {
  if (!presentation) return result;
  result.fields = result.fields.map(field => {
    const visualFilters=safeVisualFilters(presentation.choice_visual_filters?.[field.key]);
    const visualRecommendation=resolveVisualRecommendations(field,result.selection??{},presentation.choice_visual_recommendations?.[field.key]);
    return {...field,...(visualRecommendation?{visualRecommendation}:{}),...(visualFilters.length?{visualFilters}:{}),
    ...(presentation.choice_visual_layouts?.[field.key]?{visualLayout:{
      minCardWidth:Math.max(120,Math.min(280,Number(presentation.choice_visual_layouts[field.key].min_card_width)||120)),
      thumbnailHeight:Math.max(128,Math.min(240,Number(presentation.choice_visual_layouts[field.key].thumbnail_height)||128)),
    }}:{}),
    ...(typeof presentation.field_help?.[field.key] === 'string' ? {helpText:presentation.field_help[field.key]} : {}),
    values:field.values.map(choice => {
      const declared = presentation.choice_visual_variants?.[field.key]?.[String(choice.value)];
      const matches = Array.isArray(declared) ? declared.filter(row=>row && row.when && selectorMatches(row.when,result.selection??{})) : [];
      // A scoped declaration has no generic fallback: missing/overlapping matches stay visibly unillustrated.
      const visual = Array.isArray(declared) ? (matches.length===1?safeChoiceVisual(matches[0].visual):null)
        : safeChoiceVisual(presentation.choice_visuals?.[field.key]?.[String(choice.value)]);
      const annotation = presentation.choice_annotations?.[field.key]?.[String(choice.value)];
      const sourced=annotation && typeof annotation.source_ref==='string' && annotation.source_ref.trim();
      const declaredFacets=presentation.choice_visual_facets?.[field.key]?.[String(choice.value)];
      const visualFacets={};
      if(typeof declaredFacets?.source_ref==='string' && declaredFacets.source_ref.trim())
        for(const filter of visualFilters)if(filter.options.some(option=>option.value===declaredFacets[filter.key]))visualFacets[filter.key]=declaredFacets[filter.key];
      const recommendationLabel=visualRecommendation?.standardValues.includes(String(choice.value))?'標準':visualRecommendation?.recommendedValues.includes(String(choice.value))?'推奨':'';
      const next={...choice,...(recommendationLabel?{visualRecommendationLabel:recommendationLabel}:{}),...(Object.keys(visualFacets).length?{visualFacets,visualFacetSourceRef:declaredFacets.source_ref}:{})};
      if(Array.isArray(declared))delete next.visual;
      return {...next,...(visual?{visual}:{}),...(sourced?{
        ...(typeof annotation.label==='string'&&annotation.label.trim()?{displayLabel:annotation.label}:{}),
        ...(typeof annotation.badge==='string'?{presentationBadge:annotation.badge}:{}),
        ...(typeof annotation.description==='string'?{presentationDescription:annotation.description}:{}),
        presentationSourceRef:annotation.source_ref,
      }: {})};
    })};});
  return result;
}
