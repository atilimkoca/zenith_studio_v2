import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { lessonDateKey } from '../lessonDateKey.js';

// Mirrors scheduleService.normalizeDate for the shapes used here.
const normalizeDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'object' && typeof value.seconds === 'number') return new Date(value.seconds * 1000);
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

describe('lessonDateKey', () => {
  test('keeps a date-only string as is', () => {
    assert.equal(lessonDateKey('2026-09-15', normalizeDate), '2026-09-15');
  });

  test('uses the local calendar day of a Date', () => {
    assert.equal(lessonDateKey(new Date(2026, 8, 5, 23, 30), normalizeDate), '2026-09-05');
  });

  test('zero-pads month and day', () => {
    assert.equal(lessonDateKey(new Date(2026, 0, 3), normalizeDate), '2026-01-03');
  });

  test('returns null for missing or invalid values', () => {
    assert.equal(lessonDateKey(null, normalizeDate), null);
    assert.equal(lessonDateKey('not a date', normalizeDate), null);
  });
});
