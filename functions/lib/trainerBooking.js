/**
 * Decision logic for the `trainer_booking` notification: when a member joins a
 * lesson, tell the lesson's trainer.
 *
 * Pure on purpose. Every document (lesson, trainer, member) is passed in, so
 * the rules below can be unit-tested without Firestore. The IO around it lives
 * in autoNotifications.js.
 */

const { lessonLabel } = require('./lessonLabel');
const { toLocalDateString } = require('./time');

// A member "joined" whether they booked it themselves or an admin added them.
// Cancellations are deliberately not included.
const JOIN_ACTIONS = ['booked', 'admin_added'];

/** "Ad Soyad" for a user document, falling back to displayName. */
function fullName(user) {
  if (!user) return '';
  const name = `${user.firstName || ''} ${user.lastName || ''}`.trim();
  return name || user.displayName || '';
}

/**
 * Should this booking notify the lesson's trainer, and with what variables?
 * Returns null when no notification should be sent.
 *
 * @returns {null | { userId: string, offset: string, lang: string|undefined, vars: object }}
 */
function planTrainerNotification({ enabled, action, booking, lesson, trainer, member }) {
  if (!enabled) return null;
  if (!JOIN_ACTIONS.includes(action)) return null;

  const memberId = booking && booking.userId;
  if (!memberId) return null;

  const trainerId = lesson && lesson.trainerId;
  if (!trainerId) return null;

  // A trainer joining their own class does not need to be told about it.
  if (trainerId === memberId) return null;

  // No trainer account (deleted, or a free-text trainer name only).
  if (!trainer) return null;

  return {
    userId: trainerId,
    offset: `trainer_${action}`,
    lang: trainer.lang,
    vars: {
      isim: trainer.firstName || '',
      ders: lessonLabel(lesson),
      saat: lesson.startTime || '',
      tarih: toLocalDateString(lesson.scheduledDate) || '',
      kredi: '',
      ogrenci: fullName(member),
    },
  };
}

module.exports = { JOIN_ACTIONS, fullName, planTrainerNotification };
