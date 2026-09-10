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

describe('buildTrainerMonthlyStats – group vs individual', () => {
  test('classifies lesson types and counts each category per month', () => {
    const result = buildTrainerMonthlyStats([
      lesson({ status: 'completed', scheduledDateKey: '2026-03-01', lessonType: 'group' }),
      lesson({ status: 'completed', scheduledDateKey: '2026-03-02', lessonType: 'one-on-one' }),
      lesson({ status: 'completed', scheduledDateKey: '2026-03-03', lessonType: 'bireysel' }),
      lesson({ status: 'completed', scheduledDateKey: '2026-03-04', lessonType: 'individual' }),
      lesson({ status: 'completed', scheduledDateKey: '2026-03-05', lessonType: undefined, maxParticipants: 1 }),
      lesson({ status: 'completed', scheduledDateKey: '2026-03-06', lessonType: undefined, maxParticipants: 8 }),
      lesson({ status: 'completed', scheduledDateKey: '2026-03-07' }),                 // no info → group
      lesson({ status: 'active', scheduledDateKey: '2026-10-01', lessonType: 'one-on-one' }) // planned individual
    ], options);

    const row = result.rows[0];
    const march = row.months[2];
    assert.equal(march.done, 7);
    assert.equal(march.group.done, 3);
    assert.equal(march.individual.done, 4);
    assert.equal(row.months[9].individual.planned, 1);
    assert.equal(row.months[9].group.planned, 0);

    assert.equal(row.groupDone, 3);
    assert.equal(row.individualDone, 4);
    assert.equal(row.groupPlanned, 0);
    assert.equal(row.individualPlanned, 1);

    assert.equal(result.monthTotals[2].group.done, 3);
    assert.equal(result.monthTotals[2].individual.done, 4);
    assert.equal(result.groupDone, 3);
    assert.equal(result.individualDone, 4);
    assert.equal(result.individualPlanned, 1);
  });

  test('CSV has one row per trainer and category', async () => {
    const { trainerStatsToCsvRows } = await import('../trainerLessonStats.js');
    const stats = buildTrainerMonthlyStats([
      lesson({ status: 'completed', scheduledDateKey: '2026-01-10', lessonType: 'group' }),
      lesson({ status: 'completed', scheduledDateKey: '2026-01-11', lessonType: 'one-on-one' })
    ], options);
    const rows = trainerStatsToCsvRows(stats);

    assert.deepEqual(rows[0].slice(0, 3), ['Eğitmen', 'Kategori', 'Oca']);
    assert.deepEqual(rows[1].slice(0, 3), ['Ayşe Yılmaz', 'Tümü', 2]);
    assert.deepEqual(rows[2].slice(0, 3), ['Ayşe Yılmaz', 'Grup', 1]);
    assert.deepEqual(rows[3].slice(0, 3), ['Ayşe Yılmaz', 'Birebir', 1]);
    assert.deepEqual(rows[4].slice(0, 3), ['Toplam', 'Tümü', 2]);
    assert.equal(rows.length, 1 + 3 + 3);
  });
});
