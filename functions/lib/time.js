/**
 * Time helpers for the scheduled notification scanner.
 *
 * Turkey is permanently UTC+3 (no DST since 2016), so we anchor all studio-local
 * calculations to a fixed +03:00 offset. This keeps lesson start times and
 * day-difference math correct without a timezone library.
 */

const TR_OFFSET = '+03:00';

const { toDate } = require('./activePackage');

/** Extract a YYYY-MM-DD calendar date (studio-local) from any stored date value. */
function toLocalDateString(value) {
  const d = toDate(value);
  if (!d) return null;
  // Shift into Istanbul local time, then read the calendar date.
  const local = new Date(d.getTime() + 3 * 60 * 60 * 1000);
  return local.toISOString().slice(0, 10);
}

/**
 * Combine a lesson's scheduledDate (date portion) with its "HH:MM" startTime
 * into an absolute Date, interpreting the wall-clock time as Istanbul time.
 * Returns null if either part is missing/invalid.
 */
function lessonStartDate(scheduledDate, startTime) {
  const dateStr = toLocalDateString(scheduledDate);
  if (!dateStr) return null;
  if (!startTime || !/^\d{1,2}:\d{2}/.test(startTime)) return null;
  const [h, m] = startTime.split(':');
  const hh = h.padStart(2, '0');
  const mm = m.slice(0, 2);
  const iso = `${dateStr}T${hh}:${mm}:00${TR_OFFSET}`;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Whole studio-local calendar days from `now` until `target` (target's date
 * minus now's date). 0 = same day, 1 = tomorrow. Negative = past.
 */
function daysUntil(target, now = new Date()) {
  const a = toLocalDateString(target);
  const b = toLocalDateString(now);
  if (!a || !b) return null;
  const da = new Date(`${a}T00:00:00Z`).getTime();
  const db = new Date(`${b}T00:00:00Z`).getTime();
  return Math.round((da - db) / (24 * 60 * 60 * 1000));
}

module.exports = { TR_OFFSET, toLocalDateString, lessonStartDate, daysUntil };
