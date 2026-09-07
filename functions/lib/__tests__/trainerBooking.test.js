/**
 * Dependency-free unit tests for the trainer booking notification rule.
 * Run with: `node lib/__tests__/trainerBooking.test.js` (from the functions dir).
 */

const assert = require('assert');
const { RULE_TYPES, DEFAULT_RULES, TEMPLATE_VARIABLES } = require('../ruleDefs');
const { renderTemplate, validateTemplate } = require('../template');
const { lessonLabel } = require('../lessonLabel');
const { planTrainerNotification, fullName } = require('../trainerBooking');

let passed = 0;
function test(name, fn) {
  fn();
  passed += 1;
  console.log(`✓ ${name}`);
}

test('lessonLabel prefers the lesson title over the package kind', () => {
  assert.strictEqual(lessonLabel({ title: 'Grup Reformer', lessonType: 'group' }), 'Grup Reformer');
});

test('lessonLabel falls back to type then lessonType, and never returns undefined', () => {
  assert.strictEqual(lessonLabel({ type: 'Reformer' }), 'Reformer');
  assert.strictEqual(lessonLabel({ lessonType: 'one-on-one' }), 'one-on-one');
  assert.strictEqual(lessonLabel({}), '');
  assert.strictEqual(lessonLabel(null), '');
});

test('{ogrenci} is an accepted template variable', () => {
  assert.ok(TEMPLATE_VARIABLES.includes('ogrenci'));
  const result = validateTemplate({
    tr: { title: 'x', body: '{ogrenci} rezervasyon yaptı' },
    en: { title: 'x', body: '{ogrenci} booked' },
  });
  assert.deepStrictEqual(result, { valid: true, unknownVariables: [] });
});

test('the trainer_booking rule exists and is on by default', () => {
  const rule = DEFAULT_RULES[RULE_TYPES.TRAINER_BOOKING];
  assert.ok(rule, 'trainer_booking rule missing');
  assert.strictEqual(rule.ruleType, 'trainer_booking');
  assert.strictEqual(rule.enabled, true);
});

test('the trainer template names the date, time, lesson and student', () => {
  const rule = DEFAULT_RULES[RULE_TYPES.TRAINER_BOOKING];
  const { title, body } = renderTemplate(rule.template, 'tr', {
    isim: 'Gizem',
    ders: 'Grup Reformer',
    saat: '19:00',
    tarih: '2026-09-07',
    ogrenci: 'Eda Gürağaç',
  });
  assert.ok(title.length > 0);
  assert.ok(body.includes('Eda Gürağaç'), `student name missing: ${body}`);
  assert.ok(body.includes('Grup Reformer'), `lesson missing: ${body}`);
  assert.ok(body.includes('19:00'), `time missing: ${body}`);
  assert.ok(body.includes('2026-09-07'), `date missing: ${body}`);
  assert.ok(!/\{\w+\}/.test(body), `unfilled placeholder left: ${body}`);
});

test('the English trainer template also fills every variable', () => {
  const rule = DEFAULT_RULES[RULE_TYPES.TRAINER_BOOKING];
  const { body } = renderTemplate(rule.template, 'en', {
    isim: 'Gizem', ders: 'Group Reformer', saat: '19:00', tarih: '2026-09-07', ogrenci: 'Eda',
  });
  assert.ok(body.includes('Eda'));
  assert.ok(!/\{\w+\}/.test(body), `unfilled placeholder left: ${body}`);
});

// ---------------------------------------------------------------------------
// planTrainerNotification
// ---------------------------------------------------------------------------

const lesson = {
  title: 'Grup Reformer',
  trainerId: 'trainer1',
  startTime: '19:00',
  endTime: '19:45',
  scheduledDate: '2026-09-07T00:00:00.000Z',
};
const trainer = { firstName: 'Gizem', lastName: 'Topuz', lang: 'tr' };
const member = { firstName: 'Eda', lastName: 'Gürağaç' };
const booking = { userId: 'member1', lessonId: 'lesson1' };
const plan = (over = {}) => planTrainerNotification({ enabled: true, action: 'booked', booking, lesson, trainer, member, ...over });

test('a self-service booking notifies the trainer with every variable filled', () => {
  const p = plan();
  assert.strictEqual(p.userId, 'trainer1');
  assert.strictEqual(p.offset, 'trainer_booked');
  assert.strictEqual(p.lang, 'tr');
  assert.strictEqual(p.vars.isim, 'Gizem');
  assert.strictEqual(p.vars.ogrenci, 'Eda Gürağaç');
  assert.strictEqual(p.vars.ders, 'Grup Reformer');
  assert.strictEqual(p.vars.saat, '19:00');
  assert.strictEqual(p.vars.tarih, '2026-09-07');
});

test('an admin adding a student also notifies the trainer', () => {
  const p = plan({ action: 'admin_added' });
  assert.ok(p);
  assert.strictEqual(p.offset, 'trainer_admin_added');
});

test('cancellations and unknown actions do not notify the trainer', () => {
  assert.strictEqual(plan({ action: 'cancelled' }), null);
  assert.strictEqual(plan({ action: 'admin_removed' }), null);
});

test('a disabled rule sends nothing', () => {
  assert.strictEqual(plan({ enabled: false }), null);
});

test('a lesson without a trainer, or a missing trainer account, sends nothing', () => {
  assert.strictEqual(plan({ lesson: { ...lesson, trainerId: null } }), null);
  assert.strictEqual(plan({ trainer: null }), null);
});

test('a trainer booking their own class is not notified', () => {
  assert.strictEqual(plan({ booking: { userId: 'trainer1' } }), null);
});

test('a member with no name still produces a sendable notification', () => {
  const p = plan({ member: null });
  assert.ok(p);
  assert.strictEqual(p.vars.ogrenci, '');
});

test('fullName falls back to displayName', () => {
  assert.strictEqual(fullName({ displayName: 'Eda G.' }), 'Eda G.');
  assert.strictEqual(fullName(null), '');
});

test('the rendered trainer message reads as a full sentence', () => {
  const p = plan();
  const { title, body } = renderTemplate(DEFAULT_RULES[RULE_TYPES.TRAINER_BOOKING].template, p.lang, p.vars);
  assert.strictEqual(title, 'Derse Yeni Rezervasyon');
  assert.strictEqual(body, '2026-09-07 19:00 Grup Reformer dersinize Eda Gürağaç rezervasyon yaptı.');
});

console.log(`\n${passed} tests passed.`);
