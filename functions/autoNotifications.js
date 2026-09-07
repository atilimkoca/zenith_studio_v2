/**
 * Automatic notification system (rule-based, template + settings).
 *
 * Admin panels (mobile + web) write one document per rule type into
 * `notificationRules`. These Cloud Functions read those rules and create
 * per-user documents in `notifications`, which the existing
 * `sendPushNotification` onCreate trigger turns into Expo push messages.
 *
 * Exposes three builders wired from index.js:
 *   - processScheduledNotifications  (pubsub, every 15 min): lesson_reminder, membership_expiring
 *   - onUserWriteCreditLow           (users onUpdate): credit_low
 *   - onBookingCreated               (userBookings onCreate): booking_confirmation + trainer_booking
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

const { RULE_TYPES, DEFAULT_RULES } = require('./lib/ruleDefs');
const { getActivePackage, getActivePackageCredits } = require('./lib/activePackage');
const { renderTemplate } = require('./lib/template');
const { lessonStartDate, daysUntil, toLocalDateString } = require('./lib/time');
const { buildSentLogId } = require('./lib/sentLog');
const { lessonLabel } = require('./lib/lessonLabel');
const { JOIN_ACTIONS, planTrainerNotification } = require('./lib/trainerBooking');

const SCAN_WINDOW_MS = 16 * 60 * 1000; // 16 min window (>= 15 min schedule, avoids gaps)
const RETENTION_DAYS = 20; // notifications older than this are auto-deleted

function db() {
  return admin.firestore();
}

/** Load a rule document, falling back to the built-in default for that type. */
async function getRule(ruleType) {
  const snap = await db().collection('notificationRules').doc(ruleType).get();
  const base = DEFAULT_RULES[ruleType] || {};
  return snap.exists ? { ...base, ...snap.data() } : base;
}

/** Build the variable bag shared by all templates. */
function buildVars({ firstName, lessonName, time, date, credits, studentName }) {
  return {
    isim: firstName || '',
    ders: lessonName || '',
    saat: time || '',
    tarih: date || '',
    kredi: credits === undefined || credits === null ? '' : credits,
    ogrenci: studentName || '',
  };
}


/**
 * Create a per-user notification document once (idempotent via sentLog).
 * Returns true if a notification was created, false if skipped as duplicate.
 */
