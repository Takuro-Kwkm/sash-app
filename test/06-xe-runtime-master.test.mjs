import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { loadRegisteredRuntime, getRuntimeMasterEntry } from '../src/catalog/runtime-master/runtime-master-registry.mjs';
import { evaluateConfiguration, applySelection, migrateLegacyConfiguration, resolveState, serializeConfiguration } from '../src/catalog/runtime-master/generic-rule-engine.mjs';
import { validateJsonSchema } from '../src/catalog/runtime-master/runtime-master-loader.mjs';

const runtimePromise = loadRegisteredRuntime('LIXIL','XE');
const flat = (state) => Object.fromEntries(Object.entries(state.fields).map(([k,v])=>[k,v.value]));
const digestMaster = (master) => createHash('sha256').update(JSON.stringify(master)).digest('hex');

function runFixture(master, fixture) {
  const result = evaluateConfiguration(master, fixture.input);
  assert.equal(result.status, fixture.expected_status, `${fixture.test_id}: status`);
  if (fixture.expected_rule_id) assert.ok(result.matched_invalid_rules.includes(fixture.expected_rule_id), `${fixture.test_id}: expected ${fixture.expected_rule_id}`);
  for (const component of fixture.expected_components ?? []) assert.ok(result.derived_components.has(component), `${fixture.test_id}: expected component ${component}`);
  return result;
}

test('XE registry resolves exact Phase 7 package and SHA-256', async () => {
  const rt = await runtimePromise;
  assert.ok(rt);
  assert.equal(rt.entry.masterVersion,'XE_V1_0_RC');
  assert.equal(rt.sourcePackageIntegrity.match,true);
  assert.equal(rt.sourcePackageIntegrity.actual,'e2e5974e730508f4588afde5811df73032443c0cfc9b2f039ec44f61838653aa');
  assert.equal(getRuntimeMasterEntry('LIXIL','XE')?.schemaVersion,'1.0');
});

test('Phase 7 positive fixtures pass unchanged 8/8', async () => {
  const {master}=await runtimePromise; let passed=0;
  for (const fixture of master.fixtures.positive) { runFixture(master,fixture); passed++; }
  assert.equal(passed,8);
});

test('Phase 7 negative fixtures pass unchanged 9/9', async () => {
  const {master}=await runtimePromise; let passed=0;
  for (const fixture of master.fixtures.negative) { runFixture(master,fixture); passed++; }
  assert.equal(passed,9);
});

test('Phase 7 boundary fixtures pass unchanged 18/18', async () => {
  const {master}=await runtimePromise; let passed=0;
  for (const fixture of master.fixtures.boundary) { runFixture(master,fixture); passed++; }
  assert.equal(passed,18);
});

test('Design reachability is 47/47', async () => {
  const {master}=await runtimePromise; let passed=0;
  for (const row of master.fixtures.reachability.design_reachability) {
    const result=evaluateConfiguration(master,row.minimal_valid_configuration);
    assert.equal(result.status,'VALID',row.design_id); passed++;
  }
  assert.equal(passed,47);
});

test('High-size reachability is 22/22 and unsupported 25/25 rejected', async () => {
  const {master}=await runtimePromise; let supported=0,rejected=0;
  for (const row of master.fixtures.reachability.high_size_reachability) {
    const result=evaluateConfiguration(master,row.configuration);
    assert.equal(result.status,row.expected_status,row.design_id);
    if (row.high_size_available) supported++; else rejected++;
  }
  assert.equal(supported,22); assert.equal(rejected,25);
});

test('ST-XE-001 FamiLock no-action to FACE clears FamiLock stale state', async () => {
  const {master}=await runtimePromise;
  const seed=master.fixtures.positive.find(x=>x.test_id==='TC-XE-003').input;
  let state=evaluateConfiguration(master,seed);
  assert.equal(state.fields.human_sensor_type.value,'FRAME_MOUNTED');
  state=applySelection(master,state,'electric_lock_system','FACE_RECOGNITION');
  assert.equal(state.fields.power_supply.value,'AC_ADAPTER');
  assert.equal(state.fields.human_sensor_type.value,null);
  assert.notEqual(state.fields.human_sensor_type.state,'SELECTED');
  assert.equal(state.fields.key_set_type.value,null);
  assert.equal(state.fields.remote_count.value,null);
  assert.equal(state.fields.outdoor_reader_type.value,null);
});

test('ST-XE-002 FACE to FamiLock clears face-only stale state', async () => {
  const {master}=await runtimePromise;
  const seed=master.fixtures.positive.find(x=>x.test_id==='TC-XE-005').input;
  let state=evaluateConfiguration(master,seed);
  assert.equal(state.fields.cylinder_presence.value,true);
  state=applySelection(master,state,'electric_lock_system','FAMILOCK');
  assert.equal(state.fields.contactless_indoor_button.value,null);
  assert.equal(state.fields.cylinder_presence.value,null);
  assert.equal(state.fields.key_set_type.value,null);
});

test('ST-XE-003 no-action to one-action removes sensor components and keeps auto components', async () => {
  const {master}=await runtimePromise;
  const seed=master.fixtures.positive.find(x=>x.test_id==='TC-XE-003').input;
  let state=evaluateConfiguration(master,seed);
  assert.ok(state.derived_components.has('HUMAN_SENSOR_FRAME_MOUNTED'));
  state=applySelection(master,state,'door_operation_mode','AUTO_ONE_ACTION');
  assert.equal(state.fields.human_sensor_type.value,null);
  assert.equal(state.fields.human_sensor_type.state,'NOT_APPLICABLE');
  assert.ok(!state.derived_components.has('HUMAN_SENSOR_FRAME_MOUNTED'));
  assert.ok(!state.derived_components.has('HUMAN_SENSOR_SPACER'));
  assert.ok(state.derived_components.has('ELECTRIC_DOOR_CLOSER'));
  assert.ok(state.derived_components.has('DOOR_STOPPER'));
});

