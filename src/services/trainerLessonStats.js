// Pure helpers for the "Eğitmen Dersleri" report: how many lessons each
// trainer held per month of a given year, split into group and one-on-one.
// Works on plain lesson documents so it can be unit-tested with node --test;
// reportsService fetches the data.

export const MONTH_LABELS_TR = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

export const LESSON_CATEGORIES = [
  { id: 'all', label: 'Tümü' },
  { id: 'group', label: 'Grup' },
  { id: 'individual', label: 'Birebir' }
];

const INDIVIDUAL_TYPES = new Set(['one-on-one', 'bireysel', 'individual', 'private']);

/** 'group' or 'individual'. Mirrors dashboardService and the mobile app's fallback rules. */
export const lessonCategory = (lesson) => {
  const raw = lesson.lessonType || lesson.lessonPackageType || lesson.packageType;
  if (typeof raw === 'string') {
    const type = raw.trim().toLowerCase();
    if (INDIVIDUAL_TYPES.has(type)) return 'individual';
    if (type === 'group' || type === 'grup') return 'group';
  }
  if (typeof lesson.maxParticipants === 'number' && lesson.maxParticipants <= 1) return 'individual';
  return 'group';
};

const emptyCell = () => ({
  done: 0,
  planned: 0,
  students: 0,
  group: { done: 0, planned: 0, students: 0 },
  individual: { done: 0, planned: 0, students: 0 }
});

const emptyMonths = () => Array.from({ length: 12 }, emptyCell);

const emptyTotals = () => ({
  totalDone: 0,
  totalPlanned: 0,
  totalStudents: 0,
  groupDone: 0,
  groupPlanned: 0,
  groupStudents: 0,
  individualDone: 0,
  individualPlanned: 0,
  individualStudents: 0
});

const addToTotals = (totals, category, bucket, students) => {
  totals[bucket === 'done' ? 'totalDone' : 'totalPlanned'] += 1;
  totals[`${category}${bucket === 'done' ? 'Done' : 'Planned'}`] += 1;
  if (bucket === 'done') {
    totals.totalStudents += students;
    totals[`${category}Students`] += students;
  }
};

const addToCell = (cell, category, bucket, students) => {
  cell[bucket] += 1;
  cell[category][bucket] += 1;
  if (bucket === 'done') {
    cell.students += students;
    cell[category].students += students;
  }
};

/** Booked students on a lesson. `participants` is the array bookingCore maintains. */
export const studentCount = (lesson) => (Array.isArray(lesson.participants) ? lesson.participants.length : 0);

const trainerDisplayName = (trainer) => {
  if (!trainer) return '';
  const fullName = `${trainer.firstName || ''} ${trainer.lastName || ''}`.trim();
  return trainer.displayName || fullName || trainer.email || '';
};

/**
 * A lesson document is a time slot. It only counts as a lesson the trainer
 * taught (or will teach) when at least one student is booked on it; slots
 * nobody booked are reported separately as empty slots.
 *
 * @param {Array<object>} lessons  lesson documents (need scheduledDateKey, status, trainerId, trainerName, lessonType, participants)
 * @param {object} options
 * @param {number} options.year  calendar year to report on
 * @param {string} options.todayKey  today's "YYYY-MM-DD"; lessons strictly before it count as held
 * @param {Array<object>} [options.trainers]  trainer directory (users docs); used for names and zero rows
 */
export const buildTrainerMonthlyStats = (lessons, { year, todayKey, trainers = [] }) => {
  const yearPrefix = `${year}-`;
  const rowsById = new Map();
  const monthTotals = emptyMonths();
  const grandTotals = emptyTotals();
  let skippedWithoutDate = 0;
  let emptyPastSlots = 0;
  let emptyFutureSlots = 0;

  const trainerById = new Map(trainers.map((trainer) => [trainer.id, trainer]));

  const rowFor = (trainerId, fallbackName) => {
    const key = trainerId || `name:${fallbackName || ''}`;
    if (!rowsById.has(key)) {
      rowsById.set(key, {
        trainerId: trainerId || '',
        trainerName: trainerDisplayName(trainerById.get(trainerId)) || fallbackName || 'Bilinmeyen Eğitmen',
        months: emptyMonths(),
        ...emptyTotals()
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
    const students = studentCount(lesson);
    if (students === 0) {
      if (isDone) emptyPastSlots += 1; else emptyFutureSlots += 1;
      return;
    }

    const bucket = isDone ? 'done' : 'planned';
    const category = lessonCategory(lesson);
    const row = rowFor(lesson.trainerId, lesson.trainerName);

    addToCell(row.months[monthIndex], category, bucket, students);
    addToCell(monthTotals[monthIndex], category, bucket, students);
    addToTotals(row, category, bucket, students);
    addToTotals(grandTotals, category, bucket, students);
  });

  const rows = Array.from(rowsById.values()).sort((a, b) => {
    if (b.totalDone !== a.totalDone) return b.totalDone - a.totalDone;
    return a.trainerName.localeCompare(b.trainerName, 'tr');
  });

  return {
    year,
    rows,
    monthTotals,
    ...grandTotals,
    skippedWithoutDate,
    emptyPastSlots,
    emptyFutureSlots
  };
};

/** Read the done/planned pair for a category ('all' | 'group' | 'individual') out of a month cell. */
export const cellForCategory = (cell, category) => {
  if (!cell) return { done: 0, planned: 0, students: 0 };
  if (category === 'group' || category === 'individual') return cell[category];
  return { done: cell.done, planned: cell.planned, students: cell.students };
};

/** Read the done/planned pair for a category out of a row or the stats object. */
export const totalsForCategory = (totals, category) => {
  if (!totals) return { done: 0, planned: 0, students: 0 };
  if (category === 'group') return { done: totals.groupDone, planned: totals.groupPlanned, students: totals.groupStudents };
  if (category === 'individual') return { done: totals.individualDone, planned: totals.individualPlanned, students: totals.individualStudents };
  return { done: totals.totalDone, planned: totals.totalPlanned, students: totals.totalStudents };
};

/** CSV rows (arrays of cells) for the report, header first; one row per trainer and category. */
export const trainerStatsToCsvRows = (stats) => {
  const header = ['Eğitmen', 'Kategori', ...MONTH_LABELS_TR, 'Toplam', 'Öğrenci', 'Planlı'];
  const rowsFor = (name, months, totals) => LESSON_CATEGORIES.map(({ id, label }) => {
    const total = totalsForCategory(totals, id);
    return [name, label, ...months.map((m) => cellForCategory(m, id).done), total.done, total.students, total.planned];
  });
  return [
    header,
    ...stats.rows.flatMap((row) => rowsFor(row.trainerName, row.months, row)),
    ...rowsFor('Toplam', stats.monthTotals, stats)
  ];
};
