/**
 * Idempotency keys for automatic notifications.
 *
 * Before sending, the scanner checks `notificationSentLog/{id}`; if it exists the
 * send is skipped, otherwise the notification is created and the log written.
 * The id is deterministic so overlapping 15-minute scans never double-send.
 *
 *   {ruleType}_{userId}_{refId}_{offset}
 *   e.g. lesson_reminder_uid123_lesson456_2h
 *        membership_expiring_uid123_pkg789_3d
 */

function sanitize(part) {
  return String(part == null ? '' : part).replace(/[^a-zA-Z0-9_-]/g, '-');
}

function buildSentLogId({ ruleType, userId, refId, offset }) {
  return [ruleType, userId, refId, offset].map(sanitize).join('_');
}

module.exports = { buildSentLogId, sanitize };
