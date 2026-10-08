import { guidedSelectionContract } from './guided-selection-contract.mjs';

const hasValue = value => value !== undefined && value !== null && value !== '' && (!Array.isArray(value) || value.length > 0);
export function admittedGuidedProducts(inventory, contract = guidedSelectionContract) {
  return inventory.filter(product => {
    const rule = contract.products[product.id];
    return rule && product.status === 'READY' && product.selectable === true
      && product.packageVersion === rule.runtime.packageVersion && product.sourceHash === rule.runtime.sourceHash;
  });
}

export async function guidedOpeningChoices({ inventory, resolve, purpose, contract = guidedSelectionContract }) {
  const choices = new Map();
  for (const product of admittedGuidedProducts(inventory, contract)) {
    const rule = contract.products[product.id];
    if (!rule.purposes.includes(purpose)) continue;
    const result = await resolve(product.id, {});
    if (!verifiedResult(product, result)) continue;
    for (const value of result.fields.find(f => f.key === rule.fields.opening)?.values ?? []) {
      if (!value.disabled) choices.set(value.value, { value: value.value, label: value.displayLabel });
    }
  }
  return [...choices.values()];
}

function verifiedResult(product, result) {
  return result.productId === product.id && result.source === 'RUNTIME_MASTER' && result.status === 'READY'
    && result.runtimeMaster?.sourceHash === product.sourceHash
    && result.runtimeMaster?.packageVersion === product.packageVersion
    && result.runtimeMaster?.sourcePackageIntegrity?.match === true;
}

export async function recommendGuidedProducts({ inventory, resolve, answers, contract = guidedSelectionContract }) {
  const { purpose, opening, width, height } = answers;
  const dimensionsKnown = hasValue(width) || hasValue(height);
  if (dimensionsKnown && (![width, height].every(value => hasValue(value) && Number.isFinite(Number(value)) && Number(value) > 0))) {
    return { candidates: [], reason: '幅と高さを両方、正の数値で入力してください。' };
  }
  if (!opening) return { candidates: [], reason: '開閉形式を選択してください。' };
  const candidates = [];
  for (const product of admittedGuidedProducts(inventory, contract)) {
    const rule = contract.products[product.id];
    if (!rule.purposes.includes(purpose)) continue;
    const fields = rule.fields;
    const patch = { [fields.opening]: opening };
    if (dimensionsKnown) patch[fields.sizeMode] = fields.standardMode;
    let result = await resolve(product.id, patch);
    if (!verifiedResult(product, result) || result.selection[fields.opening] !== opening) continue;
    let dimension = { status: 'UNKNOWN', label: '寸法未確認' };
    if (dimensionsKnown) {
      const size = result.fields.find(f => f.key === fields.size)?.values.find(value => !value.disabled
        && Number.isFinite(value.sizeMetadata?.actualW) && Number.isFinite(value.sizeMetadata?.actualH)
        && value.sizeMetadata.actualW === Number(width) && value.sizeMetadata.actualH === Number(height));
      if (!size) continue;
      patch[fields.size] = size.value;
      result = await resolve(product.id, patch);
      if (!verifiedResult(product, result) || result.selection[fields.size] !== size.value
        || result.validation?.errors?.length || ['BLOCK', 'BLOCKED', 'INVALID'].includes(result.dimensionResult?.status)) continue;
      dimension = { status: 'EXACT_STANDARD_MATCH', label: `規格実寸 W ${size.sizeMetadata.actualW} × H ${size.sizeMetadata.actualH} mm 一致` };
    }
    candidates.push({ productId: product.id, manufacturer: product.manufacturer, name: product.displayName ?? product.series,
      patch, dimension, comparisons: rule.comparisons, reason: rule.recommendation.reason,
      evidence: rule.evidence, recommendation: rule.recommendation,
      identity: rule.runtime, priority: answers.priority,
      caution: '希望の価格・断熱性能への適合は未確認です。納まりの確認も必要です。' });
  }
  return { candidates: candidates.slice(0, Math.min(3, contract.maxCandidates)),
    reason: candidates.length ? null : 'この条件で確認できる候補はありません。寸法・用途を見直すか通常入力で確認してください。' };
}

export function nextGuidedQuestion(result, acknowledged = []) {
  const errors = new Set((result?.validation?.errors ?? []).map(error => error.field));
  const missing = new Set(result?.validation?.missingRequiredFields ?? []);
  return (result?.fields ?? []).find(field => field.visible !== false && !field.disabled && !field.readOnly
    && !field.internal && !field.technical
    && (errors.has(field.key) || missing.has(field.key)
      || (!hasValue(result.selection?.[field.key]) && !acknowledged.includes(field.key)))) ?? null;
}

// Only the existing Runtime writes the authoritative Selection State.
export async function applyGuidedCandidate({ candidate, currentSelection, resolve }) {
  const result = await resolve(candidate.productId, { ...currentSelection, ...candidate.patch });
  if (result.runtimeMaster?.packageVersion !== candidate.identity.packageVersion
    || result.runtimeMaster?.sourceHash !== candidate.identity.sourceHash
    || result.runtimeMaster?.sourcePackageIntegrity?.match !== true
    || result.productId !== candidate.productId || result.source !== 'RUNTIME_MASTER' || result.status !== 'READY') {
    throw new Error('商品データが更新されています。候補を検索し直してください。');
  }
  if (Object.entries(candidate.patch).some(([key, value]) => result.selection[key] !== value)) {
    throw new Error('現在の仕様では候補を反映できません。条件を確認してください。');
  }
  return result;
}
