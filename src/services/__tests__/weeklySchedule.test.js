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