async function createUserNotification({ rule, ruleType, userId, refId, offset, vars, lang }) {
  const logId = buildSentLogId({ ruleType, userId, refId, offset });
  const logRef = db().collection('notificationSentLog').doc(logId);

  const created = await db().runTransaction(async (tx) => {
    const existing = await tx.get(logRef);
    if (existing.exists) return false;

    const { title, body } = renderTemplate(rule.template, lang, vars);
    const notifRef = db().collection('notifications').doc();
    tx.set(notifRef, {
      title,
      message: body,
      type: ruleType,
      recipients: userId, // per-user target (see getPushTokens in index.js)
      userId, // so the in-app notification list picks it up
      priority: rule.priority || 'normal',
      isRead: false,
      automatic: true,
      ruleType,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    tx.set(logRef, {
      ruleType,
      userId,
      refId,
      offset,
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return true;
  });

  return created;
}

// ---------------------------------------------------------------------------
// Scheduled scan: lesson_reminder + membership_expiring
// ---------------------------------------------------------------------------

async function runLessonReminders(now) {
  const rule = await getRule(RULE_TYPES.LESSON_REMINDER);
  if (!rule.enabled) return 0;
  const offsets = (rule.offsetsHours || []).filter((h) => Number(h) > 0);
  if (offsets.length === 0) return 0;

  const maxOffsetMs = Math.max(...offsets) * 60 * 60 * 1000;
  const fromIso = new Date(now.getTime()).toISOString();
  const toIso = new Date(now.getTime() + maxOffsetMs + SCAN_WINDOW_MS).toISOString();

  // scheduledDate may be stored as ISO string or Timestamp; query defensively by
  // pulling upcoming lessons and filtering in-memory on the precise start time.
  const snap = await db()
    .collection('lessons')
    .where('scheduledDate', '>=', fromIso)
    .where('scheduledDate', '<=', toIso)
    .get()
    .catch(() => null);

  // Fallback for Timestamp-typed scheduledDate (string query returns nothing).
  const docs = snap && !snap.empty
    ? snap.docs
    : (await db().collection('lessons').get()).docs;

  let count = 0;
  for (const doc of docs) {
    const lesson = doc.data();
    const participants = lesson.participants || [];
    if (participants.length === 0) continue;

    const start = lessonStartDate(lesson.scheduledDate, lesson.startTime);
    if (!start) continue;

    for (const hours of offsets) {
      const fireAt = start.getTime() - hours * 60 * 60 * 1000;
      // Send when the fire moment falls inside this scan's window.
      if (fireAt < now.getTime() || fireAt > now.getTime() + SCAN_WINDOW_MS) continue;

      for (const userId of participants) {
        try {
          const user = await getUser(userId);
          if (!user) continue;
          const vars = buildVars({
            firstName: user.firstName,
            lessonName: lessonLabel(lesson),
            time: lesson.startTime,
            date: toLocalDateString(lesson.scheduledDate),
          });
          const created = await createUserNotification({
            rule,
            ruleType: RULE_TYPES.LESSON_REMINDER,
            userId,
            refId: doc.id,
            offset: `${hours}h`,
            vars,
            lang: user.lang,
          });
          if (created) count += 1;
        } catch (err) {
          console.error('lesson_reminder error', { lessonId: doc.id, userId, err: err.message });
        }
      }
    }
  }
  return count;
}

async function runMembershipExpiring(now) {
  const rule = await getRule(RULE_TYPES.MEMBERSHIP_EXPIRING);
  if (!rule.enabled) return 0;
  const offsets = (rule.offsetsDays || []).filter((d) => Number(d) > 0);
  if (offsets.length === 0) return 0;

  const usersSnap = await db().collection('users').get();
  let count = 0;

  for (const doc of usersSnap.docs) {
    const user = doc.data();
    try {
      const pkg = getActivePackage(user, now);
      if (!pkg || !pkg.expiryDate) continue;

      const days = daysUntil(pkg.expiryDate, now);
      if (!offsets.includes(days)) continue;

      const vars = buildVars({
        firstName: user.firstName,
        date: toLocalDateString(pkg.expiryDate),
        credits: pkg.remainingLessons || 0,
      });
      const created = await createUserNotification({
        rule,
        ruleType: RULE_TYPES.MEMBERSHIP_EXPIRING,
        userId: doc.id,
        refId: pkg.id || pkg.packageId || toLocalDateString(pkg.expiryDate),
        offset: `${days}d`,
        vars,
        lang: user.lang,
      });
      if (created) count += 1;
    } catch (err) {
      console.error('membership_expiring error', { userId: doc.id, err: err.message });
    }
  }
  return count;
}

async function getUser(userId) {
  const snap = await db().collection('users').doc(userId).get();
  return snap.exists ? snap.data() : null;
}

const processScheduledNotifications = functions.pubsub
  .schedule('every 15 minutes')
  .timeZone('Europe/Istanbul')
  .onRun(async () => {
    const now = new Date();
    const [reminders, memberships] = await Promise.all([
      runLessonReminders(now).catch((e) => {
        console.error('runLessonReminders failed', e);
        return 0;
      }),
      runMembershipExpiring(now).catch((e) => {
        console.error('runMembershipExpiring failed', e);
        return 0;
      }),
    ]);
    console.log(`⏰ Scheduled notifications sent: reminders=${reminders}, memberships=${memberships}`);
    return null;
  });

// ---------------------------------------------------------------------------
// Event trigger: credit_low (users onUpdate)
// ---------------------------------------------------------------------------

const onUserWriteCreditLow = functions.firestore
  .document('users/{userId}')
  .onUpdate(async (change, context) => {
    const rule = await getRule(RULE_TYPES.CREDIT_LOW);
    if (!rule.enabled) return null;

    const threshold = Number(rule.threshold);
    if (!Number.isFinite(threshold)) return null;

    const before = change.before.data();
    const after = change.after.data();
    const now = new Date();

    const beforeCredits = getActivePackageCredits(before, now);
    const afterCredits = getActivePackageCredits(after, now);

    // Only fire on a fresh downward crossing of the threshold (and still > 0,
    // so a depleted package doesn't spam). before > threshold >= after > 0.
    const crossed = beforeCredits > threshold && afterCredits <= threshold && afterCredits > 0;
    if (!crossed) return null;

    const userId = context.params.userId;
    const pkg = getActivePackage(after, now);
    const vars = buildVars({ firstName: after.firstName, credits: afterCredits });

    try {
      await createUserNotification({
        rule,
        ruleType: RULE_TYPES.CREDIT_LOW,
        userId,
        refId: (pkg && (pkg.id || pkg.packageId)) || 'active',
        offset: `le${threshold}-${afterCredits}`, // distinct per remaining count
        vars,
        lang: after.lang,
      });
    } catch (err) {
      console.error('credit_low error', { userId, err: err.message });
    }
    return null;
  });

// ---------------------------------------------------------------------------
// Event trigger: booking_confirmation (userBookings onCreate)
// ---------------------------------------------------------------------------

/** booking_confirmation: tells the member their booking / cancellation landed. */
async function notifyMemberOfBooking({ booking, bookingId, action }) {
  const rule = await getRule(RULE_TYPES.BOOKING_CONFIRMATION);
  if (!rule.enabled) return;
  if (action !== 'booked' && action !== 'cancelled') return;

  const userId = booking.userId;
  if (!userId) return;

  const lesson = booking.lessonData || {};
  const user = await getUser(userId);
  const vars = buildVars({
    firstName: user ? user.firstName : '',
    lessonName: lessonLabel(lesson),
    time: lesson.startTime,
    date: toLocalDateString(lesson.scheduledDate),
  });

  // Use the cancel template variant when the booking was a cancellation.
  const effectiveRule =
    action === 'cancelled' && rule.cancelTemplate
      ? { ...rule, template: rule.cancelTemplate }
      : rule;

  await createUserNotification({
    rule: effectiveRule,
    ruleType: RULE_TYPES.BOOKING_CONFIRMATION,
    userId,
    refId: bookingId,
    offset: action,
    vars,
    lang: user ? user.lang : 'tr',
  });
}

/**
 * trainer_booking: tells the lesson's trainer that a member joined their class.
 * The trainer is lessons/{id}.trainerId; the booking carries a snapshot of the
 * lesson, and we fall back to reading the lesson document for older records.
 */
async function notifyTrainerOfBooking({ booking, bookingId, action }) {
  const rule = await getRule(RULE_TYPES.TRAINER_BOOKING);
  if (!rule.enabled) return;
  if (!JOIN_ACTIONS.includes(action)) return;

  const memberId = booking.userId;
  if (!memberId) return;

  let lesson = booking.lessonData || {};
  if (!lesson.trainerId && booking.lessonId) {
    const snap = await db().collection('lessons').doc(booking.lessonId).get();
    if (snap.exists) lesson = { ...lesson, ...snap.data() };
  }

  const trainerId = lesson.trainerId;
  if (!trainerId || trainerId === memberId) return;

  const [trainer, member] = await Promise.all([getUser(trainerId), getUser(memberId)]);

  // All the "should this be sent, and what does it say" rules live in
  // lib/trainerBooking.js so they can be unit-tested without Firestore.
  const plan = planTrainerNotification({
    enabled: rule.enabled,
    action,
    booking,
    lesson,
    trainer,
    member,
  });
  if (!plan) return;

  await createUserNotification({
    rule,
    ruleType: RULE_TYPES.TRAINER_BOOKING,
    userId: plan.userId,
    refId: bookingId,
    offset: plan.offset,
    vars: plan.vars,
    lang: plan.lang,
  });
}

const onBookingCreated = functions.firestore
  .document('userBookings/{bookingId}')
  .onCreate(async (snap, context) => {
    const booking = snap.data();
    const action = booking.action || booking.status;
    const bookingId = context.params.bookingId;

    // The two notifications are independent: one failing must not silence the other.
    const results = await Promise.allSettled([
      notifyMemberOfBooking({ booking, bookingId, action }),
      notifyTrainerOfBooking({ booking, bookingId, action }),
    ]);
    results.forEach((r, i) => {
      if (r.status === 'rejected') {
        console.error(i === 0 ? 'booking_confirmation error' : 'trainer_booking error', {
          bookingId,
          err: r.reason && r.reason.message,
        });
      }
    });
    return null;
  });

// ---------------------------------------------------------------------------
// Scheduled cleanup: delete notifications older than RETENTION_DAYS
// ---------------------------------------------------------------------------

const cleanupOldNotifications = functions.pubsub
  .schedule('every day 03:30')
  .timeZone('Europe/Istanbul')
  .onRun(async () => {
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const cutoffTs = admin.firestore.Timestamp.fromDate(cutoff);

    let totalDeleted = 0;
    // Delete in pages to stay within batch limits.
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const snap = await db()
        .collection('notifications')
        .where('createdAt', '<', cutoffTs)
        .limit(400)
        .get();

      if (snap.empty) break;

      const batch = db().batch();
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      totalDeleted += snap.size;

      if (snap.size < 400) break;
    }

    // Also clear stale idempotency logs so the collection doesn't grow forever.
    let logsDeleted = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const snap = await db()
        .collection('notificationSentLog')
        .where('sentAt', '<', cutoffTs)
        .limit(400)
        .get();
      if (snap.empty) break;
      const batch = db().batch();
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      logsDeleted += snap.size;
      if (snap.size < 400) break;
    }

    console.log(`🧹 Cleanup: deleted ${totalDeleted} notifications, ${logsDeleted} sent-logs older than ${RETENTION_DAYS} days`);
    return null;
  });

module.exports = {
  processScheduledNotifications,
  onUserWriteCreditLow,
  onBookingCreated,
  cleanupOldNotifications,
  // exported for testing / reuse
  _internal: { runLessonReminders, runMembershipExpiring, getRule, createUserNotification },
};
