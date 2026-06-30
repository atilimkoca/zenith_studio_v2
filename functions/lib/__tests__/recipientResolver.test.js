/**
 * Dependency-free unit tests for the manual-notification recipient resolver.
 * The resolver lives in the app projects; we copy the same source path here via
 * require of the web copy so functions tooling can run it.
 * Run: node functions/lib/__tests__/recipientResolver.test.js
 */

const assert = require('assert');
const path = require('path');

// Load the ESM-style web resolver by transpiling the named exports manually:
// it uses `export function`, so we read + eval in a CommonJS shim.
const fs = require('fs');
const src = fs.readFileSync(
  path.join(__dirname, '../../../src/utils/recipientResolver.js'),
  'utf8'
);
const shim = src
  .replace(/export function/g, 'function')
  .concat('\nmodule.exports = { getActivePackage, classifyUser, resolveRecipients };');
const mod = { exports: {} };
// eslint-disable-next-line no-new-func
new Function('module', 'exports', shim)(mod, mod.exports);
const { classifyUser, resolveRecipients } = mod.exports;

const now = new Date('2026-06-30T12:00:00+03:00');
let passed = 0;
const test = (name, fn) => {
  fn();
  passed += 1;
  console.log('  ✓', name);
};

const activePkg = (type = 'group') => ({
  startDate: '2026-06-01',
  expiryDate: '2026-07-30',
  remainingLessons: 5,
  packageType: type,
});

const users = [
  { id: 'm1', role: 'customer', status: 'active', packages: [activePkg('group')] },
  { id: 'm2', role: 'customer', status: 'active', packages: [activePkg('one-on-one')] },
  { id: 'm3', role: 'customer', status: 'active', packages: [] }, // passive (no active pkg)
  { id: 'm4', role: 'customer', status: 'pending', packages: [] }, // pending
  { id: 't1', role: 'instructor', status: 'active', packages: [] }, // trainer
  { id: 'a1', role: 'admin', status: 'active', packages: [] }, // admin
  { id: 'x1', role: 'customer', status: 'deleted', packages: [activePkg()] }, // excluded
];

test('classifyUser maps role/status/packageType', () => {
  assert.deepStrictEqual(classifyUser(users[0], now), { role: 'member', status: 'active', packageType: 'group' });
  assert.deepStrictEqual(classifyUser(users[2], now), { role: 'member', status: 'passive', packageType: null });
  assert.deepStrictEqual(classifyUser(users[3], now), { role: 'member', status: 'pending', packageType: null });
  assert.strictEqual(classifyUser(users[4], now).role, 'trainer');
});

test('mode all counts eligible users, excludes deleted', () => {
  const r = resolveRecipients({ mode: 'all' }, users, now);
  assert.strictEqual(r.mode, 'all');
  assert.strictEqual(r.count, 6); // 7 total - 1 deleted
  assert.strictEqual(r.userIds.length, 0);
});

test('segment: active AND group', () => {
  const r = resolveRecipients({ mode: 'segment', filters: { status: 'active', packageType: 'group' } }, users, now);
  assert.deepStrictEqual(r.userIds, ['m1']);
});

test('segment: role member + status active (excludes trainers/admins/passive/pending)', () => {
  const r = resolveRecipients({ mode: 'segment', filters: { role: 'member', status: 'active' } }, users, now);
  assert.deepStrictEqual(r.userIds.sort(), ['m1', 'm2']);
});

test('segment: passive members', () => {
  const r = resolveRecipients({ mode: 'segment', filters: { status: 'passive' } }, users, now);
  assert.deepStrictEqual(r.userIds, ['m3']);
});

test('individuals: only eligible, de-duped, deleted excluded', () => {
  const r = resolveRecipients({ mode: 'individuals', userIds: ['m1', 'm1', 'x1', 'm4'] }, users, now);
  assert.deepStrictEqual(r.userIds.sort(), ['m1', 'm4']);
  assert.strictEqual(r.count, 2);
});

test('empty segment -> count 0', () => {
  const r = resolveRecipients({ mode: 'segment', filters: { status: 'pending', packageType: 'one-on-one' } }, users, now);
  assert.strictEqual(r.count, 0);
});

console.log(`\n${passed} tests passed.`);
