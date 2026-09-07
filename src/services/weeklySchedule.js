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
