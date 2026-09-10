// Pure helpers for grouping lesson documents into a Monday–Sunday week.
// Used by scheduleService (one-time fetch) and by the live onSnapshot
// subscription in the Schedule component so both produce identical output.

export const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export const emptyWeek = () => DAY_KEYS.reduce((week, day) => {
  week[day] = [];
  return week;
}, {});

const localMidnight = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

/**
 * Bucket `lessons` by `dayOfWeek` for the week `[startDate, endDate]` (both
 * inclusive, compared at local midnight). Lessons without a `scheduledDate`
 * are legacy recurring lessons and belong to every week. Each day is sorted
 * by `startTime`. The input array is not modified.
 */
export const buildWeeklySchedule = (lessons, startDate, endDate, normalizeDate) => {
  const week = emptyWeek();
  if (!Array.isArray(lessons)) return week;

  const startTimestamp = localMidnight(startDate);
  const endTimestamp = localMidnight(endDate);

  lessons.forEach((lesson) => {
    let includeLesson = true;

    if (lesson.scheduledDate) {
      const lessonDate = normalizeDate(lesson.scheduledDate);
      if (lessonDate) {
        const lessonTimestamp = localMidnight(lessonDate);
        includeLesson = lessonTimestamp >= startTimestamp && lessonTimestamp <= endTimestamp;
      } else {
        includeLesson = false;
      }
    }

    if (includeLesson && lesson.dayOfWeek && Object.prototype.hasOwnProperty.call(week, lesson.dayOfWeek)) {
      week[lesson.dayOfWeek].push(lesson);
    }
  });

  DAY_KEYS.forEach((day) => {
    week[day].sort((a, b) => {
      if (!a.startTime || !b.startTime) return 0;
      return a.startTime.localeCompare(b.startTime);
    });
  });

  return week;
};

// --- Day / date consistency -------------------------------------------------
// A dated lesson carries both `scheduledDate` and `dayOfWeek`. Clients read
// them differently (the web calendar buckets by dayOfWeek, the mobile app and
// the calendar's week filter use scheduledDate), so the two must always agree
// or the lesson silently disappears from one of the views.

const isValidDate = (date) => date instanceof Date && !Number.isNaN(date.getTime());

/** Monday-first day key ('monday'…'sunday') for a Date, or null when invalid. */
export const dayKeyForDate = (date) => {
  if (!isValidDate(date)) return null;
  return DAY_KEYS[(date.getDay() + 6) % 7];
};

/**
 * Return a new Date on `dayKey` within the same Monday–Sunday week as `date`
 * (time-of-day preserved). Null when `date` is invalid or `dayKey` unknown.
 */
export const shiftDateToWeekday = (date, dayKey) => {
  if (!isValidDate(date)) return null;
  const targetIndex = DAY_KEYS.indexOf(dayKey);
  if (targetIndex === -1) return null;
  const currentIndex = (date.getDay() + 6) % 7;
  const shifted = new Date(date.getTime());
  shifted.setDate(shifted.getDate() + (targetIndex - currentIndex));
  return shifted;
};

/**
 * Make `dayOfWeek` agree with `scheduledDate` in a lesson payload. The date is
 * the source of truth; a missing or wrong `dayOfWeek` is replaced. Payloads
 * without a usable date (legacy recurring lessons) are returned as-is. Never
 * mutates the input.
 */
export const reconcileDayOfWeek = (payload, normalizeDate) => {
  if (!payload || !payload.scheduledDate) return payload;
  const derived = dayKeyForDate(normalizeDate(payload.scheduledDate));
  if (!derived || payload.dayOfWeek === derived) return payload;
  return { ...payload, dayOfWeek: derived };
};