test('ST-XE-004 Seamless to Standard clears Seamless-specific descendants', async () => {
  const {master}=await runtimePromise;
  const seed=master.fixtures.positive.find(x=>x.test_id==='TC-XE-006').input;
  let state=evaluateConfiguration(master,seed);
  assert.equal(state.fields.design_code.value,'40H');
  state=applySelection(master,state,'model_type','STANDARD');
  assert.equal(state.fields.design_code.value,null);
  assert.equal(state.fields.frame_profile.value,'STANDARD_FRAME');
  assert.equal(state.fields.electric_lock_system.value,'FAMILOCK');
  assert.equal(state.fields.height_class.value,'STANDARD');
  assert.equal(state.fields.frame_height_mm.value,2330);
});

test('Migration aliases map legacy fields without mutating aliases', async () => {
  const {master}=await runtimePromise;
  const migrated=migrateLegacyConfiguration(master,{familock_power_supply:'AC_ADAPTER',familock_remote_count:2,other_options:['X'],legacy_unknown:'Y'});
  assert.deepEqual(migrated.configuration,{power_supply:'AC_ADAPTER',remote_count:2,selected_options:['X']});
  assert.deepEqual(migrated.unknown_legacy_fields,['legacy_unknown']);
});

test('FACE + MANUAL stores human_sensor_type as NOT_APPLICABLE rather than undefined', async () => {
  const {master}=await runtimePromise;
  const seed=master.fixtures.positive.find(x=>x.test_id==='TC-XE-004').input;
  const state=evaluateConfiguration(master,seed);
  assert.equal(state.fields.human_sensor_type.value,null);
  assert.equal(state.fields.human_sensor_type.state,'NOT_APPLICABLE');
});

test('No hidden required UNSET conflict exists across all Phase 7 fixtures', async () => {
  const {master}=await runtimePromise;
  const fixtures=[...master.fixtures.positive,...master.fixtures.negative,...master.fixtures.boundary];
  for (const fixture of fixtures) {
    const state=evaluateConfiguration(master,fixture.input);
    for (const [name,fs] of Object.entries(state.fields)) assert.ok(!(fs.required && fs.visibility==='HIDE' && fs.state==='UNSET'),`${fixture.test_id}:${name}`);
  }
});

test('Component set integrity and dedupe are stable', async () => {
  const {master}=await runtimePromise;
  const registry=new Set(master.component_sets.components);
  for (const set of master.component_sets.component_sets) for (const component of set.components) assert.ok(registry.has(component),`${set.component_set_id}:${component}`);
  const seed=master.fixtures.positive.find(x=>x.test_id==='TC-XE-003').input;
  const state=evaluateConfiguration(master,seed);
  assert.equal(state.derived_components.size,[...state.derived_components].length);
});

test('Master definition remains immutable after selection and resolution', async () => {
  const {master}=await runtimePromise;
  const before=digestMaster(master);
  const state=evaluateConfiguration(master,master.fixtures.positive[0].input);
  applySelection(master,state,'opening_direction','LEFT');
  assert.equal(digestMaster(master),before);
  assert.equal(Object.isFrozen(master),true);
  assert.equal(Object.isFrozen(master.designs),true);
});

test('Determinism: equivalent legal final selections resolve identically', async () => {
  const {master}=await runtimePromise;
  const seed=master.fixtures.positive.find(x=>x.test_id==='TC-XE-002').input;
  const a=evaluateConfiguration(master,seed);
  const b=evaluateConfiguration(master,Object.fromEntries(Object.entries(seed).reverse()));
  assert.deepEqual(flat(a),flat(b));
  assert.deepEqual([...a.derived_components].sort(),[...b.derived_components].sort());
  assert.equal(a.status,b.status);
});

test('Idempotence: resolve(resolve(state)) equals resolve(state)', async () => {
  const {master}=await runtimePromise;
  const once=evaluateConfiguration(master,master.fixtures.positive[2].input);
  const twice=resolveState(master,once);
  assert.deepEqual(flat(twice),flat(once));
  assert.deepEqual([...twice.derived_components].sort(),[...once.derived_components].sort());
  assert.equal(twice.status,once.status);
});

test('Serialized final configuration matches Phase 7 configuration schema', async () => {
  const {master}=await runtimePromise;
  const state=evaluateConfiguration(master,master.fixtures.positive[0].input);
  const serialized=serializeConfiguration(master,state);
  assert.deepEqual(validateJsonSchema(serialized,master.schemas.configuration,'$'),[]);
  assert.equal(serialized.validation_status.value,'VALID');
  assert.equal(serialized.validation_status.state,'DERIVED');
});

test('Runtime API exposes generic contract without XE product logic methods', async () => {
  const {api}=await runtimePromise;
  for (const method of ['loadMaster','createInitialState','applySelection','resolveState','getAllowedValues','getVisibleFields','getRequiredFields','getDerivedComponents','validate','serializeConfiguration']) assert.equal(typeof api[method],'function');
  assert.equal('resolveHType' in api,false);
  assert.equal('resolveXe' in api,false);
});
