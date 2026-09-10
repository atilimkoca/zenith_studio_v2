// Pure helpers for the "Eğitmen Dersleri" report: how many lessons each
// trainer held per month of a given year. Works on plain lesson documents so
// it can be unit-tested with node --test; reportsService fetches the data.

export const MONTH_LABELS_TR = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

const emptyMonths = () => Array.from({ length: 12 }, () => ({ done: 0, planned: 0 }));

const trainerDisplayName = (trainer) => {
  if (!trainer) return '';
  const fullName = `${trainer.firstName || ''} ${trainer.lastName || ''}`.trim();
  return trainer.displayName || fullName || trainer.email || '';
};

/**
 * @param {Array<object>} lessons  lesson documents (need scheduledDateKey, status, trainerId, trainerName)
 * @param {object} options
 * @param {number} options.year  calendar year to report on
 * @param {string} options.todayKey  today's "YYYY-MM-DD"; lessons strictly before it count as held
 * @param {Array<object>} [options.trainers]  trainer directory (users docs); used for names and zero rows
 */
export const buildTrainerMonthlyStats = (lessons, { year, todayKey, trainers = [] }) => {
  const yearPrefix = `${year}-`;
  const rowsById = new Map();
  const monthTotals = emptyMonths();
  let skippedWithoutDate = 0;

  const trainerById = new Map(trainers.map((trainer) => [trainer.id, trainer]));

  const rowFor = (trainerId, fallbackName) => {
    const key = trainerId || `name:${fallbackName || ''}`;
    if (!rowsById.has(key)) {
      rowsById.set(key, {
        trainerId: trainerId || '',
        trainerName: trainerDisplayName(trainerById.get(trainerId)) || fallbackName || 'Bilinmeyen Eğitmen',
        months: emptyMonths(),
        totalDone: 0,
        totalPlanned: 0
      });
    }
    return rowsById.get(key);
  };

  trainers.forEach((trainer) => rowFor(trainer.id, trainerDisplayName(trainer)));

  (Array.isArray(lessons) ? lessons : []).forEach((lesson) => {
    if (!lesson || lesson.status === 'cancelled') return;
    const dateKey = lesson.scheduledDateKey;
    if (typeof dateKey !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
      skippedWithoutDate += 1;
      return;
    }
    if (!dateKey.startsWith(yearPrefix)) return;

    const monthIndex = Number(dateKey.slice(5, 7)) - 1;
    if (monthIndex < 0 || monthIndex > 11) return;

    const isDone = lesson.status === 'completed' || dateKey < todayKey;
    const bucket = isDone ? 'done' : 'planned';
    const row = rowFor(lesson.trainerId, lesson.trainerName);
    row.months[monthIndex][bucket] += 1;
    monthTotals[monthIndex][bucket] += 1;
    if (isDone) row.totalDone += 1; else row.totalPlanned += 1;
  });

  const rows = Array.from(rowsById.values()).sort((a, b) => {
    if (b.totalDone !== a.totalDone) return b.totalDone - a.totalDone;
    return a.trainerName.localeCompare(b.trainerName, 'tr');
  });

  return {
    year,
    rows,
    monthTotals,
    totalDone: monthTotals.reduce((sum, m) => sum + m.done, 0),
    totalPlanned: monthTotals.reduce((sum, m) => sum + m.planned, 0),
    skippedWithoutDate
  };
};

/** CSV rows (arrays of cells) for the report, header first. */
export const trainerStatsToCsvRows = (stats) => {
  const header = ['Eğitmen', ...MONTH_LABELS_TR, 'Toplam', 'Planlı'];
  const rows = stats.rows.map((row) => [
    row.trainerName,
    ...row.months.map((m) => m.done),
    row.totalDone,
    row.totalPlanned
  ]);
  const totals = ['Toplam', ...stats.monthTotals.map((m) => m.done), stats.totalDone, stats.totalPlanned];
  return [header, ...rows, totals];
};
