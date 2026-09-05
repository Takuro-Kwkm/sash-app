function valueOf(state, field) {
  return state.fields[field]?.value ?? null;
}

export function evaluateCondition(condition, state) {
  if (Array.isArray(condition?.all)) return condition.all.every((x) => evaluateCondition(x, state));
  if (Array.isArray(condition?.any)) return condition.any.some((x) => evaluateCondition(x, state));
  const value = valueOf(state, condition.field);
  switch (condition.operator) {
    case 'EQ': return Object.is(value, condition.value);
    case 'NEQ': return !Object.is(value, condition.value);
    case 'IN': return (condition.values ?? []).some((x) => Object.is(x, value));
    case 'NOT_IN': return !(condition.values ?? []).some((x) => Object.is(x, value));
    case 'GT': return value !== null && value > condition.value;
    case 'GTE': return value !== null && value >= condition.value;
    case 'LT': return value !== null && value < condition.value;
    case 'LTE': return value !== null && value <= condition.value;
    case 'BETWEEN': return value !== null && value >= condition.min && value <= condition.max;
    case 'IS_APPLICABLE': return state.fields[condition.field]?.state !== 'NOT_APPLICABLE';
    case 'IS_NOT_APPLICABLE': return state.fields[condition.field]?.state === 'NOT_APPLICABLE';
    default: {
      const error = new Error(`Unsupported operator: ${condition.operator}`);
      error.code = 'RUNTIME_RULE_EVALUATION_ERROR';
      throw error;
    }
  }
}
