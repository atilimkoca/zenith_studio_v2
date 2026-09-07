/**
 * Lesson maintenance:
 *   - autoCompleteLessons   (pubsub, hourly): marks lessons whose end time passed
 *     more than GRACE_HOURS ago as `completed`, and stamps `scheduledDateKey` on
 *     upcoming lessons that were written by a client that does not set it yet.
 *   - backfillLessonDateKeys (https callable, admin only): one-off pass over the
 *     whole collection that stamps `scheduledDateKey` and completes past lessons.
 *
 * `scheduledDateKey` ("YYYY-MM-DD", Istanbul calendar day) lets the mobile app
 * query one day instead of downloading every active lesson. Keeping the active
 * set small (auto-complete) keeps every other lesson list fast as well.
 *
 * Pure helpers are exported for the dependency-free tests in __tests__.
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { FieldValue } = require('firebase-admin/firestore');
const { TR_OFFSET, toLocalDateString, lessonStartDate } = require('./time');

const GRACE_HOURS = 3; // leave time for late attendance edits before closing a lesson
const RECENT_DAYS = 3; // how many past days the hourly job re-checks
const HEAL_LIMIT = 500; // upcoming lessons scanned per run for a missing key
const BATCH_LIMIT = 400;

const db = () => admin.firestore();

/** Istanbul calendar day ("YYYY-MM-DD") of a lesson, or null. */
function lessonDayKey(lesson) {
  if (!lesson || !lesson.scheduledDate) return null;
  return toLocalDateString(lesson.scheduledDate);
}

/**
 * Absolute end time of a lesson: day + endTime, or start + duration minutes
 * when endTime is missing. Null when it cannot be determined.
 */
function lessonEndDate(lesson) {
  const dayKey = lessonDayKey(lesson);
  if (!dayKey) return null;

  if (lesson.endTime && /^\d{1,2}:\d{2}/.test(lesson.endTime)) {
    const [h, m] = lesson.endTime.split(':');
    const end = new Date(`${dayKey}T${h.padStart(2, '0')}:${m.slice(0, 2)}:00${TR_OFFSET}`);
    if (!Number.isNaN(end.getTime())) return end;
  }

  const start = lessonStartDate(lesson.scheduledDate, lesson.startTime);
  const duration = Number(lesson.duration);
  if (!start || !Number.isFinite(duration) || duration <= 0) return null;
  return new Date(start.getTime() + duration * 60 * 1000);
}

/** True when an active lesson ended more than `graceHours` before `now`. */
function shouldAutoComplete(lesson, now = new Date(), graceHours = GRACE_HOURS) {
  if (!lesson || lesson.status !== 'active') return false;
  const end = lessonEndDate(lesson);
  if (!end) return false;
  return end.getTime() + graceHours * 60 * 60 * 1000 <= now.getTime();
}

/** Today's key followed by the previous `days - 1` day keys. */
function recentDayKeys(now = new Date(), days = RECENT_DAYS) {
  const keys = [];
  for (let i = 0; i < days; i += 1) {
    keys.push(toLocalDateString(new Date(now.getTime() - i * 24 * 60 * 60 * 1000)));
  }
  return keys;
}

function completionFields(now) {
  return {
    status: 'completed',
    completedAt: now.toISOString(),
    completedBy: 'system_auto',
  };
}

/** Collects writes and commits them in batches of BATCH_LIMIT. */
function createBatcher() {
  let batch = db().batch();
  let pending = 0;
  return {
    update(ref, data) {
      batch.update(ref, { ...data, updatedAt: FieldValue.serverTimestamp() });
      pending += 1;
      return pending >= BATCH_LIMIT ? this.flush() : Promise.resolve();
    },
    async flush() {
      if (pending === 0) return;
      await batch.commit();
      batch = db().batch();
      pending = 0;
    },
  };
}

const autoCompleteLessons = functions.pubsub
  .schedule('every 60 minutes')
  .timeZone('Europe/Istanbul')
  .onRun(async () => {
    const now = new Date();
    const stats = { keysHealed: 0, completed: 0 };
    const batcher = createBatcher();

    // 1) Stamp scheduledDateKey on upcoming lessons that lack it (string compare
    //    covers both "YYYY-MM-DD" and ISO strings; Timestamp values are handled
    //    by the one-off backfill).
    const todayKey = toLocalDateString(now);
    const upcoming = await db()
      .collection('lessons')
      .where('scheduledDate', '>=', todayKey)
      .limit(HEAL_LIMIT)
      .get()
      .catch(() => null);

    if (upcoming) {
      for (const doc of upcoming.docs) {
        const lesson = doc.data();
        const key = lessonDayKey(lesson);
        if (key && lesson.scheduledDateKey !== key) {
          await batcher.update(doc.ref, { scheduledDateKey: key });
          stats.keysHealed += 1;
        }
      }
    }

    // 2) Close lessons from the last few days whose end + grace period passed.
    for (const dayKey of recentDayKeys(now)) {
      const snap = await db().collection('lessons').where('scheduledDateKey', '==', dayKey).get();
      for (const doc of snap.docs) {
        if (shouldAutoComplete(doc.data(), now)) {
          await batcher.update(doc.ref, completionFields(now));
          stats.completed += 1;
        }
      }
    }

    await batcher.flush();
    console.log('autoCompleteLessons', stats);
    return null;
  });

async function assertAdmin(context) {
  // The Functions shell / emulator runs with the developer's CLI credentials and
  // no auth context; production calls must come from a signed-in admin.
  if (process.env.FUNCTIONS_EMULATOR === 'true') return;
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Giriş yapmanız gerekiyor.');
  }
  const user = await db().collection('users').doc(context.auth.uid).get();
  if (!user.exists || user.data().role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Bu işlem yalnızca yöneticiler için.');
  }
}

const backfillLessonDateKeys = functions.https.onCall(async (data, context) => {
  await assertAdmin(context);

  const dryRun = !!(data && data.dryRun);
  const graceHours = Number(data && data.graceHours) || GRACE_HOURS;
  const now = new Date();
  const stats = { scanned: 0, keysSet: 0, completed: 0, skippedNoDate: 0, dryRun };
  const batcher = createBatcher();

  const snap = await db().collection('lessons').get();
  stats.scanned = snap.size;

  for (const doc of snap.docs) {
    const lesson = doc.data();
    const key = lessonDayKey(lesson);
    if (!key) {
      stats.skippedNoDate += 1;
      continue;
    }

    const update = {};
    if (lesson.scheduledDateKey !== key) {
      update.scheduledDateKey = key;
      stats.keysSet += 1;
    }
    if (shouldAutoComplete(lesson, now, graceHours)) {
      Object.assign(update, completionFields(now));
      stats.completed += 1;
    }
    if (!dryRun && Object.keys(update).length > 0) {
      await batcher.update(doc.ref, update);
    }
  }

  await batcher.flush();
  console.log('backfillLessonDateKeys', stats);
  return stats;
});

module.exports = {
  GRACE_HOURS,
  lessonDayKey,
  lessonEndDate,
  shouldAutoComplete,
  recentDayKeys,
  autoCompleteLessons,
  backfillLessonDateKeys,
};
