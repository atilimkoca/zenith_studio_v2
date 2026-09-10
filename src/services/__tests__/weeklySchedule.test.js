import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { buildWeeklySchedule, emptyWeek, DAY_KEYS } from '../weeklySchedule.js';

// Minimal normaliser mirroring scheduleService.normalizeDate for the shapes used here.
const normalizeDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

// Week of Monday 7 Sept 2026 → Sunday 13 Sept 2026.
const weekStart = new Date(2026, 8, 7);
const weekEnd = new Date(2026, 8, 13);

describe('buildWeeklySchedule', () => {
  test('always returns all seven day keys', () => {
    const week = buildWeeklySchedule([], weekStart, weekEnd, normalizeDate);
    assert.deepEqual(Object.keys(week), DAY_KEYS);
    assert.deepEqual(week, emptyWeek());
  });

  test('places a lesson under its dayOfWeek when its date falls inside the week', () => {
    const lessons = [{ id: 'a', dayOfWeek: 'tuesday', scheduledDate: '2026-09-08', startTime: '10:00' }];
    const week = buildWeeklySchedule(lessons, weekStart, weekEnd, normalizeDate);
    assert.deepEqual(week.tuesday.map((l) => l.id), ['a']);
  });

  test('includes lessons on the first and last day of the range and excludes the days around them', () => {
    const lessons = [
      { id: 'first', dayOfWeek: 'monday', scheduledDate: '2026-09-07T18:00:00', startTime: '18:00' },
      { id: 'last', dayOfWeek: 'sunday', scheduledDate: '2026-09-13T09:00:00', startTime: '09:00' },
      { id: 'before', dayOfWeek: 'sunday', scheduledDate: '2026-09-06', startTime: '09:00' },
      { id: 'after', dayOfWeek: 'monday', scheduledDate: '2026-09-14', startTime: '09:00' },
    ];
    const week = buildWeeklySchedule(lessons, weekStart, weekEnd, normalizeDate);
    assert.deepEqual(week.monday.map((l) => l.id), ['first']);
    assert.deepEqual(week.sunday.map((l) => l.id), ['last']);
  });

  test('keeps legacy lessons without a scheduledDate in every week', () => {
    const week = buildWeeklySchedule([{ id: 'legacy', dayOfWeek: 'friday', startTime: '08:00' }], weekStart, weekEnd, normalizeDate);
    assert.deepEqual(week.friday.map((l) => l.id), ['legacy']);
  });

  test('drops lessons with an unknown dayOfWeek', () => {
    const week = buildWeeklySchedule([{ id: 'x', dayOfWeek: 'funday', scheduledDate: '2026-09-08' }], weekStart, weekEnd, normalizeDate);
    assert.deepEqual(week, emptyWeek());
  });

  test('sorts each day by start time and leaves the input untouched', () => {
    const lessons = [
      { id: 'late', dayOfWeek: 'monday', scheduledDate: '2026-09-07', startTime: '20:00' },
      { id: 'early', dayOfWeek: 'monday', scheduledDate: '2026-09-07', startTime: '09:00' },
    ];
    const week = buildWeeklySchedule(lessons, weekStart, weekEnd, normalizeDate);
    assert.deepEqual(week.monday.map((l) => l.id), ['early', 'late']);
    assert.deepEqual(lessons.map((l) => l.id), ['late', 'early']);
  });
});

// --- Day / date consistency helpers -----------------------------------------
// Regression: editing a lesson's "Gün" on the web left `scheduledDate` on the
// old weekday, so the lesson vanished from the calendar while it kept living
// in the student's list (2026-09-10).
import { dayKeyForDate, shiftDateToWeekday, reconcileDayOfWeek } from '../weeklySchedule.js';

describe('dayKeyForDate', () => {
  test('maps JS weekdays onto Monday-first DAY_KEYS', () => {
    assert.equal(dayKeyForDate(new Date(2026, 8, 7)), 'monday');
    assert.equal(dayKeyForDate(new Date(2026, 8, 16)), 'wednesday');
    assert.equal(dayKeyForDate(new Date(2026, 8, 13)), 'sunday');
  });

  test('returns null for invalid input', () => {
    assert.equal(dayKeyForDate(null), null);
    assert.equal(dayKeyForDate(new Date('nope')), null);
  });
});

describe('shiftDateToWeekday', () => {
  test('moves the date to the requested weekday inside the same Monday–Sunday week', () => {
    const wed = new Date(2026, 8, 16);
    assert.equal(shiftDateToWeekday(wed, 'thursday').getTime(), new Date(2026, 8, 17).getTime());
    assert.equal(shiftDateToWeekday(wed, 'monday').getTime(), new Date(2026, 8, 14).getTime());
    assert.equal(shiftDateToWeekday(wed, 'sunday').getTime(), new Date(2026, 8, 20).getTime());
  });

  test('a Sunday belongs to the week that started the previous Monday', () => {
    const sun = new Date(2026, 8, 13);
    assert.equal(shiftDateToWeekday(sun, 'monday').getTime(), new Date(2026, 8, 7).getTime());
  });

  test('does not mutate the input and keeps the same day when already matching', () => {
    const wed = new Date(2026, 8, 16);
    const out = shiftDateToWeekday(wed, 'wednesday');
    assert.notEqual(out, wed);
    assert.equal(out.getTime(), wed.getTime());
    assert.equal(wed.getDate(), 16);
  });

  test('returns null for an unknown day key or invalid date', () => {
    assert.equal(shiftDateToWeekday(new Date(2026, 8, 16), 'funday'), null);
    assert.equal(shiftDateToWeekday(null, 'monday'), null);
  });
});

describe('reconcileDayOfWeek', () => {
  test('derives dayOfWeek from scheduledDate when they disagree', () => {
    const out = reconcileDayOfWeek({ dayOfWeek: 'thursday', scheduledDate: '2026-09-16' }, normalizeDate);
    assert.equal(out.dayOfWeek, 'wednesday');
    assert.equal(out.scheduledDate, '2026-09-16');
  });

  test('leaves a consistent payload untouched', () => {
    const input = { dayOfWeek: 'wednesday', scheduledDate: '2026-09-16', title: 'x' };
    assert.deepEqual(reconcileDayOfWeek(input, normalizeDate), input);
  });

  test('fills a missing dayOfWeek from the date', () => {
    assert.equal(reconcileDayOfWeek({ scheduledDate: '2026-09-17' }, normalizeDate).dayOfWeek, 'thursday');
  });

  test('legacy lessons without a date keep their dayOfWeek', () => {
    const input = { dayOfWeek: 'friday' };
    assert.deepEqual(reconcileDayOfWeek(input, normalizeDate), input);
  });

  test('does not mutate the input object', () => {
    const input = { dayOfWeek: 'thursday', scheduledDate: '2026-09-16' };
    reconcileDayOfWeek(input, normalizeDate);
    assert.equal(input.dayOfWeek, 'thursday');
  });
});
