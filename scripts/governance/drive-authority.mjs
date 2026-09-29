import { readJson } from './governance-lib.mjs';

const policy = readJson('project-governance/drive-authority-policy.json');

export function validateConnectorDriveSnapshot(snapshot, { now = Date.now() } = {}) {
  const errors = [];
  if (snapshot?.read_only !== true) errors.push('SNAPSHOT_NOT_READ_ONLY');
  if (snapshot?.observation?.source !== policy.connector_source) errors.push('CONNECTOR_SOURCE_MISMATCH');
  const observedAt = Date.parse(snapshot?.observation?.metadata_revalidated_at ?? '');
  if (!Number.isFinite(observedAt)) errors.push('CONNECTOR_OBSERVATION_TIME_INVALID');
  const maxAgeMs = policy.connector_snapshot_max_age_hours * 60 * 60 * 1000;
  if (Number.isFinite(observedAt) && (now < observedAt || now - observedAt > maxAgeMs)) errors.push('CONNECTOR_OBSERVATION_STALE');
  const entries = Array.isArray(snapshot?.entries) ? snapshot.entries : [];
  const byId = new Map(entries.map(row => [row.drive_file_id, row]));
  if (byId.size !== entries.length) errors.push('DUPLICATE_DRIVE_FILE_ID');
  for (const id of policy.required_file_ids) {
    const row = byId.get(id);
    if (!row) { errors.push(`MISSING_REQUIRED_DRIVE_FILE_${id}`); continue; }
    for (const key of ['drive_file_id','name','version','modified_identity','current_revision_id','retrieved_at','source']) if (!row[key]) errors.push(`MISSING_${key}_${id}`);
    if (row.source !== policy.connector_source) errors.push(`SOURCE_MISMATCH_${id}`);
    if (row.content_read !== true) errors.push(`CONTENT_NOT_READ_${id}`);
  }
  return {
    status: errors.length ? 'BLOCKED' : 'PASS',
    mode: 'CONNECTOR_ATTESTED',
    checked_at: new Date(now).toISOString(),
    observed_at: Number.isFinite(observedAt) ? new Date(observedAt).toISOString() : null,
    max_age_hours: policy.connector_snapshot_max_age_hours,
    errors
  };
}

export async function verifyLiveDriveSnapshot(snapshot, accessToken) {
  if (!accessToken) return { status: 'BLOCKED', mode: 'LIVE_API', reason: 'BLOCKED_LIVE_DRIVE_READ_NOT_CONFIGURED', checked_at: null, entries: [] };
  const checked = [];
  for (const row of snapshot.entries) {
    const r = await fetch(`https://www.googleapis.com/drive/v3/files/${row.drive_file_id}?fields=id,name,modifiedTime,version`, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!r.ok) throw Error(`DRIVE_READ_FAILED_${r.status}`);
    const live = await r.json();
    if (live.name !== row.name || live.modifiedTime !== row.modified_identity) throw Error(`DRIVE_AUTHORITY_CHANGED_${row.drive_file_id}`);
    checked.push({ drive_file_id: row.drive_file_id, name: live.name, modified_identity: live.modifiedTime, live_revision: live.version ?? null });
  }
  return { status: 'PASS', mode: 'LIVE_API_VERIFIED', reason: null, checked_at: new Date().toISOString(), entries: checked };
}

export function resolveDriveAuthority(connector, live) {
  const reconstructionPass = live.status === 'PASS' || connector.status === 'PASS';
  return {
    current_state_reconstruction_gate: reconstructionPass ? 'PASS' : 'BLOCKED',
    authority_mode: live.status === 'PASS' ? live.mode : connector.status === 'PASS' ? connector.mode : 'BLOCKED',
    post_human_drive_live_gate: live.status === 'PASS' ? 'PASS' : 'BLOCKED'
  };
}
