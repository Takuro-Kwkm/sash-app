import { createHash } from 'node:crypto';

const key = (nodeId, glassId) => `${nodeId}\u0000${glassId}`;
const digest = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');

export function projectUchirimoGlassMatrix(canonical) {
  const nodes = canonical.product_nodes ?? [];
  const glasses = canonical.glass_specs ?? [];
  const profiles = canonical.glass_compatibility_profiles ?? [];
  if (!profiles.length || canonical.glass_node_matrix?.length) throw new Error('SLIM_PROFILE_EXCLUSIVE_REQUIRED');
  const nodeIds = nodes.map((node) => node.node_id);
  if (new Set(nodeIds).size !== nodeIds.length) throw new Error('SLIM_NODE_ID_COLLISION');
  const byProfile = new Map();
  for (const profile of profiles) {
    if (byProfile.has(profile.profile_id)) throw new Error('SLIM_PROFILE_ID_COLLISION');
    const statuses = new Map(profile.node_statuses.map((row) => [row.node_id, row.status]));
    if (statuses.size !== nodeIds.length || profile.node_statuses.length !== nodeIds.length ||
        nodeIds.some((id) => !statuses.has(id))) throw new Error('SLIM_PROFILE_NODE_COVERAGE');
    byProfile.set(profile.profile_id, statuses);
  }
  if (new Set(glasses.map((glass) => glass.glass_spec_id)).size !== glasses.length) throw new Error('SLIM_GLASS_ID_COLLISION');
  const rows = [];
  for (const nodeId of nodeIds) {
    for (const glass of glasses) {
      const status = byProfile.get(glass.compatibility_profile_id)?.get(nodeId);
      if (!status) throw new Error(`SLIM_GLASS_PROFILE_UNRESOLVED:${glass.glass_spec_id}:${nodeId}`);
      rows.push({ node_id: nodeId, glass_spec_id: glass.glass_spec_id,
        gsc: glass.glass_size_constraint_group, status, scope_class: glass.scope_class });
    }
  }
  return rows;
}

export function normalizeUchirimoGlassMatrix(canonical) {
  const nodes = canonical.product_nodes ?? [];
  const glasses = canonical.glass_specs ?? [];
  const legacy = canonical.glass_node_matrix ?? [];
  if (!nodes.length || !glasses.length || legacy.length !== nodes.length * glasses.length) {
    throw new Error('LEGACY_MATRIX_NOT_FULL_CARTESIAN');
  }
  const glassById = new Map(glasses.map((row) => [row.glass_spec_id, row]));
  if (glassById.size !== glasses.length) throw new Error('LEGACY_GLASS_ID_COLLISION');
  const matrix = new Map();
  for (const row of legacy) {
    const glass = glassById.get(row.glass_spec_id);
    if (!glass || row.gsc !== glass.glass_size_constraint_group || row.scope_class !== glass.scope_class) {
      throw new Error(`LEGACY_GLASS_FACT_CONFLICT:${row.glass_spec_id}`);
    }
    const id = key(row.node_id, row.glass_spec_id);
    if (matrix.has(id)) throw new Error(`LEGACY_MATRIX_DUPLICATE:${id}`);
    matrix.set(id, row);
  }
  const bySignature = new Map();
  const glassProfile = new Map();
  for (const glass of glasses) {
    const statuses = nodes.map((node) => {
      const status = matrix.get(key(node.node_id, glass.glass_spec_id))?.status;
      if (!status) throw new Error(`LEGACY_MATRIX_MISSING:${node.node_id}:${glass.glass_spec_id}`);
      return { node_id: node.node_id, status };
    });
    const signature = digest(statuses);
    if (!bySignature.has(signature)) bySignature.set(signature, statuses);
    glassProfile.set(glass.glass_spec_id, signature);
  }
  const signatures = [...bySignature.keys()].sort();
  const profileId = new Map(signatures.map((signature, index) => [signature, `UCH-CP-${String(index + 1).padStart(2, '0')}`]));
  const slim = {
    ...canonical,
    glass_specs: glasses.map((glass) => ({ ...glass, compatibility_profile_id: profileId.get(glassProfile.get(glass.glass_spec_id)) })),
    glass_compatibility_profiles: signatures.map((signature) => ({
      profile_id: profileId.get(signature), node_statuses: bySignature.get(signature),
    })),
  };
  delete slim.glass_node_matrix;
  return slim;
}

export function compareUchirimoGlassSemantics(legacy, slim) {
  const projection = projectUchirimoGlassMatrix(slim);
  const rowKey = (row) => key(row.node_id, row.glass_spec_id);
  const old = new Map(), current = new Map();
  for (const row of legacy.glass_node_matrix ?? []) {
    if (old.has(rowKey(row))) throw new Error('LEGACY_MATRIX_DUPLICATE');
    old.set(rowKey(row), row);
  }
  for (const row of projection) {
    if (current.has(rowKey(row))) throw new Error('SLIM_PROJECTION_DUPLICATE');
    current.set(rowKey(row), row);
  }
  const missing = [...old.keys()].filter((id) => !current.has(id));
  const extra = [...current.keys()].filter((id) => !old.has(id));
  const mismatches = [...old].filter(([id, row]) => current.has(id) &&
    (row.status !== current.get(id).status || row.gsc !== current.get(id).gsc || row.scope_class !== current.get(id).scope_class));
  const priorGlasses = new Map((legacy.glass_specs ?? []).map((glass) => [glass.glass_spec_id, glass]));
  const evidenceMismatches = (slim.glass_specs ?? []).filter(({ compatibility_profile_id, ...glass }) =>
    JSON.stringify(priorGlasses.get(glass.glass_spec_id)) !== JSON.stringify(glass));
  const evidenceIds = new Set((slim.evidence ?? []).map((row) => row.source_id));
  const evidenceOrphans = (slim.glass_specs ?? []).filter((glass) =>
    [glass.row_source_id, glass.source_id, ...String(glass.source_ids ?? '').split(/[;,]/)]
      .filter((id) => id && /^EV-UCH-/.test(id.trim())).some((id) => !evidenceIds.has(id.trim())));
  const preserved = structuredClone(slim);
  delete preserved.glass_compatibility_profiles;
  preserved.glass_specs = preserved.glass_specs?.map(({ compatibility_profile_id, ...glass }) => glass);
  const prior = structuredClone(legacy);
  delete preserved.glass_node_matrix;
  delete prior.glass_node_matrix;
  const unchangedFactMismatch = JSON.stringify(preserved) !== JSON.stringify(prior);
  return {
    legacy_count: old.size, projection_count: current.size, match_count: old.size - missing.length - mismatches.length,
    missing_count: missing.length, extra_count: extra.length, status_or_fact_mismatch_count: mismatches.length,
    evidence_mismatch_count: evidenceMismatches.length, evidence_orphan_count: evidenceOrphans.length,
    unchanged_fact_mismatch_count: Number(unchangedFactMismatch),
    status: missing.length || extra.length || mismatches.length || evidenceMismatches.length || evidenceOrphans.length || unchangedFactMismatch ? 'BLOCKED' : 'PASS',
    samples: { missing: missing.slice(0, 5), extra: extra.slice(0, 5), mismatch: mismatches.slice(0, 5).map(([id]) => id) },
  };
}
