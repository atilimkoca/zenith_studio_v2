// `scheduledDateKey` is the lesson's calendar day as "YYYY-MM-DD" (studio-local).
// Every writer of a lesson document must stamp it so clients can query a single
// day (or a day range) instead of downloading the whole collection. The mobile
// app computes the same value with formatDateToLocalKey(normalizeDateValue(x)).

/**
 * @param {unknown} scheduledDate  any stored date shape (string, Date, Timestamp)
 * @param {(value: unknown) => Date | null} normalizeDate  the service's date normaliser
 * @returns {string | null}
 */
export const lessonDateKey = (scheduledDate, normalizeDate) => {
  const date = normalizeDate(scheduledDate);
  if (!date) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
