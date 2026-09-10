import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { buildTrainerMonthlyStats, MONTH_LABELS_TR } from '../trainerLessonStats.js';

const lesson = (overrides) => ({
  id: Math.random().toString(36).slice(2),
  trainerId: 't1',
  trainerName: 'Ayşe Yılmaz',
  status: 'active',
  scheduledDateKey: '2026-03-10',
  ...overrides
});

const options = { year: 2026, todayKey: '2026-09-10' };

describe('buildTrainerMonthlyStats', () => {
  test('exports 12 Turkish month labels', () => {
    assert.equal(MONTH_LABELS_TR.length, 12);
    assert.equal(MONTH_LABELS_TR[0], 'Oca');
    assert.equal(MONTH_LABELS_TR[11], 'Ara');
  });

  test('counts completed lessons in the month they were held', () => {
    const result = buildTrainerMonthlyStats([
      lesson({ status: 'completed', scheduledDateKey: '2026-03-10' }),
      lesson({ status: 'completed', scheduledDateKey: '2026-03-24' }),
      lesson({ status: 'completed', scheduledDateKey: '2026-05-01' })
    ], options);

    assert.equal(result.rows.length, 1);
    const row = result.rows[0];
    assert.equal(row.trainerId, 't1');
    assert.equal(row.trainerName, 'Ayşe Yılmaz');
    assert.equal(row.months[2].done, 2);
    assert.equal(row.months[4].done, 1);
    assert.equal(row.totalDone, 3);
    assert.equal(row.totalPlanned, 0);
  });

  test('treats past uncompleted lessons as done and future ones as planned', () => {
    const result = buildTrainerMonthlyStats([
      lesson({ status: 'active', scheduledDateKey: '2026-09-09' }),   // yesterday, auto-complete lag
      lesson({ status: 'active', scheduledDateKey: '2026-09-10' }),   // today, not yet held
      lesson({ status: 'active', scheduledDateKey: '2026-09-20' }),   // future
      lesson({ status: 'active', scheduledDateKey: '2026-11-02' })    // future month
    ], options);

    const row = result.rows[0];
    assert.equal(row.months[8].done, 1);
    assert.equal(row.months[8].planned, 2);
    assert.equal(row.months[10].planned, 1);
    assert.equal(row.totalDone, 1);
    assert.equal(row.totalPlanned, 3);
  });

  test('ignores cancelled lessons, other years and lessons without a date key', () => {
    const result = buildTrainerMonthlyStats([
      lesson({ status: 'cancelled', scheduledDateKey: '2026-03-10' }),
      lesson({ status: 'completed', scheduledDateKey: '2025-12-31' }),
      lesson({ status: 'completed', scheduledDateKey: null }),
      lesson({ status: 'completed', scheduledDateKey: '2026-01-05' })
    ], options);

    assert.equal(result.rows[0].totalDone, 1);
    assert.equal(result.rows[0].months[0].done, 1);
    assert.equal(result.skippedWithoutDate, 1);
  });

  test('groups by trainerId and prefers the trainer directory name', () => {
    const trainers = [
      { id: 't1', displayName: 'Ayşe Y.' },
      { id: 't2', firstName: 'Mehmet', lastName: 'Demir' }
    ];
    const result = buildTrainerMonthlyStats([
      lesson({ trainerId: 't1', trainerName: 'Eski İsim', status: 'completed' }),
      lesson({ trainerId: 't2', trainerName: '', status: 'completed' }),
      lesson({ trainerId: 't2', trainerName: '', status: 'completed' }),
      lesson({ trainerId: '', trainerName: 'Misafir Eğitmen', status: 'completed' })
    ], { ...options, trainers });

    const names = result.rows.map((r) => r.trainerName);
    assert.deepEqual(names, ['Mehmet Demir', 'Ayşe Y.', 'Misafir Eğitmen']);
    assert.equal(result.rows[0].totalDone, 2);
  });

  test('sorts by done count descending, then by name', () => {
    const result = buildTrainerMonthlyStats([
      lesson({ trainerId: 'b', trainerName: 'Zeynep', status: 'completed' }),
      lesson({ trainerId: 'a', trainerName: 'Ali', status: 'completed' }),
      lesson({ trainerId: 'c', trainerName: 'Can', status: 'completed' }),
      lesson({ trainerId: 'c', trainerName: 'Can', status: 'completed' })
    ], options);

    assert.deepEqual(result.rows.map((r) => r.trainerName), ['Can', 'Ali', 'Zeynep']);
  });

  test('lists active trainers with zero lessons and computes month totals', () => {
    const trainers = [{ id: 't1', displayName: 'Ayşe' }, { id: 't9', displayName: 'Yeni Eğitmen' }];
    const result = buildTrainerMonthlyStats([
      lesson({ status: 'completed', scheduledDateKey: '2026-02-01' }),
      lesson({ status: 'active', scheduledDateKey: '2026-12-01' })
    ], { ...options, trainers });

    assert.equal(result.rows.length, 2);
    assert.equal(result.rows[1].trainerName, 'Yeni Eğitmen');
    assert.equal(result.rows[1].totalDone, 0);
    assert.equal(result.monthTotals[1].done, 1);
    assert.equal(result.monthTotals[11].planned, 1);
    assert.equal(result.totalDone, 1);
    assert.equal(result.totalPlanned, 1);
  });

  test('handles empty input', () => {
    const result = buildTrainerMonthlyStats([], options);
    assert.deepEqual(result.rows, []);
    assert.equal(result.totalDone, 0);
    assert.equal(result.monthTotals.length, 12);
  });
});
