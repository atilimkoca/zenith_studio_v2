/**
 * Dependency-free unit tests for the automatic-notification helpers.
 * Run with: `node lib/__tests__/helpers.test.js` (from the functions dir).
 */

const assert = require('assert');
const { getActivePackage, getActivePackageCredits } = require('../activePackage');
const { renderTemplate, validateTemplate } = require('../template');
const { lessonStartDate, daysUntil } = require('../time');
const { buildSentLogId } = require('../sentLog');

const now = new Date('2026-06-30T12:00:00+03:00');
let passed = 0;
function test(name, fn) {
  fn();
  passed += 1;
  console.log('  ✓', name);
}

// ---- active package ----
test('picks most recent active package, ignores expired/depleted', () => {
  const user = {
    packages: [
      { startDate: '2026-06-01', expiryDate: '2026-05-01', remainingLessons: 5 }, // expired
      { startDate: '2026-06-10', expiryDate: '2026-07-10', remainingLessons: 0 }, // depleted
      { startDate: '2026-06-15', expiryDate: '2026-07-15', remainingLessons: 4 }, // active (older)
      { startDate: '2026-06-20', expiryDate: '2026-07-20', remainingLessons: 2 }, // active (newest)
    ],
  };
  const active = getActivePackage(user, now);
  assert.strictEqual(active.remainingLessons, 2);
  assert.strictEqual(getActivePackageCredits(user, now), 2);
});

test('no active package -> 0 credits (does not sum inactive packages)', () => {
  const user = {
    packages: [
      { startDate: '2026-01-01', expiryDate: '2026-02-01', remainingLessons: 8 }, // expired but has credits
      { status: 'cancelled', startDate: '2026-06-01', expiryDate: '2026-07-01', remainingLessons: 3 },
    ],
  };
  assert.strictEqual(getActivePackage(user, now), null);
  assert.strictEqual(getActivePackageCredits(user, now), 0);
});

// ---- template ----
test('renders bilingual template and fills variables', () => {
  const template = {
    tr: { title: 'Ders', body: '{isim}, {ders} {saat}\'da.' },
    en: { title: 'Class', body: '{isim}, {ders} at {saat}.' },
  };
  const tr = renderTemplate(template, 'tr', { isim: 'Ada', ders: 'Yoga', saat: '18:00' });
  assert.strictEqual(tr.body, 'Ada, Yoga 18:00\'da.');
  const en = renderTemplate(template, 'en', { isim: 'Ada', ders: 'Yoga', saat: '18:00' });
  assert.strictEqual(en.body, 'Ada, Yoga at 18:00.');
});

test('unknown variable -> empty string, lang fallback to tr', () => {
  const template = { tr: { title: 'T', body: 'merhaba {bilinmeyen}!' } };
  const out = renderTemplate(template, 'fr', { isim: 'Ada' });
  assert.strictEqual(out.body, 'merhaba !');
});

test('validateTemplate flags unknown variables', () => {
  const res = validateTemplate({ tr: { title: 'x', body: '{isim} {credit}' } });
  assert.strictEqual(res.valid, false);
  assert.deepStrictEqual(res.unknownVariables, ['credit']);
  const ok = validateTemplate({ tr: { title: 'x', body: '{isim} {kredi}' } });
  assert.strictEqual(ok.valid, true);
});

// ---- time ----
test('lessonStartDate combines date + HH:MM as Istanbul time', () => {
  const d = lessonStartDate('2026-07-01', '18:00');
  assert.strictEqual(d.toISOString(), '2026-07-01T15:00:00.000Z'); // 18:00 +03:00
});

test('lessonStartDate handles ISO scheduledDate strings', () => {
  const d = lessonStartDate('2026-07-01T00:00:00.000Z', '09:30');
  assert.strictEqual(d.toISOString(), '2026-07-01T06:30:00.000Z');
});

test('daysUntil counts studio-local calendar days', () => {
  assert.strictEqual(daysUntil('2026-07-07', now), 7);
  assert.strictEqual(daysUntil('2026-07-01', now), 1);
  assert.strictEqual(daysUntil('2026-06-30', now), 0);
});

// ---- sentLog ----
test('buildSentLogId is deterministic and sanitized', () => {
  assert.strictEqual(
    buildSentLogId({ ruleType: 'lesson_reminder', userId: 'uid123', refId: 'lesson456', offset: '2h' }),
    'lesson_reminder_uid123_lesson456_2h'
  );
  assert.strictEqual(
    buildSentLogId({ ruleType: 'membership_expiring', userId: 'u/1', refId: 'pkg 9', offset: '3d' }),
    'membership_expiring_u-1_pkg-9_3d'
  );
});

console.log(`\n${passed} tests passed.`);
