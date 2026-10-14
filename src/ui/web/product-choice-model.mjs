// Grouping is declared by product data; the underlying Runtime identity stays per specification.
export function productChoices(products) {
  const ids = new Set(products.map(product => product.id));
  if (ids.size !== products.length) throw new Error('PRODUCT_CHOICE_DUPLICATE_ID');
  const groups = new Map(), choices = [];
  for (const product of products) {
    const declaration = product.productSelectionGroup;
    if (!declaration) { choices.push(product); continue; }
    const {id, displayName, specificationLabel, specificationName} = declaration;
    if (![id, displayName, specificationLabel, specificationName].every(value => typeof value === 'string' && value.trim()) || ids.has(id)) {
      throw new Error('PRODUCT_CHOICE_GROUP_INVALID');
    }
    let group = groups.get(id);
    if (!group) {
      group = {id, displayName, specificationLabel, manufacturer: product.manufacturer, grouped: true, members: []};
      groups.set(id, group); choices.push(group);
    }
    if (group.manufacturer !== product.manufacturer || group.displayName !== displayName || group.specificationLabel !== specificationLabel || group.members.some(member => member.productSelectionGroup.specificationName === specificationName)) {
      throw new Error('PRODUCT_CHOICE_GROUP_CONFLICT');
    }
    group.members.push(product);
    group.selectable = group.members.some(member => member.selectable !== false);
  }
  return choices;
}

export function choiceForMember(choices, memberId) {
  return choices.find(choice => choice.id === memberId || choice.members?.some(member => member.id === memberId));
}

export function memberForChoice(choice, memberId) {
  return choice?.grouped ? choice.members.find(member => member.id === memberId && member.selectable !== false) : null;
}
