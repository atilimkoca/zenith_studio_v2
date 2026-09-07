/**
 * Dependency-free unit tests for the lesson maintenance helpers.
 * Run with: `node lib/__tests__/lessonMaintenance.test.js` (from the functions dir).
 */

const assert = require('assert');
const {
  lessonDayKey,
  lessonEndDate,
  shouldAutoComplete,
  recentDayKeys,
} = require('../lessonMaintenance');

let passed = 0;
function test(name, fn) {
  fn();
  passed += 1;
  console.log(`✓ ${name}`);
}

// 15 Sept 2026, 22:30 Istanbul time.
const now = new Date('2026-09-15T22:30:00+03:00');

test('lessonDayKey reads the Istanbul calendar day from a date-only string', () => {
  assert.strictEqual(lessonDayKey({ scheduledDate: '2026-09-15' }), '2026-09-15');
});

test('lessonDayKey reads the Istanbul calendar day from a UTC ISO string that is local midnight', () => {
  // Local midnight 15 Sept in Istanbul, stored as UTC by the mobile app.
  assert.strictEqual(lessonDayKey({ scheduledDate: '2026-09-14T21:00:00.000Z' }), '2026-09-15');
});

test('lessonDayKey returns null without a scheduledDate', () => {
  assert.strictEqual(lessonDayKey({}), null);
});

test('lessonEndDate combines the day with endTime in Istanbul time', () => {
  const end = lessonEndDate({ scheduledDate: '2026-09-15', startTime: '20:00', endTime: '20:45' });
  assert.strictEqual(end.toISOString(), '2026-09-15T17:45:00.000Z');
});

test('lessonEndDate falls back to startTime plus duration when endTime is missing', () => {
  const end = lessonEndDate({ scheduledDate: '2026-09-15', startTime: '20:00', duration: 45 });
  assert.strictEqual(end.toISOString(), '2026-09-15T17:45:00.000Z');
});

test('shouldAutoComplete is true once the grace period after the end has passed', () => {
  const lesson = { status: 'active', scheduledDate: '2026-09-15', startTime: '18:00', endTime: '18:45' };
  assert.strictEqual(shouldAutoComplete(lesson, now, 3), true);
});

test('shouldAutoComplete is false inside the grace period', () => {
  const lesson = { status: 'active', scheduledDate: '2026-09-15', startTime: '20:00', endTime: '20:45' };
  assert.strictEqual(shouldAutoComplete(lesson, now, 3), false);
});

test('shouldAutoComplete ignores lessons that are not active', () => {
  const lesson = { status: 'cancelled', scheduledDate: '2026-09-10', startTime: '10:00', endTime: '10:45' };
  assert.strictEqual(shouldAutoComplete(lesson, now, 3), false);
});

test('shouldAutoComplete is false when the end time cannot be determined', () => {
  assert.strictEqual(shouldAutoComplete({ status: 'active', scheduledDate: '2026-09-10' }, now, 3), false);
});

test('recentDayKeys lists today and the previous days, newest first', () => {
  assert.deepStrictEqual(recentDayKeys(now, 3), ['2026-09-15', '2026-09-14', '2026-09-13']);
});

console.log(`\n${passed} tests passed.`);
